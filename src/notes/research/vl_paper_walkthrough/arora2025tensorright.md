# TensorRight: Automated Verification of Tensor Graph Rewrites
(authored by agents unless marked 🧑)
Tag: `arora2025tensorright`, [paper](https://doi.org/10.1145/3704865)

## scope and result

TensorRight verifies tensor compiler rewrite rules for arbitrary tensor rank and size. Its central reduction is finite: represent any number of axes with aggregated axes, assign rank classes, infer a sufficient rank bound, instantiate every rank up to that bound, and discharge each bounded case with symbolic execution and an SMT solver. The paper then uses induction to cover larger ranks (Sections 3.2–3.3 and 6.1, pages 8–10 and 16–18). Section 8.2 (page 26) states, “Out of the 121 rules that we can express in our DSL, we implemented 118 rules and verified 115 rules in the unbounded setting.” The source set is the 175-rule XLA Algebraic Simplifier pass (Section 8, page 25).

## technique 1: represent polymorphic tensors with aggregated axes and rank classes

What it is. A named axis is a single semantic dimension. An aggregated axis is a set of named axes treated uniformly, so one expression denotes tensors with any rank. A rank class (RClass) ties aggregated axes that must be instantiated at the same rank and provides canonical bijections for relabeling (Sections 4.1–4.3 and 6.1, pages 10–17). The paper states, “This allows us to write expressions with an arbitrary number of named-axes in a uniform and simple way.” (Section 4.2, page 12.)

When to use it. Inference: use this representation when a rewrite must hold for arbitrary numbers of dimensions and the operators are layout-insensitive. It is unsuitable for layout-sensitive reshape and bitcast rules; the evaluation says TensorRight “cannot represent layout-sensitive rules” (Section 8.1, page 26).

How to do it. (1) Give semantic names to axes and represent shapes as maps from names to sizes. (2) Group repeatable dimensions into an aggregated axis. (3) Put aggregated axes that must share rank into one RClass. (4) Use the canonical positional bijection between members of that class, which TensorRight constructs during instantiation. (5) Express the left-hand and right-hand tensor expressions and any precondition over these abstract axes. Listing 1 shows the concrete DSL shape: `newTensor @TensorInt "Y" [rcls --> size]`, operators such as `dynamicSlice` and `slice`, and `precondition` declarations (Section 3.2, page 9).

Verus form. Inference: encode an abstract shape as a Verus sequence or map plus a predicate describing valid dimensions, and use a predicate to state that two shape sequences have equal length and a positional correspondence. Inference: use `requires` for rank/shape preconditions and `ensures` for equality of output tensors; use ghost state or proof functions for the axis bijection. Inference: these would require a separate semantic encoding and proof in Verus; the paper does not evaluate Verus.

Evidence and limits. TensorRight represented 121 of 175 XLA rules; its categories and denominators are in Table 1 (Section 8.1, page 26). The DSL supports boolean, integer, and real-valued tensors. The paper reports “the inability to reason about precision of floating point expressions efficiently” and unsupported operators such as log and power (Sections 8.1–8.2, page 26).

## technique 2: infer a finite rank bound and use k-induction

What it is. For each RClass, TensorRight computes a sufficient rank k from the number of distinct boolean conditions and tensor accesses. The paper proves that its inferred bound permits induction: validity at rank i implies validity at rank i+1 for every i≥k. TensorRight checks all concrete-rank instances through that bound. Equation 6 states `∀i ≥ k, valid(i) → valid(i + 1)` (Section 6.1, page 18). The general induction argument justifies the inferred bounds; TensorRight then verifies the finite base instances.

When to use it. Inference: use this reduction when a property is uniform over dimensions and a counterexample at a higher rank can be projected to a lower rank. It turns an infinite rank space into finitely many SMT obligations plus an induction proof.

How to do it. (1) Build the aggregated representation and RClasses. (2) For each RClass c, compute `k_c = max(1, m_c + Σ_t n_t(n_t−1)/2)`, where m_c counts relevant nontrivial conditions and n_t counts distinct accesses to each input tensor containing c (Algorithm 1, pages 22–23; Appendix G, pages 60–61). (3) Instantiate each RClass with every rank from 1 through its bound. (4) Generate and prove each bounded obligation. (5) Use the paper’s general induction proof, which shows that any counterexample above the sufficient bound can be projected down one rank. (6) Conclude validity for all larger ranks. For `SliceDyUpSlice`, which is invalid at rank 2, the authors nevertheless show rank 2 is a sufficient verification bound: “Therefore, if the SliceDyUpSlice rule is valid for rank 2, then it is valid for any higher-rank.” (Section 2.4, page 7.)

Verus form. Inference: represent `valid(rank)` as a predicate over a shape sequence and prove a base lemma for all ranks up to k plus a step lemma from rank i to i+1. Use a `while` loop invariant only for executable iteration; the mathematical induction itself belongs in proof functions and lemmas. Inference: the projection from k+1 dimensions to k dimensions must be an explicit lemma over sequences/maps. The paper's rank-bound theorem does not transfer automatically to Verus.

Evidence and limits. In the evaluation, 110 of the 115 verified rules required one bounded-verification task, three required two tasks, and two required four tasks (Section 8.2 and Figure 10b, pages 26–27). In general, the task count is the product of the RClass bounds. Aggregated axes are nonempty, so each RClass ranges from rank 1 upward (Algorithm 1, page 22). The method assumes the semantic operators admit rank-independent index transformers and conditions; operators whose behavior depends on physical layout fall outside the representation (Sections 6.2 and 8.1, pages 18–26).

## technique 3: lower each bounded instance to symbolic SMT verification

What it is. After rank instantiation, sizes remain unbounded. TensorRight models each tensor as an uninterpreted function, sizes and indices as unbounded integers, and symbolically evaluates both sides at a general valid access. It proves shape equality, valid accesses, RHS validity, and pointwise value equality under the precondition and LHS validity (Sections 6.1 and 6.4, pages 16 and 23–24). The paper says, “To handle arbitrary sizes, we model each tensor as an uninterpreted function and use unbounded integers to model the indices and sizes in each named-axis.” (Section 6.1, page 16.)

When to use it. Inference: use this lowering for arithmetic, conditionals, slicing, padding, and other operators whose scalar behavior can be expressed with integer, Boolean, or real formulas. It is effective when the solver has theories for the resulting operations and the rule's semantics can be symbolically evaluated.

How to do it. (1) Instantiate all RClasses to concrete ranks within the bound. (2) Create symbolic maps for sizes, indices, and attributes. (3) Symbolically evaluate the LHS and RHS. (4) Assume the precondition and LHS validity, check matching named axes in the symbolic engine, and prove equal axis sizes with the solver. (5) Introduce a general access A to the output. (6) Prove that valid LHS accesses lead to valid RHS accesses, that the RHS is valid, and that the values agree. Listing 2 abbreviates the pointwise obligation as `pre && lhsValid -> lhsSym[A] .== rhsSym[A]` (Section 3.3, page 10); Section 6.4 gives the full checks. Most rules use Z3, with cvc5 used for one advanced element-wise rule (Section 8.1, page 25). For `PadLowCombine`, the paper expands nested padding into conditionals and proves equality for every symbolic access (Section 6.2, pages 18–20).

Verus form. Inference: model an array or tensor as a sequence/map and state element equality under a universally quantified valid index, or use a quantified `ensures` predicate when supported by the project’s Verus conventions. Use `requires` for shape and index bounds and proof functions for arithmetic identities. Inference: Verus's SMT-backed verification can discharge similar integer obligations, but TensorRight's uninterpreted-function encoding and solver behavior must be re-established for the chosen Rust representation.

Evidence and limits. Section 8.2 (page 26) states, “The timeout per SMT solver query was set to 10 seconds.” On an Intel Core i9-13900K with 128 GB RAM and a 10-second timeout per SMT query, 108 of 115 verified rules completed in under one second; total times ranged from 0.023 s to 23.33 s (Section 8.2, page 26). Unsupported operators include `log` and `power`, and floating-point precision is difficult for the solvers (Section 8.1, page 26).

## technique 4: compute bounds by rank-independent semantic factors and lower counterexamples

What it is. TensorRight factors each symbolic expression into an index transformer, folded Boolean conditions, and a scalar function. These factors do not depend on the number of named axes. To prove the induction step, it takes a counterexample at rank k+1 and projects k of the axes, solving constraints so the scalar-function arguments remain equal and the mismatch persists (Section 6.2, pages 19–21).

When to use it. Inference: use this technique when direct induction over tensor structures is difficult but the operator semantics are pointwise and factor into rank-independent functions. It provides a constructive way to derive the rank bound rather than guessing one.

How to do it. (1) Expand the denotational semantics at a general access. (2) Rewrite index arithmetic as `fmap` of an index transformer. (3) Rewrite nested conditions as `fold` over per-axis predicates. (4) Count distinct accesses and conditions for the bound. (5) Assume a failing instance at rank k+1. (6) Choose a size-k projection Γ of the axes. (7) Restrict shape, attributes, and access maps to Γ. (8) Retain axes witnessing false conditions or distinguishing same-tensor accesses with unequal values. Assign the projected tensor the required values at those accesses. Each condition and each pair of accesses contributes at most one required axis; the union yields the sufficient bound. With multiple aggregated axes in one RClass, project them together while respecting their canonical bijections (Sections 6.2–6.3 and Appendix E.3). The paper explicitly notes that not all k+1 projections necessarily preserve a counterexample (Section 6.2, pages 20–21).

Verus form. Inference: write projection and restriction lemmas over finite sequences, then prove that the scalar expression and branch predicates are preserved. Inference: a Verus proof may need auxiliary lemmas for map restriction and solver guidance; this has not been tested here.

Evidence and limits. The paper gives the `PadLowCombine` derivation as a worked example, not as a separate aggregate benchmark. The method depends on rank-independent semantic factors; three of twenty represented reduction rules remained unproved because of insufficient normalization lemmas and cases with extra zeros (Section 8.1, page 26).

## technique 5: use preconditions as part of rewrite soundness

What it is. A rewrite is proved only for valid left-hand expressions under its declared precondition. The core obligation is `∀v, C ∧ valid-expr(LHS) → ⟦LHS⟧ = ⟦RHS⟧` (Section 6.1, page 16). Section 6.4 and Appendix G additionally require RHS validity. This allows rules whose correctness depends on attributes such as nonnegative padding or equal slice lengths.

When to use it. Inference: add a precondition whenever the rewrite is sound only for a subset of operator attributes. Do not silently treat invalid inputs as counterexamples; state the domain on which the compiler may apply the rule.

How to do it. (1) Identify the operator attributes needed for LHS validity. (2) Encode each as a predicate over maps, as Listing 1 does with `end - start' .== length`, `stride .== 1`, and `start' .== start` (Section 3.2, page 9). (3) Include the precondition in the SMT implication. (4) Inference: check that the compiler’s rewrite pass enforces the same condition before applying the rule. Appendix F restricts the supported precondition language to conjunctions and disjunctions of fold predicates, whose truth is preserved by projection; it does not justify arbitrary negations of whole folds.

Verus form. Inference: put these conditions in `requires` on the verified rewrite function or lemma and state output equivalence in `ensures`. Keep invalid-input behavior outside the lemma's contract unless the implementation must handle it. The paper does not study Rust call-site enforcement, so integration with a Verus API is an inference.

Evidence and limits. TensorRight represented 40 of the 61 XLA rules with preconditions and verified 34 (Table 1, page 26), while TASO and PET represented none of the 61 XLA rules in the precondition category. The precondition row overlaps the five disjoint operator categories in Table 1; TensorRight’s verification is unbounded.

## technique 6: verify reductions with user-supplied index relations

What it is. Reductions over unbounded axis sizes remain uninterpreted reduction elements. TensorRight normalizes them with a limited set of arithmetic rules, then proves a stronger sufficient condition: the reductions combine the same multiset of values. The paper states, “In TensorRight, the user provides a relation between 𝑋 and 𝑌 as a hint.” (Section 6.5, page 24.)

When to use it. Inference: use this approach when two reductions differ by an index rearrangement that preserves the values being combined.

How to do it. (1) Name symbolic reduction indices so the user can refer to them. (2) Supply a relation between the LHS and RHS reduction indices. (3) Have the solver prove the relation is a bijection over valid indices. (4) Prove corresponding elements equal. (5) Apply the bounded verification checks and rank-bound argument (Section 6.5, page 24; Appendix A, pages 34–35; Appendix G, page 60).

Verus form. Inference: define the relation and prove its totality, uniqueness, coverage, and preservation of element values with separate lemmas. This transfer is untested.

Evidence and limits. Section 6.5 reports 13 of 17 rules proved with these hints, one blocked by quantified-formula solver limitations, and three without a suitable bijection. Table 1 instead gives 20 representable and 17 verified reduction-category rules. The paper does not explicitly reconcile the two counts. Extra zero terms and missing normalization rules also limit the approach (Sections 8.1 and 10, pages 26 and 29). In unsupported cases, the user must complete the set-equivalence proof; automation is conditional on the supplied hints and supported reduction rules.

## what is proved, measured, and trusted

Inference: the soundness argument relies on TensorRight DSL denotational semantics, the rank-bound theorem, symbolic execution, and the SMT solver. Inference: these experiments establish representation and proof-completion results within the model; they do not establish implementation correctness for XLA or TensorRight. The setup is one machine, one timeout, and all valid boolean, integer, and real tensor types for each rule (Section 8.2, page 26). The headline denominator is 115 verified of 118 implemented, 121 expressible, and 175 total XLA rules; those are different denominators and should not be conflated.

Inference: in a Verus product, trusted components include the Rust compiler, Verus translation, solver, tensor model, and every external library contract. TensorRight's finite-rank reduction is a reusable design pattern for generic data structures, but its theorem does not prove a Verus encoding sound. Inference: verifying a few concrete shapes in Rust would leave a gap for arbitrary-rank rewrites unless a separate bound theorem applies. The paper does not measure risks in agent-written Rust. Appendix G (page 61) also limits the bound argument for input aliasing: the per-tensor access counts assume distinct input tensors do not alias. It states, “To account for such cases, (1) one can verify a different rewrite capturing the aliasing relation, or (2) adjust the sufficient rank to account for additional cross-tensor interactions and constraints introduced from them.”

## contradictions and what VL should not redo

The abstract calls TensorRight the first automatic system for arbitrary rank and size within its supported model, while the introduction acknowledges earlier manual proof-assistant work and bounded automatic systems (Sections 1 and 2.3, pages 2–3 and 5–6). Inference: this novelty claim concerns automatic verification; it is consistent with the cited manual unbounded proofs. Reductions still need the user hints described above. Table 1 reports 121 represented and 115 verified rules, whereas Section 8.2 reports 118 implemented and 115 verified; the paper explains that three represented rules were not implemented, so the denominators differ.

Inference: VL should not redo a generic bounded-to-unbounded argument without comparing against this rank-class and counterexample-projection method. A useful new study would test whether the same bound inference works for Verus sequences, maps, and iterator transformations, and measure proof repair under changes to generic dimensions. The paper already establishes the tensor-specific technique and its 115/175 result.

## techniques for the catalog

- aggregated-axis DSL: represent arbitrarily many uniformly treated dimensions with named and aggregated axes
- rank-class bounding: infer a sufficient rank per class, verify all lower ranks, and use k-induction for larger ranks
- symbolic SMT lowering: model tensors as uninterpreted functions and prove pointwise equality under symbolic accesses
- counterexample projection: lower a higher-rank failure to a lower-rank instance using rank-independent semantic factors
- preconditioned rewrites: include attribute and validity predicates in the equivalence obligation
- reduction index bijections: check user-supplied relations and equality of corresponding reduction terms
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "For any rewrite rule, TensorRight symbolically executes the LHS and RHS tensor expressions using operator semantics and interprets them under a general access with symbolic indices, chosen from the domain of accesses of the two expressions."): checked every quotation, number, section/page reference, and technique against all 61 pages, including appendices; corrected references, replaced an inexact quotation, specified the bound and full verification conditions, added reduction hints and aliasing limits, corrected the overlapping precondition category, and removed unsupported Verus claims; did not run TensorRight, reproduce benchmarks, validate a Verus implementation, or independently prove the paper’s theorems.
