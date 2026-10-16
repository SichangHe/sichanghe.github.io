# A Tool for the Certification of PLCs based on a Coq Semantics for Sequential Function Charts
(authored by agents unless marked 🧑)
Tag: `brunner2011tool`, [paper](http://arxiv.org/abs/1102.3529v1)

## result and assurance boundary

Blech presents CERT PLC, a generator and Coq library for independently checkable certificates about PLC models written in IEC 61131–3 Sequential Function Charts (SFCs). The abstract says: “It provides routines to certify properties of systems by delivering an independently checkable formal system description and proof (called certificate) for the desired properties.” The report focuses on inductive invariants, with system descriptions and certificates generated and handled by Coq (Abstract, PDF p. 1).

A certificate contains the formal system description, the desired property, and a proof description (Sec. 1.1, PDF p. 3). The trusted computing base (TCB) includes the Coq certificate checker and the program that generates the formal PLC description; it also includes operating system and hardware outside the formal core. The proof description and its generator are not in the TCB: a bad proof hint can cause rejection, but cannot make Coq accept a false property. The report therefore says the approach is sound but not necessarily complete (Sec. 1.2, PDF p. 3). The generated Coq representation is intentionally human readable so an experienced reviewer can check it against the original graphical SFC (Sec. 2, PDF pp. 4–5).

Inference: this is a certificate-producing architecture for VL when a small checker should re-check generated claims. A Verus analogue would keep executable Rust and specifications in the artifact, use `proof fn` lemmas as checker inputs, and treat the Verus verifier, solver assumptions, compiler, external libraries, and generated model as trusted boundaries. The paper's explicit TCB accounting is a useful threat model, but it does not establish Verus's actual TCB.

## technique 1: compile a graphical control model into explicit transition semantics

Use this when a PLC's control flow is specified graphically and verification must be independent of the modeling tool. Represent an SFC as `(S, S0, T, A, F, V, ValV)`: steps `S`, initially active steps `S0`, transitions `T`, action blocks `A`, a mapping `F` from steps to actions, variables `V`, and value types `ValV` (Sec. 3.1, PDF pp. 7–8). A transition is `(Sin, g, Sout)`, where all source steps `Sin` must be active and guard `g` must hold; target steps `Sout` become active. SFCs support loops, branches, parallel processing, and synchronization through multiple predecessor or successor steps.

Compile a runtime state as `(m, a, s)`: memory `m`, active action blocks `a`, and active steps `s`. Define two transition kinds. Processing an action block updates memory and removes that block from `a`. Taking an SFC transition checks enabled source steps and guard, waits until pending actions on deactivated steps have run, deactivates source steps, activates target steps, and installs target actions (Sec. 3.1, PDF p. 8). The paper's semantic split is explicit: “The semantics is defined by a state transition system which comprises two kinds of rules” (Sec. 3.1, PDF p. 8).

In CERT PLC, the representation generator emits a Coq transition relation `JSFC K` and a predicate `ReachableSFC` for the reachable states (Sec. 4.1, PDF p. 9). A generic template is instantiated with initial state, transitions, and action-block definitions. The generated representation contains the PLC-specific transition relation and reachable-state definition, while static files contain datatypes, building blocks, generic semantics, and tactics (Secs. 4.2–4.4, PDF pp. 9–13).

Inference: in Verus, model the control state as a Rust ghost datatype or enum plus a map of variables, and expose each action/transition as an executable method with `requires` for enabled guards and `ensures` for the next state. A `spec fn` can define the transition relation and reachable predicate; an inductive reachability proof should be a `proof fn` over the initial state and one-step relation. The paper's Coq `Prop`, lists, and generated graph are not Rust syntax, so this is a representation mapping rather than a claim that Verus accepts the original code.

## technique 2: separate generic semantic infrastructure from generated model facts

Use this when many PLC models share the same language semantics but differ in graph, variables, and actions. Keep generic Coq files for datatype definitions, SFC and FBD building blocks, an instantiable state-transition relation, reachable-state definitions, and tactics. Generate per-PLC files for the concrete state-transition representation, reachable-state instantiation, model-specific lemmas, and their proofs (Sec. 4.2, PDF pp. 9–10).

The framework defines `executeAction c c'` with four obligations: an active action exists; the successor memory is the action applied to the predecessor memory; the action is removed from the active list; and the rest of the state is unchanged (Sec. 4.3, PDF pp. 10–11). `stepTransition transitions c c'` checks transition membership, source-step inclusion, a true guard, unchanged memory, correct source removal and target activation, absence of pending source actions, and insertion of target actions (Sec. 4.3, PDF pp. 11–12). The reachable-state predicate is inductive with an initial-state constructor and a constructor that extends a reachable state by either `executeAction` or `stepTransition` (Figure 5, PDF p. 12).

The report gives the generated Coq shape: “The second rule makes use of the two predicates defined above.” This is the transition-to-reachability link in the generic framework (Sec. 4.3, PDF p. 12). A generated lemma can state that every active action block in every reachable state belongs to the finite set declared by the PLC; its proof performs induction on the reachable-state predicate (Secs. 4.5, PDF pp. 13–15).

Inference: structure a Verus crate the same way: shared specs and proof lemmas for the state machine, generated model constants and transition predicates, and product-specific invariants. Keep generated facts as lemmas consumed by later proofs, rather than embedding model-specific cases in the generic verifier. This can reduce proof duplication, but the paper does not measure Verus proof size or maintenance cost.

## technique 3: certify an inductive invariant by initial and one-step cases

Use this for a property `I` that must hold for every reachable PLC state. State the goal as `∀ s. s ∈ ReachableSFC → I(s)` (Sec. 5.1, PDF p. 16). Apply induction on the inductively defined reachable-state set. The generated proof then has exactly two obligations: `I(s0)` for each initial state and `I(s) ∧ (s,s') ∈ JSFC K → I(s')` for each transition (Sec. 5.1, PDF p. 16).

The framework's proof script makes the step case tractable in a fixed sequence:

1. split conjunctions in `I` into independently checked invariants (Sec. 5.1, PDF p. 16)
2. split disjunctions into separate subgoals (Sec. 5.1, PDF p. 16)
3. normalize arithmetic and active-step expressions (Sec. 5.1, PDF p. 16)
4. exhaustively case-split on each possible control-flow transition, carrying the state's precondition and transition guard (Sec. 5.1, PDF pp. 16–17)
5. discharge contradictory cases and derive `I(s')` from the guard, post-state conditions, and arithmetic constraints (Sec. 5.1, PDF p. 17)

The case shape is “Precondition on states associated with a case distinction / Transition condition associated with a case distinction / Conditions on possible reachable states after one transition / ⇒ / Property holds for succeeding states” (Sec. 5.1, PDF p. 17). Arithmetic tactics such as Coq's Omega procedure solve Presburger constraints after structural tactics expose them (Sec. 4.3, PDF p. 13; Sec. 5, PDF p. 16).

Inference: the Verus form is a loop or state-machine invariant plus a `proof fn` for each transition case. Use `invariant` clauses on executable loops and `requires`/`ensures` on transition methods; use `assert` and arithmetic lemmas to expose the same case splits. The paper's generated exhaustive transition enumeration is the important technique; relying on unconstrained solver search alone would not reproduce its proof structure.

## technique 4: generate basic model lemmas and use tactic-guided proof automation

CERT PLC generates basic facts that are independent of any one user property, then lets structural and arithmetic tactics reuse them. Examples include “only those action blocks may appear in the set of currently active action blocks that do belong to the actual system definition” (Sec. 4.5, PDF p. 14). The proof generator proves such a fact by induction over reachable states; a tactic can then use it in later invariant proofs (Secs. 4.5–4.6, PDF pp. 14–15).

For user properties, developers write a logical formula in Coq syntax, not a proof from scratch. A structural tactic is selected based on the property class and performs system-structure reasoning; arithmetic tactics solve the resulting numeric goals. The report says, “We are able to prove a large class of commonly appearing inductive properties with a single default tactics application” (Sec. 4.3, PDF p. 13). Nonstandard cases leave open subgoals for specialized tactics or hand-written scripts (Sec. 4.3, PDF p. 13).

Inference: a Verus library should expose reusable proof lemmas about valid states, action domains, and transition exclusivity, then let each product invariant call those lemmas. Verus's automation is solver-driven rather than Coq tactic scripting; the safe analogue is to keep helper `proof fn`s explicit and use `assert`/`reveal` only where needed. This paper does not show that a default Verus proof would close the same goals.

## technique 5: certify non-arithmetic safety and reachability properties

Inductive invariants are the main target, but CERT PLC also supports non-arithmetic properties through preproved lemmas. One pattern proves that a state cannot be reached if every incoming transition requires a condition that is impossible and the state is not initial. Another proves that, under system-specific preconditions, when an expression becomes true the successor is always a particular state. The latter is helped by first proving that the expression can become true in only a finite set of states (Sec. 5.2, PDF p. 17).

Inference: these are useful Verus patterns for unreachable-state and deterministic-response claims. Encode the impossible guard as a lemma over the state invariant, then prove no transition can establish the forbidden state; encode the response as a transition `ensures` clause. The paper gives no completeness theorem or quantitative success rate for these non-inductive properties.

## evidence, what remains trusted, and limits for VL

The report describes application to “a number of case studies,” with a notable consistency-property verification for a conveyor-belt controller in the EU Artemis ACROSS project (Sec. 6, PDF p. 18). It gives no number of case studies, no total property count, no proof-time denominator, and no benchmark comparison. It explicitly says completeness is not targeted (Sec. 6, PDF p. 18). Therefore the evidence supports feasibility of generated Coq certificates for the described PLC setting, not a measured claim about coverage or scalability.

The certificate checker and generated PLC representation are trusted; proof scripts, proof-generator hints, and user tactics are not trusted for soundness because Coq checks the resulting proof. The original SFC-to-Coq correspondence still requires manual review: the report says the generated representation “can be validated against the original graphical SFC specification by experienced users” (Sec. 2, PDF p. 4). Hardware, the operating system, unsupported IEC languages, and any semantic mismatch in vendor tools remain outside the mathematical certificate.

Inference: the threat to a product of agent-written verified Rust is moderate and indirect. The strongest reusable ideas are an independently checked certificate, an explicit state-transition semantics, generated basic facts, and an invariant proof decomposed into initial-state and one-step obligations. The work predates Rust and Verus and does not verify memory safety, ownership, concurrency APIs, or foreign-code behavior. VL should not repeat the generic certificate-pipeline idea; it should investigate the concrete trusted boundary between generated Rust, its executable semantics, and the Verus contracts that describe it.

Inference: what the paper has already done that VL should not redo is the generic Coq certificate pipeline for finite-control PLC models, including induction over reachable states and transition case splitting. A VL-specific contribution would need to show a measurable advantage on agent-written Rust, such as preserving proofs across generated-code changes or checking that the generated transition model still matches the compiled implementation.

## techniques for the catalog

- certificate-producing semantics compiler — generate a human-readable formal state machine, property, and independently checkable proof from an SFC model
- inductive reachable-state invariant — prove the initial state and every allowed transition preserve the desired property
- transition-case proof decomposition — split logical structure, normalize arithmetic, enumerate guards, and discharge each control-flow case
- generic-plus-generated proof infrastructure — reuse static semantics and tactics while generating model-specific transitions and lemmas
- trusted-base separation — trust only the checker and model representation while treating proof hints and proof generation as untrusted inputs
- non-arithmetic reachability lemmas — prove impossible guards prevent states or force a specific successor under system preconditions
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
