# Formal verification and validation of run-to-completion style state charts using Event-B
(authored by agents unless marked 🧑)
Tag: `morris2022formal`, [paper](https://doi.org/10.1007/s11334-021-00416-4)

This paper adds refinement and formal verification to SCXML-style reactive state charts with run-to-completion semantics. It translates an abstract run-to-completion basis and successive state-chart refinements into UML-B/Event-B. Safety is proved as Event-B invariant preservation. Responsiveness and termination are proved with deadlock-freedom, fairness, convergence, and lexicographic variants. Scenario Checker animation validates that the model’s reactions are useful to a domain expert.

## event-b basis for run to completion

What it is. SCXML consumes one external trigger, fires all enabled triggered transitions in a batch, fires enabled untriggered transitions, and repeats until no transition is enabled. Event-B normally selects enabled events asynchronously, so the authors create a basis machine with internal queue `iQ`, external queue `eQ`, dequeued trigger `dt`, and completion flag `uc`. The paper describes the aim: “The run-to-completion semantics is specified via an abstract basis that is extended by the model.” (§4, p. 526).

When to use it. Use this translation when a controller is designed as a run-to-completion state chart but needs Event-B refinement and proof obligations. The basis is reusable across input models; the state chart contributes later refinements.

How to apply it.

1. Create a context containing all possible triggers, partitions for internal and external triggers, sequence operations (`append`, `concat`, `head`, `tail`, `content`), and queue types (Listing 2, p. 528).
2. Create a machine with variables `iQ`, `eQ`, `uc`, and `dt`; initialize both queues and `dt` to empty and `uc` to false (Listing 3, p. 528).
3. Add events for raising external triggers, dequeuing internal triggers, dequeuing external triggers only when `iQ` is empty, firing all trigger-enabled transition combinations, discarding a trigger when no triggered transition is enabled, adding untriggered transitions, and marking the run complete when no untriggered transition remains (Listing 3, pp. 528–529).
4. Preserve batch semantics by generating an event for each possible subset of parallel transitions enabled by the same trigger. Strengthen guards as later refinements eliminate combinations (§4, pp. 526–527).
5. Finalise a transition when its behavior must no longer be bypassed: strengthen completion-event guards with the negation of every relevant transition guard (§4, pp. 527–528).

Verus form. Inference: model `iQ`, `eQ`, `dt`, and `uc` as an executable Rust state struct, with `spec fn` predicates for queue well-formedness and “run complete.” Each event becomes a function with `requires` for its guard and `ensures` for its state update. A loop `invariant` preserves queue ordering and the one-dequeued-trigger property. Verus does not have Event-B’s automatic refinement proof obligations, so a separate `proof fn` must show that each concrete event simulates its abstract event and that a new event refines `skip`.

Evidence and assumptions. The paper’s abstract basis is a formal model, not an implementation benchmark. It assumes the generated UML-B/Event-B semantics correctly represents SCXML. Later tool translation and model checking provide additional evidence, but future work still includes formalizing the extended SCXML semantics (§11, p. 540).

## state-chart refinement rules

What it is. The authors define three refinement rules that preserve safety because refinement restricts traces. Rule A strengthens transition guards or moves a transition into a nested state. Rule B adds actions that do not modify abstract variables. Rule C embeds a state chart within a state, including hierarchical or parallel composition (§5, pp. 528–529). The paper states: “Rule A: Guard conditions on a transition can be strengthened (but not weakened).” (§5, p. 528).

How to apply it.

1. Start with a small abstract state chart containing only behavior that is already understood.
2. Add a nested state or textual guard only by strengthening an existing guard (Rule A).
3. Add concrete variables and actions while leaving abstract variables unchanged (Rule B).
4. Add nested or parallel state charts (Rule C).
5. Translate each level to a UML-B state machine and Event-B refinement; discharge the ordinary Event-B guard-strengthening, simulation, and invariant proof obligations (§5, p. 529).
6. Mark a reaction finalised at the level where it becomes mandatory, so later abstractions cannot complete early and bypass it (§4, pp. 527–528).

Verus form. Inference: retain an abstract Rust state type and define a concrete state with a ghost refinement relation. A concrete transition `fn` gets `requires` strong enough to imply the abstract guard and an `ensures` clause establishing the relation after the step. Added fields can be ghost or executable; a proof function checks that the abstract projection is unchanged when Rule B requires it. Rule C maps to nested transition functions, but Verus has no refinement keyword, so the relation is explicit.

Evidence. The drone example is refined through several levels: basic flight and shutdown, battery monitoring, takeoff details, and cancellation behavior (§6, pp. 529–532). Safety properties are placed at the earliest level where they are simple and are preserved by later refinements (§9, pp. 534–536). Inference: this staged placement reduces proof effort because a property is proved against the smallest model that determines it.

## invariant proofs for safety

What it is. Event-B invariants are predicates over reachable machine states. The authors encode controller requirements such as `TAKEOFF = TRUE ⇒ BATTERYOK = TRUE ∨ toLand` and prove them by invariant preservation. The translation generates events for each state-machine transition and queue operation; Rodin provers discharge the resulting obligations. The paper reports: “All of the proof obligations are automatically discharged for our example.” (§9, p. 534).

How to apply it.

1. Express the requirement as an invariant over state variables, queues, and trigger sets.
2. Add it at the refinement level where its antecedent and relevant state are present (§9, pp. 534–535).
3. Check initialization and preservation for every generated event.
4. If a transition could break the invariant, either strengthen its guard or add the required state/trigger action; do not weaken the invariant.
5. Preserve the invariant through later refinements using Event-B’s refinement obligations.

Verus form. Inference: write the requirement as a `spec fn` over a Rust state and put it in the loop or transition `invariant`. Each event’s `ensures` establishes the predicate in the post-state. Rust control flow does not automatically generate the exhaustive event cases that Rodin does, so the proof must cover each `match` arm or transition function explicitly.

Failure and assumptions. The invariant proves only the stated safety predicate. The conclusion section warns that “These verifications do not validate that the model behaviour is useful.” (§11, p. 540). The model also depends on translation correctness and the chosen abstraction.

## liveness through fairness and variants

What it is. Safety does not guarantee that an external trigger is eventually consumed. The paper assumes all internal events are strongly fair and `dequeueExternalTriggered` is weakly fair (Assumption 1, p. 537). It proves internal relative deadlock-freedom, convergence of internal events, and eventual dequeue of every raised external trigger. The key statement is: “Theorem 3 (Responsiveness to External Triggers) If an external trigger is raised, then eventually, it will be de-queued.” (§10.1, p. 537).

How to apply it.

1. Classify events as external, future system, dequeue-trigger, triggered, discard-trigger, or untriggered (§10, p. 536).
2. Prove relative deadlock-freedom: whenever `iQ ≠ ∅ ∨ uc = FALSE ∨ dt ≠ ∅`, at least one internal event is enabled (Theorem 1, p. 536).
3. State fairness assumptions for events that may remain enabled (Assumption 1, p. 537).
4. Choose a well-founded variant for each convergent event set. The paper’s generic variants include `dt ∩ ExternalTrigger`, `length(iQ)`, `dt`, and `{uc, TRUE}` (§10.1.1, pp. 537–538).
5. Combine variants lexicographically, with higher-priority state-machine variants before queue-length variants. Prove that convergent events decrease the variant and anticipated events do not increase it (§10.1.1, p. 538).
6. Use fairness plus convergence to prove the system returns to `iQ = ∅ ∧ uc = TRUE ∧ dt = ∅`, then prove that a queued external trigger eventually reaches the head and is dequeued (Theorems 2 and 3, pp. 537–538).

Verus form. Inference: represent the event system as a ghost transition relation and use a `spec fn` variant over a finite set or natural-number tuple. A `proof fn` can show each transition decreases the lexicographic measure. Verus can prove local well-founded decreases, but fairness and “eventually” are trace properties; they need a separate ghost trace model and assumptions about scheduler behavior. A terminating Rust loop with `decreases` is not the same as the paper’s fairness theorem.

## temporal response properties

What it is. To verify that a trigger causes the right state change, the paper introduces LTL properties with history variables for `old` values. It refines the model separately for each property and records the state at trigger time (§10.2, pp. 538–539). The drone example weakens an initially too-strong property `G([ExternalTriggerEvent_decreaseCharge] ⇒ F{charge < old(charge)})` by requiring `BATTERYOK = TRUE`, `charge > 20`, and no conflicting `off` trigger (§10.2, p. 539). It then proves an `unless` property and uses Theorem 3 to establish the eventual response.

How to apply it.

1. Write the desired response as an LTL formula, including the pre-trigger value through a history variable.
2. Inspect counterexamples and add only the environmental preconditions that make the requirement meaningful (§10.2, p. 539).
3. Translate the property into a branch refinement with history variables.
4. Prove an `unless` property: while the precondition holds, it remains true until the response condition holds (Definition 3 and Theorem 4, p. 539).
5. Combine the unless proof with trigger-dequeue responsiveness and the enabled transition’s proof to conclude the eventual state change (§10.2, pp. 539–540).

Verus form. Inference: maintain a ghost event log and record the pre-trigger state in a `Ghost` value. State the response as a relation over the log in a `proof fn`; use an `ensures` clause for each completed transition. Verus has no native LTL model checker, so finite trace checking or a separate temporal model is needed for the “eventually” claim.

## what is proved, measured, and trusted

The paper proves refinement obligations, safety invariants, deadlock-freedom, convergence, and response properties for the drone model. It validates intermediate refinements with UML-B animation and Scenario Checker, and uses ProB model checking for temporal behavior described in prior work (§8, pp. 532–534; §10.2, p. 539). No denominator for proof time, number of obligations, or bugs found is reported. Trusted elements include SCXML-to-UML-B translation, Rodin/AtelierB provers and SMT solvers, fairness assumptions, the state-chart model, and the scenario traces. Inference: for an agent-written verified Rust product, the useful pattern is staged refinement plus separate safety and liveness proofs. The threat is that a proof can establish a consistent controller model while missing a wrong requirement, an unfair scheduler, or a translation error; animation catches some usefulness errors but is not exhaustive.

No earlier study in the walkthrough notes covers this Event-B run-to-completion refinement method.

## techniques for the catalog

- run-to-completion Event-B basis: encode trigger queues and completion phases in a reusable abstract machine
- trace-preserving state-chart refinement: strengthen guards, add concrete actions, and embed nested state charts
- invariant-at-earliest-level proof: place safety predicates at the first refinement where they are expressible and preserve them afterward
- lexicographic convergence variants: combine state, queue, and trigger measures to prove termination under fairness
- unless plus temporal response: prove a precondition persists until a response and combine it with eventual trigger dequeue
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
