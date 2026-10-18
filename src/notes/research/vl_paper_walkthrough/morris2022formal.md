# Formal verification and validation of run-to-completion style state charts using Event-B
(authored by agents unless marked 🧑)
Tag: `morris2022formal`, [paper](https://doi.org/10.1007/s11334-021-00416-4)

This paper adds refinement and formal verification to SCXML-style reactive state charts with run-to-completion semantics. It translates an abstract run-to-completion basis and successive state-chart refinements into UML-B/Event-B. Safety is proved as Event-B invariant preservation, and the proof obligations are reported as automatically discharged for the drone example. Responsiveness and termination are argued in paper proofs (the abstract says “we outline a proof”) using deadlock-freedom, assumed fairness, convergence, and lexicographic variants. Scenario Checker animation is offered as the way to validate, by observation, that the model’s behaviour is useful.

## event-b basis for run to completion

What it is. SCXML consumes one external trigger, fires all enabled triggered transitions in a batch, fires enabled untriggered transitions, and repeats until no transition is enabled (§3.3, p. 525). Event-B has an asynchronous semantics, so the authors create a basis machine with internal queue `iQ`, external queue `eQ`, dequeued trigger `dt`, and completion flag `uc` (§4, p. 526). The paper describes the aim: “The run-to-completion semantics is specified via an abstract basis that is extended by the model [15,17].” (§4, p. 526).

When to use it. Inference: use this translation when a controller is designed as a run-to-completion state chart but needs Event-B refinement and proof obligations. The paper says the basis is independent of the particular SCXML model, so its proof obligations need not be re-proved (§7, p. 531); the state chart contributes later refinements.

How to apply it.

1. Create a context containing all possible triggers, partitions for internal and external triggers, sequence operations (`append`, `concat`, `head`, `tail`, `content`), and queue types (Listing 2, p. 528).
2. Create a machine with variables `iQ`, `eQ`, `uc`, and `dt`; initialize both queues and `dt` to empty and `uc` to false (Listing 3, p. 528).
3. Add events for raising external triggers, dequeuing internal triggers, dequeuing external triggers (the external queue is de-queued only if `iQ` is empty), firing triggered transition sets, discarding a trigger when no triggered transition is enabled, firing untriggered transition sets, and marking the run complete when no untriggered transition remains (Fig. 1 and text, pp. 526–527; Listing 3, p. 528).
4. Preserve batch semantics by generating, at translation, a refinement of the abstract triggered-transition event for each subset of parallel transitions that could fire together; some combinations may be eliminated as guards are strengthened (§4, p. 527).
5. Finalise a transition when its reaction must not be bypassed by non-deterministic early completion: the translation strengthens the guard of `noTriggeredTransitionsEnabled` (or `noUntriggeredTransitionsEnabled`) with the conjunction of the negated guards of the transitions that can fire in parallel with it (§4, pp. 527–528). A finalised transition’s guards cannot be strengthened in later refinements (§7, p. 532).

Verus form. Inference: model `iQ`, `eQ`, `dt`, and `uc` as an executable Rust state struct, with `spec fn` predicates for queue well-formedness and “run complete.” Each event becomes a function with `requires` for its guard and `ensures` for its state update. A loop `invariant` preserves queue ordering and the one-dequeued-trigger property. Verus does not have Event-B’s automatic refinement proof obligations, so a separate `proof fn` must show that each concrete event simulates its abstract event and that a new event refines `skip` (the paper states new events refine skip, §3.1, p. 524).

Evidence and assumptions. The paper’s abstract basis is a formal model, and no implementation benchmark is reported. Inference: the result assumes the generated UML-B/Event-B model faithfully represents SCXML. The paper lists future work to “formalise the semantics of our extended SCXML notation in order to define its notion of refinement and correspondence to Event-B” (§11, p. 540).

## state-chart refinement rules

What it is. The authors define three refinement rules; in their state chart semantics, “refinement means a subset of traces from an abstraction,” which preserves safety properties (§1, p. 523). Rule A strengthens transition guards, including by changing the source of the transition to a nested state. Rule B adds actions that do not modify variables appearing in the abstraction, including by changing the target to a nested state. Rule C embeds a state chart within a state, as hierarchical or parallel composition (§5, pp. 528–529). The paper states: “Rule A: Guard conditions on a transition can be strengthened (but not weakened);” (§5, p. 528).

How to apply it.

1. Start with an abstract state chart capturing the basic functionality; the drone example starts with generic start/shutdown behaviour (§6, p. 529).
2. Add a nested state or textual guard only by strengthening an existing guard (Rule A).
3. Add concrete variables and actions while leaving abstract variables unchanged (Rule B).
4. Add nested or parallel state charts (Rule C).
5. Translate each level to a UML-B state machine and Event-B refinement; the rules “rely on the usual Event-B proof obligations to ensure that they do indeed yield refinements” (§5, p. 529).
6. Mark a reaction finalised at the level where it must be enforced, so later non-deterministic completion cannot bypass it (§4, pp. 527–528; §9, pp. 534–535).

Verus form. Inference: retain an abstract Rust state type and define a concrete state with a ghost refinement relation. A concrete transition `fn` gets `requires` strong enough to imply the abstract guard and an `ensures` clause establishing the relation after the step. Added fields can be ghost or executable; a proof function checks that the abstract projection is unchanged when Rule B requires it. Rule C maps to nested transition functions, but Verus has no refinement keyword, so the relation is explicit.

Evidence. The drone example is refined through several levels: generic start/shutdown, operational sub-states, battery monitoring, takeoff details, and take-off cancellation (§6, pp. 529–531). The safety property is modelled “at an early level of refinement where the models are relatively simple,” and later refinements are “proven (automatically) to preserve the previously verified safety properties” (§9, p. 535). Inference: this staged placement reduces proof effort because a property is proved against the smallest model that determines it; the paper does not measure proof effort.

## invariant proofs for safety

What it is. Event-B invariants are predicates over reachable machine states. The authors encode controller requirements as invariants of the form `S=TRUE ⇒ P` (§9, p. 533), for example `(TAKEOFF = TRUE) ⇒ (BATTERYOK = TRUE ∨ toLand)` (§6, p. 530), and prove them by invariant preservation. Because a state chart reacts to monitored changes with delay, `P` is replaced by a modified form `P'` that allows time for the reaction (§9, pp. 534–535). Rodin provers discharge the resulting obligations. The paper reports: “All of the proof obligations are automatically discharged for our example.” (§9, p. 535), using “a strong prover configuration including AtelierB provers and SMT solvers” (footnote 7, p. 535).

How to apply it.

1. Express the requirement as an invariant `S=TRUE ⇒ P`.
2. Weaken `P` to `P'` that allows time for the reaction: either `P ∨ untriggered transitions are not complete`, or `P ∨ trigger t is in the internal queue or de-queued` (§9, pp. 534–535). In the drone example these became `(BATTERYOK = TRUE) ⇒ (uc = FALSE ∨ charge>20)` and `(TAKEOFF = TRUE) ⇒ (toLand ∈ content(iQ) ∨ toLand∈dt ∨ BATTERYOK=TRUE)` (§9, p. 535).
3. Add it at the refinement level where the monitored state and the reacting transitions are present (§9, p. 535).
4. Identify the events that can make the antecedent true or the consequent false, and handle each one by a guard on the transition (for example `charge>50` on entry, `uc = FALSE` on the triggered self-transition), by finalising the reacting transition so the completion event is guarded against it, or by having the transition raise the trigger (§9, pp. 535–536).
5. Preserve the invariant through later refinements, which the paper says are proven automatically to preserve verified safety properties (§9, p. 535).

Verus form. Inference: write the requirement as a `spec fn` over a Rust state and put it in the loop or transition `invariant`. Each event’s `ensures` establishes the predicate in the post-state. Rust control flow does not automatically generate the exhaustive event cases that Rodin does, so the proof must cover each `match` arm or transition function explicitly.

Failure and assumptions. The invariant proves only the stated safety predicate. The conclusion section warns that “These verifications do not validate that the model behaviour is useful.” (§11, p. 540). Inference: the result also depends on translation correctness and the chosen abstraction.

## liveness through fairness and variants

What it is. Safety does not guarantee that an external trigger is eventually consumed. The paper assumes all internal system events are strongly fair and `dequeueExternalTriggered` is weakly fair (Assumption 1, p. 537). Theorem 1 gives relative deadlock-freedom of internal events (p. 536), Theorem 2 gives termination of internal events given convergence and anticipation (p. 537), and Theorem 3 gives eventual dequeue of every raised external trigger. The convergence and anticipation proofs are described as needing to be done for each state chart, with the drone variant proof available in a Rodin archive (§10.1.1, p. 538). The key statement is: “Theorem 3 (Responsiveness to External Triggers) If an external trigger is raised, then eventually, it will be de-queued.” (§10.1, p. 537).

How to apply it.

1. Classify events as external, future system, dequeue-trigger, triggered, discard-trigger, or untriggered (§10, p. 536).
2. Prove relative deadlock-freedom: whenever `iQ ≠ ∅ ∨ uc = FALSE ∨ dt ≠ ∅`, at least one internal system event is enabled (Theorem 1, p. 536).
3. State fairness assumptions for events that may remain enabled (Assumption 1, p. 537).
4. Choose a well-founded variant for each convergent event set. The paper’s generic variants are `dt ∩ ExternalTrigger`, `length(iQ)`, `dt`, and `{uc, TRUE}`; the state-machine variants depend on the diagram, for example `{SHUTDOWN, FALSE}` and `{TAKEOFF, FALSE}` for the drone (§10.1.1, p. 538).
5. Combine variants lexicographically in the paper’s order: external trigger, state-machine variants, `length(iQ)`, `dt`, `{uc, TRUE}`. Convergent events decrease the variant and anticipated events do not increase it (Definitions 1 and 2, p. 537; §10.1.1, p. 538).
6. Use fairness plus convergence to prove the system returns infinitely often to `iQ = ∅ ∧ uc = TRUE ∧ dt = ∅`, then show that a queued external trigger eventually reaches the head and is dequeued (Theorems 2 and 3, p. 537).

Verus form. Inference: represent the event system as a ghost transition relation and use a `spec fn` variant over a finite set or natural-number tuple. A `proof fn` can show each transition decreases the lexicographic measure. Verus can prove local well-founded decreases, but fairness and “eventually” are trace properties; they need a separate ghost trace model and assumptions about scheduler behavior. A terminating Rust loop with `decreases` is not the same as the paper’s fairness theorem.

## temporal response properties

What it is. To verify that a trigger causes the right state change, the paper uses properties of the form `G([external_trigger_event] ⇒ F{predicate})`, where the predicate may refer to `old(v)` values. The translator generates a separate “branch” refinement for each LTL property, with history variables recording the old values (§10.2, p. 539). The drone example weakens a too-strong property `G([ExternalTriggerEvent_decreaseCharge] ⇒ F{charge < old(charge)})` by requiring `BATTERYOK=TRUE ∧ charge>20` and no conflicting `off` trigger in `dt` or `eQ` (§10.2, p. 539). It then states an `unless` property (Theorem 5, proved by a sketch) and uses Theorem 3 to establish the eventual response (§10.2, pp. 539–540).

How to apply it.

1. Write the desired response as an LTL formula, including the pre-trigger value through a history variable.
2. Weaken the property by the environmental preconditions under which it holds; the paper notes the unweakened property “does not hold” for the drone model (§10.2, p. 539).
3. Translate the property into a branch refinement with history variables (§10.2, p. 539).
4. Prove an `unless` property: if `P` holds, it holds continuously unless `Q` holds (Definition 3), using the per-event rule of Theorem 4 (p. 539).
5. Combine the unless proof with Theorem 3 and the enabledness of the triggered transition event to conclude the eventual state change (§10.2, p. 540).

Verus form. Inference: maintain a ghost event log and record the pre-trigger state in a `Ghost` value. State the response as a relation over the log in a `proof fn`; use an `ensures` clause for each completed transition. Verus has no native LTL model checker, so finite trace checking or a separate temporal model is needed for the “eventually” claim.

## what is proved, measured, and trusted

The paper reports automatic discharge of the safety proof obligations for the drone example (§9, p. 535). It gives paper proofs for the deadlock-freedom and responsiveness theorems, a proof sketch for Theorem 5, and points to a Rodin archive for the variant and unless proofs (pp. 536–539). It validates intermediate refinements with UML-B animation and Scenario Checker (§8, pp. 532–534), and says an earlier paper used the ProB model checker for LTL properties (§1, p. 524; §10.2, p. 538). No denominator for proof time, number of obligations, or bugs found is reported. Inference: trusted elements include the SCXML-to-UML-B translation, Rodin/AtelierB provers and SMT solvers, fairness assumptions, the state-chart model, and the scenario traces. Inference: for an agent-written verified Rust product, the useful pattern is staged refinement plus separate safety and liveness proofs. The threat is that a proof can establish a consistent controller model while missing a wrong requirement, an unfair scheduler, or a translation error; animation catches some usefulness errors but is not exhaustive, and the paper notes that unless transitions are finalised, other behaviours remain possible during animation (§8, p. 533).

## techniques for the catalog

- run-to-completion Event-B basis: encode trigger queues and completion phases in a reusable abstract machine
- trace-preserving state-chart refinement: strengthen guards, add concrete actions, and embed nested state charts
- invariant-at-earliest-level proof: place safety predicates at the first refinement where they are expressible and preserve them afterward
- lexicographic convergence variants: combine state, queue, and trigger measures to prove termination under fairness
- unless plus temporal response: prove a precondition persists until a response and combine it with eventual trigger dequeue
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The only events that can break this invariant are ones that make the antecedent become true or the consequent become false and we deal with these as follows"): read all of pp. 523-541 and checked every quotation, page and section reference, listing and theorem reference, and each technique step against the text (Theorem 1 inequality signs confirmed on the rendered PDF page 536); changed the abstract summary (proofs are outlined, not all mechanised), the Rule A quote ending, the invariant-proof steps (the paper weakens P to P', it does not forbid weakening), the page of the "automatically discharged" quote (p. 535, not 534), the finalisation, refinement-step and variant-order descriptions, removed the unsupported "counterexamples" step, the simulation-obligation claim and the claim about earlier walkthrough notes, and marked own conclusions as Inference; not checked: the Rodin archive at https://tinyurl.com/ISSE-Drone, cited works, the Verus mappings (own inference), the figures' fine detail beyond what the text says.
