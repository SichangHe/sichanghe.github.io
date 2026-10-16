# An algebra of alignment for relational verification
(authored by agents unless marked 🧑)
Tag: `antonopoulos2023alignment`, [paper](http://arxiv.org/abs/2202.04278v4)

## what the paper proves or measures

The paper introduces BiKAT, a two-sided extension of Kleene Algebra with Tests (KAT), for deriving alignments between two program executions. The purpose is to turn relational verification into algebraic rewriting plus ordinary and relational Hoare-style obligations. The abstract states: “This article shows how a simple extension of Kleene Algebra with Tests (KAT), called BiKAT, subsumes prior formulations, including alignment witnesses for forall-exists properties, which brings to light new RHL-style rules for such properties.” (Abstract, p. 1). It covers relational noninterference, regression and compiler-translation validation, equivalence, simulation, and data refinement.

The paper’s key separation is between (1) proving a chosen aligned product satisfies the desired relation and (2) proving that the aligned product is adequate, meaning that it represents all computations that matter. It says: “The proof of a given relational property has two parts: the chosen aligned product satisfies the property, and the aligned product is adequate, in the sense that it represents all computations of the program(s) of interest.” (Section 1, p. 2). The extended version includes an appendix with proofs and a Coq formalization; it is a theory and worked-example paper rather than a benchmark study.

Inference: in Verus, the direct analogue is a pair of executable Rust functions or two executions of one function, related by a relational specification. BiKAT is not a Verus library or syntax. Its value for VL is a disciplined way to choose intermediate relational states and to separate adequacy from the easy-to-automate invariant proof.

## technique 1: encode a program and its relational goal in BiKAT

what it is: KAT represents atomic commands as actions, conditions as tests, sequencing with `·`, choice with `+`, and iteration with `*`. BiKAT adds left and right embeddings of a unary KAT and primitive “bitests” over pairs of states. For a relational judgment `c | c′ : R ≈> S`, the paper uses the equation `R; ⟨c | c′⟩; ¬S = 0` (Definition 4.1 and Equation (2), p. 7). The abstract describes the reason: “An explicit algebra enables constructive proof by equational reasoning.” (Abstract, p. 1).

when to use it: use this representation when the requirement relates every pair of executions (∀∀, or 2-safety), such as equal outputs for equal inputs or low-input/low-output noninterference. It is also the starting representation before selecting a more useful alignment.

how to do it:
1. Express each program as a KAT term; the factorial example is assignment sequencing followed by a starred loop body and a terminating test (Section 2, p. 3).
2. Put the left and right terms into the BiKAT two-argument embedding `⟨c | c′⟩` (Definition 4.1, p. 7).
3. State a pre-relation `R` and post-relation `S` as bitests over the paired state.
4. Prove the zero equation, or an equivalent inclusion ending in `S`; the relational-model soundness theorem says this is equivalent to the semantic ∀∀ judgment (Theorem 4.6, p. 10).

Verus form (Inference): represent the pre- and post-relations with predicates over paired mathematical values, then prove a Rust function’s `requires` and `ensures` for each side. For two distinct implementations, use a proof `fn` that takes both input states and establishes the relational postcondition. Loop alignment facts become `invariant` clauses on each loop and assertions relating the two ghost/specification states. Verus does not provide BiKAT’s embeddings; the relation and any paired state must be encoded explicitly.

evidence: Theorem 4.6(a) states that, in a relational BiKAT, the semantic condition holds iff `R; ⟨c | d⟩; ¬S = 0` (p. 10). This is a formal soundness theorem under the paper’s relational-model assumptions. In the factorial noninterference example, the authors use `[n =¥ n]` as the pre-bitest and `[r =¥ r]` as the post-bitest (Section 2, pp. 3–4).

limits: the theorem assumes that the relevant state relations are represented as BiKAT tests and that the embeddings have the required homomorphism properties. The paper also proves that validity of an arbitrary identity in all *-continuous BiKATs is undecidable (Theorem 4.4, p. 8). Therefore, the algebra does not make alignment search or all verification obligations decidable.

## technique 2: derive a lockstep loop alignment by equational rewriting

what it is: BiKAT’s left-right commutativity (LRC) lets independent left and right actions be reordered. The general loop law expands two starred loops into a common lockstep star plus left-only and right-only remainder paths (Equation (3), Section 4.1, p. 8). The paper says: “The following general law is useful for reasoning about two loops while e do c and while e′ do c′. They are aligned lockstep, under a common star, with a remainder to account for whichever may iterate longer.” (Section 4.1, p. 8).

when to use it: use lockstep when loop iterations correspond one-for-one and a simple relational invariant is preserved by both bodies. It is the normal first attempt for same-structure programs and for equal-input/equal-output proofs.

how to do it:
1. Start with the two loop KAT terms inside the relational judgment (Section 4.1, p. 8).
2. Apply the loop expansion law to expose a star of paired body iterations plus remainder terms for unequal termination (Equation (3), p. 8).
3. Use homomorphism and LRC to move left actions next to left actions and right actions next to right actions, producing a paired body.
4. Introduce a relational invariant as a bitest and prove it is preserved by the paired body.
5. Discharge the post-relation after both loops terminate; the remainder terms account for the side that runs longer.

The factorial example illustrates the pattern: both copies of the loop are aligned in lockstep, and agreements on `i`, `n`, and `r` are introduced inside the body (Section 2, pp. 3–4). The simple sum example later unrolls one extra left iteration before applying lockstep; its invariant is `[i =¥ i][x =¥ x]` (Section 5, pp. 10–11).

Verus form (Inference): preserve the paired invariant by proving an `ensures` relation for each loop body or by a `proof fn` that combines the two body facts. If a single Rust function is run twice, represent each run’s mutable state with separate ghost/spec values. Use the concrete loop’s `invariant` for each side and `assert` the relational invariant after corresponding iterations. The paper’s algebraic star is a proof derivation; it is not a runtime loop transformation.

evidence: Theorem 6.1 proves the selected relational Hoare rules sound in any BiKAT (Section 6, p. 14), and the examples derive equivalence without proving the full functional result. For the two sum programs, the text states that “a simple relational loop invariant, [x =¥ x] [i =¥ i], suffices to establish equivalence.” (Section 5, p. 10). These are formal derivations, not measured success rates.

limits: lockstep can fail when iteration counts differ or when control paths do not line up. The authors explicitly introduce more flexible alignments for those cases. Remainder branches must still be proved adequate; simply dropping unmatched iterations would be unsound.

## technique 3: align unequal loop rates by algebraic tiling

what it is: rewrite one loop so that two iterations on one side correspond to one on the other. The “Double Square” example aligns two iterations of `D1` with one iteration of `D2`, preserving `z_left = 2 z_right` and `y_right = 2 y_left` (Section 5, pp. 11–12). The transformed KAT expression groups two left bodies before applying Equation (3).

when to use it: use unequal-rate alignment for optimizations or refactorings where one implementation performs a fixed multiple of the other’s work, such as loop unrolling or batching.

how to do it:
1. Use unary KAT laws to rewrite the faster loop as a repeated group, for example `(guard; body; guard; body)*` (Section 5, p. 11).
2. Apply the loop expansion to the grouped left body and the single right body.
3. Choose a relational invariant expressing the scale change; the paper uses `I = [y =¥ 2y]; [z =¥ 2z]` (Section 5, p. 11).
4. Prove three obligations: paired grouped iterations preserve `I`, a left-only grouped iteration preserves `I`, and a right-only iteration preserves `I` (Section 5, p. 11).
5. Prove the post-relation from the invariant and terminal tests.

Verus form (Inference): write a proof `fn` for the grouped step and establish that two concrete iterations of one Rust loop imply the relational state after one iteration of the other. Keep the scale relation in loop `invariant` clauses or ghost variables. A Verus loop still executes one body per iteration; the two-for-one correspondence belongs to the proof relation.

evidence: the paper’s worked derivation explicitly states that “This example uses an alignment where two iterations of the loop in the first program are related to one iteration of the second one” (Section 2, p. 4). The invariant-preservation decomposition is displayed in Section 5 (p. 11). No independent benchmark measures this technique.

limits: fixed-rate grouping does not cover data-dependent iteration ratios. The paper treats those with conditional alignments. Grouping also requires a semantic side condition that the unrolled expression is equivalent to the original loop.

## technique 4: normalize different loop shapes before alignment

what it is: algebraically reshape programs so their KAT terms have compatible nested-loop structure. In the loop-tiling example, a one-dimensional loop `L1` is rewritten into nested loops, then aligned with the nested loops of `L2` (Sections 2 and 5, pp. 5 and 12). The relational invariants connect the representation: `x =¥ i × M + j` and an array-value relation `R(x,i,j)`.

when to use it: use normalization when two programs compute the same result with different control-flow shapes, such as flattening versus nesting, tiling, or data-layout changes.

how to do it:
1. Treat each program as a KAT term and apply unary KAT equivalences to reshape one term (Section 2, p. 5).
2. Make the loop guards and body grouping structurally compatible.
3. Choose index and data representation relations; the paper uses `x =¥ i × M + j` and agreement of corresponding array elements (Section 2, p. 5).
4. Prove inner-loop and outer-loop relational invariants separately (Section 5, p. 12).
5. Conclude the representation-level post-relation after both normalized terms terminate.

Verus form (Inference): expose a mathematical sequence or map specification for each array representation, then prove index correspondence and element equality with `requires`, `ensures`, `invariant`, and `assert`. The algebraic normalization itself is not available in Verus, so the equivalent loop-shape facts must be proved manually or packaged as proof `fn`s.

evidence and limits: the paper presents the derivation and names the two invariants, but reports no runtime or benchmark denominator. The approach depends on finding a terminating KAT rewrite and on having a precise representation relation; it does not infer that relation automatically.

## technique 5: conditionally align data-dependent loops

what it is: permit a left-only iteration, a right-only iteration, or a paired iteration based on relational predicates `Q` and `R`. Equation (7) expands the product into these alternatives. Rule `caWh` is proved for BiKATs satisfying the expansion law (Section 6, pp. 14–15). The worked example has gratuitous iterations and chooses left-only when `w%2 != 0`, right-only when `w%3 != 0`, and joint execution otherwise (Section 6, p. 15).

when to use it: use conditional alignment when loop counts depend on data or when one side performs stuttering work that has no counterpart on the other side.

how to do it:
1. Define `Q` for a left-only iteration and `R` for a right-only iteration (Section 6, pp. 14–15).
2. Prove the paired body preserves the relational invariant when neither condition holds.
3. Prove left-body-versus-skip preserves the invariant under `Q`.
4. Prove skip-versus-right-body preserves it under `R`.
5. Prove the side condition that the two loop guards agree except in the allowed `Q` or `R` cases (rule `caWh`, p. 14).
6. Use Equation (7) to assemble the three cases and prove the terminating post-relation.

Verus form (Inference): encode stuttering as separate proof branches around the two loop-step specifications. A proof `fn` can establish the relation for left-body/right-skip and left-skip/right-body; the main loop proof maintains the disjunction or guarded invariant. Verus does not have a paired scheduler primitive, so the correspondence is a ghost proof structure.

evidence: the paper’s example proves `y =¥ y′ ∧ z > z′ > 0` as an invariant and uses it to establish that factorial output majorizes the other program’s output (Section 6, p. 15). Theorem 6.2 says Equation (7) holds in any *-continuous BiKAT and that `caWh` is sound in a BiKAT satisfying it (p. 15).

limits: Equation (7) is not asserted for every BiKAT: “We do not know whether (7) holds in all BiKATs, but it holds in relational BiKATs and trace BiKATs.” (Section 6, p. 15). A proof must therefore establish the model assumptions and all three case obligations.

## technique 6: ∀∃ witnesses for nondeterminism and simulation

what it is: for forward simulation, every left execution must have some right execution that reaches the related post-state; for backward simulation, every right execution must have some matching left execution. BiKAT uses a witness `W` consisting of an aligned product plus bitest restrictions. The three witness conditions are: WC, the ∀∀ property on `W`; WO, `W` over-approximates left behavior; and WU, `W` under-approximates right behavior (Example 2.4 and Theorem 7.1, pp. 5 and 16).

when to use it: use this for nondeterministic code, possibilistic noninterference, data refinement, and refinement proofs where matching executions are existential rather than pairwise universal.

how to do it:
1. State the forward relation `R` on initial states and `S` on final states (Section 7.1, p. 16).
2. Align the two programs and add bitests that restrict the right-side choices to a witness set.
3. Prove WC: the restricted product satisfies the universal relational postcondition.
4. Prove WO: every left behavior is represented by the witness (over-approximation).
5. Prove WU: every witness right behavior is permitted by the right program (under-approximation).
6. Use the forward-simulation theorem; reverse the direction for backward simulation.

The nondeterministic example chooses `t := x-1` after the right-side `any` assignment so that `y = z` holds. The paper says this is sufficient because the bitest “does not restrict the behaviors of the left program (WO), nor does it add behaviors on the right that are not already allowed by the right program (WU).” (Section 2, p. 5).

Verus form (Inference): model the witness choice as a ghost value or an explicit existential witness passed to a proof `fn`; prove that the chosen right execution satisfies its function contract and that the witness is permitted by the implementation. Verus’s `ensures` can express the resulting relation for a supplied witness, but an executable nondeterministic search is outside this proof pattern. Do not encode the witness with an unproved `assume`.

evidence: The paper derives new forward- and backward-simulation proof rules and states their relational characterizations in Section 7. The abstract claims these are “the first deductive system for backward simulation judgments.” (Abstract, p. 1); this is the authors’ novelty claim. The Coq formalization includes “the basic definitions and results about BiKATs” (Section 1, p. 3), providing machine-checked support for the algebraic core.

limits: witness restrictions must satisfy both over- and under-approximation obligations. A witness that merely finds one convenient pair of executions is insufficient. The paper also explores ∃∀ and ∃∃ properties and sketches TriKAT, but does not provide the same completed development for every quantifier pattern (Sections 7.5–7.6).

## technique 7: derive relational Hoare rules and use procedure summaries

what it is: standard relational Hoare rules for sequencing, conditionals, loops, consequence, and one-sided `skip` are derived from the BiKAT equation. Theorem 6.1 states: “The rules of Fig. 1 are sound in any BiKAT.” (Section 6, p. 14). BiKAT also accepts unary procedure summaries or relational hypotheses as primitive action assumptions, so alignment can occur at procedure boundaries (Section 5, pp. 12–13).

how to do it:
1. Translate a desired relational judgment to `P; ⟨c | c′⟩; ¬Q = 0` (Section 6, p. 13).
2. Apply derived sequence, conditional, loop, consequence, and disjunction rules (Figure 1, p. 13).
3. For a procedure call, import a unary postcondition or a relational procedure judgment as a hypothesis (Section 5, p. 13).
4. Add any ghost pre-state relation needed to express postconditions referring to old values (Section 5, p. 13).
5. Prove the remaining alignment and postcondition obligations.

Verus form (Inference): use executable function `requires`/`ensures` contracts and proof `fn`s for relational procedure summaries. Keep pre-state values in ghost/spec variables rather than inventing unsupported syntax. Loop rules become explicit `invariant` clauses; conditional branches require separate `assert` facts. Verus’s contracts must still be proved for each implementation, so importing a summary is a trusted boundary unless its proof is present.

evidence and limits: the paper gives a worked `arrayInsert` example where both executions are aligned at three procedure/loop boundaries and a summary for `shift_array` preserves `len` agreement (Section 5, pp. 12–13). This is a formal example, not an empirical evaluation. The summary itself is an assumption until justified by a unary or relational proof.

## trusted boundary, contradictions, and scope

The formal guarantees are conditional on the KAT/BiKAT algebra, the semantics of primitive actions and tests, and the adequacy proofs for any chosen alignment. The paper’s Coq artifact covers the basic definitions and results, but the implementation semantics of a target Rust program, external procedure summaries, and Verus’s verifier remain outside this paper (Inference). Theorem 4.4’s undecidability result means automation can search or simplify but cannot decide all identities.

No benchmark denominator, verification-time table, or success percentage is reported. The concrete evidence consists of algebraic soundness theorems, worked derivations, and the accompanying Coq formalization. The paper distinguishes proving a relational property from proving alignment adequacy; omitting adequacy would leave a gap even when a simple invariant proves the aligned product.

Inference: a product generating verified Rust should treat BiKAT’s alignment catalog as a design aid for regression and translation-equivalence proofs. It reduces relational invariants when loop rates, shapes, or stuttering differ, but it does not remove the need to specify representation relations, prove procedure summaries, or check the exact quantifier pattern. VL should not redo a generic lockstep relational-logic derivation as a new contribution; a useful product experiment would instead measure how often agent-generated alignments preserve adequacy under real Rust refactorings.

## techniques for the catalog

- BiKAT relational encoding — represent two programs, paired-state tests, and a relational goal as an algebraic zero equation
- lockstep loop expansion — derive a common paired-loop star and preserve a relational invariant through corresponding iterations
- unequal-rate alignment — group fixed numbers of iterations on one side before applying relational loop reasoning
- loop-shape normalization — use unary algebraic rewrites to align flattened and nested loops
- conditional stuttering alignment — prove left-only, right-only, and paired steps under data-dependent guards
- ∀∃ witness alignment — restrict nondeterministic choices and prove universal correctness plus over- and under-approximation
- derived relational Hoare rules — use BiKAT equations to justify sequence, branch, loop, consequence, and procedure-summary rules
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
