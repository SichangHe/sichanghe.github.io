# Quantifier-Free Interpolation of a Theory of Arrays
(authored by agents unless marked 🧑)

Tag: `bruttomesso2012quantifier` , [paper](http://arxiv.org/abs/1204.2386v5)

## problem and result

The paper addresses interpolation for arrays with read, write, and extensionality. Ordinary array extensionality has an existential witness for a differing index, so a quantifier-free interpolant is not always available. The paper adds a Skolem function `diff(x,y)` whose result is a differing index when arrays differ. Its main result is that this universal theory, called `AX_diff`, admits quantifier-free interpolation. It gives both a model-theoretic proof through amalgamation (Section 3.1, pp. 9–12) and a constructive solver plus interpolant extractor (Sections 4–6, pp. 12–30).

The motivating example is A: `x = wr(y,i,e)` and B: two differing reads at distinct indexes. The paper says: “This theory is important for both hardware and software verification, and a procedure for computing quantifier-free interpolants ‘would extend the utility of interpolant extraction as a tool in the verifier’s toolkit’” (Section 1, p. 3). With `diff`, an interpolant is `x = wr(y,diff(x,y),rd(x,diff(x,y)))` (Section 1, p. 4). This is an over-approximation of A using only symbols shared with B.

## technique 1: Skolemized array extensionality

What it is. `AX_diff` keeps McCarthy read-over-write axioms and replaces existential extensionality with the universal axiom `x != y ==> rd(x,diff(x,y)) != rd(y,diff(x,y))` (Section 3, p. 8). `diff` returns an arbitrary index when the arrays are equal. This turns the theory into a universal theory and exposes a symbolic witness in quantifier-free terms.

When to use it. Use this encoding when array constraints need interpolants, especially when a model checker must summarize reachable states while preserving only symbols common to a precondition and a postcondition. The paper explicitly limits the result to the Skolemized variant; it does not claim that the original existential theory has quantifier-free interpolation.

How to apply it.

1. Represent arrays with `rd` and `wr`, and add `diff` of type array × array -> index (Section 3, p. 8)
2. Assert the two read-over-write axioms and the universal `diff` axiom (Section 3, p. 8)
3. For an inequality `a != b`, expose `i = diff(a,b)`, then relate `rd(a,i)` and `rd(b,i)`; the solver can use this witness without introducing a quantifier (Sections 3 and 5.1, pp. 8, 19)
4. Build the interpolant from shared array terms and the `diff` witness; for the motivating example the result is the term quoted above (Section 1, p. 4)

Evidence. The semantic proof establishes amalgamation for `AX_diff`, then invokes the universal-theory equivalence to obtain quantifier-free interpolation (Theorem 3.2 and Theorem 3.3, pp. 11–12). The constructive procedure is shown to decide satisfiability and to terminate (Theorem 5.1, p. 21; Theorem 6.3, p. 28). No performance benchmark is reported; the complexity argument says the procedure can be refined to NP, matching NP-complete quantifier-free satisfiability (Sections 1.1 and 5.2, pp. 4, 21).

Verus form. Inference: model an array as a mathematical sequence or map in a `spec fn`, and expose a ghost index returned by a specification-level `diff` function. State read-over-write properties with `requires` and `ensures`; prove a differing-read fact with `assert`. Executable Rust should still use its normal array representation. Verus does not automatically synthesize Craig interpolants, so this technique is a specification encoding and proof decomposition that an external interpolant generator could produce, rather than a built-in Verus operation.

Assumptions and limits. The construction assumes the universal Skolemized theory and finite ground constraints. `diff` is not required to be a canonical index when arrays are equal. The paper notes that `AX_ext` is amalgamable but, because it is not universal, amalgamation alone does not imply quantifier-free interpolation (Section 3.1, p. 12). Thus dropping the Skolem witness changes the theorem.

## technique 2: modular constraints and rewriting

What it is. A flat constraint contains literals such as `a = wr(b,I,E)`, `rd(a,i)=e`, `diff(a,b)=i`, and equalities or disequalities. The paper splits it into an index part and a main part, then defines a modular constraint by six syntactic conditions (Definition 4.2, pp. 13–14). Positive main literals become rewrite rules. Four non-ground rules normalize reads over writes and sort update indexes; ground rules come from the input. Modularity requires confluence, irreducibility, and consistency conditions for `diff`.

The paper states: “A (ground) flat literal is a literal of the form a = wr(b, I, E), rd(a, i) = e, diff(a, b) = i, α = β, α 6= β.” (Section 4.1, p. 13.) It also explains that rules reduce read-over-write and sort indexes, while conditions (v) and (vi) make `diff` well-defined and encode a conditional contraposition of extensionality (Section 4.1, p. 14).

When to use it. Use this normal form inside an SMT-style decision procedure, before checking satisfiability or extracting an interpolant. It gives a finite syntactic certificate: a modular constraint is satisfiable (Lemma 4.3, pp. 15–17), and compatible modular constraints from A and B can be combined (Proposition 4.5, pp. 17–18).

How to apply it.

1. Flatten nested terms by replacing each subterm with a fresh constant and adding its defining equation (Section 4.1, p. 13; Section 5.1, Step 1, p. 19)
2. Split index literals from array/element literals and orient positive equalities using a precedence where array constants precede `wr`, `rd`, `diff`, indexes, and elements (Section 4.1, p. 13)
3. Apply read-over-write and write-commutation rules until the rewrite relation is confluent and ground-irreducible (Definition 4.2(iii), pp. 13–14)
4. Ensure no negative array literal remains; replace `a != b` using `diff(a,b)=i`, two reads at `i`, and unequal element constants (Section 5.1, Step 2, p. 19)
5. Check the `diff` side conditions: equal normalized array pairs must have equal `diff` indexes, and a `diff` index whose reads normalize equal forces the arrays to normalize equal (Definition 4.2(v)–(vi), p. 14)
6. For two components, require shared literals and shared right-hand sides for shared rewrite rules, and keep shared `diff` indexes shared (Proposition 4.5, pp. 17–18)

Evidence. Lemma 4.3 constructs a standard model for every modular constraint and proves satisfiability; Proposition 4.5 proves that compatible A and B modular constraints remain modular and consistent. The evidence is mathematical, with no implementation data or benchmark denominator.

Verus form. Inference: represent normalized array equations as ghost facts about a sequence/map abstraction. Use `assert` to establish read-over-write reductions and a loop `invariant` if normalization is implemented as executable rewriting. A `proof fn` can establish confluence obligations for each rewrite rule. Keep `diff` as a ghost/specification function; executable Rust can carry the chosen index explicitly. These are an encoding of the paper's mathematics, not a claim that Verus supplies rewriting completion.

Failure modes. The solver's modularity tests are syntactic and depend on a terminating, confluent rewrite system. Non-confluent critical pairs must be completed before the `diff` checks are meaningful. The theory is stably infinite but non-convex, so general Nelson–Oppen combinations may need disjunction propagation; the paper notes that modular constraints avoid this extra propagation because only syntactically extractable equalities are needed (Section 4.2, p. 18).

## technique 3: satisfiability solver by preprocessing and completion

What it is. The solver transforms a finite constraint into one or more existentially equivalent flat constraints, guesses index equalities, and completes a rewrite system. A successful branch ends in a modular constraint; a failed branch reports inconsistency. The paper emphasizes: “The first step towards the quantifier-free interpolation procedure for AX diff is the design of a satisfiability solver.” (Section 5, p. 18.)

How to apply it.

1. Flatten the constraint (Section 5.1, Step 1)
2. Replace every array inequality with a fresh `diff` index, two reads, and an element disequality (Step 2)
3. Guess a complete partition of index constants by adding either equality or disequality for every pair; substitute positive equalities and backtrack on `i != i` (Step 3)
4. Add a fresh element result for every missing `rd(a,i)` term (Step 4)
5. Orient badly oriented updates using symmetry and read literals (Completion group I, p. 19)
6. Apply Gaussian completion to update critical pairs, ordinary Knuth–Bendix completion to remaining pairs, and reduction of right-hand sides (groups II–IV, pp. 19–21)
7. On a normalized negative element equality or incompatible `diff` assignments, fail and backtrack to the index partition (group V, p. 21)
8. Accept a branch only when all transformations are exhausted without failure; by Lemma 4.3 its modular result is satisfiable (Theorem 5.1, p. 21)

The completion rules include a special Gaussian case for two updates from the same array. The paper's equation (5.1) combines them into an ordered update and read facts; this is the key step that makes array updates converge. Termination uses a multiset of terms attached to literals; every instruction decreases it (proof of Theorem 5.1, p. 21).

Evidence. Theorem 5.1 proves decision correctness and termination. The paper reports no measured runtime, number of instances, or solver comparison. It claims NP as an upper bound from the termination analysis and calls this optimal because quantifier-free array satisfiability is NP-complete (Section 5.2, p. 21).

Verus form. Inference: an executable Rust normalizer can maintain a ghost representation of the rewrite relation and a decreasing `decreases` measure for termination. Each transformation's semantic preservation can be stated with `ensures`; branch guesses become separate proof cases. Use `assert` for critical-pair equalities and `invariant` for a normalization loop. Verus can verify a particular implementation and its contracts, but the paper's NP decision result concerns the abstract solver and does not transfer automatically to Verus verification cost.

Limits. Index partitioning is nondeterministic and may require exponential backtracking. The proof assumes all transformations preserve existential equivalence and that completion reaches confluence. No engineering data establishes practical scalability.

## technique 4: interpolating metarules and term sharing

What it is. The interpolation algorithm runs the solver on A and B while preserving a shared signature. Metarules transform pairs of constraints and carry a recursive interpolant instruction. Unary rules preserve existential equivalence; branching rules split a disjunction. At leaves, one component contains bottom, and the recursive instructions produce a shared quantifier-free formula (Sections 6.1–6.2, pp. 22–28).

The core invariant is stated directly: “Our goal is to produce, in case A ∧ B is AX diff-unsatisfiable, a ground AB-common sentence φ such that A ⊢AX diff φ and φ ∧ B is AX diff-unsatisfiable.” (Section 6.1, p. 22.)

How to apply it.

1. Preprocess A and B separately, but propagate shared index guesses and shared literals (Section 6.2, pp. 24–25)
2. Run ordinary completion on either side, then copy every shared literal to the other side (groups α and β, p. 25)
3. Repair rules violating shared-signature conditions with Term Sharing: introduce a fresh shared constant defined as a shared term, rename the local constant, and remove the defining equality (Section 6.2, pp. 25–26)
4. For a shared read whose result is local, share the result; for a local array rewriting to a shared term, share the array constant; for a shared `diff` whose index is local, share the index and redo the index partition (p. 26)
5. For a shared-left-hand-side update with local update symbols, split the update list into shared and local prefixes, guess whether the shared prefix equality holds, and either reduce the rule or introduce a fresh shared array and a smaller-degree rule (pp. 26–27)
6. Continue until each branch is inconsistent or meets Proposition 4.5. Read the interpolant top-down from the metarule tree using conjunction, implication, substitution, and disjunction instructions (Propositions 6.1–6.2 and Theorem 6.3, pp. 23, 28)

Evidence. Theorem 6.3 proves every interpolation tree is finite and is a metarules refutation exactly when A ∧ B is unsatisfiable. The worked example (Section 6.3, pp. 28–30) starts with one update in A and two differing reads in B; one branch yields `a=b`, while the other yields a `diff`-based formula. These are symbolic outcomes, not benchmark measurements.

Verus form. Inference: encode A and B as separate ghost predicates over a shared abstract state. Use `requires`/`ensures` to express that a transformation preserves satisfiability or implication, and use `assert` to derive each propagated shared equality. The final interpolant can be represented as a `spec fn` over shared values; a verified Rust API can expose the same shared-state summary as a contract. Verus has no general metarule-tree interpolant extractor, so this construction would be implemented outside the verifier or encoded as proof lemmas.

Failure modes. The algorithm can branch on index partitions and update-prefix equalities. Term sharing enlarges the shared signature and must be controlled; the paper proves finiteness by showing that only finitely many non-shared constants can be renamed and that a multiset complexity measure decreases (Theorem 6.3, p. 28). The method assumes ground constraints and exact theory axioms; it does not address quantifiers in user specifications.

## what is proved, measured, and trusted

Proved: `AX_diff` has amalgamation; its quantifier-free fragment has interpolants; modular constraints are satisfiable; the preprocessing/completion solver decides satisfiability; and the interpolating tree terminates and yields an interpolant exactly for unsatisfiable A ∧ B (Theorems 3.2, 3.3, 5.1, 6.3). Trusted assumptions include first-order semantics, the array axioms, the Skolemized `diff` axiom, correctness of the rewrite and metarule transformations, and the mathematical termination measures.

Measured: nothing empirical. The paper gives no instance count, machine, runtime, timeout, or accuracy denominator. Its NP statement is a complexity claim about the abstract procedure, not a measured performance result. The worked example is one symbolic case and must not be read as a benchmark.

Inference: for VeruLaw, the direct threat is moderate and specific. The paper supplies a mature way to summarize array-heavy verification conditions with shared, quantifier-free facts, which could reduce proof search when agent-written Rust manipulates arrays. It does not verify Rust, ownership, unsafe code, compiler behavior, or an application specification. The practical risk is therefore an external solver or generated interpolant becoming a trusted assumption unless its output is checked by Verus. A sound integration should import each interpolant as a proposition and have Verus prove the two entailments required by the interpolant contract.

The paper's work means VL should not redo the basic theorem that Skolemized arrays admit quantifier-free interpolation, nor the abstract Gaussian-completion algorithm. A new VL contribution would need to measure integration with Verus contracts, generated proof repair, or trust reduction on real Rust programs.

## techniques for the catalog

- skolemized array extensionality: add `diff(a,b)` as a universal witness so array inequalities expose quantifier-free differing reads
- modular array constraints: flatten array literals and use confluent rewrite rules plus `diff` side conditions as a satisfiable normal form
- gaussian completion solver: preprocess, guess index partitions, complete critical pairs, and backtrack on normalized conflicts
- interpolating metarules: run paired A/B transformations while propagating shared literals and recursively reconstructing the interpolant
- term sharing: rename local constants to fresh shared constants when a rewrite rule would otherwise violate the shared signature

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
