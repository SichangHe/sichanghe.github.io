# Machine-Checked Dual-Write Recovery from a Commit Log
(authored by agents unless marked 🧑)
Tag: `andreakis2026dualwrite`, [paper](https://www.semanticscholar.org/paper/5a0d0fadaad489fffb1120419c3e21b452e5246c)

## scope and result

The paper formalizes crash recovery when a process commits a fact in one authority and delivers a related effect to an independent sink without a shared transaction. It proves an impossibility result for recovery that reads only source-side state, then proves conditional positive results when recovery can read authoritative sink acceptance records and use admission fences. “The main result is an impossibility theorem for source-only recovery.” (Abstract, p. 1). All theorems are machine-checked in Isabelle/HOL, but the authors state: “We do not verify a broker, connector, mail provider, or deployed recovery implementation.” (Section 1, p. 2)

The model contains a committed source history, downstream history, queue and pending state, source acknowledgements, an append-only sink emissions ledger, and a generation counter. Its sink event is durable acceptance, not eventual user-visible delivery. “The sink’s acceptance boundary” is the moment modeled as the receiving authority durably admitting the operation (Section 2, p. 3). Inference: a Verus proof of a relay must state whether its postcondition means API acceptance, downstream transit, or user-visible effect; these are different claims.

## technique 1: model recovery as observations and construct indistinguishable states

What it is. A recovery policy factors through an observation of state. If two reachable post-crash states have equal observations but different sink acceptance histories, the policy must choose the same resend batch in both. The authors construct states with equal source core and generation but different emissions ledgers (Theorem 1, Section 3, pp. 4–5).

How to do it. (1) Define a source history `H` with stable coordinates and a sink acceptance ledger `E`. (2) Define hazards: premature effects, duplicate effects, and lost deliveries. (3) Construct two reachable states with identical source-side fields and different `E`. (4) Quantify over every observation function and every policy that factors through it. (5) Show that a common batch either duplicates a previously accepted payload or leaves the missing payload undelivered. The paper’s theorem says the two repaired stores can both be clean while one outcome remains unsafe or incomplete (Theorem 1, p. 5).

The fixed-protocol version adds a durable cursor and models a deliver-then-checkpoint sequence. “A crash before delivery and a crash after delivery but before checkpointing leave recovery with the same durable-local view and different sink records.” (Section 4, p. 6). Theorem 3 applies this to a deterministic protocol whose only nondeterminism is crash timing (Section 4, p. 7).

Verus form. Inference: represent the relay state as a Rust struct and define a `spec fn` observation projection that omits sink acceptance. Define two `spec fn` predicates for `unsafe` and `lost`, then prove a lemma that equal observations force equal policy output. Use `requires`/`ensures` on each transition and a proof function for the indistinguishable-pair construction. Inference: this is a specification-level impossibility proof, so Verus can check it if the transition system and reachability relation are encoded; it does not need to execute network calls.

Evidence and limits. The theorem is quantified over the modeled policy classes and reachable machines, not all implementations. The paper explicitly says: “They show that the stated failure is reachable and that every policy in the class fails on the construction, without claiming that every deployed system fails.” (Section 1, p. 2). Inference: a product may escape the bound only by exposing new sink evidence or changing acceptance controls, not by making a source cursor more carefully maintained.

## technique 2: compute the sink delta from authoritative acceptance

What it is. If recovery can read a complete, current, sink-owned acceptance record, it computes the missing batch as committed obligations absent from that record. The paper defines the sink delta as `Δ⟨f⟩(t) = [p in replay(H,K,f) | p not in pay(E(t))]` (Section 5, p. 8).

How to do it. (1) Define a committed frontier `f` and a scoped replay of source events. (2) Read the sink’s authoritative accepted-record `E`, not merely current materialized contents. (3) Subtract accepted payloads from the source replay set. (4) Re-drive exactly that delta. (5) Require strictly increasing source coordinates per event (condition P4), complete and current acceptance records, and a sink read that is strong enough not to hide recent acceptance. Theorem 4 proves the resulting policy can achieve exactly-once at the judged frontier under its stated conditions (Section 5, pp. 8–9).

Verus form. Inference: define `spec fn replay` and `spec fn delta`; prove that `delta` contains every committed operation missing from the accepted set and no accepted operation. Use a ghost set or sequence for accepted stable identifiers. The sink query and its freshness guarantee must be modeled as a trusted contract or separately verified adapter. `ensures` should state frontier-relative exactness, not an unqualified exactly-once claim.

Evidence and limits. The paper says, “The positive results hold under conditions stated with each theorem.” (Section 1, p. 2). Current key-value state is insufficient when intermediate updates are overwritten; per-operation acceptance history is required (Section 12, p. 19). Inference: a Verus proof over an outbox table alone cannot establish acceptance at an external API unless the API supplies a durable, queryable record.

## technique 3: arrival fencing for in-flight stragglers

What it is. A request sent before a crash may still be in flight when recovery reads the sink. The arrival fence changes what the sink accepts: recovery atomically applies the missing delta and raises a generation threshold so old requests are rejected. “The fenced re-drive at 𝑓 is one atomic act: heal the store, compute Δ from the accepted record, land the batch in the sent ledger and synchronously in 𝐴.” (Section 6, p. 9)

How to do it. (1) Stamp every send with a producer generation. (2) On recovery, atomically read the accepted record, apply the delta, and set the sink fence to `crashed_generation + 1`. (3) Admit an arriving event only if its generation clears the fence. (4) Ensure the recovery’s own sends use the allowed generation. (5) Test a schedule where an old request arrives after the recovery read. Theorem 6 proves exactly-once acceptance at the recovery frontier under conditions Q1–Q4 (Section 6, pp. 10–11).

Verus form. Inference: represent the fence as ghost state in a Verus transition system. A sink `accept` operation should require `generation >= fence` and ensure that accepted IDs are unique. A recovery proof must show the delta and fence update are one atomic transition; if the real API cannot provide that atomicity, the theorem’s precondition is false. The paper’s Corollary 6.1 also proves a cost: fencing can reject delayed work needed at a later frontier (Section 6, p. 10).

## technique 4: claim fencing for concurrent recoverers

What it is. Two recovery workers can both read the same missing event and fire it. A claim fence serializes authority at the sink. “An atomic claim by generation g requires φ ≤ g, so claims never lower the fence.” (Section 7, p. 12). The claim sets the fence and arms a batch from the acceptance record read under that claim; a later fire succeeds only if the worker remains authorized.

How to do it. (1) Give each worker a generation. (2) Atomically claim by raising the sink fence and reading acceptance. (3) Prepare a duplicate-free batch under the claim. (4) Repair the source-side store. (5) Fire only if the sink still accepts that generation. (6) Require no source commit in the recovery range between claim and fire (window freshness C3), and require the fire to land at the fence (C4). Lemma 7.1 proves claim-fence safety; Theorem 8 proves completed-claim exactness under C1–C4 (Section 7, pp. 11–13).

Verus form. Inference: encode the claim transition as a state-machine transition that updates a monotonic fence and stores the claimed batch. Use an invariant that no two authorized generations can fire the same stable source coordinate. Prove that a fire after a superseding claim is rejected. Inference: Rust mutexes or leases alone are insufficient if an old worker can still issue an external request; the admission check must be enforced at the sink.

## technique 5: prove evidence-lifetime and retention limits

What it is. Exactly-once coverage depends on how long deduplication and source history retain evidence. Theorem 9 gives an identity for an ideal permanent-memory deduplicated sink: each replay obligation appears exactly once if and only if delivery is at least once (Section 8, p. 13). With bounded deduplication or truncated source history, replay can become a new effect or become unidentifiable; Theorem 10 states the truncation dilemma (Section 8, pp. 13–14).

How to do it. (1) Specify a retention floor and the source journal prefix still available. (2) Define deduplicated view as payloads with repeated identities removed. (3) Prove coverage relative to retained history. (4) Add a condition that expired source events were already accepted before truncation. (5) Keep stable event identities for the entire recovery horizon. Corollary 7.1 states journal-grade exactness when the journal equals the committed source history and retention drops only accepted obligations (Section 7, p. 13).

Verus form. Inference: make retention a parameter in the specification and expose the horizon in the API contract. Use a ghost map from stable coordinates to acceptance state; a cleanup function requires a proof that every removed obligation is already accepted. Verus cannot prove an external sink retained records unless that retention contract is modeled and checked.

## proof boundary and consequences for VL

The paper proves source-only impossibility, sink-delta recovery, arrival and claim fences, permanent-dedup coverage, and retention boundaries in Isabelle/HOL. It does not verify external brokers, connectors, mail providers, deployed relays, network transit, or application semantics. The source model assumes a durable ordered append-only history; strict coordinate monotonicity is required for per-instance counting. The paper’s practical guide classifies sinks as blind/write-only, queryable, or deduplicating/fenced (Section 12, pp. 19–21).

Already done that VL should not redo: indistinguishable-state arguments, frontier-relative delivery definitions, sink-delta recovery, generation fencing, concurrent-claim fencing, and retention-relative exactness are fully formalized here. Inference: VL should reuse these proof patterns for Rust relays and focus on verified adapters, stable IDs, and explicit acceptance boundaries. Inference: threat to agent-written verified Rust is high when agents call external APIs without a durable acceptance contract, or when “exactly once” is asserted without a frontier and retention horizon. It is lower when Verus checks the transition system and the sink enforces the proved fence atomically.

## techniques for the catalog

- indistinguishable-state impossibility: construct equal-observation crash states with different sink acceptance and quantify over all source-only policies
- sink-delta recovery: subtract authoritative sink acceptance from committed replay obligations at a stated frontier
- arrival fencing: atomically apply recovery and raise a generation threshold to reject in-flight stale requests
- claim fencing: atomically claim a recovery generation, prepare its batch, and reject fires after a newer claim
- evidence-lifetime proof: relate deduplication and source-history retention to the horizon for which exactness is claimed

Checked 2026-10-15 against the paper by a Codex agent for machine_checked_dual_write_recovery_from_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
