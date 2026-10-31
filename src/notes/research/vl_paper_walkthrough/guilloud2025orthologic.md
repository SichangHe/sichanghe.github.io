# Verified and Optimized Implementation of Orthologic Proof Search
(authored by agents unless marked 🧑)
Tag: `guilloud2025orthologic`, [paper](https://doi.org/10.1007/978-3-031-98682-6_8)

## what the paper establishes

The paper formalizes ortholattices and a sequent calculus for orthologic in Coq, proves soundness, completeness, and cut elimination, then verifies a proof-search decision procedure and builds tactics on it. The abstract states: “We then implement and verify a complete proof search procedure for orthologic.” (Abstract, p. 130) Orthologic “sacrifices completeness (with respect to classical semantics) in exchange for guaranteed efficiency and predictability” (§1, p. 131).

The main engineering contribution is turning an exponential recursive search into a quadratic procedure by verified memoization and simulated reference equality, then using reflection or proof-producing tactics (Abstract, p. 130). Inference: these are verifier-building techniques rather than Rust program specifications.

## technique: dependent proof objects and cut elimination

What it is and when to use it. Encode proof-system derivations as dependent inductive types so malformed proofs cannot be constructed. Prove cut elimination to obtain the subformula property needed for finite search. The paper says: “We implement the proof system using dependent inductive types, so that the correctness of a proof is guaranteed by construction, and no additional proof-checking function is required.” (§2, p. 135)

How to do it.

1. Define ortholattices as a typeclass, then ortholattice terms and their evaluation, then represent sequents as ordered pairs of annotated formulas (N: no formula, L: left, R: right) (§2, pp. 134–135).
2. Define each sequent rule as a constructor of a dependent inductive proof type; add Swap and Contract rules to simulate set-like sequents (§2, pp. 135–136).
3. Prove soundness and completeness of the calculus against inequalities in every ortholattice; the paper calls both “straightforward to prove” (§2, p. 136).
4. Prove cut elimination by double induction: first on the number of cuts (`fuelCut`), then on proof size (`fuelSize`), reducing to a single final Cut with cut-free premises; that case is again a double induction, on the size of the cut formula (`fuelB`) and then on the total size of the two premise proofs (`fuelSize`) (§3, p. 136).
5. Use the resulting subformula property: the depth of a proof of a sequent of size `n` “will never exceed 4n2” (rendered 4n² in the PDF) (§4, p. 139).

Verus form. Inference: Represent proof derivations as Rust enums whose variants carry the premises required by each rule, and use Verus `requires`/`ensures` on constructors or proof functions to state rule soundness. A cut-elimination transformation can be a recursive `proof fn` with `decreases` measures for cut count, formula size, and proof size. Inference: Verus does not automatically enforce dependent indices as Coq does; the indices and well-formedness facts must be ghost data and preconditions.

Evidence and limits. The Swap rule makes the naive case analysis exceed 500 cases (23 cases each for the two premises); dependent types eliminate impossible combinations, and “the formal proof contains around 200 cases” (§3, pp. 137–138). The formalization found a case, involving an implicit contraction, “that was not properly considered in the paper proof of [12]” (§3, p. 138). Inference: the theorem concerns orthologic only; it does not establish classical completeness.

## technique: optimized proof search with necessary-rule pruning

What it is and when to use it. A backward search recursively tries rules that can conclude a sequent. Before memoization, eliminate redundant branching: when a rule is necessary, do not try alternatives; unfold Swap and track flags against Contract and Weaken loops. The paper reports the result is still exponential: “The algorithm still has an exponential runtime” of O(2^(n²)) (§5, p. 141; exponent read from the PDF).

How to do it.

1. When RightAnd, LeftOr, Hyp, RightNot, or LeftNot applies, apply it and try no other step, because these steps are necessary as well as sufficient (§5, p. 141).
2. Prevent repeated Swap by “unfolding” the swap step so a meaningful rule is always applied; against Contract and Weaken loops, add two Boolean flags recording whether `(g, N)` and `(N, d)` have already been tried (§5, p. 141).
3. Prove soundness of the resulting `decideOL_opti` and derive the `solve_OL_opti` reflection tactic (§5, p. 141).

Verus form. Inference: Encode a search state containing the sequent and two Boolean flags. Use a recursive `proof fn` with a `decreases` bound on fuel; state that every returned `true` has a derivation witness. Inference: branch pruning is sound only after proving each omitted rule is necessary under the calculus's hypotheses.

Evidence and limits. The paper states: “To obtain a polynomial time procedure, we need to implement memoization.” (§5, p. 141) Inference: pruning is a step before memoization, not a replacement for it.

## technique: verified memoization with an abstract map

What it is and when to use it. Cache subproblem results when the subformula property limits the number of distinct states. The paper states: “Using memoization, we can ensure that the body of the program is never executed more than O(n2 ) times.” (§5, p. 141; O(n²) in the PDF)

How to do it.

1. Use cut elimination's subformula property to bound possible sequents to O(n²); also memoize the two loop flags, which “only multiplies the number of input by 4” (§5, p. 141).
2. Define `MemoMap` with keys in `(AnTerm * AnTerm)` and values in `bool`; run the search in the state monad paradigm, evaluating Boolean conjunctions and disjunctions in series (§5, p. 142).
3. On a cache hit (`Some (_, b)`), return the stored result; otherwise evaluate the search and return the result with the map extended by the new entry (listing on §5, p. 142).
4. Define map correctness: “A map is correct if and only if for every key k with a value of true, the non-memoized version of the algorithm returns true on k.” Prove, by joint induction, that from a correct input map the returned map is correct and a `true` result implies the non-memoized algorithm returns `true` for some fuel (§5, pp. 142–143).
5. Implement list maps (lookup cubic overall, total O(n⁵)) and AVL maps from the Coq standard library, which need a total order on terms (logarithmic number of comparisons, each linear, total O(n³ log n)) (§5, p. 143).

Verus form. Inference: Define a ghost map from a canonical state representation to a Boolean and an abstraction predicate connecting the concrete cache to it. Every cache insertion needs an `ensures` that the map-correctness predicate is preserved; the recursive search uses an invariant that cached `true` entries imply the corresponding proof. Inference: Verus has no Coq state monad, so use an explicit mutable map plus ghost state or a pure sequence of entries.

Evidence and limits. Completeness of the memoized version is not proved: “Note that completeness is not required to define a reflection-based tactic.” (footnote 4, p. 142) The two versions “are not necessarily equivalent for an arbitrary allowance of fuel” (§5, p. 142). The memoization proof “was carried completely independently of the orthologic proof system” (§5, p. 143). The complexity bounds “assume the usual Word RAM model, where checking equality of words takes constant time, even though this does not precisely match Coq’s evaluation of terms” (footnote 5, p. 146).

## technique: pointer/reference equality for sound cache keys

What it is and when to use it. Structural equality compares whole terms and costs linear time. Assign unique identifiers to subterms and use identifier equality as a sound but incomplete approximation: equal identifiers imply equal structure, while duplicate equal subtrees receive different identifiers. The paper says: “Checking if two objects have the same location in memory is a sound approximation to deciding if they are structurally equal.” (§6, p. 143)

How to do it.

1. Extend terms with a pointer of type `positive`; assign pointers by depth-first, pre-order traversal (`add_pointer`) (§6, pp. 144–145).
2. Prove `GetPointer` is injective on all subterms of the input, expressed as an address-lookup function that is left and right inverse to `GetPointer` on those subterms (§6, p. 144).
3. Key an AVL map by pairs of annotated pointers and run the memoized search on pointer terms (§6, p. 144).
4. In `decideOL_pointers_simp`, set initial fuel to `(|g| + |d|)²`, flags to false, the map to empty, and compute the pointers for `g` and `d` (§6, p. 144).

Verus form. Inference: Use immutable `Arc` identity only if its identity semantics are modeled and proved; a safer Verus form is an explicit `id: nat` in each ghost AST node plus a proof that IDs are injective over the subterm forest. Cache keys then use IDs, while a lemma connects equal IDs to structural equality. Inference: pointer equality that is merely a runtime address comparison is not by itself a Verus proof.

Evidence and limits. Proving the pointer assignment correct “was surprisingly difficult to prove, and required a lot of intermediate lemmas about the structure of subterms, the monotonicity of add_pointer along subterms, correspondence between the pointer and non-pointer version of terms, etc.” (§6, p. 145). With a strictly weaker equality “the algorithm is still sound, and we only risk losing some of the benefits of memoization” (§6, p. 143).

## technique: reflection and proof-producing tactics

What it is and when to use it. Reflection computes a Boolean decision and uses a proved soundness theorem so that the kernel's evaluation of the decision closes the goal. A proof-producing alternative computes an explicit proof term in OCaml. The paper says: “Instead of relying on a soundness theorem, a proof-producing tactic will compute a proof (in Coq, a proof term) that is then checked by the logical kernel.” (§7, p. 145)

How to do it.

1. Reify the goal: put the leaves of `s` and `t` in a list `env`, and compute terms `s'`, `t'` and a function `f` such that `eval s' f` and `eval t' f` are convertible to `s` and `t` (§4, p. 140).
2. Apply a lemma derived from the decision procedure's soundness to reduce the goal to the algorithm returning `true`, then close it with `eq_refl`, which makes Coq evaluate the algorithm (`solveOL`, and later `solve_OL_pointers`) (§4, p. 140; §8, p. 147).
3. For the proof-producing variant, run the OCaml tactic `olcert_goal`, whose proof term the Coq kernel checks (§7, p. 145).
4. Build `olnormalize` by computing a normal form in OCaml and proving equality to it with `solveOL_pointer` or `olcert_goal`; build `oltauto`/`oltauto_cert` as a DPLL-like solver that branches on a literal and simplifies with `olnormalize` (§7, p. 146).

Verus form. Inference: A Verus `proof fn` can compute or expose a proof witness, while executable Rust can produce a certificate checked by a separate Verus lemma. Keep the checker in the verified Verus proof path; an `external_body` function would remove the guarantee. Inference: reflection can be represented as a verified Boolean function plus a lemma `decision == true ==> proposition`.

Evidence and limits. The OCaml tactic is faster in practice, but “the proof-producing tactic is not verified, so it is not guaranteed that it does not contain a bug and outputs an incorrect proof” (§7, p. 146); its proof term has size up to O(n²), while that of `solveOL_pointer` has constant size (§7, p. 146). The reification step of the reflective tactic is not verified, but an error there makes Coq's kernel refuse the goal replacement (§4, pp. 140–141).

## techniques for the catalog

- dependent proof objects and cut elimination — encode derivations as indexed data and prove cut elimination to obtain a finite subformula search space
- necessary-rule pruning — remove redundant backward-search branches, unfold Swap, and track flags to prevent Contract/Weaken loops
- verified memoization — cache subproblem results under a proved map-correctness relation
- pointer-keyed memoization — assign injective subterm IDs to obtain sound, faster cache keys
- reflective and proof-producing tactics — either derive kernel proofs from a verified Boolean decision or emit proof terms for kernel checking
