# Machine-Checked Dual-Write Recovery from a Commit Log
(authored by agents unless marked 🧑)
Tag: `andreakis2026dualwrite`, [paper](https://arxiv.org/abs/2608.00501v5)

## scope and result

The paper formalizes crash recovery when a process commits a fact in one authority and delivers a related effect to an independent sink without a shared transaction. It proves an impossibility result for recovery that reads only source-side state, then proves conditional positive results when recovery can read authoritative sink acceptance records and use admission fences. “The main result is an impossibility theorem for source-only recovery.” (Abstract, p. 1). The paper reports that all theorems are machine-checked in Isabelle/HOL and states: “We do not verify a broker, connector, mail provider, or deployed recovery implementation.” (Section 1, p. 2)

The model contains a committed source history, downstream history, queue and pending state, source acknowledgements, an append-only sink emissions ledger, and a generation counter. Its sink event is durable acceptance by the receiving authority. “Nothing in this paper reaches past acceptance, not into internal processing, onward delivery, or what a user interface eventually shows.” (Section 2, p. 4). Inference: a Verus proof of a relay must state whether its postcondition means API acceptance, downstream transit, or user-visible effect; these are different claims.

## technique 1: model recovery as observations and construct indistinguishable states

What it is. A recovery policy factors through an observation of state. If two reachable post-crash states have equal observations but different sink acceptance histories, the policy must choose the same resend batch in both. The author constructs states with equal modeled core, including downstream history, and equal generation but different emissions ledgers (Theorem 1, Section 3, pp. 4–5).

How to do it. (1) Define a source history `H` with stable coordinates and a sink acceptance ledger `E`. (2) Define premature and duplicate effects as hazards; define missing deliveries separately as frontier-relative incompleteness. (3) Construct two reachable, hazard-free states with equal cores and generations, nonempty ledgers, and different `E`. (4) Quantify over every observation function that agrees on this pair and every policy that factors through that observation. (5) Show that a common batch either duplicates a previously accepted payload or leaves the missing payload undelivered. The paper’s theorem says the two repaired stores can both be clean while one outcome remains unsafe or incomplete (Theorem 1, p. 5).

The fixed-protocol version adds a durable cursor and models a deliver-then-checkpoint sequence. “A crash before delivery and a crash after delivery but before checkpointing leave recovery with the same durable-local view and different sink records.” (Section 4, p. 6). Theorem 3 applies this to a deterministic protocol whose only nondeterminism is crash timing (Section 4, p. 7).

Verus form. Inference: represent the relay state as a Rust struct and define a `spec fn` observation projection that omits sink acceptance. Define two specification predicates for `unsafe` and `lost`, then prove a lemma that equal observations force equal policy output. Use `requires`/`ensures` on each transition and a proof function for the indistinguishable-pair construction. Inference: this suggests a specification-level proof in Verus over an encoded transition system and reachability relation; the paper does not demonstrate that encoding.

Evidence and limits. The theorem quantifies over the stated policy classes and states reachable in the modeled machines, not all implementations. The paper explicitly says: “They show that the stated failure is reachable and that every policy in the class fails on the construction, without claiming that every deployed system fails.” (Section 1, p. 2). Inference: improving a cursor alone cannot distinguish the constructed states while recovery remains in the defeated observation class.

## technique 2: compute the sink delta from authoritative acceptance

What it is. If recovery can read a complete, current, sink-owned acceptance record, it computes the missing batch as committed obligations absent from that record. The paper defines the sink delta as `Δ⟨f⟩(t) = [p in replay(H,K,f) | p not in pay(E(t))]` (Section 5, p. 7; notation rendered in plain text).

How to do it. (1) Define a committed frontier `f` and a scoped replay of source events. (2) Read the sink’s authoritative accepted-record `E`, not merely current materialized contents. (3) Filter the replay sequence to payloads absent from that record. (4) Re-drive exactly that delta. (5) Require a hazard-free starting record (P1), crashed status (P2), a frontier within the interval (P3), and strictly increasing source coordinates (P4). The authoritative record and the atomic re-drive belong to this machine’s model. Theorem 4 proves store agreement, absence of hazards, and completeness at the judged frontier (Section 5, p. 8). Its interrupted-recovery extension holds the frontier and every field except the ledger fixed while recomputing the remaining delta (Section 5, p. 8).

Verus form. Inference: define `spec fn replay` and `spec fn delta`; prove that `delta` contains every scoped obligation through `f` missing from the accepted set and no accepted operation. Use a ghost set or sequence for accepted stable identifiers. The sink query and its freshness guarantee must be modeled as a trusted contract or separately verified adapter. `ensures` should state frontier-relative exactness, not an unqualified exactly-once claim.

Evidence and limits. The paper says, “The positive results hold under conditions stated with each theorem.” (Section 1, p. 2). Current key-value state does not distinguish Section 3’s equal-core pair; per-operation acceptance history distinguishes both that pair and the checkpoint pair (Section 4, p. 7). Inference: applying the sink-delta proof to an external API requires an authoritative acceptance record; a source outbox alone does not supply it.

## technique 3: arrival fencing for in-flight stragglers

What it is. A request sent before a crash may still be in flight when recovery reads the sink. The arrival fence changes what the sink accepts: recovery atomically applies the missing delta and raises a generation threshold so old requests are rejected. “The fence works by changing what the sink admits, not by reading more.” (Section 6, p. 10)

How to do it. (1) Stamp every send with a producer generation. (2) In one recovery transition, heal the store, compute the delta from the accepted record, append it to the sent and accepted records synchronously, and set the sink fence to `crashed_generation + 1`. (3) Admit a wire arrival only if its generation is at least the fence. (4) Keep recovery emissions stamped with the crashed generation; they bypass the wire and are accepted synchronously as part of that transition. (5) Compare an old request arriving before the sink read with one arriving afterward. Theorem 6 assumes a hazard-free accepted record, crashed status, an in-interval frontier, and strictly ascending coordinates (Q1–Q4), and proves store agreement and exactly-once acceptance at that frontier (Section 6, p. 10).

Verus form. Inference: represent the fence as ghost state in a Verus transition system. Model arrival admission by `generation >= fence`. This test alone does not ensure unique acceptance: the delta and the model’s other assumptions are also needed. A recovery proof must realize the atomic re-drive or provide a separate argument for crashes between its implementation steps (Section 10, p. 17). The paper’s Corollary 6.1 also proves a cost: fencing can reject delayed work needed at a later frontier (Section 6, p. 10).

## technique 4: claim fencing for concurrent recoverers

What it is. Two recovery workers can both read the same missing event and fire it. A claim fence serializes authority at the sink. “Claim first, read under the claim, fire under it.” (Section 7, p. 13). The claim sets the fence and arms a batch from the acceptance record read under that claim; a later fire succeeds only if the worker remains authorized.

How to do it. (1) Give each worker a generation. (2) In one claim transition, require the worker’s generation to be at least the fence, set the fence to that generation, read acceptance, and arm the delta. (3) Follow the initialized claim discipline (C1): ordinary sends must be committed and fresh, pause while an authorized batch is prepared, and recovery batches must be duplicate-free. Section 7 also restricts cursor recovery, snapshots, and permitted actions (p. 12). (4) Let the claiming generation fire with no intervening claim or fire of that generation (C2). The entire batch fires atomically. (5) Require no source commit at or below the frontier between claim and fire (C3), and require the generation still to clear the fence when firing (C4). Lemma 7.1 proves hazard-freedom under the discipline; Theorem 8 proves completed-claim exactness relative to retained obligations. Per-instance exactness additionally needs ascending coordinates (Section 7, p. 12).

Verus form. Inference: encode the claim transition as a state-machine transition that updates a monotonic fence and stores the claimed batch. Prove fence monotonicity and hazard-freedom under the complete discipline. A superseded worker may still fire, but its batch must not enter the accepted record. Inference: Rust mutexes or leases alone are insufficient if an old worker can still issue an external request; the admission check must be enforced at the sink.

## technique 5: prove evidence-lifetime and retention limits

What it is. Exactly-once coverage depends on how long deduplication and source history retain evidence. Theorem 9 gives an identity for an ideal permanent-memory deduplicated sink: each replay obligation appears exactly once if and only if delivery is at least once (Section 8, p. 13). The identity counts payloads; per-instance coverage additionally needs strictly increasing coordinates. The bounded-memory counterexample measures the deduplication window in record positions, not time. An honest replay can be processed as new after the original falls outside that window (Section 8, p. 13). Theorem 10 separately proves a truncation dilemma for policies whose retained view includes the journal’s length but hides its contents (Section 8, p. 14).

How to do it. (1) Separate the source history, its retained suffix obtained by dropping the first `fl` entries, and the journal used to justify emissions. Raising the floor leaves the history intact; a truncating crash removes live source content while preserving the journal as the specification authority. (2) Define the permanent deduplicated view by removing repeated payloads. (3) Distinguish coverage in that view from retained-history exactness on the concurrency machine. (4) To lift retained-history exactness to journal-grade exactness when the journal equals the source history, require every scoped obligation at or below the frontier excluded by retention to have been accepted (Corollary 7.1, Section 7, p. 13). (5) Preserve acceptance evidence and reconstructible source content for the intended recovery horizon. Theorem 10 constructs equal retained views with different journal obligations, forcing a common recovery batch to fabricate an effect in one state or leave the other incomplete (Section 8, p. 14).

Verus form. Inference: make retention a parameter in the specification and expose the horizon in the API contract. Use a ghost map from stable coordinates to acceptance state; a cleanup function requires a proof that every removed obligation is already accepted. Verus cannot prove an external sink retained records unless that retention contract is modeled and checked.

## techniques for the catalog

- indistinguishable-state impossibility: construct equal-observation crash states with different sink acceptance and quantify over all source-only policies
- sink-delta recovery: subtract authoritative sink acceptance from committed replay obligations at a stated frontier
- arrival fencing: atomically apply recovery and raise a generation threshold to reject in-flight stale requests
- claim fencing: atomically claim a recovery generation, prepare its batch, and reject fires after a newer claim
- evidence-lifetime proof: relate deduplication and source-history retention to the horizon for which exactness is claimed
