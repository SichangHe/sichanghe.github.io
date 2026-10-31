# Incremental Symbolic Bounded Model Checking of Software Using Interval Methods via Contractors
(authored by agents unless marked 🧑)
Tag: `aldughaim2020incremental`, [paper](http://arxiv.org/abs/2012.11245v3)

## scope and result
The paper integrates interval methods via contractors into incremental bounded model checking (BMC). It models BMC variables, domains, and assertion properties as a constraint-satisfaction problem (CSP), contracts variable boxes with forward/backward interval propagation, then instruments the program with `assume` directives so BMC searches only the region that may violate the property. The outer contractor is applied to the constraint `f(x) ≤ 0` derived from the assertion and keeps the region that can satisfy it; the removed part is called `Sout` (outside the solution, so it violates the property). The inner contractor is applied to the complementary constraint and identifies `Sin`, the region where the property is guaranteed to hold; what is left is `Sboundary`. `Sout` and `Sboundary` are kept for BMC and `Sin` is removed (sec. III, PDF pp. 4–5). The implementation uses ESBMC GOTO-programs, the IBEX interval library, and SV-COMP 2022 unreach-call benchmarks. The abstract reports 7,044 verification tasks, up to 75% lower memory, and 1% more tasks verified; the conclusion gives 32 additional successful benchmarks and the same 75% memory reduction (abstract, sec. VII, PDF pp. 1, 10). Inference: 32 of 7,044 tasks is about 0.45%, so the paper's "1%" is not derivable from these two numbers; Table I's total scores differ by 26 points (1976 vs 1950, PDF p. 8).

## technique: incremental BMC baseline
What: encode a transition system unrolled to bound `k` as a quantifier-free verification condition `Ψk`; increase `k` until a counterexample appears, a completion threshold is reached, or resources are exhausted.

How:
1. Derive a transition system from the control-flow graph and convert it to SSA form; each state holds the variable values and a program counter, and each transition is a formula `γ(si,si+1)`; `I(s0)` describes the initial states (sec. II-B, PDF p. 2). The GOTO-program intermediate representation is introduced in sec. III (PDF p. 4).
2. Build `Ψk` as in Eq. 3 (PDF p. 2): `I(s0)` conjoined with a disjunction over `i = 0..k` of the conjunction of the first `i` transitions `γ(sj,sj+1)` and `¬φ(si)`. `Ψk` is satisfiable iff `φ` has a counterexample of length `k` or less.
3. Ask an SMT solver whether `Ψk` is satisfiable. SAT yields a counterexample; UNSAT means no error is reachable within `k` steps.
4. Use completion threshold `CTk` (Eq. 4), which checks whether `k` reaches all reachable states; if `Ψk ∨ CTk` is UNSAT for a given `k`, the program is considered safe (sec. II-B, PDF p. 2).
5. Otherwise increment `k`: `Inc(P,k)` is "unsafe" if `Ψk` is SAT, "correct" if `Ψk ∨ CTk` is UNSAT, and `Inc(P,k+1)` otherwise (Definition 3, Eq. 5, PDF p. 2).

Verus form: Inference: this is an external bounded checker rather than a Verus proof. A Verus workflow could use the contractor output to restrict test or harness inputs, but an `assume` inserted without a separately proved invariant is not a sound substitute for a Verus `invariant` or `ensures` clause.

Evidence and limits: BMC finds bounded counterexamples and needs a completion threshold for unbounded-loop safety; the paper says finding the optimal bound is not always possible because of unbounded loops (i) or limited system resources (ii), and names k-induction and incremental BMC as the two responses (sec. II-B, PDF p. 2). Inference: the baseline therefore cannot prove safety of unbounded loops without CT or induction.

Quote: “BMC aims to find errors rather than prove the absence of them” (sec. I, PDF p. 1; the sentence ends with citation [9])

## technique: forward-backward and outer contractors
What: contract an interval box while preserving every solution of a CSP. A forward step evaluates an expression interval; backward steps intersect each operand with the inverse image of the constrained result. The outer contractor applies this to each constraint `fj(x) ≤ 0`.

How:
1. Define a CSP `(x,[x],f(x)≤0)` with variables, an axis-aligned box, and constraints (Definitions 4–5, sec. II-C, PDF p. 3).
2. For one constraint, intersect the result interval with `(-∞,0]`: `[y] = [I] ∩ [f]([x])`.
3. For every variable, intersect `[xi]` with the interval inverse `[f_xi^-1]([y],[x])` (Algorithm 1, PDF p. 3).
4. For multiple constraints, apply the forward-backward contractor to each `fj` independently with `I = (−∞,0]` (Algorithm 2, PDF p. 3).
5. Let the contracted box `[x]'` be the region that may satisfy the property; the difference `[x] \ [x]'` is `Sout`, outside the solution and so violating the property (sec. III and Algorithm 5, PDF pp. 4–5). If `[x]'` is empty, the whole domain violates the property and no pruning is done (sec. III, PDF p. 5).

Verus form: Inference: represent interval endpoints and arithmetic soundly in ghost/specification code, and prove that each contraction preserves the property-satisfying set. Verus’s integer arithmetic differs from IBEX’s real/double interval arithmetic, so this translation requires explicit overflow and rounding assumptions.

Evidence and limits: The paper’s `x ≥ y` example contracts `x2` from `[0,Maxuint]` to `[0,20]` after the assumption `x≤20` (sec. III, PDF p. 4). Contractor correctness is defined as `C([x]) ⊆ [x]` and `C([x]) ∩ Sx = [x] ∩ Sx` (Definition 6, PDF p. 3). The ESBMC interval-analysis option sometimes gives intervals too broad to help the contractor, and IBEX deals exclusively with the double datatype (sec. IV-E, PDF p. 7). Inference: IBEX's double arithmetic is not bit-precise C integer arithmetic; the paper does not discuss overflow handling in the contractor.

Quote: “The former satisfies the contraction condition and the latter satisfies correctness condition.” (Definition 6, PDF p. 3)

## technique: inner contractor and BMC instrumentation
What: apply a contractor to the complementary constraint `f(x)>0` to identify `Sin`, the region guaranteed to satisfy the property. Remove `Sin` from BMC and preserve `Sout ∪ Sboundary`, where the boundary is not classified.

How:
1. Parse the expressions in the `assert` directive from ESBMC GOTO syntax into IBEX syntax, collecting a list of variables and a list of constraints (sec. IV-A, PDF p. 6); only one constraint is handled at a time (sec. IV-E, PDF p. 7).
2. Build an interval for each variable in the assertions; the implementation uses ESBMC's `--interval-analysis` option and parses each `assume` it inserts, updating the interval of any listed variable (sec. IV-B, PDF p. 6).
3. Apply the outer contractor to the property. If the result is empty, retain the original program; otherwise set `Sout = [x]\[x]'` (Algorithm 5, PDF p. 5).
4. Apply the inner contractor to `[x]'` using the complementary constraint (`f(x) > 0` or `f(x) ≠ 0`). Set `Sin = [x]'\[x]''` and `Sboundary=[x]''` (Algorithms 4–5, PDF p. 5).
5. Instrument the GOTO program with `assume(expr)` constraining the search to `Sout ∪ Sboundary`. If `Sin` is at the end of the loop, the `assume` removes the unnecessary loop steps; the beginning and middle cases are deferred to sec. V-E (sec. III, PDF p. 5). BMC then searches for a counterexample in `Sout` and `Sboundary`.

Verus form: Inference: encode the skipped-loop region as a proved inductive predicate and put that predicate in a Verus loop `invariant`; use `assert`/`ensures` to show that skipping preserves the postcondition. A raw `assume` is trusted by BMC and therefore must not be copied into verified Rust without a proof of the skipped region.

Evidence and limits: Figure 6’s inner example contracts `[x2]` from `[0,30]` to `[20,30]` for `x≥y`, pruning the `Sin` region (sec. III, PDF pp. 4–5). On `afnp2014.c` (Fig. 9) the outer contractor returns the same domain (`Sout = ∅`), the inner contractor reduces `[1,Maxint]×[0,1000]` to `[1,1000]×[1,1000]`, and `assume(x <= 1000)` is inserted inside the loop (Figs. 9–11, PDF pp. 5–6). The paper says it applies the contractor only if the contracted area is at the end of the loop; for a reduction from the lower bound it states it cannot guarantee correctness because the method cannot reason about the minimum number of loop iterations (sec. V-E, PDF p. 9).

Quote: “With Sout , Sin and Sboundary , now we can instrument the program for the BMC engine to search for a counterexample in Sout and Sboundary while removing Sin from the search-space.” (sec. III, PDF p. 5)

## technique: monotonicity-aware loop pruning
What: use interval contraction to skip loop iterations only when the variable evolution is monotone and the guaranteed-safe interval occurs at the loop’s end. A non-monotone variable can return to the skipped region, invalidating the instrumentation.

How:
1. Decide whether the relevant loop variable is monotone: in Fig. 14 `y` that only increments is monotone, while `y` that may increment and decrement is not (sec. V-E, PDF p. 9). The paper does not describe the detection procedure beyond calling it "naive" (sec. V-D, PDF p. 7).
2. Contract only when the removed region is at the end of the loop, i.e. the interval was reduced from the upper bound so that iterations beyond it can be skipped; a reduction from the lower bound, or in the middle for a non-monotone variable, is not contracted (sec. V-E, PDF p. 9).
3. Place the `assume` inside the loop where the variables change (Fig. 11, PDF p. 6; sec. III, PDF p. 5).
4. Do not apply the contractors when the property has an unsupported operator (sec. IV-E, PDF p. 7; sec. V-D, PDF p. 8).

Evidence and limits: The paper says "we do not deal with multiple lengthy loops in this version" (sec. V-D, PDF p. 8), attributes the cases where contractors could not be applied to "our naive approach to detecting monotonicity" and a supported-operator subset (PDF p. 7), and reports a false negative in one bitvectors benchmark that "represents the overflow problem" (PDF p. 8). Unsupported operators are `!=`, `==`, `&&`, `||` (sec. IV-E, PDF p. 7). The paper says the correct and incorrect result counts "were maintained by a margin of 0.01%" and concludes soundness and completeness are preserved (EG2, sec. V-D, PDF p. 8). Inference: given the reported false negative, that claim holds only empirically on this benchmark set and is not a proof of soundness. Inference: Table I's BitVectors score falls from 55 to 24 (PDF p. 8), which is consistent with that false negative but the paper does not say so.

## evidence, trust, and product relevance
The evaluation uses 7,044 SV-COMP 2022 unreach-call tasks, ESBMC on an Intel Xeon E5-2620 v4 with 160 GB RAM, 900-second and 15-GB per-task limits, and BenchExec measurements (sec. V-B–C, PDF p. 7). Table I (PDF p. 8) reports per-category scores and CPU seconds; Table III (PDF p. 10) reports memory in MB. The total memory is 11,615,197 MB with contractors versus 46,649,636 MB for ESBMC incremental-BMC v6.9, a 75% reduction (Table III, PDF p. 10). Table III also shows higher memory with contractors in BitVectors (-10%), ControlFlow (-23%), ECA (-2%), Heap (-16%), and Recursive (-9%). Inference: DeviceDriversLinux64 (7,045,822 vs 40,824,348 MB) accounts for about 96% of the total memory saved, so the 75% figure is dominated by one category. The abstract’s “verifying 1% more verification tasks” has no explicit denominator in the abstract; the conclusion instead states 32 more successful benchmarks. These are different presentations of the same benchmark suite and should be treated as the paper’s own approximate summary. The conclusion also says memory usage fell "by various orders of magnitude" (PDF p. 10); Inference: 75% is about a 4x reduction, which does not match that wording. In the loops category the paper reports an improvement of "at least 2%" over ESBMC (669 vs 652, Table II, PDF pp. 8–9), and the lead over other tools in only two subcategories, XCSP and AWS-C-Common (PDF p. 7).

## techniques for the catalog
- incremental BMC — unroll transition systems and increase the bound until a counterexample or completion threshold
- forward-backward contractor — propagate interval constraints forward and backward to contract a variable box
- outer/inner decomposition — separate guaranteed failures, guaranteed successes, and an undecided boundary
- monotonicity-aware instrumentation — insert `assume` only for safe tail regions of monotone loops
- syntax and interval filtering — disable contraction when operators or interval precision are unsupported
