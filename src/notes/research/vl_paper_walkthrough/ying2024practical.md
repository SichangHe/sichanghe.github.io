# A Practical Quantum Hoare Logic with Classical Variables, I
(authored by agents unless marked 🧑)
Tag: `ying2024practical`, [paper](http://arxiv.org/abs/2412.09869v4)

## scope and semantic model

QHL+ is a Hoare logic for a language that combines classical variables and control flow with quantum arrays, parameterised gates, and measurements whose outcomes are stored in classical variables. The abstract says: “Our approach offers several improvements over previous work: Enhanced expressivity of the programming language: Our logic applies to quantum programs with classical variables that incorporate quantum arrays and parameterized quantum gates.” (Abstract, p. 1.) The paper supplies syntax and operational/denotational semantics, an assertion language, proof rules, and a soundness theorem. Relative completeness and its proof are deferred to a companion paper; a revision note reports that an AI-agent formalization found and fixed a gap in the total-correctness soundness proof (end matter, p. 41).

A program state is a pair `(σ,ρ)` of a classical state and quantum state. A cq-assertion is `(φ,A)`: `φ` is a classical first-order formula and `A` is a quantum predicate formula parameterised by classical values (Sections 1 and 4.5, pp. 2, 31). A Hoare triple is `{φ,A} P {ψ,B}`. Total correctness compares the precondition expectation with the sum of terminating output expectations satisfying the postcondition; partial correctness adds the nontermination probability (Definition 5.1, p. 32).

## technique 1: typed quantum arrays and parameterised operations

what it is. Quantum arrays are indexed by classical terms, so a variable can represent a family of qubits or higher-dimensional registers. Gate symbols accept classical parameters and indexed quantum variables; measurement outcomes have a classical type and are assigned to classical variables (Sections 2–3, pp. 5–11). The language qWhile+ extends classical while syntax with initialization, parameterised gates, measurement assignment, sequencing, conditionals, and loops (Definition 3.1, p. 11).

when to use it. Use this representation when algorithm structure depends on classical indices, such as QFT circuits over `q[k:l]`, rather than expanding every register into separate variables. Example 2.2 defines a bit array `j` and quantum-array states for QFT; Example 3.2 uses a parameterised gate to describe an efficient QFT circuit (pp. 6, 10).

how to do it. (1) Declare the classical index and quantum-array types. (2) Define subscripted states and gates using classical terms. (3) Define the semantics of each indexed operation in the current classical state. (4) Write assertions whose quantum predicates carry the same indices. The paper's semantics requires that an indexed gate or measurement be meaningful in a classical state only when all indices are valid (Section 3.2, pp. 13–14).

Verus form. Inference: use Rust datatypes for bounded indices and arrays, `spec fn` predicates for valid slices, and ordinary `requires` clauses to enforce bounds. Inference: parameterised gates can be modeled as ghost transformations with lemmas about their state relation; Verus does not supply quantum linear algebra, so matrices and density operators require a trusted or separately verified library.

## technique 2: paired classical and quantum assertions

what it is. A cq-assertion deliberately keeps classical first-order reasoning separate from quantum predicates while allowing quantum predicates to depend on classical variables. Entailment is componentwise: `(φ,A) |= (ψ,B)` requires `φ |= ψ` and `φ |= A ≤ B` (Definition 4.8, p. 31). This lets existing classical theorem provers discharge index arithmetic and implications while quantum reasoning handles observables.

how to apply it. (1) State the classical precondition `φ` and postcondition `ψ`. (2) Define quantum predicates `A` and `B`, possibly with array indices or parameters. (3) Prove classical entailments and quantum-operator inequalities separately. (4) Combine them as a Hoare triple. The paper explicitly motivates this split: “classical first-order logic is helpful in proving the entailment between cq-assertions” (Section 4.5, p. 31).

paper evidence and limits. The QFT specification is `{1 ≤ n, A(j,1:n)} QFT[q[1:n]] {true, B(j,1:n)}` for any classical bit array `j` (Example 5.1, p. 33). This is a specification, not an experimental success rate. Assertion formulas are interpreted only when their indexed terms are well-defined; side conditions about validity and operator order remain obligations.

Verus form. Inference: encode `φ` as `requires`/`ensures` over ordinary Rust values and `A,B` as `spec fn` predicates over ghost state. Use `proof fn` lemmas for entailment; do not put `ensures` on a `spec fn`. Inference: this separation maps well to Verus's executable/specification split, but quantum observables remain an external model.

## technique 3: measurement rule without probability-distribution substitution

what it is. Measurement `x := M[q]` produces a classical outcome. QHL+ avoids substituting a full outcome distribution into the precondition. Its `(Axiom-Meas)` introduces a fresh variable `y`, reasons about one possible outcome, and adds `x = y` to the postcondition (Section 5.2, pp. 34–36). The paper says: “Thus, we only need to use the ordinary substitution [y/x] of x by a variable y rather than by a probability distribution in the precondition.” (Section 5.2, p. 34.)

how to apply it. (1) Choose fresh `y` absent from the precondition and predicate variables. (2) Substitute `y` for `x` in the classical formula and quantum predicate. (3) Prove the precondition for that outcome. (4) Conclude a postcondition containing `x = y`. (5) Use accumulation rules to merge disjoint outcomes. The rule in Table 3 is `{φ[y/x], FM(y)[q](A[y/x])} x := M[q] {φ ∧ x = y, A}` (p. 35).

accumulation. `(Rule-Accum1)` merges outcome-specific classical postconditions by disjunction when they are pairwise disjoint and a Kraus-operator domination side condition holds. `(Rule-Accum2)` combines different quantum pre/postconditions under a common classical condition (Table 3, p. 35). Convex special cases use sub-probability weights (p. 36).

Verus form. Inference: represent measurement as a result enum carrying an outcome and updated ghost state; prove each branch's contract separately, then combine branches with a lemma over the enum. Inference: probabilities and Kraus inequalities require a mathematical ghost model; the runtime branch cannot be treated as deterministic merely because the proof enumerates outcomes.

## technique 4: classical Hoare rules with quantum predicates

QHL+ retains familiar rules but lifts assertions to pairs. `Axiom-Ski` handles skip; `Axiom-Ass` uses substitution for classical assignment; `Axiom-Init` and `Axiom-Uni` use Kraus-operator transformations of quantum predicates; `Rule-Seq`, `Rule-Cond`, `Rule-Conseq`, and partial `Rule-Loop-par` compose programs (Table 3, p. 35). Total correctness uses `Rule-Loop-tot`: preserve the invariant under `φ ∧ b`, prove a decreasing integer expression `t` with a fresh upper-bound variable `z`, and require `φ → t ≥ 0` (Table 4, p. 36).

how to apply it. (1) Pick a quantum predicate invariant `A` and classical invariant `φ`. (2) Prove the body triple under `φ ∧ b`. (3) Prove the exit postcondition under `φ ∧ ¬b`. (4) For total correctness, provide the integer variant and its decrease triple. (5) Use `Rule-Conseq` to weaken preconditions or strengthen postconditions only after proving cq-entailments. Inference: this is the direct transfer point to Verus loop invariants and `decreases`, but Verus's `invariant` and `decreases` are syntax clauses, not function calls.

## technique 5: compositional QFT verification

Example 5.2 verifies a QFT circuit using arrays and induction. First it defines an atomic predicate `B*(j,k:l)` for the recursively defined QFT state and proves the reverse circuit by `(Axiom-Uni)`. It then proves Hadamard and controlled-rotation triples, combines them with `(Rule-Seq)`, and proves the recursive QFT triple by induction on array length (Example 5.2, pp. 37–39). The final sequence yields the QFT Hoare triple in Example 5.1.

The evidence is a derivation, not a benchmark: “The correctness of the circuit implementation (Table 1) of quantum Fourier transform (QFT) is verified.” (Section 5.2, p. 39.) Inference: VL can copy the decomposition pattern—state a recursive contract, prove local gate lemmas, compose with sequence, and induct over a bounded index—but must supply verified Rust representations and arithmetic/matrix lemmas.

## soundness, trust, and product threat

Theorem 6.1 states that derivability in `QHL+par` implies semantic partial correctness and derivability in `QHL+tot` implies semantic total correctness (Section 6, p. 39). The proof checks every axiom and preserves validity through every rule; detailed calculations are in Appendix A. Relative completeness is explicitly deferred, so the paper does not prove that every semantically correct program is derivable in this paper. The revision note says a total-correctness gap was found during Lean formalization and fixed (p. 41), evidence that mechanization can expose proof errors.

Trusted elements include the qWhile+ semantics, classical first-order reasoning, quantum predicate interpretation, Kraus-operator algebra, assertion expressiveness, and the proof assistant or solver used to discharge side conditions. Inference: threat to agent-written verified Rust is moderate. The logic offers a disciplined contract and composition pattern, but no direct Rust/Verus implementation, no artifact or performance evaluation, and no guarantee that a chosen quantum model matches hardware. VL should reuse paired assertions, branch accumulation, and explicit loop variants; it should not redo a generic Hoare-rule survey. The open work listed by the paper includes mechanization in Coq, Isabelle, or Lean and extension to parallel/distributed quantum programs (Conclusion, p. 40).

## techniques for the catalog

- typed quantum arrays — index quantum registers with classical terms and parameterise gates and measurements
- paired cq-assertions — combine classical first-order formulas with quantum predicate formulas
- fresh-variable measurement rule — avoid distribution substitution by introducing an outcome variable and `x = y`
- outcome accumulation — merge disjoint measurement branches with Kraus and convexity side conditions
- lifted Hoare composition — apply assignment, unitary, sequence, condition, consequence, and loop rules to cq-assertions
- total loop rule — add an integer decreasing variant to quantum/classical loop invariants
- inductive circuit verification — prove local gate triples and compose them over a recursive array specification
Checked 2026-10-15 against paper ying2024practical: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
