# Incremental Symbolic Bounded Model Checking of Software Using Interval Methods via Contractors
(authored by agents unless marked 🧑)
Tag: `aldughaim2020incremental`, [paper](http://arxiv.org/abs/2012.11245v3)

## scope and result
The paper integrates interval methods via contractors into incremental bounded model checking (BMC). It models BMC variables, domains, and assertion properties as a constraint-satisfaction problem (CSP), contracts variable boxes with forward/backward interval propagation, then instruments the program with `assume` directives so BMC searches only the region that may violate the property. An outer contractor removes values guaranteed to violate the asserted property; an inner contractor removes values guaranteed to satisfy it; the remaining boundary and outer regions are checked. The implementation uses ESBMC GOTO-programs, the IBEX interval library, and SV-COMP 2022 unreach-call benchmarks. The abstract reports 7,044 verification tasks, up to 75% lower memory, and 1% more tasks verified; the conclusion gives 32 additional successful benchmarks and the same 75% memory reduction (abstract, sec. VII, PDF pp. 1, 10).

## technique: incremental BMC baseline
What: encode a transition system unrolled to bound `k` as a quantifier-free verification condition `Ψk`; increase `k` until a counterexample appears, a completion threshold is reached, or resources are exhausted.

How:
1. Convert the control-flow graph to SSA/GOTO form and represent each state and transition as formulas `I(s0)` and `γ(si,si+1)` (sec. II-B, PDF p. 2).
2. Build `Ψk = I(s0) ∧ ⋀γ(sj,sj+1) ∧ ⋁¬φ(si)` for all steps through `k` (Eq. 3, PDF p. 2).
3. Ask an SMT solver whether `Ψk` is satisfiable. SAT yields a counterexample; UNSAT means no error is reachable within `k` steps.
4. Use completion threshold `CTk` to establish that all reachable states have been covered; if `Ψk ∨ CTk` is UNSAT, report safety (Eq. 4–5, PDF p. 2).
5. Otherwise increment `k` as specified by `Inc(P,k)`.

Verus form: Inference: this is an external bounded checker rather than a Verus proof. A Verus workflow could use the contractor output to restrict test or harness inputs, but an `assume` inserted without a separately proved invariant is not a sound substitute for a Verus `invariant` or `ensures` clause.

Evidence and limits: BMC finds bounded counterexamples and needs a completion threshold for unbounded-loop safety; the paper says finding the optimal bound is not always possible because of unbounded loops and finite resources (sec. II-B, PDF p. 2). Thus the baseline is incomplete without CT or induction.

Quote: “BMC aims to find errors rather than prove the absence of them.” (sec. II-B, PDF p. 2)

## technique: forward-backward and outer contractors
What: contract an interval box while preserving every solution of a CSP. A forward step evaluates an expression interval; backward steps intersect each operand with the inverse image of the constrained result. The outer contractor applies this to each constraint `fj(x) ≤ 0`.

How:
1. Define a CSP `(x,[x],f(x)≤0)` with variables, an axis-aligned box, and constraints (sec. II-C, PDF pp. 2–3).
2. For one constraint, intersect the result interval with `(-∞,0]`: `[y] = [I] ∩ [f]([x])`.
3. For every variable, intersect `[xi]` with the interval inverse `[f_xi^-1]([y],[x])` (Algorithm 1, PDF p. 3).
4. For multiple constraints, repeat the forward-backward contractor for each `fj` (Algorithm 2).
5. Let the contracted box `[x]'` define the possible property-satisfying region; the removed difference is `Sout`, guaranteed outside the solution and therefore a candidate counterexample region.

Verus form: Inference: represent interval endpoints and arithmetic soundly in ghost/specification code, and prove that each contraction preserves the property-satisfying set. Verus’s integer arithmetic differs from IBEX’s real/double interval arithmetic, so this translation requires explicit overflow and rounding assumptions.

Evidence and limits: The paper’s `x ≥ y` example contracts `x2` from `[0,Maxuint]` to `[0,20]` after the assumption `x≤20` (sec. III, PDF p. 4). Contractor correctness is defined as `C([x]) ⊆ [x]` and `C([x]) ∩ Sx = [x] ∩ Sx` (Definition 6, PDF p. 3). Intervals may be too broad, and IBEX supports real doubles rather than bit-precise C integers (sec. IV-E, PDF p. 6).

Quote: “The former satisfies the contraction condition and the latter satisfies correctness condition.” (Definition 6, PDF p. 3)

## technique: inner contractor and BMC instrumentation
What: apply a contractor to the complementary constraint `f(x)>0` to identify `Sin`, the region guaranteed to satisfy the property. Remove `Sin` from BMC and preserve `Sout ∪ Sboundary`, where the boundary is not classified.

How:
1. Parse assertion expressions into IBEX syntax and collect variables and one supported constraint (sec. IV-A, PDF p. 6).
2. Analyze declarations, assignments, and `assume` directives to obtain each variable’s interval domain (sec. IV-B, PDF p. 6).
3. Apply the outer contractor to the property. If the result is empty, retain the original program; otherwise set `Sout = [x]\[x]'`.
4. Apply the inner contractor to `[x]'` using the complementary constraint. Set `Sin = [x]'\[x]''` and `Sboundary=[x]''` (Algorithm 5, PDF pp. 5–6).
5. Instrument the GOTO program with `assume(Sout ∪ Sboundary)` at the loop location where the contracted region is known to be safely skippable. BMC then searches only for errors in `Sout` and `Sboundary`.

Verus form: Inference: encode the skipped-loop region as a proved inductive predicate and put that predicate in a Verus loop `invariant`; use `assert`/`ensures` to show that skipping preserves the postcondition. A raw `assume` is trusted by BMC and therefore must not be copied into verified Rust without a proof of the skipped region.

Evidence and limits: Figure 6’s inner example contracts `[x2]` from `[0,30]` to `[20,30]` for `x≥y`, pruning the red `Sin` region (sec. III, PDF pp. 4–5). Instrumentation is only safe when the contracted region is at the end of a monotone loop; reducing a lower-bound or middle region can skip required iterations (sec. V-E, PDF p. 9).

Quote: “With Sout , Sin and Sboundary , now we can instrument the program for the BMC engine to search for a counterexample in Sout and Sboundary while removing Sin from the search-space.” (sec. III, PDF p. 5)

## technique: monotonicity-aware loop pruning
What: use interval contraction to skip loop iterations only when the variable evolution is monotone and the guaranteed-safe interval occurs at the loop’s end. A non-monotone variable can return to the skipped region, invalidating the instrumentation.

How:
1. Determine whether the relevant loop variable always moves in one direction under the program’s nondeterminism (sec. V-E, PDF p. 9).
2. Check that the contracted safe interval is an upper-tail region reached after the remaining loop iterations, rather than a lower or middle region.
3. Insert `assume` only at the point where execution has entered the safe tail; leave earlier/middle states for BMC.
4. Reject contractor application when the implementation cannot establish monotonicity or when the assertion uses unsupported operators.

Evidence and limits: The paper explicitly says it does not handle multiple lengthy loops, has naive monotonicity detection, and reported one false negative in a bitvector overflow benchmark (sec. V-D–E, PDF pp. 8–9). Supported-operator restrictions exclude `!=`, `==`, `&&`, and `||` in the current conversion path (sec. IV-E, PDF p. 6). The paper reports a 0.01% margin in correct/incorrect outcomes while claiming preserved soundness/completeness (sec. V-D, PDF p. 8), but also reports the false negative, so that claim is limited to applicable benchmarks and should not be read as universal.

## evidence, trust, and product relevance
The evaluation uses 7,044 SV-COMP 2022 unreach-call tasks, ESBMC on an Intel Xeon E5-2620 v4 with 160 GB RAM, 900-second and 15-GB per-task limits, and BenchExec measurements (sec. V-B–C, PDF p. 7). Table I reports per-category scores and CPU seconds; Table III reports memory. The total memory is 11,615,197 MB with contractors versus 46,649,636 MB for ESBMC incremental-BMC, a 75% reduction (Table III, PDF p. 9). The abstract’s “verifying 1% more verification tasks” has no explicit denominator in the abstract; the conclusion instead states 32 more successful benchmarks. These are different presentations of the same benchmark suite and should be treated as the paper’s own approximate summary.

Inference: IBEX interval arithmetic, ESBMC parsing and symbolic execution, the SMT solver, and the correctness of inserted `assume` directives are trusted for the reported result. Inference: for agent-written Verus Rust, contractor intervals are useful as counterexample-search guidance and loop-invariant candidates, but unsafe if imported as assumptions without proofs. Threat is moderate: contractors can reduce search costs for monotone arithmetic loops, while unsupported operators, imprecise intervals, non-monotone control flow, integer overflow, and the reported false negative leave substantial residual risk. VL need not redo the basic forward/backward contractor algorithms; it needs a sound integer/Verus adapter and proof obligations for every skipped region.

## techniques for the catalog
- incremental BMC — unroll transition systems and increase the bound until a counterexample or completion threshold
- forward-backward contractor — propagate interval constraints forward and backward to contract a variable box
- outer/inner decomposition — separate guaranteed failures, guaranteed successes, and an undecided boundary
- monotonicity-aware instrumentation — insert `assume` only for safe tail regions of monotone loops
- syntax and interval filtering — disable contraction when operators or interval precision are unsupported
Checked 2026-10-15 against paper aldughaim2020incremental: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
