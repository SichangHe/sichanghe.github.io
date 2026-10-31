# Deciding and Interpolating Algebraic Data Types by Reduction (Technical Report)
(authored by agents unless marked 🧑)
Tag: `hojjat2018deciding`, [paper](http://arxiv.org/abs/1801.02367v1)

## scope and result

This paper decides quantifier-free recursive algebraic data type (ADT) constraints by reducing them to equisatisfiable formulas over equality with uninterpreted functions (EUF) and linear integer arithmetic (LIA). It also derives Craig interpolants from EUF+LIA interpolants and extends the method to ADT size constraints through incremental unfolding. The abstract says: “We show that the reduction approach gives rise to both decision and Craig interpolation procedures in (extensions of) ADTs.” (abstract, p. 1)

The target is a practical solver architecture: reuse mature EUF and LIA engines instead of implementing a native ADT solver. The paper's introduction states: “The reduction can be implemented with little effort, and is widely applicable since EUF and LIA are supported by virtually all SMT solvers, and increasingly also by other theorem provers.” (section I, p. 1) The reduction is structure-preserving but introduces auxiliary integer functions for constructor identity and depth.

Inference: this is directly relevant to Verus proofs over enums, recursive specs, and sequences when a backend needs ADT satisfiability or interpolants. It does not describe Verus, and a translation from Verus `Seq`/`Map` values to these ADT encodings would be an additional trusted layer.

## technique: flatten ADT formulas

The reduction assumes the ADT formula is flat and in negation normal form. A formula is flat if constructors and selectors occur only in equations `g(x1,...,xn) ≈ x0` with variables as arguments and result, and only in positive positions; flattening costs a linear number of additional variables (section IV, p. 3). The list example (Example 2, p. 3) introduces variables `t1` for `blue`, `t2` for `red`, and `t3` for `nil` before reduction.

The paper's reduction proceeds as follows (the numbered order is this study's summary of sections IV-A and Table I, not a list given by the paper):

1. flatten every constructor/selector occurrence with fresh sorted variables (section IV, p. 3)
2. convert the formula to negation normal form (section IV-A, p. 4)
3. introduce an integer variable `x̃` for each ADT variable `x:σ` (section IV-A, p. 4)
4. exhaustively apply the constructor, selector, tester, equality, and disequality rules (1)–(6) at positive positions, handling negated testers explicitly (Table I, p. 4)
5. conjoin range constraints `In_σ(x̃)` for each variable of a finite sort; `In_σ(x) = 0 ≤ x < |T_σ|` for finite sorts and `true` otherwise (Table I and the definition of the reduct, p. 4)
6. solve the resulting EUF+LIA formula with an existing solver (Theorem 1, p. 5)

## technique: encode constructors, selectors, testers, and acyclicity

For each constructor `f:σ1×…×σn→σ0` the reduction introduces an integer-valued uninterpreted function `f̃`; for each selector a unary function `f̃_j`; and for each sort `σ` a function `ctorId_σ` (to encode testers) and a function `depth_σ` (to ensure acyclicity) (section IV-A, p. 3). `CtorSpec_f` asserts that `f̃` reconstructs the result, selectors recover each argument, the constructor ID is `Id_f`, and the result depth exceeds each child depth (Table I, p. 4). The depth inequalities prevent a term from being a sub-term of itself.

Rule (1) translates a constructor equation with `CtorSpec_f`. Rule (2) translates a selector equation `f_j(x) ≈ y` into `f̃_j(x̃) ≈ ỹ` plus a disjunction of `ExCtorSpec_g` over every constructor `g` of the sort of `x`. Rule (3) translates `is_f(x)` with `ExCtorSpec_f`, which existentially quantifies fresh constructor arguments; these quantifiers are removed by Skolemisation (Example 3). Rule (4) translates `¬is_f(x)` with the disjunction of `ExCtorSpec_g` for all `g ≠ f`. Rules (5) and (6) translate equalities and disequalities by renaming variables (Table I, p. 4). The paper's correctness theorem is: “The reduct φ̃ of a flat ADT formula φ in NNF is satisfiable (over EUF+LIA) if and only if φ is satisfiable (over an ADT).” (Theorem 1, section IV-B, p. 5)

The proof of the easy direction embeds the term domains injectively into the integers. The proof of the other direction builds a set of relevant integer indices and an injective map from them to constructor terms, using a `dep` function over the model and the acyclicity guaranteed by the depth encoding (section IV-B, p. 5). The paper notes that the depth functions need not be assumed positive (p. 5) and that the arithmetic constraints fall in the UTVPI fragment (p. 5).

Inference: a Verus encoding could map an enum constructor to a ghost tag and fields, with a recursive `spec fn` describing selectors and a well-founded depth measure. The paper's EUF functions are solver artifacts; they should not be exposed as executable Rust operations.

## technique: optimize the reduction

