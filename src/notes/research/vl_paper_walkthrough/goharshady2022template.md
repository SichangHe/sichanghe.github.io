# Template-based Program Synthesis using Stellensätze
(authored by agents unless marked 🧑)
Tag: `goharshady2022template`, [paper](http://arxiv.org/abs/2209.03602v1)

## problem and scope

The paper synthesizes polynomial imperative programs over bounded real variables from a programmer-provided sketch. Holes may occur in assignments, in guards of `if` and `while`, in invariants, and in pre- and postconditions (Section 2, p. 8). The abstract describes the goal: “The role of the synthesis engine is then to fill in these holes such that the completed program satisfies the desired specification.” (Abstract, PDF p. 1) Its main algorithm reduces inductive validity constraints to Quadratic Programming (QP) using Farkas' Lemma, Handelman's Theorem, Putinar's Positivstellensatz, and the Real Nullstellensatz (Section 3, pp. 10–20).

The target is decidable by first-order real arithmetic but quantifier elimination is impractical. The paper states: “The synthesis problem we consider here can be reduced, in polynomial time, to the decision problem of a formula in the first-order theory of the reals and is hence decidable.” (Section 1, p. 3) The paper claims its reduction to QP is sound and semi-complete (abstract): it is complete if the degree bound is large enough, and sound at every degree (Theorems 3.15 and 3.16, pp. 19–20). Inputs are polynomial expressions and inequalities over real variables; boundedness of the variables and strong positivity of invariants and postconditions are assumptions of the completeness theorem, not of soundness (Sections 2 and 3.4, pp. 9–10, 19–20).

## technique 1: make a polynomial sketch and instantiate templates

What it is. A hole is annotated with allowed variables `V` and maximum degree `d`. The algorithm enumerates all monomials over `V` of degree at most `d`, introduces a fresh coefficient for each monomial, and replaces the hole by their linear combination (Section 3.1, pp. 10–11).

How to apply it.

1. Write a partial program with real variables, pre/postconditions, loop invariants, and holes.
2. For a hole `H=(V,d)`, enumerate monomials `m_i` of degree ≤ `d` over `V`.
3. Create `p_H = Σ t_i m_i`, with fresh template variables `t_i`.
4. Replace every hole by its polynomial and translate the program into a sketch polynomial transition system (SPTS).

The paper's summation example uses quadratic templates over `{i,s}` for two invariant holes, affine templates over `{i,n}` for the third invariant hole and the loop guard, and an affine template over `{i,s}` for the assignment `s = [..]`; this gives 21 template variables `t0..t20` (Examples 1.1, 2.3 and 3.1, pp. 3, 9–10). The synthesized program has invariant `s ≥ i(i+1)/2 ∧ s ≤ i(i+1)/2 ∧ i≤n` (that is, `s = i(i+1)/2 ∧ i≤n`), guard `i≤n−1`, and assignment `s=s+i` (Figure 2, p. 3). The paper notes the solution is not necessarily unique (Example 3.4, p. 13).

Verus form. Inference: use a Verus `spec fn` with symbolic coefficients for a candidate invariant or contract, then instantiate coefficients externally and compile the chosen invariant into a Rust `invariant` clause. Verus does not synthesize arbitrary Rust syntax from holes; this mapping applies to arithmetic expressions and ghost specifications. Inference: bounded real variables must be replaced by the integer or machine-number domain used by the Rust program, with overflow assumptions made explicit.

Evidence and limits. The template restriction is part of the input, so the method does not search unrestricted programs. The paper says that without such information “our algorithm can simply iterate over all possible templates with a bounded degree” (Section 1, p. 3). The paper states: “In theory, it is possible to come up with adversarial instances in which the required degree is exponentially high [Mai and Magron 2022]. In practice, we rarely, if ever, need to use a higher degree than that of the polynomials that are already part of the input SPTS.” (Section 3.4, p. 20) Handelman-style certificates also need one new variable per polynomial in the degree-bounded monoid, which the paper calls more expensive than Farkas (Section 3.2, p. 15).

## technique 2: generate initiation, consecution, and finalization constraints

What it is. Translate every basic path of the SPTS into a symbolic transition relation, then require the candidate invariant to hold initially, be preserved by loop paths, and imply the postcondition at final paths (Section 3.1, pp. 10–12).

How to apply it.

1. Fix a cutset (the paper assumes one is given; invariants sit at the program start, the program end, and loop headers) and enumerate every basic path between cutpoints (Section 2, pp. 6–7).
2. Compose the transition relations along each path.
3. Generate initiation constraints from the precondition to the invariant at the initial cutpoint.
4. Generate consecution constraints from an invariant at a loop cutpoint to the invariant after one loop path.
5. Generate finalization constraints from the invariant and terminating path to the postcondition.
6. Simplify equalities such as `n′=n` and rewrite each implication as standard form `f1 ⋈1 0 ∧ … ∧ fr ⋈r 0 ⇒ f ⋈ 0`, where each relation is `≥` or `>`.

For the summation SPTS, the paper computes three paths: initialization, a guard-false final path, and the loop body. The loop path gives `i′=i+1`, `s′=t18+t19(i+1)+t20s`; the resulting consecution is `I(6) ∧ ρ_π3 ⇒ I(6)′` (Example 3.2, pp. 11–12).

Verus form. Inference: these become a `requires` clause, a loop `invariant`, and an `ensures` clause. The path relation is encoded by one loop-body proof obligation per branch; use `assert` to simplify assignments and branch guards. Inference: Verus checks the concrete Rust transition directly, so an SPTS is a conceptual intermediate rather than a required file format.

Evidence. The paper states in the proof of Theorem 3.16 that “Step 2 is complete since it simply rewrites the inductive validity constraints as an equivalent set of standard constraints” (p. 19); the proof of Theorem 3.15 says the same equivalence holds for soundness (p. 19). Inference: the method does not prove termination, since a valid run only has to satisfy the postcondition if it reaches the final location (Section 2, p. 7); the paper calls termination analysis “a very different and orthogonal problem” (Section 1, p. 5).

## technique 3: eliminate quantified program variables with QP certificates

What it is. Replace each universally quantified polynomial implication by a certificate expressing the conclusion as a nonnegative combination of premises. Equating polynomial coefficients removes program variables and leaves quadratic equalities/inequalities over template and certificate variables (Section 3.1, pp. 12–13).

The basic certificate for affine constraints is `f = λ0 + Σ λi fi` with nonnegative `λi`. Equality of coefficients is necessary and sufficient for the polynomial identity; products of unknown coefficients make the resulting constraints quadratic. For `n−1≥0 ⇒ t12+t14 n≥0`, the paper obtains `t12=λ0−λ1`, `t14=λ1`, and `λ0,λ1≥0` (Example 3.3, p. 12).

Use the appropriate theorem by shape.

- Farkas' Lemma (Step 3.(i)) handles affine premises and affine conclusions, with three cases: premises satisfiable and entailing the conclusion, premises unsatisfiable with `−1 ≥ 0` derivable, and premises unsatisfiable with `0 > 0` derivable; strict inequalities add positivity constraints on multipliers (Section 3.3, p. 18)
- Handelman's Theorem (Step 3.(ii)) handles affine premises and a higher-degree conclusion by writing the conclusion as `y0 + Σ yi·hi` with nonnegative `yi` and `hi` ranging over `Monoid_d(Φ)`, the products of premises of degree at most `d` (Section 3.3, p. 18)
- Putinar's Positivstellensatz (Step 3.(iii)) handles premises of degree 2 or more by writing the conclusion as `y0 + h0 + Σ hi·fi` with sum-of-squares template polynomials `hi` of degree `d`; sum-of-squares is encoded in QP through a lower-triangular matrix `L` with non-negative diagonal and `p = aᵀ L Lᵀ a` (Section 3.2, p. 17; Section 3.3, p. 18)
- the Real Nullstellensatz, combined with Putinar's result in Theorem 3.12, gives a criterion for the premises being unsatisfiable, including the case where the premises with strict inequalities are unsatisfiable but their non-strict closure is satisfiable; the algorithm then introduces fresh variables `w1..wr` and sum-of-squares templates and writes `w_j^{d'} = Σ hi·(fi − wi²) − h0` for each strict premise `j`, with `d'` the largest multiple of 4 not exceeding `d` (Sections 3.2–3.3, pp. 16–19)

