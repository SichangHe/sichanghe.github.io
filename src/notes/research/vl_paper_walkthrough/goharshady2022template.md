# Template-based Program Synthesis using Stellensätze
(authored by agents unless marked 🧑)
Tag: `goharshady2022template`, [paper](http://arxiv.org/abs/2209.03602v1)

## problem and scope

The paper synthesizes polynomial imperative programs over bounded real variables from a programmer-provided sketch. Holes may occur in code, guards, assignments, loop invariants, preconditions, or postconditions. The abstract describes the goal: “The role of the synthesis engine is then to fill in these holes such that the completed program satisfies the desired specification.” (Abstract, PDF p. 1) Its main algorithm reduces inductive validity constraints to Quadratic Programming (QP) using Farkas' Lemma, Handelman's Theorem, Putinar's Positivstellensatz, and the Real Nullstellensatz.

The target is decidable by first-order real arithmetic but quantifier elimination is impractical. The paper states: “The synthesis problem we consider here can be reduced, in polynomial time, to the decision problem of a formula in the first-order theory of the reals and is hence decidable.” (Section 1, p. 3) The paper's reduction is sound and semi-complete: it succeeds for sufficiently high template degree, while remaining sound at every finite degree. Inputs are polynomial expressions and inequalities over real variables; boundedness and strong positivity are needed for the higher-degree completeness results (Sections 1 and 3, pp. 1–4, 18–20).

## technique 1: make a polynomial sketch and instantiate templates

What it is. A hole is annotated with allowed variables `V` and maximum degree `d`. The algorithm enumerates all monomials over `V` of degree at most `d`, introduces a fresh coefficient for each monomial, and replaces the hole by their linear combination (Section 3.1, pp. 10–11).

How to apply it.

1. Write a partial program with real variables, pre/postconditions, loop invariants, and holes.
2. For a hole `H=(V,d)`, enumerate monomials `m_i` of degree ≤ `d` over `V`.
3. Create `p_H = Σ t_i m_i`, with fresh template variables `t_i`.
4. Replace every hole by its polynomial and translate the program into a sketch polynomial transition system (SPTS).

The paper's summation example uses quadratic templates over `{i,s}` for two invariant holes and affine templates over `{i,n}` for a guard and invariant. The synthesized program has invariant `s = i(i+1)/2 ∧ i≤n`, guard `i≤n−1`, and assignment `s=s+i` (Example 1.1, pp. 3, 10–11).

Verus form. Inference: use a Verus `spec fn` with symbolic coefficients for a candidate invariant or contract, then instantiate coefficients externally and compile the chosen invariant into a Rust `invariant` clause. Verus does not synthesize arbitrary Rust syntax from holes; this mapping applies to arithmetic expressions and ghost specifications. Inference: bounded real variables must be replaced by the integer or machine-number domain used by the Rust program, with overflow assumptions made explicit.

Evidence and limits. The template restriction is part of the input, so the method does not search unrestricted programs. The paper says it can iterate over bounded degrees when the programmer gives no template information (Section 1, p. 3). Higher degree can be exponentially expensive and is not guaranteed to be found at a practical bound (Section 3.4, p. 20).

## technique 2: generate initiation, consecution, and finalization constraints

What it is. Translate every basic path of the SPTS into a symbolic transition relation, then require the candidate invariant to hold initially, be preserved by loop paths, and imply the postcondition at final paths (Section 3.1, pp. 10–12).

How to apply it.

1. Enumerate the SPTS cutpoints and every basic path between them.
2. Compose the transition relations along each path.
3. Generate initiation constraints from the precondition to the invariant at the initial cutpoint.
4. Generate consecution constraints from an invariant at a loop cutpoint to the invariant after one loop path.
5. Generate finalization constraints from the invariant and terminating path to the postcondition.
6. Simplify equalities such as `n′=n` and rewrite each implication as standard form `f1 ⋈1 0 ∧ … ∧ fr ⋈r 0 ⇒ f ⋈ 0`, where each relation is `≥` or `>`.

For the summation SPTS, the paper computes three paths: initialization, a guard-false final path, and the loop body. The loop path gives `i′=i+1`, `s′=t18+t19(i+1)+t20s`; the resulting consecution is `I(6) ∧ ρ_π3 ⇒ I(6)′` (Example 3.2, pp. 11–12).

Verus form. Inference: these become a `requires` clause, a loop `invariant`, and an `ensures` clause. The path relation is encoded by one loop-body proof obligation per branch; use `assert` to simplify assignments and branch guards. Inference: Verus checks the concrete Rust transition directly, so an SPTS is a conceptual intermediate rather than a required file format.

Evidence. Step 2 is an equivalent symbolic rewriting, so its constraints preserve inductive validity (Section 3.1, p. 12). It does not prove termination; the postcondition is conditional on reaching a final path.

## technique 3: eliminate quantified program variables with QP certificates

What it is. Replace each universally quantified polynomial implication by a certificate expressing the conclusion as a nonnegative combination of premises. Equating polynomial coefficients removes program variables and leaves quadratic equalities/inequalities over template and certificate variables (Section 3.1, pp. 12–13).

The basic certificate for affine constraints is `f = λ0 + Σ λi fi` with nonnegative `λi`. Equality of coefficients is necessary and sufficient for the polynomial identity; products of unknown coefficients make the resulting constraints quadratic. For `n−1≥0 ⇒ t12+t14 n≥0`, the paper obtains `t12=λ0−λ1`, `t14=λ1`, and `λ0,λ1≥0` (Example 3.3, p. 13).

Use the appropriate theorem by shape.

- Farkas' Lemma handles affine premises and affine conclusions, with separate cases for satisfiable premises, unsatisfiable premises, and strict inequalities (Section 3.3, pp. 18–19)
- Handelman's Theorem handles affine premises and a higher-degree conclusion by enumerating bounded-degree monoid products and nonnegative coefficients
- Putinar's Positivstellensatz handles polynomial premises by representing the conclusion with sum-of-squares multipliers
- the Real Nullstellensatz handles infeasibility caused by polynomial equalities and strict inequalities; the algorithm introduces auxiliary variables and sum-of-squares templates (Section 3.2–3.3, pp. 14–19)

Verus form. Inference: a Verus proof can use arithmetic lemmas and `assert` to establish each certificate identity, while SMT checks the resulting nonlinear arithmetic. Verus does not expose Farkas/Handelman/Putinar as synthesis primitives; this technique belongs in an external invariant synthesizer that emits candidate Rust proof annotations. Inference: certificate coefficients over reals must be translated carefully when the implementation uses integers or bounded machine arithmetic.

Evidence and guarantees. Theorem 3.15 proves soundness for every produced solution. Theorem 3.16 proves semi-completeness for a solvable sketch when the degree bound is sufficiently large. Completeness of the higher-degree cases assumes bounded semialgebraic sets and strong positivity; affine Farkas handling is complete without boundedness (Section 3.4, pp. 19–20).

## technique 4: solve and refine the QP instance

What it is. Send the conjunction of all QP constraints to an external solver. The implementation uses Python, SymPy for symbolic manipulation, and Z3 for the final QP; all experiments use quadratic hole templates and degree bound `d=2` (Section 5, p. 21).

The implementation applies two heuristics. It merges variables constrained equal on the left side and substitutes constants. It then strengthens the QP by setting template variables to zero; if Z3 returns an unsatisfiable core that excludes a zero constraint, those zero constraints are removed and the process repeats (Section 5, pp. 21–22). This is a solver-oriented search heuristic, not a change to the sound mathematical reduction.

Verus form. Inference: use an external synthesis loop to propose coefficients, then check the resulting Verus proof. Unsat-core-guided weakening can prioritize a small set of nonzero coefficients, but the final artifact must still pass Verus's proof obligations. Inference: this separates synthesis trust from proof trust: the candidate generator may be untrusted if Verus independently checks the emitted contract and code.

## experimental evidence and boundaries

The prototype runs on an Intel i9-10980HK, 32 GB RAM, Windows 10. Table 1 reports ten examples; Step 2 times range from 0.07 to 0.14 seconds, Step 3 from 0.08 to 35.00 seconds, and Z3 from 0.03 to 20.92 seconds (Table 1, p. 23). For example, ConsecutiveCubes takes 0.14, 35.00, and 20.92 seconds in those three columns. The denominator is ten listed examples, and times use the stated machine and `d=2` setting. The paper also compares Sketch, Rosette, and direct Z3 encodings with a 12-hour per-instance limit in Table 2 (Appendix material, pp. 24–26); it notes that Sketch is unsound for real variables.

The method is restricted to polynomial programs and is NP-hard even for affine cases (Section 1, p. 3). The authors state: “The main limitation of our approach is that it can only handle polynomial programs.” (Section 1, p. 4) Handelman and Putinar completeness requires compactness; adversarial instances may require exponentially high degree. Strong positivity excludes inequalities that approach zero without a positive margin. Soundness does not require these assumptions, so a failed synthesis run is not evidence that no valid program exists.

What is proved and trusted. The paper proves the certificate reduction's soundness and degree-bounded semi-completeness, and measures synthesis runtimes. It does not prove the Python implementation, SymPy, Z3, the input sketch, or the physical models used in examples correct. Inference: a Verus product can use the synthesizer as an untrusted candidate generator while relying on Verus to recheck the final Rust proof; the specification and machine-number model remain trusted inputs.

What VL should not redo. Inference: VL need not recreate this general real-algebraic QP machinery for ordinary Rust integer invariants unless benchmarks show a gap. The reusable idea is template synthesis followed by independently checked proof certificates. Existing Verus invariant syntax and SMT automation can consume the resulting candidate invariants.

Threat to agent-written verified Rust. Inference: the direct threat is medium. Agents may choose an invariant degree too low, produce a solver timeout, or encode a real-valued proof that does not match integer overflow behavior. A successful Verus check protects against an incorrect candidate proof, but not an inadequate specification or an unsound translation from real arithmetic to machine arithmetic. The paper does not test agent-written Rust; this estimate is an inference.

## techniques for the catalog

- polynomial hole templates — replace each sketch hole with a bounded-degree monomial polynomial and solve for coefficients
- path obligation generation — derive initiation, consecution, and finalization implications from every basic SPTS path
- algebraic certificates — use Farkas, Handelman, Putinar, and Real Nullstellensatz certificates to remove quantified variables
- QP reduction — equate polynomial coefficients to obtain quadratic constraints over template and certificate variables
- unsat-core refinement — strengthen QP variables to zero and relax only constraints identified by solver unsat cores
- semi-complete synthesis — obtain sound solutions at any degree and completeness when the degree and boundedness assumptions suffice

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