The disjunction in rule (2) can be dropped, giving `f_j(x) ≈ y ⇒ f̃_j(x̃) ≈ ỹ` (rule 2'), whenever the selector literal is guarded: it occurs in conjunction with a (positive or negative) test `is_g(x)`, or with a constructor literal `g(x1,...,xn) ≈ x`, regardless of whether `f = g` (section IV-C, p. 5). Example 5 (p. 6) shows the full rule is needed when `x.head` and `x.tail` occur unguarded. For finite sorts, in particular enumerations (only nullary constructors), each constructor `f` can be mapped directly to its index (`f ≈ x0 ⇒ Id_f ≈ x̃0`, rule 1'), and testers reduce to simple arithmetic comparisons (section IV-C, p. 6).

For size, the paper states that the reduction is linear in the ADT size `n`: `|φ̃| ∈ O(n·|φ|)`, linear if the ADT is fixed (section IV-D, p. 6). The authors measured size on the 8,000 randomly generated ADT benchmarks from [2] (Barrett, Shikanian, Tinelli); 4,422 are unsatisfiable. Average formula size, counted as the number of sub-expressions, was 76 after parsing, 337 after reduction, and 34 after reduction plus simplification with the standard EUF+LIA simplifier in Princess. The paper concludes that reduction increased size by a factor of 4.5, but simplification more than offset this. Of the 4,422 unsatisfiable problems, 4,334 were directly simplified to `false`. The remaining 3,666 problems (of all 8,000, not only unsatisfiable ones) averaged size 74 after reduction and simplification, “incidentally the same as the average initial size of all benchmarks” although the table gives 76 after parsing. The paper says the benchmarks are not very challenging: the most complicated was solved in around 1 s, and the average solving time of 43 ms was dominated by parsing and pre-processing (section IV-D, p. 6). A comparison with other SMT solvers on a larger benchmark set was “ongoing”, so these are not a head-to-head speedup result.

## technique: generate Craig interpolants through the reduction

For an unsatisfiable `φA ∧ φB`, an interpolant is a formula `I` with `φA ⇒ I`, `φB ⇒ ¬I`, and only variables common to both. The method computes an EUF+LIA interpolant `Ĩ` for the reduced conjunction `φ̃A ∧ φ̃B`, then translates it back to an ADT interpolant (section V, p. 6). The paper lists three points to address in the back-translation: (1) `Ĩ` may contain arithmetic on ADT terms; (2) the `ctorId_σ` functions are not ADT operations and are translated back to testers; (3) `Ĩ` may mention `depth_σ`, which has no counterpart in ADTs. The paper's choice for (3) is not to eliminate depth but to “embrace” it as an extension of ADTs, which leads to the size-constraint treatment below (section V, p. 6). The list example (Example 6, p. 6) has the left part `x.is_cons & x.tail = z & z.is_cons & x.head != z.head`, the right part `x = cons(c, cons(c, y))`, and the interpolant `x.head != x.tail.head` over the only common variable `x`.

Point (1) is a non-issue for infinite sorts, since the reduction uses no arithmetic on them (each could be mapped to a fresh uninterpreted sort). For finite sorts, the predicates `In_σ` are cardinality constraints that can contribute to unsatisfiability. One solution is a fixed mapping of terms to integers, as in the enumeration optimisation, but footnote 3 states that the implementation does this only for enumerations, not for other finite sorts (section V, p. 6). The paper says that to its knowledge its Princess implementation is the first proof-based interpolation procedure for ADTs (section I, p. 2).

Inference: Verus could consume an interpolant as a ghost lemma or candidate invariant over enum tags and sequence fields. Interpolant translation is a synthesis aid, not a proof of the Rust implementation; the concrete-to-ADT abstraction still needs a Verus refinement lemma.

## technique: handle ADT size constraints with unfolding

Size `|t|` of a term is the number of constructor occurrences. Adding a size operator introduces two issues: constructor terms might not exist for all sizes, and even where terms of size `n` exist there might be too few of them to satisfy a formula (section VI, p. 7). Issue (i) is addressed by the size image `S_σ = {|t| | t ∈ T_σ}`, which is semi-linear because the ADT can be read as a context-free grammar over a singleton alphabet; an existential Presburger representation can be derived from the constructors in linear time [18] (section VI-A, p. 7). Table II (p. 8) replaces `depth_σ` by a function `size_σ`, changes `CtorSpec_f` to `CtorSpec'_f` so that the result size equals `1 +` the sum of child sizes with each child size in its size image, and adds rule (7): `|x| ≈ y ⇒ size_σ(x̃) ≈ y ∧ y ∈ S_σ`.

Lemma 1 (p. 7): if the reduct of a flat NNF formula with size constraints is unsatisfiable, so is the formula. The converse fails: the reduct of the formula in Example 8 (`\size(x) = 3 & \size(y) = 3 & x != y` over the positive natural numbers) is satisfiable while the formula is unsatisfiable, so reduction alone is not sound for satisfiability, because it does not precisely translate the number of terms of each size (section VI-A, p. 7). The paper follows incremental unfolding from [17]:

