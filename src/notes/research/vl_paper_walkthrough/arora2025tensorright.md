# TensorRight: Automated Verification of Tensor Graph Rewrites
(authored by agents unless marked 🧑)
Tag: `arora2025tensorright`, [paper](http://arxiv.org/abs/2511.17838v1)

## scope and result

TensorRight verifies tensor compiler rewrite rules for arbitrary tensor rank and size. Its central reduction is finite: represent any number of axes with aggregated axes, assign rank classes, infer a sufficient rank bound, instantiate every rank up to that bound, and discharge each bounded case with symbolic execution and an SMT solver. The paper then uses induction to cover larger ranks (Sections 3.2–3.3 and 6.1, pages 10 and 16–18). It reports 115 unbounded proofs for 115 of 118 implemented rules out of 121 expressible rules from the 175-rule XLA Algebraic Simplifier pass (Section 8.2, page 26).

## technique 1: represent polymorphic tensors with aggregated axes and rank classes

What it is. A named axis is a single semantic dimension. An aggregated axis is a set of named axes treated uniformly, so one expression denotes tensors with any rank. A rank class (RClass) ties aggregated axes that must be instantiated at the same rank and provides canonical bijections for relabeling (Sections 4.1–4.3 and 6.1, pages 10–17). The paper states, “The key distinction of our DSL from XLA-HLO is that we group axes into aggregated-axes, where all the axes in the same group share the same ‘role’ and are treated uniformly by the operators.” (Section 4, page 10.)

When to use it. Use this representation when a rewrite must hold for arbitrary numbers of dimensions and the operators are layout-insensitive. It is unsuitable for layout-sensitive reshape and bitcast rules; the evaluation says TensorRight “cannot represent layout-sensitive rules” (Section 8.1, page 26).

How to do it. (1) Give semantic names to axes and represent shapes as maps from names to sizes. (2) Group repeatable dimensions into an aggregated axis. (3) Put aggregated axes that must share rank into one RClass. (4) Define the canonical positional bijection between members of that class. (5) Express the left-hand and right-hand tensor expressions and any precondition over these abstract axes. Listing 1 shows the concrete DSL shape: `newTensor @TensorInt "Y" [rcls --> size]`, operators such as `dynamicSlice` and `slice`, and `precondition` declarations (Section 3.2, page 10).

Verus form. Inference: encode an abstract shape as a Verus sequence or map plus a predicate describing valid dimensions, and use a predicate to state that two shape sequences have equal length and a positional correspondence. Inference: use `requires` for rank/shape preconditions and `ensures` for equality of output tensors; use ghost state or proof functions for the axis bijection. These are a semantic encoding in Verus, not TensorRight syntax. Verus has no built-in aggregated-axis operator in the cited reference.

Evidence and limits. TensorRight represented 121 of 175 XLA rules; its categories and denominators are in Table 1 (Section 8.1, page 26). The DSL covers boolean, integer, and real tensors, but not all operators, floating-point precision, or layout-sensitive semantics (Sections 8.1–8.2, pages 26–27).

## technique 2: infer a finite rank bound and use k-induction

What it is. For each RClass, TensorRight computes a sufficient rank k from the number of distinct boolean conditions and tensor accesses. It proves all instances through k, then proves that validity at rank i implies validity at i+1 for every i≥k. The paper's key condition is “there exists a rank k, such that, ∀i ≥ k, valid(i) → valid(i + 1)” (Section 6.1, page 18).

When to use it. Use this reduction when a property is uniform over dimensions and a counterexample at a higher rank can be projected to a lower rank. It turns an infinite rank space into finitely many SMT obligations plus an induction proof.

How to do it. (1) Build the aggregated representation and RClasses. (2) Count distinct access expressions and boolean conditions to derive a candidate bound. (3) Instantiate each RClass with every rank from 1 through its bound. (4) Generate and prove each bounded obligation. (5) Establish the induction step by showing any counterexample at rank k+1 (and above) projects to one at rank k. (6) Conclude validity for all larger ranks. For `SliceDyUpSlice`, the authors show rank 2 is sufficient: “Therefore, if the SliceDyUpSlice rule is valid for rank 2, then it is valid for any higher-rank.” (Section 2.4, page 4.)

Verus form. Inference: represent `valid(rank)` as a predicate over a shape sequence and prove a base lemma for all ranks up to k plus a step lemma from rank i to i+1. Use a `while` loop invariant only for executable iteration; the mathematical induction itself belongs in proof functions and lemmas. Inference: the projection from k+1 dimensions to k dimensions must be an explicit lemma over sequences/maps. The paper's rank-bound theorem does not transfer automatically to Verus.

Evidence and limits. In the evaluation, 110 of the 115 verified rules required one bounded-verification task, and the remaining rules required the product of RClass bounds (Section 8.2, page 27). The method assumes the semantic operators admit rank-independent index transformers and conditions; operators whose behavior depends on physical layout fall outside the representation (Sections 6.2 and 8.1, pages 18–26).

## technique 3: lower each bounded instance to symbolic SMT verification

What it is. After rank instantiation, sizes remain unbounded. TensorRight models each tensor as an uninterpreted function, sizes and indices as unbounded integers, and symbolically evaluates both sides at a general valid access. It asks the SMT solver to prove the precondition implies equality of the symbolic values (Sections 6.1 and 6.4, pages 16 and 21). The paper says, “To handle arbitrary sizes, we model each tensor as an uninterpreted function and use unbounded integers to model the indices and sizes in each named-axis.” (Section 6.1, page 16.)

When to use it. Use this lowering for arithmetic, conditionals, slicing, padding, and other operators whose scalar behavior can be expressed with integer, Boolean, or real formulas. It is effective when the solver has theories for the resulting operations and the rule's semantics can be symbolically evaluated.

How to do it. (1) Instantiate all RClasses to concrete ranks within the bound. (2) Create symbolic maps for sizes, indices, and attributes. (3) Symbolically evaluate the LHS and RHS. (4) Assert shape equality and validity of the LHS. (5) Introduce a general access A to the output. (6) Ask Z3, or cvc5 for the one advanced rule, to prove `pre && lhsValid -> lhsSym[A] .== rhsSym[A]`. Listing 2 contains this exact proof shape (Section 3.3, page 10). For `PadLowCombine`, the paper expands nested padding into conditionals and proves equality for every symbolic access (Section 6.2, pages 18–20).

Verus form. Inference: model an array or tensor as a sequence/map and state element equality under a universally quantified valid index, or use a quantified `ensures` predicate when supported by the project’s Verus conventions. Use `requires` for shape and index bounds and proof functions for arithmetic identities. Inference: Verus's SMT-backed verification can discharge similar integer obligations, but TensorRight's uninterpreted-function encoding and solver behavior must be re-established for the chosen Rust representation.

Evidence and limits. On an Intel Core i9-13900K with 128 GB RAM and a 10-second timeout per SMT query, 108 of 115 verified rules completed in under one second; total times ranged from 0.023 s to 23.33 s (Section 8.2, page 27). Unsupported operators include `log` and `power`, and floating-point precision is difficult for the solvers (Section 8.1, page 26).

## technique 4: compute bounds by rank-independent semantic factors and lower counterexamples

What it is. TensorRight factors each symbolic expression into an index transformer, folded Boolean conditions, and a scalar function. These factors do not depend on the number of named axes. To prove the induction step, it takes a counterexample at rank k+1 and projects k of the axes, solving constraints so the scalar-function arguments remain equal and the mismatch persists (Section 6.2, pages 19–21).

When to use it. Use this technique when direct induction over tensor structures is difficult but the operator semantics are pointwise and factor into rank-independent functions. It provides a constructive way to derive the rank bound rather than guessing one.

How to do it. (1) Expand the denotational semantics at a general access. (2) Rewrite index arithmetic as `fmap` of an index transformer. (3) Rewrite nested conditions as `fold` over per-axis predicates. (4) Count distinct accesses and conditions for the bound. (5) Assume a failing instance at rank k+1. (6) Choose a size-k projection Γ of the axes. (7) Restrict shape, attributes, and access maps to Γ. (8) Solve the equality constraints that preserve the scalar-function arguments and retain a failing access. The paper explicitly notes that not all k+1 projections necessarily preserve a counterexample (Section 6.2, pages 20–21).

Verus form. Inference: write projection and restriction lemmas over finite sequences, then prove that the scalar expression and branch predicates are preserved. Inference: a Verus proof would need explicit triggers and auxiliary lemmas for map restriction; this is a likely proof-engineering cost absent from TensorRight's generated DSL.

Evidence and limits. The paper gives the `PadLowCombine` derivation as a worked example, not as a separate aggregate benchmark. The method depends on rank-independent semantic factors; reductions with extra zeros lacked sufficient normalization lemmas for three of twenty represented reduction rules (Section 8.1, page 26).

## technique 5: use preconditions as part of rewrite soundness

What it is. A rewrite is proved only for valid left-hand expressions under its declared precondition. The core obligation is `∀v, C ∧ valid-expr(LHS) → ⟦LHS⟧ = ⟦RHS⟧` (Section 6.1, page 16). This allows rules whose correctness depends on attributes such as nonnegative padding or equal slice lengths.

When to use it. Add a precondition whenever the rewrite is sound only for a subset of operator attributes. Do not silently treat invalid inputs as counterexamples; state the domain on which the compiler may apply the rule.

How to do it. (1) Identify the operator attributes needed for LHS validity. (2) Encode each as a predicate over maps, as Listing 1 does with `end - start' .== length`, `stride .== 1`, and `start' .== start` (Section 3.2, page 10). (3) Include the precondition in the SMT implication. (4) Check that the compiler's rewrite pass enforces the same condition before applying the rule.

Verus form. Inference: put these conditions in `requires` on the verified rewrite function or lemma and repeat them in the `ensures` proof context. Keep invalid-input behavior outside the lemma's contract unless the implementation must handle it. The paper does not study Rust call-site enforcement, so integration with a Verus API is an inference.

Evidence and limits. TensorRight represented and verified 34 of 40 represented rules with preconditions (Table 1, page 26), while TASO and PET represented none of the 61 XLA rules in the precondition category. The count is for the disjoint Table 1 category and uses TensorRight's unbounded verification setting.

## what is proved, measured, and trusted

The soundness argument is conditional on TensorRight DSL denotational semantics, the rank-bound theorem, symbolic execution, and the SMT solver. The evaluation measures rule representation and proof completion, not the correctness of XLA itself or of TensorRight's implementation. The setup is one machine, one timeout, and all valid boolean, integer, and real tensor types for each rule (Section 8.2, page 27). The headline denominator is 115 verified of 118 implemented, 121 expressible, and 175 total XLA rules; those are different denominators and should not be conflated.

Inference: in a Verus product, trusted components include the Rust compiler, Verus translation, solver, tensor model, and every external library contract. TensorRight's finite-rank reduction is a reusable design pattern for generic data structures, but its theorem does not prove a Verus encoding sound. Inference: the threat to agent-written verified Rust is high for generic rewrite-heavy code if agents verify only a few concrete shapes; TensorRight shows why a bounded test or proof can miss higher-rank counterexamples. It is moderate for API designs that are intentionally fixed-rank or whose contracts include the necessary generic invariants.

## contradictions and what VL should not redo

The abstract calls TensorRight the first automatic system for arbitrary rank and size, while the introduction acknowledges earlier manual proof-assistant work and bounded automatic systems (Sections 1 and 2.3, pages 2–4). This is a scope claim about automatic push-button verification, not a claim that no prior unbounded proof exists. Table 1 reports 121 represented and 115 verified rules, whereas Section 8.2 reports 118 implemented and 115 verified; the paper explains that three represented rules were not implemented, so the denominators differ.

Inference: VL should not redo a generic bounded-to-unbounded argument without comparing against this rank-class and counterexample-projection method. A useful new study would test whether the same bound inference works for Verus sequences, maps, and iterator transformations, and measure proof repair under changes to generic dimensions. The paper already establishes the tensor-specific technique and its 115/175 result.

## techniques for the catalog

- aggregated-axis DSL: represent arbitrarily many uniformly treated dimensions with named and aggregated axes
- rank-class bounding: infer a sufficient rank per class, verify all lower ranks, and use k-induction for larger ranks
- symbolic SMT lowering: model tensors as uninterpreted functions and prove pointwise equality under symbolic accesses
- counterexample projection: lower a higher-rank failure to a lower-rank instance using rank-independent semantic factors
- preconditioned rewrites: include attribute and validity predicates in the equivalence obligation
Checked 2026-10-13: audit record arora2025tensorright; paper-study comparison complete; gate executed; experiments not rerun
