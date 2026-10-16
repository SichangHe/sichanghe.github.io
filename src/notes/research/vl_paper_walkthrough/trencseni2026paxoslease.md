# PaxosLease Revisited: A Checked Model of Diskless Distributed Leases
(authored by agents unless marked 🧑)
Tag: `trencseni2026paxoslease`, [paper](https://www.semanticscholar.org/paper/88b3d6a33302d98aae27c3d9445c72c3e26bd85c)

## scope and contribution

The paper gives a machine-checked specification of PaxosLease, a time-bounded exclusive lease protocol whose acceptors keep no durable lease state. It checks the lease protocol and its Multi-Paxos leader use, repairs three safety rules in the 2012 description, and audits Keyspace and ScalienDB implementations. The abstract states: "PaxosLease is a protocol by which a quorum of acceptors grants time-bounded exclusive ownership with no durable acceptor lease state and no disk write on the lease acquisition path." (Abstract, p. 1). The work combines TLA+ model checking with TLC, timing proofs in TLAPS, and an executable Python model (Abstract, p. 1).

The system model has crash-stop/restart processes, delayed, reordered, duplicated, or lost messages, volatile acceptor state, and a durable proposer restart counter. Clocks need not be synchronized; each clock rate lies in 1 ± ρ of real time (Section 3.1, p. 2). A quorum is a majority, and any two quorums intersect. A lease instance is an owner incarnation plus globally unique ballot, so a proposer restart is a new owner (Sections 3.1–3.2, p. 2).

## technique: specify the protocol as executable state machines

What it is: make the prose algorithm a normative TLA+ transition system with explicit proposer, acceptor, learner, messages, timers, and crash state. The paper says, "The TLA+ module, not this prose, is the normative statement of the PaxosLease algorithm." (Section 3, p. 2).

When to use it: use this when timing, retries, stale messages, and crashes interact so that an informal invariant argument can miss an execution.

How to apply it:

1. Define finite proposer and acceptor sets, majority quorums, message delivery actions, and local clocks (Section 3.1, p. 2).
2. Model proposer attempts with a fresh ballot, pending deadline, renewal base, responder identity set, active deadline, and quorum certificate (Section 3.2, p. 2).
3. Model acceptors with promised ballot and accepted lease plus local exclusion deadline; lose both on crash (Section 3.2, p. 2).
4. Encode numbered transitions P1–P6 and A1–A4: prepare, promise, accept, activation, abandonment/retry, exact-instance release, and restart quarantine (Sections 3.4–3.5, pp. 3–4).
5. Encode learner visibility separately: the owner installs an absolute expiry; remote learners install a conservative remaining duration (Section 3.6, p. 4).

Verus form: Inference: represent protocol state as Rust structs and ghost state, use `spec fn` predicates for well-formedness and lease validity, and prove transition postconditions with `requires`/`ensures`. Use `proof fn` lemmas for quorum intersection and timer containment; keep message delivery as explicit state transitions. Verus does not provide TLC’s exhaustive temporal-state search, so bounded exploration would remain an external test harness. The allowed Verus vocabulary is limited to constructs documented in the project’s Verus notes.

Evidence: TLC checks the main invariant and supporting invariants over finite configurations; the paper reports more than five billion distinct states in the largest completed runs and more than thirty billion generated states (Section 5, p. 5). A Python reference model encodes the same rules independently and replays witnesses (Section 5, p. 5).

Limits: the exhaustive checks are bounded to at most two proposers, three acceptors, three ballots, one restart per proposer, a three-unit horizon, and selected duration triples (Section 5, p. 5). The paper explicitly says the safety argument is not a liveness proof: "Liveness requires eventual message delivery, sufficiently accurate timers, and a period during which a quorum of acceptors stays available" (Section 4, p. 5). Inference: a Verus proof of an unbounded implementation still needs assumptions about clocks, transport, and fairness.

## technique: derive and prove timer containment bounds

What it is: relate proposer authority, acceptor exclusion, and restart quarantine by worst-case clock drift. The proposer deadline starts when Prepare is broadcast (T1). The acceptor exclusion duration must satisfy `DP·(1+ρ) ≤ DA·(1−ρ)` (T2), and restart quarantine must satisfy `DP·(1+ρ) ≤ DQ·(1−ρ)` (T3) (Section 3.7, p. 4).

When to use it: use this whenever one component’s local timer protects another component’s real-time safety interval.

How to apply it:

1. Start the proposer attempt timer no later than the first acceptance, so authority cannot outlive the certificate’s exclusion (T1, p. 4).
2. Choose `DA` from the drift inequality and prove the real-time containment lemma (T2 and Appendix B.3, pp. 4, 10).
3. Choose `DQ` from the analogous inequality so a restarted acceptor cannot vote while forgotten state could still matter (T3 and Appendix B.3, pp. 4, 10).
4. Check tightness by running configurations at `DQ = DP` and `DQ = DP − 1`; the latter should admit a two-owner trace (Section 4, p. 5).

Verus form: Inference: encode durations and rates as integer or rational ghost values, state the inequalities as `requires`, and prove a `lemma` that converts local-clock bounds into real-time interval inclusion. The implementation should use monotonic elapsed-time sources; wall-clock behavior is an environmental assumption to state explicitly.

Evidence: TLAPS proves `TimerContainmentArithmetic` and `QuarantineCoversForgottenFacts` (Appendix B.3, p. 10). TLC finds that quarantine equal to the proposer duration passes and one unit below fails in two-acceptor configurations (Section 4, p. 5; Table 2, p. 14).

Limits: the paper’s arithmetic proof assumes the stated clock-rate bound. It does not prove that a deployed clock source obeys that bound; the implementation audit finds unsafe wall-clock use (Appendix D.7, pp. 13–14).

## technique: mutate one rule to obtain counterexamples

What it is: generate full specification variants, each weakening exactly one rule, and require TLC to find a safety violation. This turns the model into a regression oracle for protocol design.

How to apply it:

1. Copy the checked specification and weaken one transition or guard (Section 5, p. 5).
2. Run TLC against `LeaseExclusivity`, the invariant that at most one proposer is active (Appendix B.1, p. 10).
3. Record the shortest trace and map it back to the weakened rule.
4. Keep the repaired rule only when the unweakened model passes all configurations.

The paper reports five variants: late timer (27 states), owner-only release (36), scalar quorum counting (18), stale-owner-open (36), and proposer-only owner comparison (43) (Table 1, p. 6). For example, exact owner-and-ballot release is necessary because "Matching on the owner o alone leads to a safety violation" (Section 3.5, p. 4).

Verus form: Inference: implement each transition as a Rust function with a proof-level invariant and create negative test modules that intentionally omit one guard. Verus can prove the repaired transition invariant but does not itself search for counterexamples; pair proofs with bounded model traces or executable tests.

Limits: counterexample coverage inherits the finite bounds. A passing finite model is evidence for the modeled state space, not a proof of implementation refinement.

## technique: compose the lease with Multi-Paxos through a one-way interface

The composition model uses M1 AcquireLease, M2 full log-wide Phase 1 recovery, M3 repair of constrained slots, M4 readiness, and M5 single-round appends (Appendix A, pp. 9–10). The paper warns: "What the lease does not do is replace Phase 1." (Appendix A, p. 9). This separation lets Paxos agreement remain independent of lease state; the lease only controls when a proposer may use the fast path.

Verus form: Inference: expose a ghost `ready` predicate requiring a live lease and completed recovery; prove `RecoveryPrecedesAdmission`, `ReadyImpliesRecovered`, and `AppliedImpliesChosen` as state-machine invariants. Paxos acceptor code remains independent of lease clocks.

Evidence and limits: the abstract composition checks the lease/Paxos boundary and explicitly says Paxos agreement is enforced by construction in that abstraction (Appendix B.2, p. 10). Therefore it does not constitute a full Paxos proof; the underlying durable Paxos implementation remains trusted or separately verified.

## what is proved, trusted, and already done

Proved or checked: lease exclusivity, activation quorum, timer containment, quarantine participation, and composition admission invariants within finite TLC configurations; timing arithmetic in TLAPS; executable replay in Python (Sections 4–5, pp. 4–5; Appendix B, p. 10). Trusted: TLA+/TLC/TLAPS implementations, the model-to-code correspondence, clock-rate and message assumptions, and the abstract Paxos composition boundary. The paper also finds concrete bugs in the 2012 algorithm and historic implementations, including stale messages, scalar quorum counting, unsafe wall clocks, learner delivery assumptions, and unsigned-expiry races (Section 7 and Appendix D, pp. 7–14).

Inference: VL should reuse this pattern—executable transition model, invariant proof, mutation-based negative tests, and explicit timing assumptions—before attempting verified Rust. Reimplementing PaxosLease’s basic lease rules would duplicate work; the open product risk is refinement from the checked model to asynchronous Rust handlers, clocks, transports, and learner visibility. The threat to agent-written verified Rust is high when agents silently weaken timer start, identity counting, release matching, or restart-incarnation checks; it is lower when those rules are represented as proof obligations and mutation tests.

## techniques for the catalog

- executable state-machine specification — encode every protocol action, timer, crash, and message as a checked transition system
- timer-containment arithmetic — choose lease and quarantine durations from clock-drift inequalities and prove interval inclusion
- rule mutation counterexamples — weaken one guard at a time and require a safety trace
- quorum identity discipline — count distinct acceptor identities and preserve exact owner-and-ballot matching
- lease/Multi-Paxos composition — gate recovery and fast-path admission with a live lease while keeping Paxos state independent

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
