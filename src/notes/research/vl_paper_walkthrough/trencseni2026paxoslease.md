# PaxosLease Revisited: A Checked Model of Diskless Distributed Leases
(authored by agents unless marked 🧑)
Tag: `trencseni2026paxoslease`, [paper](https://arxiv.org/abs/2609.14640v2)

## scope and contribution

The paper gives a machine-checked specification of PaxosLease, a time-bounded exclusive lease protocol whose acceptors keep no durable lease state. It checks the lease protocol and its Multi-Paxos leader use, changes three acceptor rules in the 2012 description, two required for safety and one allowing shorter restart quarantines, and audits Keyspace and ScalienDB implementations. The abstract states: "PaxosLease is a protocol by which a quorum of acceptors grants time-bounded exclusive ownership with no durable acceptor lease state and no disk write on the lease acquisition path." (Abstract, p. 1). The work combines TLA+ model checking with TLC, timing proofs in TLAPS, and an executable Python model (Abstract, p. 1).

The system model has non-Byzantine processes that may crash and restart, delayed, reordered, duplicated, or lost messages, volatile acceptor state, and a durable proposer restart counter. Clocks need not be synchronized; each clock rate lies in 1 ± ρ of real time (Section 3.1, p. 2). A quorum is a majority, and any two quorums intersect. A lease instance is an owner incarnation plus globally unique ballot, so a proposer restart is a new owner (Sections 3.1–3.2, pp. 2–3).

## technique: specify the protocol as executable state machines

What it is: specify proposer and acceptor transitions, messages, deadlines, and crash state in a normative TLA+ module. Learner deadlines and clock discipline are outside the base transition system (Table 3, p. 14). The paper says, "The TLA+ module, not this prose, is the normative statement of the PaxosLease algorithm." (Section 3, p. 2).

Inference: use this when timing, retries, stale messages, and crashes interact so that an informal invariant argument can miss an execution.

How to apply it:

1. Define finite proposer and acceptor sets, majority quorums, and message delivery actions (Section 3.1, p. 2). The model uses a common real-time variable; local timer durations are conservatively translated using the clock-rate bounds, rather than comparing clocks across processes (Appendix B, p. 9).
2. Model proposer attempts with a fresh ballot, pending deadline, responder identity set, active deadline, and quorum certificate (Section 3.2, p. 2). The executable models store a renewal base; TLA+ instead compares the reported ballot with the active ballot, equivalent under its transitions (Appendix B, p. 9).
3. Model acceptors with a promised ballot and accepted lease plus local exclusion deadline; lose both on crash (Sections 3.1–3.2, pp. 2–3).
4. Encode numbered transitions P1–P6 and A1–A4: prepare, promise, accept, activation, abandonment/retry, exact-instance release, and restart quarantine (Sections 3.4–3.5, pp. 3–4).
5. Specify learner visibility separately: the owner installs an absolute expiry; remote learners subtract an assumed delivery bound from the remaining duration. Their view is only a hint and may be stale (Section 3.6, p. 4). Learner deadlines are audited, not modeled in the base module (Table 3, p. 14).

Verus form: Inference: represent protocol state as Rust structs and ghost state, use `spec fn` predicates for well-formedness and lease validity, and prove transition postconditions with `requires`/`ensures`. Use `proof fn` lemmas for quorum intersection and timer containment; keep message delivery as explicit state transitions. Keep bounded exploration in a separate test harness. This is a proposed adaptation, not a Verus result reported by the paper.

Evidence: TLC checks the main invariant and supporting invariants over finite configurations; the paper reports more than five billion distinct states across the recorded runs and more than thirty billion generated states; each of the three largest completed runs exceeds two billion distinct states (Section 5, p. 5). A Python reference model encodes the same rules independently and replays witnesses (Section 5, p. 5).

Limits: the exhaustive checks are bounded to at most two proposers, three acceptors, three ballots, one restart per proposer, a time horizon of at most three units, and one duration triple per configuration (Section 5, p. 5). Every configuration also caps in-flight messages. The large Retry, Renew+Retry, and repaired stale-owner runs carry fingerprint-collision qualifications; a passing run does not establish arbitrary-size correctness (Table 2, p. 14; Appendix E, p. 15). The paper explicitly says the safety argument is not a liveness proof: "Liveness requires eventual message delivery, sufficiently accurate timers, and a period during which a quorum of acceptors stays available; as in Paxos, two proposers can starve one another with ever higher ballots, which implementations prevent with randomized backoff [1]." (Section 4, p. 5). Inference: a Verus proof of an unbounded implementation still needs assumptions about clocks, transport, and fairness.

## technique: derive and prove timer containment bounds

What it is: relate proposer authority, acceptor exclusion, and restart quarantine by worst-case clock drift. The proposer deadline starts when Prepare is broadcast (T1). The acceptor exclusion duration must satisfy `DP·(1+ρ) ≤ DA·(1−ρ)` (T2), and restart quarantine must satisfy `DP·(1+ρ) ≤ DQ·(1−ρ)` (T3) (Section 3.7, p. 4).

Inference: use this whenever one component’s local timer protects another component’s real-time safety interval.

How to apply it:

1. Start the proposer attempt timer when Prepare is broadcast and check the stored deadline before sending Accept and activating. With A2’s refusal rule, starting no later than the first acceptance suffices; overwriting acceptors require the earlier Prepare-time rule (T1, p. 4).
2. Choose `DA` from the drift inequality and prove the real-time containment lemma (T2 and Appendix B.3, pp. 4, 10).
3. Choose `DQ` from the analogous inequality so a restarted acceptor cannot vote while forgotten state could still matter (T3 and Appendix B.3, pp. 4, 10).
4. With equal clock rates, check the boundary at `(DP, DA, DQ) = (1, 2, 1)` and `(2, 3, 2)`, and one unit below it at `(1, 2, 0)` and `(2, 3, 1)`. The boundary checks pass; the lower values yield 25- and 26-state two-owner traces (Section 4, p. 5; Table 2, p. 14).

Verus form: Inference: encode durations and rates as integer or rational ghost values, state the inequalities as `requires`, and use a `proof fn` lemma to convert local-clock bounds into real-time interval inclusion. The implementation should use monotonic elapsed-time sources; wall-clock behavior is an environmental assumption to state explicitly.

Evidence: TLAPS proves `TimerContainmentArithmetic` and `QuarantineCoversForgottenFacts` (Appendix B.3, p. 10). TLC finds that quarantine equal to the proposer duration passes and one unit below fails in two-acceptor configurations (Section 4, p. 5; Table 2, p. 14).

Limits: the paper’s arithmetic proof assumes the stated clock-rate bound. It does not prove that a deployed clock source obeys that bound; the implementation audit finds unsafe wall-clock use (Appendix D.7, p. 13).

## technique: mutate one rule to obtain counterexamples

What it is: generate full specification variants, each weakening exactly one rule, and require TLC to find a safety violation. Inference: the expected violations provide regression tests for protocol rules.

How to apply it:

1. Copy the checked specification and weaken one transition or guard (Section 5, p. 5).
2. Run TLC against `LeaseExclusivity`, the invariant that at most one proposer is active (Appendix B.1, p. 9).
3. Record the minimum-depth trace from breadth-first search and map it back to the weakened rule (Table 2 caption, p. 14).
4. Compare weakened and repaired rules under the same search. Distinguish exhausted searches from stopped runs; the undirected renewal/crash and release/crash runs stopped without violations and were not exhaustive (Table 2, p. 14).

The paper reports five variants: late timer (27 states), owner-only release (36), scalar quorum counting (18), stale-owner-open (36), and proposer-only owner comparison (43) (Table 1, p. 6). For example, the paper states: "Matching on the owner o alone leads to a safety violation (Table 1, 36-state trace)." (Section 3.5, p. 4). LateTimer and StaleOwnerOpen use overwriting acceptors; both pass with A2’s refusal rule (Table 1, p. 6).

Verus form: Inference: implement each transition as a Rust function with a proof-level invariant and create negative test modules that intentionally omit one guard. Prove that repaired transitions preserve the invariant and pair those proofs with bounded model traces or executable tests.

Limits: counterexample searches use finite bounds. Appendix E explains that a found violating trace remains legal in the unbounded model (p. 15). Inference: a passing finite model does not prove implementation refinement.

## technique: compose the lease with Multi-Paxos through a one-way interface

Appendix A specifies M1 AcquireLease, M2 log-wide Phase 1, M3 repair of constrained slots, M4 readiness, and M5 single-round appends (p. 9). M3 selects each slot’s highest-ballot reported value, re-proposes it, and learns the result. The TLA+ composition abstracts M3 and assumes lease exclusivity in AcquireLease; the Python composition runs the lease protocol and repair rounds (Appendix A, p. 9; Appendix E, p. 15). The paper warns: "What the lease does not do is replace Phase 1." (Appendix A, p. 9). This separation lets Paxos agreement remain independent of lease state; the lease controls when a proposer may run recovery and use the fast path (Appendix A, p. 9).

Verus form: Inference: expose a ghost `ready` predicate requiring a live lease and completed recovery; prove `RecoveryPrecedesAdmission`, `ReadyImpliesRecovered`, and `AppliedImpliesChosen` as state-machine invariants. Paxos acceptor code remains independent of lease clocks.

Evidence and limits: the abstract composition checks the lease/Paxos boundary and explicitly says Paxos agreement is enforced by construction in that abstraction (Appendix B.2, p. 10). Inference: it does not constitute a full Paxos proof; a deployed durable Paxos implementation needs separate justification.

## what is proved, trusted, and already done

Proved or checked: lease exclusivity, activation quorum, timer containment, quarantine participation, and composition admission invariants within finite TLC configurations; timing arithmetic in TLAPS; executable replay in Python (Sections 4–5, pp. 4–5; Appendix B, pp. 9–10). Inference: the study treats the following as trusted: TLA+/TLC/TLAPS implementations, the model-to-code correspondence, clock-rate and message assumptions, and the abstract Paxos composition boundary. The paper finds algorithmic failures and implementation risks involving stale messages, scalar quorum counting, unsafe wall clocks, learner delivery assumptions, and unsigned-expiry races (Section 7, pp. 6–7; Appendix D, pp. 11–13). The audit did not run these executions against the shipped binaries (Section 9, p. 7).

## techniques for the catalog

- executable state-machine specification — encode proposer and acceptor actions, timers, crashes, and messages as a checked transition system
- timer-containment arithmetic — choose lease and quarantine durations from clock-drift inequalities and prove interval inclusion
- rule mutation counterexamples — weaken one guard at a time and require a safety trace
- quorum identity discipline — count distinct acceptor identities and preserve exact owner-and-ballot matching
- lease/Multi-Paxos composition — control recovery and fast-path admission with a live lease while keeping Paxos state independent
