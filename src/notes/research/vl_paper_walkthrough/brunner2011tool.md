# A Tool for the Certification of PLCs based on a Coq Semantics for Sequential Function Charts
(authored by agents unless marked 🧑)
Tag: `brunner2011tool`, [paper](http://arxiv.org/abs/1102.3529v1)

## result and assurance boundary

Blech presents CERT PLC, a generator and Coq library for independently checkable certificates about PLC models written in IEC 61131–3 Sequential Function Charts (SFCs). The abstract says: “It provides routines to certify properties of systems by delivering an independently checkable formal system description and proof (called certificate) for the desired properties.” The report focuses on inductive invariants, with system descriptions and certificates generated and handled by Coq (Abstract, PDF p. 1).

A certificate contains the formal system description, the desired property, and a proof description (Sec. 1.1, PDF p. 3). The report says the trusted computing base (TCB), “Apart from components like operating system and hardware,” comprises the certificate checker (the core of Coq) and the program that generates formal PLC descriptions for Coq. The proof description and its generation mechanism are not in the TCB: a faulty proof description can cause a valid property to be rejected, but a faulty property is never accepted. The report therefore says the approach is sound but not necessarily complete (Sec. 1.2, PDF p. 3). The check that the generated descriptions represent the original PLCs “can be done manually,” and one goal of the generation is human readability to make that feasible “at least for experienced users” (Sec. 1.2, PDF p. 3; Sec. 2, PDF p. 4).

## technique 1: compile a graphical control model into explicit transition semantics

Use this when a PLC's control flow is specified graphically and verification must be independent of the modeling tool. Represent an SFC as `(S, S0, T, A, F, V, ValV)`: steps `S`, initially active steps `S0`, transitions `T`, action blocks `A`, a mapping `F` from steps to actions, variables `V`, and value types `ValV` (Sec. 3.1, PDF pp. 7–8). A transition is `(Sin, g, Sout)`, where all source steps `Sin` must be active and guard `g` must hold; target steps `Sout` become active. SFCs support loops, branches, parallel processing, and synchronization through multiple predecessor or successor steps.

Compile a runtime state as `(m, a, s)`: memory `m`, active action blocks `a`, and active steps `s`. Define two transition kinds. Processing an action block updates memory and removes that block from `a`. Taking an SFC transition requires an enabled set of active steps and a guard that evaluates to true; some steps are deactivated and others activated, and all pending action blocks of a step to be deactivated must already have been executed (Sec. 3.1, PDF p. 8). The Coq predicate additionally installs the target steps' action blocks (Fig. 4, PDF p. 12). The paper's semantic split is explicit: “The semantics is defined by a state transition system which comprises two kinds of rules” (Sec. 3.1, PDF p. 8).

In CERT PLC, the representation generator emits a Coq transition relation `JSFC K` and a predicate `ReachableSFC` for the reachable states (Sec. 4.1, PDF p. 9). A generic template is instantiated with initial state, transitions, and action-block definitions. The generated representation contains the PLC-specific transition relation and reachable-state definition, while static files contain datatypes, building blocks, generic semantics, and tactics (Secs. 4.2–4.4, PDF pp. 9–13).

Inference: in Verus, model the control state as a Rust ghost datatype or enum plus a map of variables, and expose each action/transition as an executable method with `requires` for enabled guards and `ensures` for the next state. A `spec fn` can define the transition relation and reachable predicate; an inductive reachability proof should be a `proof fn` over the initial state and one-step relation. The paper's Coq `Prop`, lists, and generated graph are not Rust syntax, so this is a representation mapping rather than a claim that Verus accepts the original code.

## technique 2: separate generic semantic infrastructure from generated model facts

Use this when many PLC models share the same language semantics but differ in graph, variables, and actions. Keep generic Coq files for datatype definitions, SFC and FBD building blocks, an instantiable state-transition relation, reachable-state definitions, and tactics. Generate per-PLC files for the concrete state-transition representation, reachable-state instantiation, model-specific lemmas, and their proofs (Sec. 4.2, PDF pp. 9–10).

The framework defines `executeAction c c'` with four obligations: an active action exists; the successor memory is the action applied to the predecessor memory; the action is removed from the active list; and the rest of the state is unchanged (Sec. 4.3, PDF pp. 10–11). `stepTransition transitions c c'` checks transition membership, source-step inclusion, a true guard, unchanged memory, correct source removal and target activation, absence of pending source actions, and insertion of target actions; a second disjunct reactivates the action block of an active step whose outgoing guards are all false (Sec. 4.3, Fig. 4, PDF pp. 11–12). The reachable-state predicate is inductive with an initial-state constructor and a constructor that extends a reachable state by either `executeAction` or `stepTransition` (Figure 5, PDF p. 12).

The report describes the link as: “The second rule makes use of the two predicates defined above.” This is the transition-to-reachability link in the generic, static framework (Sec. 4.3, PDF p. 11). The report also mentions a variant that uses priorities to resolve non-determinism (Sec. 4.3, PDF p. 11). A generated lemma can state that every active action block in every reachable state belongs to the finite set declared by the PLC; its proof performs induction on reachable states (Sec. 4.5, Figs. 7–8, PDF pp. 13–15).

Inference: structure a Verus crate the same way: shared specs and proof lemmas for the state machine, generated model constants and transition predicates, and product-specific invariants. Keep generated facts as lemmas consumed by later proofs, rather than embedding model-specific cases in the generic verifier. This can reduce proof duplication, but the paper does not measure Verus proof size or maintenance cost.

## technique 3: certify an inductive invariant by initial and one-step cases

Use this for a property `I` that must hold for every reachable PLC state. State the goal as `∀ s. s ∈ ReachableSFC → I(s)` (Sec. 5.1, PDF p. 16). Apply induction on the inductively defined reachable-state set. Induction leaves two open subgoals: `I(s0)` for initial states `s0` and `I(s) ∧ (s,s') ∈ JSFC K ⟹ I(s')` (Sec. 5.1, PDF p. 16). The first “can be solved by some relatively simple tactic which just checks that all conditions derived from I are fulfilled in the initial states.” For the second, the certificate's proof script “performs most importantly the following operations” (Sec. 5.1, PDF pp. 16–17). The paper lists them as bullets, not as a numbered or strictly ordered sequence:

1. split conjunctions in `I` into independently verifiable invariants (PDF p. 17)
2. split disjunctions into two independently verifiable subgoals (PDF p. 17)
3. normalize arithmetic expressions and expressions that distinguish active steps (PDF p. 17)
4. exhaustively case-split on possible transitions, one case per transition in the control-flow graph; contradictory cases (e.g. a precondition's arithmetic constraint contradicting a transition condition) can be eliminated early to speed up checking (PDF p. 17)
5. derive that the invariant holds after the transition from the transition conditions and the decision of possible arithmetic constraints (PDF p. 17)

The case shape is “Precondition on states associated with a case distinction / Transition condition associated with a case distinction / Conditions on possible reachable states after one transition / ⇒ / Property holds for succeeding states” (Sec. 5.1, PDF p. 17). Arithmetic tactics, such as the Coq implementation of Omega, solve subgoals that structural tactics call them on or leave open; Sec. 5 names Presburger arithmetic in invariants, action blocks, and guards as the targeted class (Sec. 4.3, PDF p. 13; Sec. 5, PDF p. 16).

Inference: the Verus form is a loop or state-machine invariant plus a `proof fn` for each transition case. Use `invariant` clauses on executable loops and `requires`/`ensures` on transition methods; use `assert` and arithmetic lemmas to expose the same case splits. The paper's generated exhaustive transition enumeration is the important technique; relying on unconstrained solver search alone would not reproduce its proof structure.

## technique 4: generate basic model lemmas and use tactic-guided proof automation

CERT PLC generates basic facts that are independent of any one user property, then lets structural and arithmetic tactics reuse them. Examples include “only those action blocks may appear in the set of currently active action blocks that do belong to the actual system definition” (Sec. 4.5, PDF p. 14). The proof generator proves such a fact by induction over reachable states; the report says such proofs “are used automatically by tactics, but can also be used manually to prove user defined properties” (Sec. 4.5, PDF pp. 13–15).

For user properties, developers write a logical formula in Coq syntax: “All that is required is writing a logical formula that captures the desired property” (Sec. 4.6, PDF p. 14). A structural tactic is selected based on the property class and performs system-structure reasoning; arithmetic tactics solve the resulting numeric goals. The report says, “We are able to prove a large class of commonly appearing inductive properties with a single default tactics application” (Sec. 4.3, PDF p. 13). Nonstandard cases leave open subgoals for specialized tactics or hand-written scripts (Sec. 4.3, PDF p. 13).

Inference: a Verus library should expose reusable proof lemmas about valid states, action domains, and transition exclusivity, then let each product invariant call those lemmas. Verus's automation is solver-driven rather than Coq tactic scripting; the safe analogue is to keep helper `proof fn`s explicit and use `assert`/`reveal` only where needed. This paper does not show that a default Verus proof would close the same goals.

## technique 5: certify non-arithmetic safety and reachability properties

Inductive invariants are the main target, but CERT PLC also supports non-arithmetic properties through preproved lemmas. One pattern proves that a state cannot be reached if every incoming transition requires a condition that is impossible and the state is not initial. Another proves that, under system-specific preconditions, when an expression becomes true the successor is always a particular state. The paper calls the latter “one of the few non-inductive properties” and says its proof benefits from a proof that the expression “can only become true in a number of distinct states” (Sec. 5.2, PDF p. 17).

Inference: these are useful Verus patterns for unreachable-state and deterministic-response claims. Encode the impossible guard as a lemma over the state invariant, then prove no transition can establish the forbidden state; encode the response as a transition `ensures` clause. The paper gives no completeness theorem or quantitative success rate for these non-inductive properties.

## techniques for the catalog

- certificate-producing semantics compiler — generate a human-readable formal state machine, property, and independently checkable proof from an SFC model
- inductive reachable-state invariant — prove the initial state and every allowed transition preserve the desired property
- transition-case proof decomposition — split logical structure, normalize arithmetic, enumerate guards, and discharge each control-flow case
- generic-plus-generated proof infrastructure — reuse static semantics and tactics while generating model-specific transitions and lemmas
- trusted-base separation — trust only the checker and model representation while treating proof hints and proof generation as untrusted inputs
- non-arithmetic reachability lemmas — prove impossible guards prevent states or force a specific successor under system preconditions
