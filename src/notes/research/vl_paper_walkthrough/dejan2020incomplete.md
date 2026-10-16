# Incomplete SMT Techniques for Solving Non-Linear Formulas over the Integers
(authored by agents unless marked 🧑)
Tag: `dejan2020incomplete`, [paper](http://arxiv.org/abs/2008.13601v1)

## scope and result

This paper gives incomplete satisfiability procedures for quantifier-free nonlinear integer arithmetic (SMT(QF-NIA)), then extends them to Max-SMT(QF-NIA) and a quantified fragment. The central reduction is explicit: “non-linear monomials are linearized by abstracting them with fresh variables and by performing case splitting on integer variables with finite domain.” Unbounded variables receive artificial lower and upper bounds; the bounds are enlarged until a model is found or a timeout occurs. The paper's two new domain-relaxation guides are optimization problems: minimize the number of violated artificial bounds with Max-SMT, or minimize distance outside the domains with OMT.

The procedure is incomplete because Hilbert's tenth problem makes integer polynomial satisfiability undecidable and because finite artificial domains can hide a real solution. The paper's goal is therefore useful SAT answers and sound UNSAT answers when the linearized problem proves them, rather than a decision procedure for all QF-NIA formulas.

## technique 1: linearize nonlinear monomials by finite-domain case splitting

what it is. Replace every nonlinear monomial by a fresh integer variable. Choose one factor with a finite domain and add an implication for every value in that domain. For a monomial `x²yz` with `0 ≤ x ≤ 2`, introduce `v_x2yz` and add `x=0 -> v=0`, `x=1 -> v=yz`, and `x=2 -> v=4yz`. New nonlinear monomials introduced on the right are recursively linearized.

how to do it.

1. Select variables sufficient to linearize all monomials (`artificial_bounds`). If a needed lower or upper bound is absent, introduce `V ≥ L` or `V ≤ U`, initially often −1 and 1.
2. Enumerate the nonlinear monomials in the input. For each, create a fresh variable and replace all occurrences.
3. Choose a bounded factor `V`. For every integer `K` between its current lower and upper bound, add `V=K -> V_Q=evaluate(Q,V,K)`.
4. Add any newly created monomials to the worklist and repeat until the formula is QF-LIA.
5. Pass the linearized formula and current artificial bounds to a QF-LIA solver.

With the core-based baseline, an UNSAT result whose core contains no artificial bound proves the original formula UNSAT. If the core contains artificial bounds, relax at least one and add case clauses for newly covered values. The paper's worked formula is `tx+y≥4 ∧ t²+x²+w²+y²≤12` with all variables initially in `[-1,1]`. Relaxing `x≤1` to `x≤4` adds clauses for `x=2,3,4`; the next iteration finds `t=1,w=1,y=1,x=3`.

Verus form. Inference: this is an offline way to linearize nonlinear arithmetic appearing in Verus proof obligations. Generate a fresh specification variable for each monomial and prove its equality to the Rust expression under explicit bounds. Use `requires` or loop `invariant` clauses for those bounds, and `assert` the finite case split. Inference: the generated clauses are proof hints, not executable Rust; Verus still checks the original arithmetic relation through its supported integer semantics.

limits. The method needs a bounded factor in each monomial. Artificial bounds make it incomplete: a linearized formula may be UNSAT even though the original formula has a model outside the current box. Every relaxation adds case-splitting clauses, so large bounds cause formula blow-up.

## technique 2: core-guided domain relaxation baseline

The earlier algorithm `solve_SMT_QF_NIA_cores` initializes bounds and linearizes, then loops until timeout. It receives an SMT(QF-LIA) status and UNSAT core. SAT returns SAT. UNSAT with no artificial bound in the core returns UNSAT. Otherwise, `new_domains_cores` selects a nonempty subset of artificial bounds in the core and moves each lower bound downward or upper bound upward by a configured increment; `update` appends case clauses for each newly covered integer.

This baseline identifies which domains matter but not how far to enlarge them. The paper says, “unsatisfiable cores indicate which bounds should be relaxed, but they provide no hint on how large the new domains should be made.” That missing magnitude motivates the model-guided methods below.

Inference: for a Verus proof that fails because a nonlinear arithmetic lemma is outside a guessed range, a core-like diagnostic can identify which variable bounds need strengthening. Inference: because Verus's solver context is not a QF-NIA case-splitting engine, this should be implemented as a candidate-generation or lemma-splitting layer rather than as a replacement for Verus's verifier.

## technique 3: Max-SMT minimal models for relaxation

what it is. Replace the QF-LIA satisfiability call with Max-SMT. Keep linearization clauses hard and artificial bounds soft, with positive weights. Minimize the number or weight of violated bounds. The resulting model identifies both which bounds to relax and the exact value assigned outside each bound.

how to do it.

1. Build the initial linearization and artificial bounds.
2. Add each `V≥L` and `V≤U` as a soft clause; all original and case-splitting clauses remain hard.
3. Ask a Max-SMT(QF-LIA) solver for a minimum-cost model and its assignment.
4. If cost is zero, all monomial abstractions are consistent with their bounded cases, so return SAT.
5. If cost is nonzero, select violated bounds and replace each by a bound reaching the model's value. Add case clauses for the intervening values, then optimize again.
6. Return UNSAT when the hard linearization has no model, or UNKNOWN on timeout.

Theorem 3.1 gives the soundness condition for any cost: it must be nonnegative, and every zero-cost model of the linearization must be a model of the original nonlinear formula. Lemma 3.2 proves that counting violated bounds satisfies this condition. Weights may be non-unit positive values and may change between iterations. In the worked example, a minimum-cost model violates only `x≤1` by assigning `x=4`; changing the bound to `x≤4` adds three cases, and a later zero-cost model is found.

A practical failure is unbounded overshoot. A Max-SMT model may assign `x=10^5` because it pays the same one-unit penalty for any violation; adding 100,000 cases can exhaust resources. The authors report this is rarely observed in their implementation, but it is a stated risk.

Verus form. Inference: use Max-SMT only to propose bounds or auxiliary arithmetic lemmas. Encode the selected bound as a Verus `requires` or loop `invariant`, then prove the zero-cost relation with `assert` and ordinary Verus arithmetic. Inference: a candidate generated from a model is not evidence that the model satisfies Rust's exact operation semantics, especially for overflow or division; Verus must check the final formula.

## technique 4: OMT distance-to-domain relaxation

Instead of counting violated bounds, minimize the sum of distances outside each artificial interval. For a domain `[l,U]`, define `δ(z,[l,U])` as `l−z` below l, zero inside, and `z−U` above U. Algorithm 9 introduces nonnegative variables for lower and upper distances, constrains them with linear inequalities, sums them into `cost`, and calls an OMT(QF-LIA) solver.

A zero-cost model is sound by Lemma 3.4. The model's assignment becomes the next bound, exactly as in Max-SMT relaxation. The same example can return `t=2` as the smallest distance-one escape from `[-1,1]`, then add clauses for `t=2`. The drawback is slow growth: a solution requiring a large value can require many one-step iterations. The experiments confirm that bcl-omt's simplex optimization and gradual enlargement are usually too expensive.

Inference: distance minimization is useful when a verifier wants the smallest arithmetic strengthening, but the paper's evidence favors violated-bound counting for throughput. Inference: a Verus integration should prefer a capped Max-SMT-style proposal and use distance only when a small counterexample is expected.

## technique 5: Max-SMT(QF-NIA) with two cost components

The paper extends model-guided relaxation to weighted formulas with hard clauses `H₀` and soft clauses `S₀`. Linearize nonlinear monomials in both parts. Artificial-bound violations receive a first cost component; violations of original soft clauses receive a second. Costs are compared lexicographically, so bound consistency is solved before soft-clause optimality.

Algorithm 12 keeps the best zero-bound-cost model. A Max-SMT(QF-LIA) call is given a current upper limit on soft cost. If the model violates bounds, relax domains. If bound cost is zero, record the model and lower the permitted soft cost. UNSAT under that threshold proves either that no model exists or that the recorded model is optimal. Theorem 4.1 states that a returned SAT model satisfies all hard nonlinear clauses and minimizes falsified soft-clause weight; UNSAT means the hard part is unsatisfiable.

Verus form. Inference: this supports weighted verification goals, such as finding a best candidate invariant while treating safety obligations as hard. Encode hard contracts as ordinary `requires`/`ensures`; treat soft candidates as a search objective outside Verus. Inference: Verus should never accept a soft-clause optimum as a proof until all hard contracts are discharged.

## technique 6: eliminate a restricted existential-universal fragment

The paper handles formulas `∃x∈Z ∀y∈R F(x,y)` where no monomial multiplies two universally quantified variables. Such formulas arise from template invariant synthesis. For a loop `double y=0; while(y≤2) y=y+1`, a template `x₀y≤x₁` yields existential integer coefficients and universally quantified real program states.

Rewrite each clause as linear inequalities in universal variables, with coefficients polynomial in existential variables. Apply Motzkin's Transposition Theorem to replace universal unsatisfiability by existential nonnegative multipliers satisfying matrix equalities and inequalities. The resulting formula is nonlinear but has enough integer variables for the paper's case-splitting linearization. For Max-SMT, transform each soft clause with a fresh proposition and a hard equivalence to its Motzkin certificate. In the example, the method finds `x₀=1,x₁=3`, representing invariant `y≤3`.

Verus form. Inference: this is a synthesis backend for choosing coefficients of a Verus `spec fn` or loop invariant. Generate candidate coefficients externally, then state the resulting invariant in Verus and prove initiation and preservation. Inference: the Motzkin multipliers and real-arithmetic certificates are outside the Rust proof unless separately encoded as Verus lemmas; they should therefore be treated as untrusted suggestions.

## evidence, assumptions, and contradictions

The QF-NIA comparison ran on StarExec Intel Xeon 2.4 GHz nodes, 60 GB memory, and an 1,800-second timeout. The benchmark denominator is explicit: Term has 1,934 instances; SMT-LIB families have AProVE 8,829, calypto 177, LassoRanker 120, leipzig 167, mcm 186, UltimateAutomizer 7, UltimateLassoRanker 32, and LCTES 2. LCTES had one instance solved only by CVC4 and one solved by none. Tables I–II count SAT and UNSAT instances separately within each family. On Term's 1,934 instances, bcl-maxsmt solved 1,857 SAT and 67 UNSAT; bcl-omt solved 1,854 SAT and 67 UNSAT. On AProVE's 8,829, bcl-maxsmt solved 8,027 SAT and 202 UNSAT; bcl-omt solved 8,013 SAT and 203 UNSAT. These are counts under the 1,800-second run, not completeness rates.

The authors report that bcl-maxsmt generally outperforms bcl-omt and the core baseline, especially on SAT instances and termination-derived families. OMT's extra simplex work and slow domain growth are identified causes. UNSAT instances requiring deep nonlinear reasoning remain difficult; the paper proposes CAD as a fallback. In the Max-SMT(QF-NIA) experiment, Integer Transition Systems contains 20,354 instances and C Integer 2,019 after filtering. For Integer Transition Systems, bcl-maxsmt reports 2,618 UNSAT, 7,644 OPT, and 8,311 OPT+SAT; for C Integer it reports 144 UNSAT, 453 OPT, and 522 OPT+SAT. OPT means optimality proved; OPT+SAT includes models found without optimality proof, so those rows must not be added as disjoint successes.

For the quantified fragment, the same families and denominators are used without simplification and with real multipliers. Solved counts drop: on 20,354 Integer Transition Systems instances, bcl-maxsmt reports 2,196 UNSAT, 6,707 OPT, and 7,337 OPT+SAT; on 2,019 C Integer instances, it reports 88 UNSAT, 360 OPT, and 429 OPT+SAT. No competing solver was available for this fragment, so the comparison is only among the three bcl variants.

The paper's own limitations are decisive: artificial-domain search can time out, unsatisfiable instances requiring nontrivial nonlinear reasoning are missed, and all experiments are sequential. The authors state, “The extension of Max-SMT-based techniques to concurrent programs is a promising line of work with a potentially high impact in the industry.”

Inference: the threat to VeruLaw is moderate and concentrated in nonlinear proof obligations. These methods can generate useful bounds, coefficient candidates, and counterexamples, but they do not replace Verus's specification, ownership, overflow, or solver-trust boundary. Inference: the safest product use is an external arithmetic candidate engine whose outputs become Verus `assert`, `requires`, `ensures`, and loop `invariant` obligations that Verus independently proves. Inference: the paper has already covered model-guided nonlinear invariant synthesis and should be treated as prior art when designing a new Verus arithmetic synthesizer.

## techniques for the catalog

- finite-domain monomial linearization: abstract each nonlinear product with a fresh variable and add value-by-value case clauses
- core-guided relaxation: enlarge bounds selected by unsatisfiable cores, with fixed increments
- Max-SMT model guidance: minimize violated artificial bounds and enlarge each selected domain to the model's value
- OMT distance guidance: minimize summed distance outside artificial intervals before extending bounds
- lexicographic Max-SMT: solve artificial-bound consistency before minimizing original soft-clause cost
- Motzkin certificate reduction: eliminate restricted existential-universal polynomial arithmetic with nonnegative multiplier witnesses
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
