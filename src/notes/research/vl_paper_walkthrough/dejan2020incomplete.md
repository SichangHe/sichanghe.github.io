# Incomplete SMT Techniques for Solving Non-Linear Formulas over the Integers
(authored by agents unless marked 🧑)
Tag: `dejan2020incomplete`, [paper](http://arxiv.org/abs/2008.13601v1)

## scope and result

This paper (Borralleras, Larraz, Oliveras, Rodríguez-Carbonell, Rubio; arXiv v1, 31 Aug 2020) gives incomplete satisfiability procedures for quantifier-free nonlinear integer arithmetic (SMT(QF-NIA)), then extends them to Max-SMT(QF-NIA) and a quantified fragment. The central reduction is explicit: “non-linear monomials are linearized by abstracting them with fresh variables and by performing case splitting on integer variables with finite domain.” Unbounded variables receive artificial lower and upper bounds; the bounds are enlarged until a model is found or a timeout occurs. The paper's two new domain-relaxation guides are optimization problems: minimize the number of violated artificial bounds with Max-SMT, or minimize distance outside the domains with OMT. It is the extended journal version of a SAT 2014 conference paper (footnote 1 of Section 1).

The procedure is incomplete. The paper states that solving even a single integer polynomial equation is undecidable (Hilbert's 10th problem), and that with artificial bounds “a linearized formula with artificial bounds may be unsatisfiable while the original QF-NIA formula is actually satisfiable” (Section 2.2). Its goal is therefore useful SAT answers, plus UNSAT answers when the linearized problem proves them (Theorem 3.1), rather than a decision procedure for all QF-NIA formulas.

## technique 1: linearize nonlinear monomials by finite-domain case splitting

what it is. Replace every nonlinear monomial by a fresh integer variable. Choose one factor with a finite domain and add an implication for every value in that domain (Section 2.2, Algorithms 2 and 3). For a monomial `x²yz` with `0 ≤ x ≤ 2`, introduce `v_x2yz` and add `x=0 -> v=0`, `x=1 -> v=yz`, and `x=2 -> v=4yz`. New nonlinear monomials introduced on the right (here `yz`) are linearized the same way.

how to do it.

1. Select variables sufficient to linearize all monomials (`artificial_bounds`). If a needed lower or upper bound is absent, introduce `V ≥ L` or `V ≤ U` for a parameter (the paper gives `L = −1` and `U = 1` as examples).
2. Enumerate the nonlinear monomials in the input. For each, create a fresh variable and replace all occurrences.
3. Choose a bounded factor `V`. For every integer `K` between its current lower and upper bound, add `V=K -> V_Q=evaluate(Q,V,K)`.
4. Add any newly created monomials to the worklist and repeat until the formula is QF-LIA.
5. Pass the linearized formula and the artificial bounds to a QF-LIA solver.

With the core-based baseline, an UNSAT result whose core contains no artificial bound proves the original formula UNSAT. If the core contains artificial bounds, relax at least one and add case clauses for newly covered values. The paper's worked formula (Example 2.1) is `tx+y≥4 ∧ t²+x²+w²+y²≤12` with all variables initially in `[-1,1]`. Relaxing `x≤1` to `x≤4` adds clauses for `x=2,3,4`; the next iteration can then find solutions, for instance `t=w=y=1, x=3`.

Verus form. Inference: this is an offline way to linearize nonlinear arithmetic appearing in Verus proof obligations. Inference: generate a fresh specification variable for each monomial and prove its equality to the Rust expression under explicit bounds, using `requires` or loop `invariant` clauses for the bounds and `assert` for the finite case split. Inference: the generated clauses are proof hints, not executable Rust; Verus still checks the original arithmetic relation through its supported integer semantics.

limits. The method needs, in each monomial, at least one variable that is both lower and upper bounded (Section 2.2). Artificial bounds make it incomplete: a linearized formula may be UNSAT even though the original formula has a model outside the current box. The paper says the size of the next formula “can grow significantly depending on the number of new case splitting clauses that have to be added” (Section 2.2), so large bounds cause formula blow-up.

## technique 2: core-guided domain relaxation baseline

The earlier algorithm `solve_SMT_QF_NIA_cores` (Algorithm 1, from Borralleras et al. 2012) initializes bounds and linearizes, then loops until timeout. It receives an SMT(QF-LIA) status and UNSAT core. SAT returns SAT. UNSAT with no artificial bound in the core returns UNSAT. Otherwise, `new_domains_cores` (Algorithm 4) selects a nonempty subset of the artificial bounds in the core and moves each lower bound downward or each upper bound upward by a parameter (for example `L′ = L − K_L`, `U′ = U + K_U`); `update` (Algorithm 5) appends case clauses for each newly covered integer.

This baseline identifies which domains matter but not how far to enlarge them. The paper says, “although unsatisfiable cores indicate which bounds should be relaxed, they provide no hint on how large the new domains have to be made.” That missing magnitude motivates the model-guided methods below.

Inference: for a Verus proof that fails because a nonlinear arithmetic lemma is outside a guessed range, a core-like diagnostic can identify which variable bounds need strengthening. Inference: because Verus's solver context is not a QF-NIA case-splitting engine, this should be implemented as a candidate-generation or lemma-splitting layer rather than as a replacement for Verus's verifier.

## technique 3: Max-SMT minimal models for relaxation

what it is. Replace the QF-LIA satisfiability call with Max-SMT (Section 3.1, Algorithms 6 to 8). Keep linearization clauses hard and artificial bounds soft, with positive weights. Minimize the number or weight of violated bounds. The resulting model identifies both which bounds to relax and the value the model assigns outside each violated bound.

how to do it.

1. Build the initial linearization and artificial bounds.
2. Add each `V≥L` and `V≤U` as a soft clause (for example weight 1); all original and case-splitting clauses remain hard.
3. Ask a Max-SMT(QF-LIA) solver for a minimum-cost model and its assignment. The paper uses branch-and-bound on top of an SMT(QF-LIA) solver, as in Nieuwenhuis and Oliveras 2006.
4. If cost is zero, the model satisfies all artificial bounds, so the auxiliary monomial variables have values consistent with the theory and the model is a model of the original formula; return SAT.
5. If cost is nonzero, choose a nonempty subset of the violated bounds and replace each by a bound equal to the model's value for that variable (Algorithm 7). Add case clauses for the newly covered values, then optimize again.
6. Return UNSAT when the linearization has no model, or UNKNOWN on timeout.

Theorem 3.1 gives the correctness condition for a cost function (called admissible): it must be nonnegative, and every cost-zero model of the linearization must be a model of the original nonlinear formula. Lemma 3.2 proves that counting violated bounds is admissible. Weights need not be 1: any positive weights work, and they may change between iterations. In the worked example (Example 3.3), a minimum-cost model has cost 1 and violates only `x≤1` by assigning `x=4`; changing the bound to `x≤4` adds three cases, and the next iteration has cost-0 solutions.

A stated risk is unbounded overshoot. The cost counts only whether a bound is violated, not by how much, so in Example 2.1 the solver could return `x = 10^5`; “a large number would involve adding a prohibitive number of case splitting clauses.” The authors write that “this kind of behaviour is rarely observed in our implementation.” They also describe a correction factor `U + α · min(β, n/m)` added to the relaxed bound in their implementation (Section 3.3).

Verus form. Inference: use Max-SMT only to propose bounds or auxiliary arithmetic lemmas. Inference: encode the selected bound as a Verus `requires` or loop `invariant`, then prove the zero-cost relation with `assert` and ordinary Verus arithmetic. Inference: a candidate generated from a model is not evidence that the model satisfies Rust's exact operation semantics, especially for overflow or division; Verus must check the final formula.

## technique 4: OMT distance-to-domain relaxation

Instead of counting violated bounds, minimize the sum of distances outside each artificial interval (Section 3.2). For a domain `[l,U]`, define `δ(z,[l,U])` as `l−z` below l, zero inside, and `z−U` above U. Algorithm 9 introduces, for each bound, a fresh variable constrained to be nonnegative and at least the distance to that bound, sums them into `cost`, and calls an OMT(QF-LIA) solver. The paper builds such a solver by adding an optimization simplex phase II to an SMT(QF-LIA) solver.

A zero-cost model is a true model by Lemma 3.4. The model's assignment is used to extend the bound, exactly as in the Max-SMT method (Algorithm 7). In Example 3.5, the OMT solver can return `t=2` (cost 1), after which clauses for `t=2` are added; the paper notes that “At the next iteration there is still no solution with cost 0, so at least another further iteration is necessary before a true model of the non-linear formula can be found.” The drawback is slow growth: “in cases where solutions have large numbers, many iterations are needed.” The paper also describes variants: weights `α_V, β_V > 0` on the distance terms, for example to count new clauses rather than new cases.

The experiments back this up. Section 3.3 says that, in general, “the additional iterations required in the simplex algorithm to perform the optimization are too expensive,” and that traces confirm bcl-omt “enlarges the domains too slowly.”

Inference: distance minimization is useful when a verifier wants the smallest arithmetic strengthening, but the paper's evidence favors violated-bound counting. Inference: a Verus integration should prefer a capped Max-SMT-style proposal and use distance only when a small counterexample is expected.

## technique 5: Max-SMT(QF-NIA) with two cost components

The paper extends model-guided relaxation to weighted formulas with hard clauses `H₀` and soft clauses `S₀` (Section 4.1, Algorithms 12 and 13). Linearize nonlinear monomials in both parts. Artificial-bound violations receive a first cost component (bound cost); violations of original soft clauses receive a second (soft cost). Costs are compared lexicographically, “so that the bound cost (which measures the consistency with respect to the theory of QF-NIA) is more relevant than the soft cost.”

Algorithm 12 keeps the best model whose bound cost is zero. Each Max-SMT(QF-LIA) call is given a limit `max_soft_cost`, initially infinity. If the model violates bounds, relax domains as in technique 3. If bound cost is zero, record the model and set `max_soft_cost` to its soft cost minus 1 (assuming natural-number costs). If the solver returns UNSAT, the algorithm returns UNSAT when no model was recorded, and otherwise returns the recorded model. Theorem 4.1 states that a returned SAT model satisfies the hard clauses and minimizes the sum of weights of falsified soft clauses, and that UNSAT means the hard part is unsatisfiable. On timeout the algorithm returns UNKNOWN, though the paper notes the best model so far can also be reported.

Verus form. Inference: this supports weighted verification goals, such as finding a best candidate invariant while treating safety obligations as hard. Inference: encode hard contracts as ordinary `requires`/`ensures` and treat soft candidates as a search objective outside Verus. Inference: Verus should never accept a soft-clause optimum as a proof until all hard contracts are discharged.

## technique 6: eliminate a restricted existential-universal fragment

The paper handles formulas `∃x∈Z ∀y∈R F(x,y)` where no monomial multiplies two universally quantified variables (Section 5). Such formulas arise in the template-based method (Colón and Sipma 2002). For the loop `double y = 0; while (y ≤ 2) y = y+1;`, a template `x₀y ≤ x₁` yields existential integer coefficients `x₀, x₁` and universally quantified real program variables.

Because no monomial multiplies two universal variables, each literal is linear in `y` with coefficients polynomial in `x`, so a clause has the form `¬(A(x)y ≤ b(x) ∧ C(x)y < d(x))`. Motzkin's Transposition Theorem (Theorem 5.1) says the system inside the negation is unsatisfiable iff there exist `λ, µ ≥ 0` with `λᵀA(x)+µᵀC(x)=0`, `λᵀb(x)+µᵀd(x)≤0`, and either `λᵀb(x)<0` or `µ≠0`. This replaces the universal quantifier with existential multipliers, with fresh multipliers per clause. The resulting formula is nonlinear, and the multipliers `λ, µ` have real type; but every nonlinear monomial contains at most one multiplier and otherwise integer variables, so the finite-domain linearization of Section 3 still applies. For Max-SMT, each soft clause gets a fresh proposition `p_S`, the soft clause becomes `[p_S, Ω]`, and a hard double implication ties `p_S` to its Motzkin certificate.

In Example 5.2 the initiation condition is soft (weight 1) and inductiveness is hard. The paper says there exist many cost-0 solutions, each a loop invariant, for instance `x₀=1, x₁=3, λ₁=0, λ₂=1, µ=1`, which represents the invariant `y ≤ 3`.

Verus form. Inference: this is a synthesis backend for choosing coefficients of a Verus `spec fn` or loop invariant. Inference: generate candidate coefficients externally, then state the resulting invariant in Verus and prove initiation and preservation. Inference: the Motzkin multipliers and real-arithmetic certificates are outside the Rust proof unless separately encoded as Verus lemmas; they should therefore be treated as untrusted suggestions.

## technique 7: non-incremental domains and optimality cores

Section 3.4 gives two refinements of the Max-SMT method. First, a non-incremental strategy (Algorithms 10 and 11): instead of enlarging each violated domain, replace it by an interval `[M(V)−R, M(V)+R]` centered at the model's value for a parameter `R > 0`, remove the outdated case-splitting clauses, and add the hard clause that forbids the previous combination of bounds (a disjunction of the negated bounds) so that domains cannot repeat. In Example 3.6 with `R = 2`, `x ≤ 1` becomes `2 ≤ x ≤ 6`. Second, optimality cores (Definition 3.7, Example 3.8): using a lower-bound certificate of the Max-SMT solver, the forbidding clause can be shortened to only the soft bounds `S` among the certificate's leaves. The paper says it makes most sense for the Max-SMT method, because minimal models may assign large values.

Reported results (Section 3.5 and Section 4.2): bcl-ninc tends to do better on SAT instances, with the largest difference on Integer Transition Systems and C Integer; optimality cores slightly hurt on SAT but quite often help on UNSAT instances (Term, LassoRanker, Integer Transition Systems, C Integer); bcl-maxsmt is usually the best of the three on UNSAT instances; and for Max-SMT, bcl-ninc-cores is more effective than bcl-ninc.

Inference: for a Verus use, a non-incremental window around a counterexample value keeps the number of generated case assertions bounded, at the cost of tracking which windows were already tried.

## evidence, assumptions, and contradictions

The QF-NIA comparison (Section 3.3) ran on StarExec Intel Xeon 2.4 GHz nodes, 60 GB memory, and an 1,800-second timeout (SMT-COMP 2016 allowed 2400 seconds). The compared solvers were AProVE-NIA, CVC4, ProB, SMT-RAT, yices-2, raSAT-0.3, raSAT-0.4 exp, z3, and the paper's bcl-cores, bcl-maxsmt, bcl-omt. The benchmark denominator is explicit: Term has 1,934 instances; SMT-LIB families have AProVE 8,829, calypto 177, LassoRanker 120, leipzig 167, mcm 186, UltimateAutomizer 7, UltimateLassoRanker 32, and LCTES 2. LCTES had one instance solved only by CVC4 (UNSAT) and one solved by none. Tables I and II count SAT and UNSAT instances separately within each family. On Term's 1,934 instances, bcl-maxsmt solved 1,857 SAT and 67 UNSAT; bcl-omt solved 1,854 SAT and 67 UNSAT. On AProVE's 8,829, bcl-maxsmt solved 8,027 SAT and 202 UNSAT; bcl-omt solved 8,013 SAT and 203 UNSAT. These are counts under the 1,800-second run, not completeness rates. On AProVE, leipzig and mcm the paper says its results “are only comparable or slightly worse than those obtained with other tools.”

The authors write that “overall bcl-maxsmt tends to give the best results in terms of number of solved SAT and UNSAT instances and timings” among their three methods. They explain that bcl-cores proves many fewer unsatisfiable instances because a core may use artificial bounds even when the linearization is unsatisfiable; for SAT instances bcl-cores solves a similar number but bcl-maxsmt tends to be faster. OMT's extra simplex work and slow domain growth are the stated causes of bcl-omt's weaker results. UNSAT instances that need deep nonlinear reasoning remain difficult, and CAD-based yices-2 and z3 can be better there; the authors suggest, as future work and as a possible mixed approach, using their methods as a filter with a fall back to CAD. In Tables III to V (Section 3.5), only the better competitors z3 and yices-2 were kept, because there were tens of thousands of instances; benchmarks that both yices-2 and bcl-maxsmt solved in under 0.5 seconds were discarded.

In the Max-SMT(QF-NIA) experiment (Section 4.2), Integer Transition Systems contains 20,354 instances and C Integer 2,019 after that filtering, with soft clauses kept. For Integer Transition Systems, bcl-maxsmt reports 2,618 UNSAT, 7,644 OPT, and 8,311 OPT+SAT; for C Integer it reports 144 UNSAT, 453 OPT, and 522 OPT+SAT. OPT means optimality proved; OPT+SAT adds the instances where a model was found without an optimality proof, so those rows must not be added as disjoint successes. The authors say z3 is “competitive or even superior when dealing with unsatisfiable problems” (for C Integer z3 reports 257 UNSAT) but lags on the rest.

For the quantified fragment (Section 5.2), the same two families are used without simplification and with real-typed multipliers. Solved counts drop: on 20,354 Integer Transition Systems instances, bcl-maxsmt reports 2,196 UNSAT, 6,707 OPT, and 7,337 OPT+SAT; on 2,019 C Integer instances, it reports 88 UNSAT, 360 OPT, and 429 OPT+SAT. The authors write that “as far as we know no competing tool can handle the problems of Max-SMT(∃Z ∀R-NIRA) effectively,” so the comparison is only among bcl-maxsmt, bcl-ninc and bcl-ninc-cores.

The paper's own stated limitations: the artificial-domain search can time out, unsatisfiable instances requiring non-trivial nonlinear reasoning are not captured, and only sequential programs were considered. The authors state, “The extension of Max-SMT-based techniques to concurrent programs is a promising line of work with a potentially high impact in the industry.”

Inference: the relevance to VeruLaw is moderate and concentrated in nonlinear proof obligations. These methods can generate useful bounds, coefficient candidates, and counterexamples, but they do not replace Verus's specification, ownership, overflow, or solver-trust boundary. Inference: the safest product use is an external arithmetic candidate engine whose outputs become Verus `assert`, `requires`, `ensures`, and loop `invariant` obligations that Verus independently proves. Inference: because the paper applies Max-SMT(QF-NIA) to template-based invariant synthesis, it should be treated as prior art when designing a new Verus arithmetic synthesizer.

## techniques for the catalog

- finite-domain monomial linearization: abstract each nonlinear product with a fresh variable and add value-by-value case clauses
- core-guided relaxation: enlarge bounds selected by unsatisfiable cores, with fixed increments
- Max-SMT model guidance: minimize violated artificial bounds and enlarge each selected domain to the model's value
- OMT distance guidance: minimize summed distance outside artificial intervals before extending bounds
- lexicographic Max-SMT: give artificial-bound consistency priority over the original soft-clause cost
- Motzkin certificate reduction: eliminate restricted existential-universal polynomial arithmetic with nonnegative multiplier witnesses
- non-incremental domains with optimality cores: replace each violated domain by a window around the model value and forbid tried domain combinations with short clauses
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Regarding bcl-omt, it turns out that, in general, the additional iterations required in the simplex algorithm to perform the optimization are too expensive."): read the whole paper text, rendered PDF page 11 to confirm the 10^5 exponent, and checked every quotation, algorithm step, theorem and lemma reference, and number (Tables I, II, VI to IX values for bcl-maxsmt and bcl-omt) against it; changed the core quotation (was misquoted), the claim that bcl-maxsmt wins ‘especially on SAT instances’ (paper says UNSAT gap vs bcl-cores, similar SAT counts), ‘all experiments are sequential’ (paper means programs analyzed), ‘no competing solver was available’ (paper says none handles it effectively), the claim that the paper ‘proposes’ CAD (future work), the x=10^5 resource claim, the Motzkin multipliers (real, not integer), the ‘finds x0=1,x1=3’ example (paper says "for instance"), and added technique 7 (Section 3.4) plus the Section 3.5 filtering; relabeled all Verus-related sentences as Inference. The tag author ‘dejan’ does not match the authors (Borralleras et al.) but the tag is kept because it must match the file name; link kept from the fetch record (it matches arXiv:2008.13601v1 in the paper text). Not checked: Tables III to V numbers, the references list, the PDF layout of tables beyond page 11, and the Verus-related inferences (these are the study's own).
