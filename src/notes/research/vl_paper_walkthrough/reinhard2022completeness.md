# Completeness Thresholds for Memory Safety of Array Traversing Programs: Early Technical Report
Inference: (authored by agents unless marked 🧑)
Tag: `reinhard2022completeness`, [paper](http://arxiv.org/abs/2211.11885v3)

## what is proved or measured
Inference: This technical report defines completeness thresholds for quantified assertions and for program memory-safety proofs. A threshold is a restricted set of values such that proving the property on that set implies proving it on the full domain. The target programs manipulate heap arrays, use loops, and do not allocate or free memory. The report says: “We present the first notion of completeness thresholds for program verification which reduce unbounded memory safety proofs to bounded ones.” (section 1, p. 2). It develops weakest liberal preconditions, precision conditions, elimination/slicing lemmas, an iterative workflow, and a reusable bounded-array-access lemma. The report is explicitly ongoing work; it does not give a completed implementation or empirical benchmark.

## technique: weakest-liberal-precondition verification condition
Inference: What it is: derive a verification condition (VC) from `{M} c` using `wlp`, then prove the VC instead of enumerating executions. Definition 7.1 requires `vc` to imply `safeA(M,c)`. The paper states: “In general, vc describes an over-approximation of all possible program behaviours.” (section 7, p. 13)

Inference: How: (1) define heap commands, assertions, and memory-error semantics; (2) define `safeA(a,c)` as safety for every valuation satisfying assertion a; (3) recursively compute `wlp` for expressions, lets, conditionals, while loops, for loops, loads, stores, and heap commands; (4) quantify free variables over their types; (5) prove the resulting assertion. The loop clauses require an invariant and separate preservation and exit obligations. For a `for x in [e1 to e2] inv I do c`, the paper's wlp includes `I`, preservation of `I` for every x with `e1 ≤ x < e2`, and the postcondition under loop exit (section 7.1, p. 14). The paper notes that its for-loop precondition "does not allow the postcondition to depend on the knowledge that any work was done" and calls it sufficient for "array-traversing programs that do not allocate nor free memory" (section 7.1, p. 14). Inference: the report does not prove that its wlp satisfies Definition 7.1, so soundness of VC generation is assumed, not shown.

Inference: Verus form: Inference: use executable Rust with `requires`, `ensures`, and `invariant` clauses on loops, then let Verus generate SMT obligations. A Verus loop invariant is written as an annotation such as `invariant 0 <= i <= a.len()`; `wlp` is a mathematical derivation in the report, not a Verus syntax feature. The report's separating-heap assertions require a logical model of ownership; use only constructs already supported by the project's Verus notes and prove the necessary view lemmas.

## technique: threshold for quantified assertions
Inference: What it is: Definition 8.1 calls `R ⊆ T` a completeness threshold for `Q x ∈ T. a` when validity over R implies validity over T. Definition 8.2 lifts this to program safety: safety for every input in R implies safety for every input in the full type. Precision (Lemma 8.3) is the bridge: if the VC is precise in x and R is a VC threshold, R is a program threshold.

Inference: When to use it: use this when an unbounded input variable affects only finitely many semantic cases. First prove a threshold for the VC, then prove precision before claiming a threshold for the program. The paper says that finding a threshold for a non-precise VC "does not allow us to conclude that we found a completeness threshold for the actual program", but that it can still be used when the assertion actually proved is at least as strong as the VC (section 8, p. 15).

Inference: How: (1) formulate `∀x ∈ T. vc`; (2) find a subset `R ⊆ T` on which the choice of x does not change the validity of vc, i.e. `⊨ vc[x ↦ v1] ⇔ ⊨ vc[x ↦ v2]` for all `v1, v2 ∈ R`; (3) pick any representative `r ∈ R`; (4) the set `(T \ R) ∪ {r}` is then a threshold (Lemma 8.4, Corollary 8.5, section 8, pp. 15–16); (5) apply Lemma 8.3 if the VC is precise, to get a threshold for the program. Note that `(T \ R) ∪ {r}` is in general not finite; only for suitable R is the result small.

Inference: Verus form: encode the collapse as a ghost lemma over the input domain: prove that all values in R give equivalent validity, then conclude from the representative `r` and the values outside R. Verus does not automatically turn an unbounded integer domain into finite cases; the equivalence and arithmetic lemmas are user proof obligations.

## technique: VC slicing and threshold elimination
Inference: What it is: if a VC factors as `vca * vcb` for separate arrays and x occurs only in `vca`, threshold extraction can ignore `vcb`. Lemma 8.8 proves elimination when the validity of the other factor is unaffected by x (`∀v ∈ T. (⊨ a′ ⇔ ⊨ a′[x ↦ v])`); Corollary 8.9 states the slicing form when x is not free in the other factor (section 8, p. 17).

Inference: How: (1) rewrite the VC as a separating conjunction of subformulas; (2) identify the subformula that contains the target variable; (3) prove the other subformula's validity is independent of that variable; (4) extract a threshold on the relevant slice; (5) reuse it for the full VC. The report motivates this with a prose example of a program traversing arrays a (size sa) and b (size sb), whose VC takes the form `vca ∗ vcb` (section 8, p. 17); it gives no worked instance. It also notes that when the two arrays are entangled, "we have no choice but to analyse the entire formula".

Inference: Verus form: Inference: represent disjoint slices with separate views and prove frame lemmas showing that changing one length or index does not affect the other view. Then apply the threshold lemma to the affected slice. Rust aliasing and ownership may make the disjointness easier to establish, but the logical independence proof remains necessary.

## technique: iterative threshold extraction
Inference: Workflow 8.10 (section 8.1, p. 18) gives a concrete procedure: (1) compute a VC of the form `∀x ∈ T. vc`, e.g. with weakest preconditions; (2) for each variable xi: (a) let R be the threshold extracted so far, initially T; (b) bring `∀x ∈ R. vc` into the form of a separating conjunction of subformulas vcj; (c) identify a subformula whose validity is not affected by the choice of xi, so that `∀x ∈ R. vc ≡ ∀x ∈ R. vci ∗ vc′` and only `∀x ∈ R. vci` needs analysis; (d) extract a threshold from vci, manually or by a previously proved pattern; (e) repeat until the threshold does not improve. The iteration rests on Lemma 8.6 and Corollary 8.7 (transitivity of thresholds for a fixed variable, p. 16). The paper says: “This step yields a completeness threshold Ri′ which, in the worst case, does not yield an improvement.” (section 8.1, p. 18)

Inference: Verus form: keep each extracted threshold as a ghost lemma and apply each extracted restriction sequentially to array lengths, loop bounds, and indices. The workflow is proof planning around Verus obligations, not a runtime optimization.

## technique: bounded unconditional array-access lemma
Inference: Lemma 8.11 considers constants `z, a, b ∈ Z` and `vc(s) = ∀i ∈ Z. a ≤ i < s+b → 0 ≤ i+z < s`. For any integer r with `r > a-b`, `⊨ ∀s ∈ Z. vc(s)` iff `⊨ vc(r)`. The proof splits `s ≤ a-b`, where the antecedent is false, from `s > a-b`, then rewrites the formula into a conjunction `vc+` in which s no longer occurs. The lemma states: “That is, {r} is a completeness threshold for vc(s).” (section 8.2, p. 18). Inference: the printed proof has slips: its last line writes “r > l − r” instead of `r > a − b` and cites “Lem. 8.5” where Corollary 8.5 is meant (p. 19). I did not independently verify the algebra of the rewriting steps, so re-prove the lemma before relying on it.

Inference: How: normalize the implication; distribute conjunction; isolate terms without s; show small s is vacuous; choose any representative r beyond the cutoff. This pattern applies to bounded, unconditional array accesses and is intended for automation once more patterns are catalogued.

Inference: Verus form: Inference: prove a generic arithmetic lemma with `requires r > a - b` and `ensures` that the loop-bound safety predicate for r implies it for every s; instantiate it at the array length representative. Use `assert` and linear arithmetic proof blocks. The report's notation `∗` and quantified heap assertions are not Verus syntax.

## techniques for the catalog
- weakest-liberal-precondition VC — derive a memory-safety assertion recursively from commands and loop invariants
- completeness-threshold reduction — prove a quantified property on a representative restriction that implies the full-domain property
- precision bridge — require VC precision before transferring a VC threshold to program safety
- VC slicing/elimination — isolate the subformula affected by an input and reuse its threshold for the full VC
- iterative extraction — repeatedly refine thresholds variable by variable until no further reduction occurs
- bounded array-access lemma — collapse array-size checks to any representative above the proven cutoff
