# Automated Completion of Statements and Proofs in Synthetic Geometry: an Approach based on Constraint Solving
(authored by agents unless marked 🧑)
Tag: `tabetgonzalez2024automated`, [paper](https://doi.org/10.4204/EPTCS.398.6)

## scope and core idea

The paper extends the Larus prover so that incomplete conjectures and proof sketches become human-readable, machine-checkable proofs. Its abstract (p. 21) states: “The framework can turn a conjecture with missing assumptions and with an under-specified goal into a proper theorem.” It handles three completion tasks uniformly: missing assumptions (abducts), under-specified goals (deducts), and constrained proof sketches (hints). The implementation encodes a proof of bounded length as natural-number variables plus constraints, solves those constraints with SAT, SMT, or CSP, and reconstructs a coherent-logic proof.

The evaluation uses five Varignon-theorem geometry problems. On the fully specified problem, Larus found an eight-step proof in 2 seconds on an Intel i7-8565U 1.80 GHz Linux PC (Appendix 7.1, pp. 31–33). For the first inverse problem it found a consistent midpoint abduct after two inconsistent candidates in 3.26 seconds (Appendix 7.2, pp. 33–34). For the rectangle inverse problem it returned a congruent-diagonals abduct in 14 seconds (Appendix 7.3, pp. 34–35). A suitable hint made the partially specified proof about 20% faster (Example 4, §5, p. 29). Appendix 7.5 (pp. 36–37) gives 4 seconds with the hint and 5 seconds without it. Inference: these example timings do not establish average performance or success rates.

## technique 1: coherent logic as a readable proof target

What it is. The framework restricts statements to coherent logic, whose general shape is a conjunction of atomic premises implying an existential disjunction of conjunctions. The paper gives the form “A0 (⃗x) ∧ . . . ∧ An−1 (⃗x) ⇒ ∃⃗y(B0 (⃗x,⃗y) ∨ . . . ∨ Bm−1 (⃗x,⃗y))” (§2.1, p. 22). The authors explain (§2.1, p. 23): “In contrast to resolution-based theorem proving, in forward reasoning for CL, the conjecture being proved is kept unchanged and proved without using refutation, Skolemization and clausal form.”

How to apply it. (1) Express geometry relations as atomic formulas and axioms in coherent-logic form, without function symbols of positive arity. (2) Put assumptions in the antecedent and the target in the existential/disjunctive consequent. (3) Use the sequent rules MP, case split, assumption, and ex falso to derive the target. (4) Keep the proof steps as a structured list that can be rendered in natural language.

Verus form. Inference: encode the theorem’s predicates as Verus `spec fn` relations and the target as an `ensures` clause or a separate proof function. Verus does not use coherent-logic syntax directly; quantifiers and relation predicates must be translated to Rust types and executable/spec definitions. The paper’s readable proof reconstruction is a design goal, not a Verus feature.

Limits. Coherent logic cannot directly include function symbols of positive arity, and the authors say this excludes geometry proofs using non-trivial arithmetic (§6, p. 29). The prover also cannot handle conjectures with proofs longer than about 50 steps (§6, p. 29).

## technique 2: theorem proving as constraint solving

What it is. Instead of searching directly over formulas, Larus searches for an entire proof of a chosen length. The paper says (§2.2, p. 24): “Namely, a proof of a formula in a fixed logical setting can be encoded as a sequence of natural numbers obeying some constraints.” Each position has variables for step kind, axiom, premises, instantiation, contents, and nesting (§2.2, pp. 24–25).

Steps. (1) Fix axioms, conjecture, and a concrete proof length for the constraint encoding; command-line examples set an upper bound on the length searched. (2) Create natural-number variables for every proof-step field. (3) Add local constraints for each step kind and global constraints such as final nesting equal to one. (4) Send the resulting linear constraints to SAT, SMT, or CSP solving. (5) Decode a satisfying model into a proof and print it in human-readable form. For a QED-by-ex-falso step, the listed constraints require the kind code, a preceding step, bottom as prior contents, the goal as current contents, and unchanged nesting (§2.2, p. 24).

Verus form. Inference: a bounded proof search can be represented as a Rust candidate sequence plus a `spec fn` predicate checking each step and global consistency. A Verus proof should establish that a decoded sequence implies the target; the solver-generated sequence is input data, not evidence until Verus checks it. If Verus independently checks each decoded step against the intended axioms, the search solver and decoder need not be trusted for proof validity.

Evidence. Appendix 7.1–7.5 (pp. 31–37) presents results for all five examples; Larus can emit proofs for Coq, Isabelle, and Mizar (§2.2, p. 24). Inference: the timings above show feasibility on these small geometry tasks; they do not establish scalability.

## technique 3: abductive completion of missing assumptions

What it is. Given a theory T that does not entail goal G, an abduct is an additional hypothesis A such that T and A imply G without inconsistency (Definition 1, §3, p. 25). Larus restricts abducts to conjunctions of ground atomic formulas and inserts them as special assumption steps immediately after the original assumptions (§3, pp. 25–27).

Steps from “Finding Abducts using Larus” (§3, pp. 26–27):

1. Add one or more candidate proof positions for abducts.
2. Constrain each position to be an assumption at nesting 1, with no branching.
3. Require a signature predicate and existing constant arguments.
4. Exclude the goal atom and bottom, and constrain the proof not to end by ex falso.
5. Solve the complete proof constraints.
6. Use the external prover Vampire to discard other inconsistent candidates.

For the first inverse Varignon problem, the system produced “H is the midpoint of AD” and its symmetric form. For the rectangle problem it produced over 150 consistent abducts, mostly degenerate; the other examples listed were congruent diagonals and right-angle conditions (§3, Example 2, p. 27).

Verus form. Inference: model missing preconditions as candidate boolean predicates in a bounded list, then ask Verus to prove the target under each candidate. A candidate that makes the theorem vacuous must be rejected with a consistency/nontriviality check; Verus can prove implication but does not automatically rank “interesting” assumptions. A separate inconsistency search, like the Vampire filter in the paper, can discard candidates; failure to find a contradiction alone does not prove consistency.

## technique 4: deductive completion of an under-specified goal

What it is. A deduct is a concrete goal atom found when the predicate or arguments are omitted. Larus leaves the corresponding goal fields unconstrained while retaining proof constraints. The paper explains (§4, p. 28): “During the solving process, if there is a model, these slots are filled-in by some concrete values, giving a concrete goal.” The authors add: “The current implementation finds one possible deduct, but it can be extended to list all possible deducts, similarly as for abducts (as explained in Section 3).”

Steps: (1) mark unknown predicate or arguments with `_` in the TPTP conjecture; (2) constrain final nesting and no case branch; (3) constrain any supplied predicate/arguments and omit unknown fields; (4) solve; (5) decode the filled fields and proof. On Problem 4, Larus returned `EF ∥ GH` as the goal (Example 3, §4, p. 28).

Verus form. Inference: represent the goal schema as a finite enum of predicates or a trait-level relation, search candidates, and have a Verus proof function establish the selected postcondition. Open-ended predicate discovery is outside Verus’s ordinary type/spec elaboration and requires an external generator.

## technique 5: completing proof sketches with hints

What it is. Hints impose partial constraints on proof steps while leaving the remaining proof search to Larus. Hints need not be ordered and may specify only a predicate, an exact step, or an axiom application (§5, pp. 28–29). The paper gives (§5, p. 29): “The first hint specifies that some proof step will have an atom of the form r(. . . , . . .).” It also notes (§5, p. 28): “some hint may be used in just one proof branch and cannot be proved itself.”

Steps: (1) express a hint in the extended TPTP syntax, such as `fof(hintname1, hint, r(_,_), 5, _).`; (2) add its constraints to the common proof-step constraints; (3) solve for a proof satisfying all hints; (4) reconstruct and check the proof. In Problem 5, a suitable hint reduced runtime by about 20% (Example 4, p. 29).

Verus form. Inference: translate a hint into a required lemma call, invariant shape, or intermediate predicate, then let Verus check the resulting proof. Hints should constrain search and readability; they cannot weaken the final `ensures` condition. The paper’s arbitrary-order hint language has no direct Verus equivalent.

## what is trusted and threat to VeruLaw

The paper says (§2.2, p. 24): “Larus can generate readable, human understandable proofs in natural language and also machine-verifiable proofs for the interactive provers Coq, Isabelle, and Mizar.” Inference: independently checking an exported proof can remove reliance on the search solver, constraint encoding, and decoder for proof validity, but the formalized axioms and proof checker still matter. Vampire filters inconsistent abduct candidates; it does not by itself establish that an added assumption matches an intended specification.

The authors identify two practical limitations (§6, p. 29): “First, in current stage, it can deal only with coherent logic, hence the theories cannot involve function symbols, which excludes geometry proof that use (non-trivial) arithmetic.” Also: “Second, the framework cannot deal with conjectures whose proofs are long (say, longer than 50 proof steps).” Inference: the latter is a reported practical limitation, not a stated hard 50-step implementation limit.

Inference: VeruLaw could borrow bounded proof search, candidate precondition generation, and hint constraints, then have Verus check each resulting proof. An added precondition can make a proof succeed while excluding cases the intended API must accept. Reviewing candidate assumptions against that API and checking for vacuity would therefore matter. The paper evaluates synthetic geometry, so it does not establish effectiveness for Verus programs.

## techniques for the catalog

- coherent-logic proof target — use function-free atomic premises and readable forward proof rules
- proof-as-constraints — encode bounded proof steps as natural-number variables and solve with SAT, SMT, or CSP
- abductive assumption completion — insert constrained atomic assumptions and filter inconsistent or trivial candidates
- deductive goal completion — leave predicate or arguments open and decode a concrete goal from a satisfying proof model
- hint-constrained proof repair — add partial proof-step constraints while leaving the rest to automated search
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The third hint specifies that in the 5th proof step the axiom ax2 is applied."): checked the full paper including references and appendix, study quotations, numbers, section and page references, and technique steps; corrected the unrelated arXiv link to the paper DOI, page references, abduction filtering order, goal-completion quotation, and trust discussion; marked Verus and VeruLaw conclusions as inferences; did not rerun Larus, inspect its implementation, or validate the proposed Verus adaptations.