Verus form. Inference: a Verus proof can use arithmetic lemmas and `assert` to establish each certificate identity, while SMT checks the resulting nonlinear arithmetic. Verus does not expose Farkas/Handelman/Putinar as synthesis primitives; this technique belongs in an external invariant synthesizer that emits candidate Rust proof annotations. Inference: certificate coefficients over reals must be translated carefully when the implementation uses integers or bounded machine arithmetic.

Evidence and guarantees. Theorem 3.15 proves soundness for every produced solution. Theorem 3.16 proves semi-completeness for a solvable sketch when the degree bound is sufficiently large. Completeness of the higher-degree cases assumes the boundedness assumption and strong positivity of invariants and postconditions; the paper says “the treatment of the linear/affine case using Farkas’ Lemma requires neither boundedness nor any specific value of d and is always complete” (Section 3.4, p. 20).

## technique 4: solve and refine the QP instance

What it is. Pass the QP instance to “an SMT solver or a numerical solver”; if the solver fails, the algorithm fails (Step 4, p. 13). The implementation uses Python, SymPy for symbolic manipulation, and Z3 for the final QP; all experiments use quadratic hole templates and degree bound `d=2` (Section 5, p. 21).

The implementation applies two heuristics (Section 5, pp. 21–22). First, it merges two variables `v1`, `v2` when a standard constraint has `v1 = v2` on its left-hand side, and substitutes `c` for `v1` when it has `v1 = c`. Second, it adds `t = 0` for every template variable `t`, which makes the QP easier but “would very likely lead to an unsatisfiable QP”. Z3 then returns an unsatisfiability core. The paper states: “If the core does not include any of our 𝑡 = 0 constraints,” (end of p. 21) “then we know that the original QP is also unsatisfiable. Otherwise, we simply remove all the 𝑡 = 0 constraints in the core and repeat the same process.” (p. 22) The paper describes this as repeatedly making the QP weaker, “but never weaker than the original instance”. Inference: this is a solver-oriented search heuristic, not a change to the sound mathematical reduction.

