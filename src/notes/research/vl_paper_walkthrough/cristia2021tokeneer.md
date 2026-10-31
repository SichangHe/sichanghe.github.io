# An Automatically Verified Prototype of the Tokeneer ID Station Specification
(authored by agents unless marked 🧑)
Tag: `cristia2021tokeneer`, [paper](https://arxiv.org/abs/2009.00999)

## system and contribution

Tokeneer is a secure biometric ID station specified in Z and implemented in SPARK Ada. This paper translates the Z specification into the `{log}` set-constraint language, obtaining an executable functional prototype and automatically proving its state invariants and four of the five formalized security properties (Property 2 is not proved). The abstract states: “Furthermore, we show that {log}’s automated proving capabilities can discharge all the proof obligations concerning state invariants as well as important security properties.” (Abstract, PDF p. 1.) Page numbers in this study are those of the arXiv v1 preprint (arXiv:2009.00999v1), which is the text checked; the DOI-published version may paginate differently.

The source Z document is 117 pages plus an 11-page security-property document (Section 2, PDF p. 2). The model has 11 RealWorld state variables, 36 IDStation variables, 25 major operations plus three grouping operations, and six stated security properties; one property is not formalized (Section 2, PDF pp. 2–3). The authors encode the five formalized security properties (Properties 1–4 and 6) and report 523 proof obligations in total (Sections 5.2 and 6, PDF pp. 10 and 13). The introduction says all invariants and “all but one” of the security properties are proved (PDF p. 1), while Section 5.2 says Property 2 cannot be proved and one of the six properties is not formalized (PDF pp. 3, 10); the paper does not reconcile these counts.

## technique 1: schema-to-constraint prototype encoding

when to use it

Use this when a relational Z specification should become an executable reference model while retaining its mathematical meaning. `{log}` supports finite sets, binary relations, unification, and constraints, but not every Z type or unrestricted negation.

steps

1. Encode each Z schema as a `{log}` clause. Schema variables become clause arguments; included schemas are represented by tuple arguments, preserving declaration order (Section 4, PDF pp. 5–6).
2. Represent optional values with an explicit finite-set definition: `optional X == {x : F X | x = ∅ ∨ (∃ y : X | x = {y})}` (Section 2, PDF p. 2).
3. Encode state transitions with before and after tuples; a primed Z variable becomes an underscore-decorated `{log}` variable (Section 4, PDF pp. 5–6).
4. Replace universal quantification with restricted universal quantification (RUQ), using the equivalence `(∀ x ∈ A : φ) ⇔ A ⊆ {x : x ∈ A ∧ φ}` (Section 3, PDF p. 5).
5. Preserve decidability by expressing negation through built-in negated constraints such as `nin`, `neq`, `ncomp`, and explicit complement predicates, rather than arbitrary logical negation (Examples 6–7, PDF p. 5).
6. Run the resulting clauses as a prototype. Partial input tuples and underscores leave variables unconstrained, so one query can enumerate several functional scenarios (Example 9, Section 5.3, PDF p. 11).

The authors call the result a formula as well as a program: “The {log} code can be used to compute results.” (Section 4, PDF p. 5.) Inference: a Verus analogue would encode Z state as Rust structs plus `spec fn` predicates and state transitions as pure specification functions; executable Rust would require a separate implementation refinement proof. `{log}`'s set unification and finite-set decision procedure do not transfer directly to Verus.

## technique 2: explicit invariant obligations

Z schemas can hide preconditions by conjoining invariants with operation predicates. For a transition `Op`, the paper's alternative explicit style states an invariant `Inv` and proves `Inv ∧ Op ⇒ Inv′` (Section 2.1, PDF p. 3). The authors choose this style in `{log}` because “we want the {log} prototype to be closer to an implementation (than the Z specification) and because {log} can automatically discharge these proof obligations” (Section 2.1, PDF p. 3). The paper notes the style makes all preconditions explicit but requires discharging proof obligations.

steps

1. Move every state invariant out of the state schema into a standalone predicate (Section 5.1, PDF p. 9).
2. Add pre- or postconditions to some operations; for `UnlockDoor`, encode latch, alarm, door, and timeout cases explicitly (Section 5.1, PDF p. 9).
3. Encode the obligation as `invariant(IDStation) & tisOperation(...) & not_invariant(IDStation_)` and ask `{log}` to prove it unsatisfiable (Section 5.1, PDF p. 10).
4. If satisfiable, inspect the finite countermodel returned by `{log}`; if unsatisfiable, the operation preserves the invariant.

Inference: in Verus, this is a direct `requires`/`ensures` contract on each transition plus an `invariant` clause around loops. The countermodel workflow can be approximated with failing Verus assertions, but Verus does not enumerate finite set solutions as `{log}` does.

## technique 3: security properties as unsatisfiability and state-sequence lemmas

To prove an implication `p ⇒ q`, submit `p ∧ ¬q` to `{log}` and require unsatisfiability; if it is satisfiable, `{log}` returns “a finite representation of all the possible solutions (countermodels or counterexamples)” (Section 5, PDF p. 9). Property 1 is subtle because the Z formula only relates one transition pair, while the intended requirement concerns all reachable operation sequences.

The authors therefore prove Property 1 in layers:

1. Prove 11 lemmas that the system can only execute certain state changes (Figures 4 and 5, PDF p. 12). The authors add `enclaveStatus ≠ waitingStartAdminOp` as a hypothesis to “many of the auxiliary lemmas—otherwise they do not hold”, because without it “TISShutdownOp can be executed violating some desired properties”; they believe the team's documentation does not mention this (Section 5.2.1, PDF p. 10).
2. Prove four intermediate properties at the states reached along those sequences, for example, when passing from `gotUserToken` to `waitingEntry` the user token is checked for validity and the presence of an authorization certificate is checked (Section 5.2.1, PDF p. 11).
3. Prove the final Property 1 implication under those intermediate facts. The complete strategy discharges 16 obligations: 11 transition lemmas, four state properties, and one final property (Section 5.2.1, PDF p. 10). Inference: the 19 security obligations in Table 1 are these 16 plus one each for Properties 3, 4 and 6; the paper does not state the split.

This goes beyond proving the team's pairwise formula, whose gap the team itself acknowledged in its documentation (Section 2.2, PDF p. 3). The paper says that formula “does not really correspond to the property the team would have wanted to prove” (Section 2.2, PDF p. 3). Inference: a Verus design should model reachable state-machine transitions explicitly and prove sequence invariants, rather than rely only on a local postcondition.

## technique 4: prototype as executable oracle and monitor

Once invariants and security properties are proved, `{log}` can execute functional scenarios. The paper queries a partially specified door state and obtains a next-state solution, allowing several cases in one run (Example 9, PDF p. 11). It proposes differential testing: run the `{log}` prototype and SPARK implementation on the same generated test case and compare outputs. It also proposes a reference monitor that runs both in parallel and fires an alarm when outputs differ; the authors note the control is ex post because execution speeds differ (Section 5.3, PDF p. 11).

## quantitative evidence, trust, and limits

The experiment ran `{log}` 4.9.6-21c over SWI-Prolog 7.6.4 on a four-core Intel i7-6600U laptop with 8 GB memory and Ubuntu 18.04.4 (Section 6.1, PDF p. 13). The authors estimate 40–120 man-hours for encoding plus proofs, noting the work was done in an academic setting; the team's reported effort for the Z specification and informal proofs is 233.5 man-hours (Section 6 and Table 1, PDF pp. 13–14). The Z source is 2 KLOC and 52 KB; the prototype is 2.6 KLOC and 108 KB; lemma code is 5.1 KLOC and 276 KB. All 523 obligations were discharged in 851 seconds: 325 invariance obligations in 533 seconds, 19 security obligations in 313 seconds, 93 negation obligations in 4 seconds, 12 initial-state satisfiability checks in 0.1 seconds, and 74 operation satisfiability checks in 0.9 seconds (Table 1, PDF p. 14). The paper gives an average of 1.6 seconds per obligation (PDF p. 13); the Section 6 text gives 548 seconds for invariance lemmas, which disagrees with the 533 seconds in Table 1.

Property 2 cannot be proved by `{log}` because it needs a decision procedure for integer intervals, which the authors call part of their current work (Section 5.2, PDF p. 10). `{log}` also cannot express N or Z as sets, cannot encode schema types as sets of records (used once), and the universally quantified predicate in `ValidEnrol` lies outside its decision procedures; that predicate can run the prototype but `{log}` “might enter an infinite loop” if asked to decide satisfiability with `issuerCerts` variable (Section 4.1, PDF p. 9). Types are only partly encoded and the encoding assumes the Z specification has been type-checked (Section 4.1, PDF p. 7). The authors say the prototype is “a prototype and not a program” and cannot support efficiency estimates (Section 4, PDF p. 5). Inference: trust therefore rests on the Z specification's typing, the `{log}` decision procedure, the encoding's faithfulness, and the unproved or unformalized security properties. The authors explicitly say correctness is only “with respect to the verified properties” (Abstract, PDF p. 1).

## techniques for the catalog

- schema-to-constraint prototyping — encode Z schemas as executable set constraints while preserving state-transition structure
- explicit invariant obligations — separate invariants from operations and prove `Inv ∧ Op ⇒ Inv′` by unsatisfiability
- layered security proof — establish reachable state sequences, intermediate facts, and the final security property as separate obligations
- countermodel-driven checking — submit negated implications to the solver and inspect satisfying assignments as counterexamples
- verified model oracle — execute a proved prototype for scenarios, differential tests, and runtime monitoring
