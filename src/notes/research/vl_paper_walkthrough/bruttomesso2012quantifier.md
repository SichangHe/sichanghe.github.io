# Quantifier-Free Interpolation of a Theory of Arrays
(authored by agents unless marked 🧑)

Tag: `bruttomesso2012quantifier` , [paper](https://doi.org/10.2168/LMCS-8%282:04%292012)

## problem and result

The paper addresses interpolation for arrays with read, write, and extensionality. Ordinary array extensionality has an existential witness for a differing index, so a quantifier-free interpolant is not always available. The paper adds a Skolem function `diff(x,y)` whose result is a differing index when arrays differ. Its main result is that this universal theory, called `AX_diff`, admits quantifier-free interpolation. It gives both a model-theoretic proof through amalgamation (Section 3.1, pp. 9–12) and a constructive solver plus interpolant extractor (Sections 4–6, pp. 12–30).

The motivating example is A: `x = wr(y,i,e)` and B: two differing reads at distinct indexes. The paper says: “This theory is important for both hardware and software verification, and a procedure for computing quantifier-free interpolants ‘would extend the utility of interpolant extraction as a tool in the verifier’s toolkit’” (Section 1, p. 3). With `diff`, an interpolant is `x = wr(y,diff(x,y),rd(x,diff(x,y)))` (Section 1, p. 4). This is an over-approximation of A using only symbols shared with B.

## technique 1: Skolemized array extensionality

What it is. `AX_diff` keeps McCarthy read-over-write axioms and replaces existential extensionality with the universal axiom `x != y ==> rd(x,diff(x,y)) != rd(y,diff(x,y))` (Section 3, p. 8). `diff` returns an arbitrary index when the arrays are equal. This turns the theory into a universal theory and exposes a symbolic witness in quantifier-free terms.

When to use it. Use this encoding when array constraints need interpolants, especially when a model checker must summarize reachable states while preserving only symbols common to a precondition and a postcondition. The paper explicitly limits the result to the Skolemized variant; it does not claim that the original existential theory has quantifier-free interpolation.

How to apply it.

1. Represent arrays with `rd` and `wr`, and add `diff` of type array × array -> index (Section 3, pp. 8–9)
2. Assert the two read-over-write axioms (3.1)-(3.2) and the universal `diff` axiom (3.3) (Section 3, p. 8)
3. For an inequality `a != b`, expose `i = diff(a,b)`, then relate `rd(a,i)` and `rd(b,i)`; the solver can use this witness without introducing a quantifier (Sections 3 and 5.1, pp. 8, 19)
4. Build the interpolant from shared array terms and the `diff` witness; for the motivating example the result is the term quoted above (Section 1, p. 4)

Evidence. The semantic proof establishes amalgamation for `AX_diff`, then invokes the universal-theory equivalence to obtain quantifier-free interpolation (Theorem 3.2 on p. 10 and Theorem 3.3 on p. 11). The constructive procedure is stated to decide satisfiability and to terminate (Theorem 5.1, pp. 21–22; Theorem 6.3, pp. 27–28); the correctness part of the Theorem 5.1 proof is one sentence ("Correctness and completeness of the solver are clear"). No performance benchmark is reported. On complexity the paper only says that the termination analysis "can be refined so as to show that our algorithm is in NP", which it notes is optimal because quantifier-free satisfiability in `AX_ext` is NP-complete (Section 5, p. 22; also Section 1.1, p. 4: "it is not difficult to refine our proof of termination"). The NP bound is asserted, not proved, in the paper.

Verus form. Inference: model an array as a mathematical sequence or map in a `spec fn`, and expose a ghost index returned by a specification-level `diff` function. State read-over-write properties with `requires` and `ensures`; prove a differing-read fact with `assert`. Executable Rust should still use its normal array representation. Verus does not automatically synthesize Craig interpolants, so this technique is a specification encoding and proof decomposition that an external interpolant generator could produce, rather than a built-in Verus operation.

Assumptions and limits. The construction assumes the universal Skolemized theory and finite ground constraints. `diff` is not required to be a canonical index when arrays are equal. The paper notes that `AX_ext` is amalgamable but, because it is not universal, amalgamation alone does not imply quantifier-free interpolation (Section 3.1, p. 12). Thus dropping the Skolem witness changes the theorem.

## technique 2: modular constraints and rewriting

What it is. A flat constraint contains literals such as `a = wr(b,I,E)`, `rd(a,i)=e`, `diff(a,b)=i`, and equalities or disequalities. The paper splits it into an index part and a main part, then defines a modular constraint by seven syntactic conditions, numbered (o) and (i)-(vi) (Definition 4.2, p. 14). Positive main literals become rewrite rules. Four non-ground rules (4.1)-(4.4) reduce reads over writes and sort update indexes or merge repeated ones; ground rules come from the input. Modularity requires a confluent, ground-irreducible rewrite system, no positive index equalities, no negative array literals, no badly orientable equalities, a redundancy condition (iv), and two consistency conditions for `diff`.

The paper states: “A (ground) flat literal is a literal of the form a = wr(b, I, E), rd(a, i) = e, diff(a, b) = i, α = β, α 6= β.” (Section 4.1, p. 13.) It also explains that rules reduce read-over-write and sort indexes, while conditions (v) and (vi) make `diff` well-defined and encode a conditional contraposition of extensionality (Section 4.1, p. 14).

When to use it. Use this normal form inside an SMT-style decision procedure, before checking satisfiability or extracting an interpolant. It makes satisfiability a syntactic check: a modular constraint is satisfiable iff no element inequality `e != d` in its main part has `e` and `d` joinable under the rewrite system (Lemma 4.3, pp. 15–17), and consistent modular constraints from A and B remain modular and consistent when four conditions hold (Proposition 4.5, p. 18).

How to apply it.

1. Flatten nested terms by replacing each subterm with a fresh constant and adding its defining equation (Section 4.1, p. 13; Section 5.1, Step 1, p. 19)
2. Split index literals (`i = j`, `i != j`, `diff(a,b) = i`) from the main part, and orient positive main equalities with a lexicographic path ordering whose total precedence is `a > wr > rd > diff > i > e`, so `a = wr(b,I,E)` is oriented left to right when `a > b` (Section 4.1, pp. 13–14)
3. Keep the fixed rules (4.1)-(4.4) and make the ground rules from the input confluent and ground-irreducible; the non-ground rules are convergent by themselves, so only overlaps between ground rules need checking (Definition 4.2(iii) and the text after it, pp. 14–15; the completion itself is Section 5.2)
4. Ensure no negative array literal remains; replace `a != b` using `diff(a,b)=i`, two reads at `i`, and unequal element constants (Section 5.1, Step 2, p. 19)
5. Check the `diff` side conditions: equal normalized array pairs must have equal `diff` indexes, and a `diff` index whose reads normalize equal forces the arrays to normalize equal (Definition 4.2(v)–(vi), p. 14)
6. For two components, require: (O) a shared literal is in A iff it is in B; (I) a rule with shared left-hand side has a shared right-hand side; (II) a shared `diff(a,b) = i` has a shared index `i`; (III) if a rule `a -> wr(c,I,E)` has a shared right-hand side, then `a` is shared (Proposition 4.5, p. 18)

Evidence. Lemma 4.3 builds a standard model for a modular constraint that has no joinable element inequality; Proposition 4.5 proves that consistent modular A and B satisfying (O)-(III) give a modular, consistent union. The evidence is mathematical, with no implementation data or benchmark denominator.

Verus form. Inference: represent normalized array equations as ghost facts about a sequence/map abstraction. Use `assert` to establish read-over-write reductions and a loop `invariant` if normalization is implemented as executable rewriting. A `proof fn` can establish confluence obligations for each rewrite rule. Keep `diff` as a ghost/specification function; executable Rust can carry the chosen index explicitly. These are an encoding of the paper's mathematics, not a claim that Verus supplies rewriting completion.

Failure modes. The solver's modularity tests are syntactic and depend on a terminating, confluent rewrite system. The paper says the joinability tests used in the failure instructions can be done effectively once completion groups (II)-(III) are exhausted, because then the rewrite system is confluent (Section 5.2, p. 21); before that, comparing any normal forms is a pragmatic approximation that must be repeated. The theory is stably infinite but non-convex, so general Nelson–Oppen combinations may need disjunction propagation; the paper notes that modular constraints avoid this extra propagation because only syntactically extractable equalities are needed (Section 4.2, p. 18).

## technique 3: satisfiability solver by preprocessing and completion

What it is. The solver transforms a finite constraint into one or more existentially equivalent flat constraints, guesses index equalities, and completes a rewrite system. A successful branch ends in a modular constraint; a failed branch reports inconsistency. The paper emphasizes: “The first step towards the quantifier-free interpolation procedure for AX diff is the design of a satisfiability solver.” (Section 5, p. 18.)

How to apply it.

1. Flatten the constraint (Section 5.1, Step 1)
2. Replace every array inequality with a fresh `diff` index, two reads, and an element disequality (Step 2)
3. Guess a complete partition of index constants by adding either equality or disequality for every pair; substitute positive equalities and backtrack on `i != i` (Step 3)
4. Add a fresh element result for every missing `rd(a,i)` term (Step 4)
5. Orient badly orientable equalities using the Reflexivity and Symmetry equivalences of Figure 1 and read literals (Completion group I, pp. 19–20)
6. Apply Gaussian completion to critical pairs (C1)-(C2) between ground array rules, ordinary Knuth–Bendix completion to the remaining pairs (C3)-(C5), and the reduction instructions (R1)-(R3) (groups II–IV, pp. 20–21)
7. On a negative element literal `e != d` whose sides are joinable (U1), or two `diff` literals with joinable arguments but different indexes (U2), fail and backtrack to Step 3, the index partition (group V, p. 21)
8. Accept a branch only when all transformations are exhausted without failure; by Lemma 4.3 its modular result is satisfiable (Theorem 5.1, pp. 21–22)

The Gaussian case handles two ground rules with the same left-hand side `a`. For (C1) the paper rewrites one parent rule with Symm and combines it with Trans, giving equation (5.1) `b1 = wr(b2, I2 · I1, E2 · F) ∧ a = wr(b2, I2, E2)`; for (C2) it applies Confl (Section 5.2, pp. 20–21). The paper says these two critical pairs "are impossible to recast in any standard completion procedure" (Section 7.1, p. 31). Termination uses a multiset of terms attached to literals, with `{l, r}` for a positive literal and `{l, l, r, r}` for a negative one; the paper states that "it is easy to see that such multi-set decreases after the application of any instruction" without detailing the check (proof of Theorem 5.1, p. 22).

Evidence. Theorem 5.1 states decision correctness and termination, with a short proof. The paper reports no measured runtime, number of instances, or solver comparison. It asserts NP as an upper bound by refining the termination analysis and calls this optimal because quantifier-free array satisfiability is NP-complete (Section 5, p. 22).

Verus form. Inference: an executable Rust normalizer can maintain a ghost representation of the rewrite relation and a decreasing `decreases` measure for termination. Each transformation's semantic preservation can be stated with `ensures`; branch guesses become separate proof cases. Use `assert` for critical-pair equalities and `invariant` for a normalization loop. Verus can verify a particular implementation and its contracts, but the paper's NP decision result concerns the abstract solver and does not transfer automatically to Verus verification cost.

Limits. Index partitioning is a guess realized by backtracking: "unsatisfiability can only be declared when all guessing fail" (Section 5, p. 19). Inference: this suggests exponential backtracking in the worst case in a naive implementation. The proof assumes all transformations preserve existential equivalence and that completion reaches confluence. The paper gives no data on practical scalability.

## technique 4: interpolating metarules and term sharing

What it is. The interpolation algorithm runs the solver on A and B while preserving a shared signature. Metarules transform pairs of constraints and carry a recursive interpolant instruction. Unary rules preserve existential equivalence; branching rules split a disjunction. At leaves, one component contains bottom, and the recursive instructions produce a shared quantifier-free formula (Sections 6.1–6.2, pp. 22–28).

The goal is stated directly: “Our goal is to produce, in case A ∧ B is AX diff-unsatisfiable, a ground AB-common sentence φ such that A ⊢AX diff φ and φ ∧ B is AX diff-unsatisfiable.” (Section 6.1, p. 22.)

How to apply it.

1. Preprocess A and B separately, but propagate shared index guesses and shared literals (Section 6.2, pp. 24–25)
2. Run ordinary completion on either side, then copy every shared literal to the other side (groups α and β, p. 25)
3. Repair rules violating shared-signature conditions with Term Sharing: introduce a fresh shared constant defined as a shared term, rename the local constant, and remove the defining equality (Section 6.2, pp. 25–26)
4. For a shared read `rd(c,i) -> d` whose result is local, share the result (6.1); for a local array `a` rewriting to a shared `wr(c,I,E)`, rename `a` to a fresh shared constant ordered above `c` (6.2); for a shared `diff(a,b) = k` whose index is local, share the index and repeat the index partition (6.3) (pp. 25–26)
5. For a rule `c -> wr(c',I,E)` with shared left-hand side and a local right-hand side, split the update lists into a shared part and a part with local symbols, guess whether `c = wr(c',I1,E1)` holds for the shared part, and either reduce the rule or introduce a fresh shared array and a rule of smaller degree (pp. 26–27)
6. Continue until each branch is inconsistent or meets Proposition 4.5. Read the interpolant top-down from the metarule tree using the Int. instructions of Table 1, which build conjunctions, implications, substitutions, and disjunctions (Table 1, p. 24; Propositions 6.1–6.2, p. 23; Theorem 6.3, p. 27)

Evidence. Theorem 6.3 states that every interpolation tree is finite and is a metarules refutation exactly when A ∧ B is unsatisfiable. The worked example (Section 6.3, pp. 28–30) starts with one update in A and two differing reads in B; one branch yields `a=b`, while the other yields a `diff`-based formula. These are symbolic outcomes, not benchmark measurements.

Verus form. Inference: encode A and B as separate ghost predicates over a shared abstract state. Use `requires`/`ensures` to express that a transformation preserves satisfiability or implication, and use `assert` to derive each propagated shared equality. The final interpolant can be represented as a `spec fn` over shared values; a verified Rust API can expose the same shared-state summary as a contract. Verus has no general metarule-tree interpolant extractor, so this construction would be implemented outside the verifier or encoded as proof lemmas.

Failure modes. The algorithm can branch on index partitions and update-prefix equalities. The paper argues finiteness by noting that Term Sharing decreases the number of non-AB-common constants, that only finitely many such constants exist, and that a multiset complexity measure (with a tie-break component for copying shared literals) decreases for the remaining instructions (Theorem 6.3, pp. 27–28). The method assumes ground constraints and exact theory axioms; the paper does not address quantifiers in user specifications.

## what is proved, measured, and trusted

Proved (stated as theorems; some proofs are brief): `AX_diff` has amalgamation; its quantifier-free fragment has interpolants; a modular constraint is satisfiable iff no element inequality in it is joinable; the preprocessing/completion solver decides satisfiability; and the interpolating tree terminates and yields an interpolant exactly for unsatisfiable A ∧ B (Theorems 3.2, 3.3, 5.1, 6.3, Lemma 4.3). Trusted assumptions include first-order semantics, the array axioms, the Skolemized `diff` axiom, correctness of the rewrite and metarule transformations, and the mathematical termination measures.

Measured: no numbers. The paper gives no instance count, machine, runtime, timeout, or accuracy denominator. It does say that an implementation in OpenSMT is under way, that "Preliminary experiments are encouraging although a more extensive experimental evaluation is needed", and that the refutations "are quite compact" (Section 7.3, pp. 34–35), without data. Its NP statement is a complexity claim about the abstract procedure, not a measured performance result. The worked example is one symbolic case and must not be read as a benchmark.

## techniques for the catalog

- skolemized array extensionality: add `diff(a,b)` as a universal witness so array inequalities expose quantifier-free differing reads
- modular array constraints: flatten array literals and use confluent rewrite rules plus `diff` side conditions as a satisfiable normal form
- gaussian completion solver: preprocess, guess index partitions, complete critical pairs, and backtrack on normalized conflicts
- interpolating metarules: run paired A/B transformations while propagating shared literals and recursively reconstructing the interpolant
- term sharing: rename local constants to fresh shared constants when a rewrite rule would otherwise violate the shared signature
