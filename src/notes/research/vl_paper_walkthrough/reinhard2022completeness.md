# Completeness Thresholds for Memory Safety of Array Traversing Programs: Early Technical Report
Inference: (authored by agents unless marked 🧑)
Tag: `reinhard2022completeness`, [paper](http://arxiv.org/abs/2211.11885v3)

## what is proved or measured
Inference: This technical report defines completeness thresholds for quantified assertions and for program memory-safety proofs. A threshold is a restricted set of values such that proving the property on that set implies proving it on the full domain. The target programs manipulate heap arrays, use loops, and do not allocate or free memory. The report says: “We present the first notion of completeness thresholds for program verification which reduce unbounded memory safety proofs to bounded ones.” (section 1, p. 2). It develops weakest liberal preconditions, precision conditions, elimination/slicing lemmas, an iterative workflow, and a reusable bounded-array-access lemma. The report is explicitly ongoing work; it does not give a completed implementation or empirical benchmark.

## technique: weakest-liberal-precondition verification condition
Inference: What it is: derive a verification condition (VC) from `{M} c` using `wlp`, then prove the VC instead of enumerating executions. Definition 7.1 requires `vc` to imply `safeA(M,c)`. The paper states: “In general, vc describes an over-approximation of all possible program behaviours.” (section 7, p. 12)

Inference: How: (1) define heap commands, assertions, and memory-error semantics; (2) define `safeA(a,c)` as safety for every valuation satisfying assertion a; (3) recursively compute `wlp` for expressions, lets, conditionals, while loops, for loops, loads, stores, and heap commands; (4) quantify free variables over their types; (5) prove the resulting assertion. The loop clauses require an invariant and separate preservation and exit obligations. For a `for x in [e1 to e2] inv I do c`, the paper's wlp includes `I`, preservation of `I` for every in-range x, and the postcondition under loop exit (section 7.1, pp. 13–14).

Inference: Verus form: Inference: use executable Rust with `requires`, `ensures`, and `invariant` clauses on loops, then let Verus generate SMT obligations. A Verus loop invariant is written as an annotation such as `invariant 0 <= i <= a.len()`; `wlp` is a mathematical derivation in the report, not a Verus syntax feature. The report's separating-heap assertions require a logical model of ownership; use only constructs already supported by the project's Verus notes and prove the necessary view lemmas.

## technique: threshold for quantified assertions
Inference: What it is: Definition 8.1 calls `R ⊆ T` a completeness threshold for `Q x ∈ T. a` when validity over R implies validity over T. Definition 8.2 lifts this to program safety: safety for every input in R implies safety for every input in the full type. Precision (Lemma 8.3) is the bridge: if the VC is precise in x and R is a VC threshold, R is a program threshold.

Inference: When to use it: use this when an unbounded input variable affects only finitely many semantic cases. First prove a threshold for the VC, then prove precision before claiming a threshold for the program. The paper warns that a threshold for a non-precise VC alone is insufficient for the actual program (section 8, pp. 14–15).

Inference: How: (1) formulate `∀x ∈ T. vc`; (2) partition T into classes whose substituted VC has the same validity; (3) choose one representative from each class; (4) show validity on representatives plus the unrepresented remainder implies validity on T; (5) apply Lemma 8.3 if precision holds. Lemma 8.4 formalizes the representative collapse when all values in a subset R have equivalent validity; Corollary 8.5 gives `(T \ R) ∪ {r}` as a threshold.

Inference: Verus form: Inference: encode a finite representative set as a ghost theorem over the input domain and prove that every input either is a representative or has a validity-preserving equivalence lemma. Verus does not automatically turn an unbounded integer domain into finite cases; the equivalence and arithmetic lemmas are user proof obligations.

## technique: VC slicing and threshold elimination
Inference: What it is: if a VC factors as `vca * vcb` for separate arrays and x occurs only in `vca`, threshold extraction can ignore `vcb`. Lemma 8.8 proves elimination when the validity of the other factor is unaffected by x; Corollary 8.9 states the slicing form when x is not free in the other factor.

Inference: How: (1) rewrite the VC as a separating conjunction of subformulas; (2) identify the subformula that contains the target variable; (3) prove the other subformula's validity is independent of that variable; (4) extract a threshold on the relevant slice; (5) reuse it for the full VC. The report's array example explicitly separates memory-safety obligations for arrays a and b (section 8, pp. 16–17).

Inference: Verus form: Inference: represent disjoint slices with separate views and prove frame lemmas showing that changing one length or index does not affect the other view. Then apply the threshold lemma to the affected slice. Rust aliasing and ownership may make the disjointness easier to establish, but the logical independence proof remains necessary.

## technique: iterative threshold extraction
Inference: Workflow 8.10 gives a concrete procedure: (1) compute a VC, e.g. with wlp; (2) for each variable xi, maintain the threshold set R; (3) rewrite the VC as `∀x ∈ R. vc`; (4) slice out a subformula vci whose validity depends on xi; (5) manually apply a proved pattern or derive a new threshold; (6) repeat until the threshold no longer improves. The paper says: “This step yields a completeness threshold Ri′ which, in the worst case, does not yield an improvement.” (section 8.1, p. 18)

Inference: Verus form: Inference: keep the threshold as a ghost finite-domain lemma and apply each extracted restriction sequentially to array lengths, loop bounds, and indices. The workflow is proof planning around Verus obligations, not a runtime optimization.

## technique: bounded unconditional array-access lemma
Inference: Lemma 8.11 considers `vc(s) = ∀i. a ≤ i < s+b → 0 ≤ i+z < s`. For any integer r with `r > a-b`, proving `vc(r)` is enough for all s. The proof splits `s ≤ a-b`, where the antecedent is false, from `s > a-b`, then factors the formula into an s-independent lower-bound part and an upper-bound part. The paper concludes: “That is, {r} is a completeness threshold for vc(s).” (section 8.2, pp. 18–19)

Inference: How: normalize the implication; distribute conjunction; isolate terms without s; show small s is vacuous; choose any representative r beyond the cutoff. This pattern applies to bounded, unconditional array accesses and is intended for automation once more patterns are catalogued.

Inference: Verus form: Inference: prove a generic arithmetic lemma with `requires r > a - b` and `ensures` that the loop-bound safety predicate for r implies it for every s; instantiate it at the array length representative. Use `assert` and linear arithmetic proof blocks. The report's notation `∗` and quantified heap assertions are not Verus syntax.

## assumptions, trust, and product implication
Inference: The report assumes well-typed programs, an array predicate with the stated heap semantics, sound VC generation, and precision where a program threshold is claimed. It treats stuck well-typed executions without memory errors as outside the safety property. It reports no denominated experiments, solver timings, or implementation success rates; its roadmap says the work is ongoing (section 9, p. 19). Inference: the useful product technique is proof-size reduction for loops over unbounded slices, provided a human proves the threshold pattern and its preconditions. Inference: threat to agent-written verified Rust is low to medium: thresholds can make proofs faster, but an incorrect precision or slicing lemma could hide a real out-of-range case. VL should not redo the definitions of threshold, precision, elimination, and the bounded-access pattern; a Verus library of checked threshold lemmas and an extractor for Verus VCs remain open.

## techniques for the catalog
- weakest-liberal-precondition VC — derive a memory-safety assertion recursively from commands and loop invariants
- completeness-threshold reduction — prove a quantified property on a representative restriction that implies the full-domain property
- precision bridge — require VC precision before transferring a VC threshold to program safety
- VC slicing/elimination — isolate the subformula affected by an input and reuse its threshold for the full VC
- iterative extraction — repeatedly refine thresholds variable by variable until no further reduction occurs
- bounded array-access lemma — collapse array-size checks to any representative above the proven cutoff
Checked 2026-10-15 against paper reinhard2022completeness: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