1. set `φ0 = φ` (section VI-A, p. 7)
2. choose an ADT variable `x : σ` occurring in the current formula `φ_{i-1}` (section VI-A, p. 7)
3. set `φ_i = φ_{i-1} ∧ ⋁ f_j(x_j1, x_j2, ...) ≈ x`, the disjunction over all constructors `f_j` of sort `σ` with fresh argument variables (section VI-A, p. 7)
4. in practice, pick the next variable to unfold from a model of the previous partial unfolding, until enough terms have been constructed or unsatisfiability is detected (section VI-A, p. 7)
5. by Lemma 2 (p. 7), stop with “unsatisfiable” when some reduct `φ̃_i` is unsatisfiable; stop with “satisfiable” when `φ̃_i` has a model in which every ADT variable `x : σ` in `φ_i` has the same value as some unfolded variable `y ∈ U_i` of sort `σ`

For Example 8, unsatisfiability is detected after unfolding `x` and `y` three times each (Example 9, p. 7).

## technique: characterize when unfolding terminates

Definition 1 (p. 8): a sort is expanding if for every natural `n` there is a bound `b` such that for every `b' ≥ b` the set of its terms of size `b'` is either empty or has at least `n` elements; an ADT is expanding if all its sorts are. The natural numbers (Example 8) are not expanding. Lemma 3 (p. 8) states that systematic unfolding terminates (one of the cases of Lemma 2 eventually applies) for all formulas if and only if the ADT is expanding. Example 10 (p. 8) shows `\size(x) = \size(y) & x != y` over the natural numbers cannot be refuted by finitely many unfoldings.

The paper's characterisation (section VI-C, pp. 8–10) assumes every sort contains at least two constructor terms. It uses the bipartite dependency graph `D` with vertices the sorts and the constructors, and edges `(σ0, f_j)` and `(f_j, σ1), ..., (f_j, σn)` for each constructor `f_j : σ1 × ... × σn → σ0` (Fig. 1, p. 8). Theorem 2 (p. 9): an ADT is not expanding if and only if `D` contains a simple cycle `σ1 → f1 → σ2 → f2 → ... → fn → σ1` such that:

1. the cycle is the only path from `σ1` to itself (every cycle through `σ1` repeats it)
2. all constructors `f1, ..., fn` on the cycle are unary
3. the cycle contributes unboundedly to the size image: `S_σ1 ≠ {0,...,k}·n + ⋃_{i=1..n} (S^{f_i}_{σ_i} + i − 1)` for all `k`, where `S^f_σ` is the size image restricted to terms not starting with `f`

The paper notes that non-expanding ADTs are a corner case: “all non-expanding ADTs more or less look like the natural numbers (Example 8), and most other practical ADTs are expanding”, and both sorts of Example 1 expand (p. 8). Example 12 (p. 9) gives a cycle of length 2 that is non-expanding and a cycle of length 3 that is expanding. The conclusion adds that, as a side effect of Theorem 2, termination for non-expanding ADTs can be obtained by replacing the cycle with an explicit counter over a built-in type of natural numbers (section VII, p. 10).

Inference: using the criterion in practice means building `D`, finding the simple cycles that satisfy conditions 1 and 2 (the paper proves the characterisation but gives no algorithm for checking condition 3), and, for ADTs classified as non-expanding, switching to explicit counters rather than relying on unfolding.

## evidence, limits, and trust

The reduction's main evidence is Theorem 1's equisatisfiability proof and the interpolation construction (sections IV–V, pp. 5–6). The benchmark evidence is the size measurement on 8,000 random formulas described above; no correctness percentage or comparison against native ADT solvers is reported, and the solver comparison is stated as ongoing (section IV-D, p. 6). Size-constraint handling has a soundness lemma for unsatisfiability (Lemma 1), a soundness lemma for the unfolding stopping conditions (Lemma 2), and a termination characterisation for expanding ADTs (Lemma 3, Theorem 2); reduction alone is not sound for satisfiability (section VI-A, p. 7). Assumptions stated in the paper include absolutely free constructors, well-defined (nonempty) sorts, and quantifier-free input in the supported ADT signature (section II, p. 2). The conclusion says integration into the model checker Eldarica was in progress and that combining ADTs with quantifiers and recursively defined functions “requires further work” (section VII, p. 10).

## techniques for the catalog

- flat ADT reduction — flatten recursive constructors and reduce constructor, selector, tester, and equality constraints to EUF+LIA
- constructor/depth encoding — use uninterpreted constructor functions, IDs, selectors, and depth inequalities to enforce free acyclic terms
- reduction optimization — simplify guarded selectors and encode finite enumerations directly as integer IDs
- ADT interpolation — compute EUF+LIA interpolants and translate constructor-ID functions back to testers; depth terms are kept as an ADT extension
- size-aware unfolding — add semilinear size constraints and incrementally unfold variables until a model is represented or contradiction appears
- expanding-ADT criterion — classify when unfolding is complete using unary-cycle structure in the sort/constructor dependency graph
