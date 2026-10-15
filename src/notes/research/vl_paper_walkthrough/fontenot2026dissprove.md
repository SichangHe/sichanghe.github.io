# DissProve: Automated Verification of Asynchronous Distributed Protocols with Affine Communication
(authored by agents unless marked 🧑)
Tag: `fontenot2026dissprove`, [paper](http://arxiv.org/abs/2606.24003v2)

## scope and claim

DissProve verifies safety of parametric actor systems with asynchronous message passing by searching backwards from a state that violates the safety property. The target class has affine communication: each process sends at most one message of a given type to each receiver, while the number of actors can be unbounded. The paper combines a symbolic abstraction for actor-local state, message buffers, and histories with three operations: goal-directed actor-location materialization, actor-causality reduction, and message-segment summarization. The authors prove soundness of the abstract steps and implement them in an OCaml tool for P programs.

The paper's abstract states: "We show how to use novel, goal-directed notions of materialization, causality, and summarization to verify safety properties of affine protocols with an unbounded number of actors in an automated manner." (abstract, p. 1). It checks reachability of a negated safety goal; a proof is the absence of a backwards path from that goal to an initial state. Inference: this is a safety refutation method, not a general liveness or functional-correctness verifier.

## technique 1: affine protocol model and backwards goals

What it is. An affine protocol restricts each actor to at most one send of a message type to each receiver. Communication rounds reach a quiescent point in which no further messages of that type are sent. The analysis starts with the negation of a consensus or mutual-exclusion property, represented as a symbolic error state, and computes predecessors. A discovered predecessor chain is an error trace; exhaustion or subsumption of all predecessors establishes safety.

Steps. (1) Encode handlers, fields, message sends, and an unbounded actor population in the P actor model. (2) Express the safety property in the supported prenex-universal form; negate it to obtain existential goal variables. (3) Build the initial abstract state from the negated property. (4) Repeatedly choose a symbolic state and apply backwards handler, store, receive, and send transitions. (5) Materialize actors or messages demanded by the goal. (6) Apply causality, entailment, and segment widening until either an initial state is reached (counterexample) or the work queue is empty (proof).

The paper reports: "DissProve verifies safety properties of these protocols by performing backwards abstract interpretation from a state over-approximating the negated property, and refuting the existence of a path that leads to a violation of safety." (section 6, p. 22). It assumes affine histories are realizable and models partial handler executions and asynchronous message loss. Properties outside the stated formula shape require extending the goal logic.

Verus form (inference). A Rust/Verus adaptation would model each actor as a state machine and queues as ghost sequences or maps. A safety violation becomes a `requires`-compatible bad-state predicate; proof functions would establish that each backward transition preserves over-approximation. Verus has no built-in backward abstract interpreter, so this technique would most naturally be an external generator producing proof obligations and ghost invariants. This mapping is an inference from the paper's semantics.

## technique 2: goal-directed actor-location materialization

What it is. An abstract actor may be an anonymous, unbounded blob. Materialization refines it into a named actor fixed at a control location when a predecessor step needs a concrete handler or field writer. Materialization can alias an already materialized actor at that location or create a fresh actor constrained by the symbolic state. This avoids eagerly enumerating every actor.

Steps. (1) Inspect the current error goal for a field, message, or control location that must have caused it. (2) If the relevant actor is abstract, add a materialization constraint assigning it a machine, handler, and program location. (3) If the constraint can alias an existing materialized actor, branch on that alias; otherwise create a fresh actor. (4) Continue symbolic execution backwards from the selected location. (5) Preserve affine-history realizability and separation constraints. The overview says materialization "committing to" a concrete location is used to witness the write that caused a goal field (section 2.2, pp. 5–6).

The abstraction uses separation logic for disjoint actor-local resources, linear logic for messages, and ordered logic for histories. The paper states: "This enables a goal-directed analysis to materialize new actors as needed to progress." (section 3.2, p. 14). Soundness lemmas establish subsumption and local soundness of backwards symbolic execution, mechanized in Lean (section 3.2, p. 14).

Verus form (inference). Use ghost maps from actor identifiers to actor state, with a ghost `Set` of materialized identifiers and invariants that disjoint actors own disjoint state. A materialization proof function can introduce a fresh identifier and constrain its control location; alias branches require equality lemmas. Verus's ownership and `Map`/`Set` specifications can encode the abstraction, but the unbounded search remains an external procedure.

Failure modes. Materializing every possible actor defeats finiteness. The method relies on the safety goal to select relevant locations and on affine constraints to bound repeated sends. Complex protocols can still create unbounded materialization; the paper addresses this with causal dependence and summarization.

## technique 3: actor-causality reduction

What it is. Ordinary backwards exploration branches over arbitrary handler interleavings. Causal reduction keeps only predecessor events that could have produced the current symbolic field, guard, or message. Store-constraint causality jumps to a handler assigning a needed field; network causality jumps to a send that could produce a needed message. The transition also maintains an `p_affine` constraint so every symbolic history remains realizable by an affine protocol.

Steps. (1) Identify the current obligation: a field value, a guard condition, or a message in the network. (2) For a field obligation, select a prior assignment that writes that field and move the actor location to that assignment. (3) For a message obligation, select a send of the required type and materialize its sender if needed. (4) Add the data, guard, and affine-history constraints induced by that event. (5) Discard predecessor interleavings with no causal connection. (6) Apply subsumption to merge states whose constraints are covered by another state.

The paper describes the purpose directly: "We introduce two key operations to ensure the termination of a backwards abstract interpretation using this symbolic abstraction: (a) actor-causality reduction to reduce the non-deterministic branching" (section 1, p. 3). Theorem 4.1 gives causal soundness: each causal step's concrete post-state has a concrete predecessor represented by the abstract pre-state (section 4, pp. 16–17).

Verus form (inference). A proof-oriented Rust encoding can expose per-field producer lemmas: each update records the predecessor event and proves that the event establishes the field relation. A ghost queue history and `forall` constraints can state affine uniqueness. The causal graph and predecessor selection would be generated outside Verus; Verus checks each selected transition and subsumption lemma.

Evidence. In the ablation study, disabling causal reduction left substantial queues and shallower histories; for example, Two-Phase Commit left 1,258 queued states at history length 6, and Atomic Broadcast left 1,451 at length 9 (Table 3, p. 24). The comparison uses the same explored-state cap as the primary run, so these are remaining queue counts, not total reachable states. Inference: this supports causal reduction as a state-space control, but does not isolate all other optimizations.

## technique 4: message-segment summarization

What it is. A repeated, data-dependent cycle in backwards execution is compressed into a message segment representing `k` messages of one type from a summary actor. The segment carries a symbolic length, constraints on message order and payload, and a proof obligation that its handler effect is summarized. Affinity bounds `k` by the number of possible senders and prevents one sender from contributing multiple messages of the same type to one receiver.

Steps. (1) Detect a cycle in the causally reduced transition system with the same materialized actor and control location. (2) Identify the repeated message handler and the fields whose values follow a recurrence. (3) Replace the cycle by a segment with symbolic length `k` and a summary sender actor. (4) Compute closed-form updates for fields and constraints over `k`. (5) Add lower and upper bounds on `k` from the safety goal and affine sender count. (6) Continue backwards over the segment and prove that every concrete sequence represented by it is covered. The paper says: "The analysis replaces the cycle with the segment Node c d n1.eVote^k1(), summarizing all the votes n1 receives from an abstract summary actor Node c." (section 2.5, p. 8).

Theorem 5.1 establishes message-segment soundness. The summarized trace need not match the exact preceding trace, but it must cover an equivalent class of message orderings permitted by asynchronous semantics (section 5.2, pp. 19–20). Segments are unnecessary for protocols without relevant counters; they are essential for cyclic protocols such as Bakery and Two-Phase Commit (section 6, p. 24).

Verus form (inference). Represent a segment as a ghost count and a recurrence invariant over a queue sequence. Prove a closed-form lemma by induction on `k`, then use the affine bound to relate `k` to the number of actors. A Verus `while` loop with an `invariant` can verify the concrete recurrence; the segment abstraction itself would be a proof lemma or generated summary, not a runtime optimization.

Limits. Not every cycle has a simple recurrence, and unbounded actor materialization can persist even with affine messages. Summarization requires a sound ordering/trace-equivalence argument; silently dropping interleavings would be unsound.

## technique 5: entailment and convergence control

DissProve checks whether a newly generated symbolic state is entailed by an existing state and prunes duplicates or infeasible states. Entailment cuts cycles that ordinary feasibility checks cannot remove. The ablation caps runs at 25,000 states; without entailment, most benchmarks fail to terminate, while Barrier Lock reaches 87 states and still does more work than the normal run (section 6, p. 24). Entailment is expensive: Table 2 reports 339,864 entailment queries and 8,910 feasibility queries for Two-Phase Commit, and 629,940 and 12,429 respectively for Atomic Broadcast (section 6, p. 23). These denominators are query counts over one benchmark run, not percentages of all states.

Verus form (inference). State subsumption can be encoded as implication lemmas between ghost predicates, but checking arbitrary entailment is outside ordinary Verus automation. A practical VL integration would precompute summaries or use an external SMT engine and import only proved lemmas.

## evidence, trust, and product threat

DissProve verifies seven protocols: One-Shot Election, Bakery, Dekker's Algorithm, Drinking Philosophers, Two-Phase Commit, Barrier Lock, and Atomic Broadcast. Table 1 gives 56–99 SLOC, 16–9,275 explored states, 4–8 materialized actors, and runtimes from 4 seconds to 1:12:46 on a 2.4 GHz i9 MacBook Pro with 64 GB RAM and 12 cores (section 6, pp. 22–23). Two-Phase Commit took 5,888 states and 1:08:46; Atomic Broadcast took 9,275 and 1:12:46. No user invariants were supplied. The paper reports: "To the best of our knowledge, this is the first time these two protocols have been verified in an asynchronous setting without the need for explicit inductive invariants." (section 1, p. 3).

The proofs trust the Lean-mechanized soundness theorems, the P parser and semantics, symbolic transfer rules, SMT queries, and the implementation of DissProve. The experiments do not establish scalability to arbitrary protocols: Single-Round Paxos and Raft are theoretically affine but did not finish after several hours (section 6, p. 24). Safety formulas are restricted to prenex-universal properties whose negation can be skolemized into actors and fields. Inference: agent-written verified Rust for distributed protocols faces a high threat from asynchronous interleavings, queue/history abstraction bugs, and unsound generated summaries; the paper's explicit affine condition and checked causal/segment soundness are useful design boundaries. VL should not redo a generic backward protocol verifier before determining whether its target systems satisfy affine communication and supported property shapes.

## techniques for the catalog

- affine backward safety verification: refute a negated safety goal by symbolic predecessor exploration
- actor-location materialization: instantiate only actors and locations demanded by the goal
- actor-causality reduction: retain predecessor events that can produce the current obligation
- message-segment summarization: compress cyclic message histories with affine-bounded symbolic lengths
- entailment pruning: subsume repeated symbolic states to force convergence
Checked 2026-10-15 against paper fontenot2026dissprove: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