Verus form. Inference: use an external synthesis loop to propose coefficients, then check the resulting Verus proof. Inference: unsat-core-guided weakening can prioritize a small set of nonzero coefficients, but the final artifact must still pass Verus's proof obligations. Inference: this separates synthesis trust from proof trust: the candidate generator may be untrusted if Verus independently checks the emitted contract and code.

## experimental evidence and boundaries

The prototype runs on an Intel i9-10980HK, 32 GB RAM, Windows 10. Table 1 reports ten examples; Step 2 times range from 0.07 to 0.14 seconds, Step 3 from 0.08 to 35.00 seconds, and Step 4 (Z3) from 0.03 to 20.92 seconds (Table 1, p. 23). For example, ConsecutiveCubes takes 0.14, 35.00, and 20.92 seconds in those three columns. The denominator is ten listed examples, and times use the stated machine and `d=2` setting. The paper also compares against Sketch, Rosette, and a direct SMT encoding passed to Z3 in Table 2 (p. 26, appendix), over 20 benchmarks (nine of the ten Table 1 examples, all but SquareRootFloor, plus eleven more from Appendix A), with “a time limit of 12 hours per instance”. “Our Approach” is listed as Success on all 20 rows, with times from 0.19 to 56.06 seconds (ConsecutiveCubes) for the nine examples shared with Table 1, and 1.84 to 52.75 seconds for the eleven others. Direct Z3 timed out (>43200 s) on six rows and was faster than the paper's approach on several others (for example ArchimedesPrinciple 0.25 against 0.59 seconds). The paper states: “Note that Sketch is not sound for real variables and wrong answers are expected.” (p. 26) The listed Sketch results are mostly Wrong, Failed, Unsat, or Timed out. The Table 2 note and the appendix programs are the only evidence here, and I did not rerun anything.

The method is restricted to polynomial programs, and the paper proves the problem “strongly NP-hard, even for linear/affine transition systems” by reduction from 3SAT (Section 4, p. 20; stated in Section 1, p. 3). The authors state: “The main limitation of our approach is that it can only handle polynomial programs.” (Section 1, p. 4) Handelman and Putinar completeness requires compactness (Section 3.4, p. 20); adversarial instances may require exponentially high degree. The paper says completeness is not guaranteed for invariants or postconditions of the form `f > 0` where `f` can get arbitrarily close to 0 in program runs, and that a small change by `ε > 0` restores it (p. 20). The paper states that soundness does not depend on these assumptions. Inference: because completeness holds only for large enough degree under the assumptions, a failed run at a given degree is not evidence that no valid completion exists.

What is proved and trusted. The paper proves the certificate reduction's soundness and degree-bounded semi-completeness (Theorems 3.15 and 3.16), and measures synthesis runtimes. I found no claim in the paper that the Python implementation, SymPy, or Z3 is verified, and the input sketch and the physical models in examples (SlidingBody, ArchimedesPrinciple) are taken as given. Inference: a Verus product can use the synthesizer as an untrusted candidate generator while relying on Verus to recheck the final Rust proof; the specification and machine-number model remain trusted inputs.

Threat to agent-written verified Rust. Inference: the direct threat is medium. Agents may choose an invariant degree too low, produce a solver timeout, or encode a real-valued proof that does not match integer overflow behavior. A successful Verus check protects against an incorrect candidate proof, but not an inadequate specification or an unsound translation from real arithmetic to machine arithmetic. The paper does not test agent-written Rust; this estimate is an inference.

## techniques for the catalog

- polynomial hole templates — replace each sketch hole with a bounded-degree monomial polynomial and solve for coefficients
- path obligation generation — derive initiation, consecution, and finalization implications from every basic SPTS path
- algebraic certificates — use Farkas, Handelman, Putinar, and Real Nullstellensatz certificates to remove quantified variables
- QP reduction — equate polynomial coefficients to obtain quadratic constraints over template and certificate variables
- unsat-core refinement — strengthen QP variables to zero and relax only constraints identified by solver unsat cores
- semi-complete synthesis — obtain sound solutions at any degree and completeness when the degree and boundedness assumptions suffice
