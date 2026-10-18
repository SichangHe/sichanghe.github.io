# An algebra of alignment for relational verification
(authored by agents unless marked 🧑)
Tag: `antonopoulos2023alignment`, [paper](http://arxiv.org/abs/2202.04278v4)

## what the paper proves or measures

The paper introduces BiKAT, a two-sided extension of Kleene Algebra with Tests (KAT), for deriving alignments between two program executions. The purpose is to turn relational verification into algebraic rewriting plus ordinary and relational Hoare-style obligations. The abstract states: “This article shows how a simple extension of Kleene Algebra with Tests (KAT), called BiKAT, subsumes prior formulations, including alignment witnesses for forall-exists properties, which brings to light new RHL-style rules for such properties.” (Abstract, p. 1). It covers relational noninterference, regression and compiler-translation validation, equivalence, simulation, and data refinement.

The paper’s key separation is between (1) proving a chosen aligned product satisfies the desired relation and (2) proving that the aligned product is adequate, meaning that it represents all computations that matter. It says: “The proof of a given relational property has two parts: the chosen aligned product satisfies the property, and the aligned product is adequate, in the sense that it represents all computations of the program(s) of interest.” (Section 1, p. 2). The extended version adds an appendix (Section 9) with many proofs and examples (Section 1, p. 3), and a separate Coq formalization “includes the basic definitions and results about BiKATs” (Section 1, p. 3). It is a theory and worked-example paper rather than a benchmark study.

Inference: in Verus, the direct analogue is a pair of executable Rust functions or two executions of one function, related by a relational specification. BiKAT is not a Verus library or syntax. Its value for VL is a disciplined way to choose intermediate relational states and to separate adequacy from the easy-to-automate invariant proof.

## technique 1: encode a program and its relational goal in BiKAT

what it is: KAT represents atomic commands as actions, conditions as tests, sequencing with `·`, choice with `+`, and iteration with `*`. BiKAT adds left and right embeddings of a unary KAT and primitive “bitests” over pairs of states. For a relational judgment `c | c′ : R ≈> S`, the paper uses the equation `R; ⟨c | c′⟩; ¬S = 0` (Equation (2), Section 4.1, p. 7). The abstract says that the adequacy of an alignment “must be proved” and that “an explicit algebra enables constructive proof by equational reasoning” (Abstract, p. 1).

when to use it: use this representation when the requirement relates every pair of executions (∀∀, or 2-safety), such as equal outputs for equal inputs or low-input/low-output noninterference. It is also the starting representation before selecting a more useful alignment.

how to do it:
1. Express each program as a KAT term; the factorial example is assignment sequencing followed by a starred loop body and a terminating test (Section 2, p. 3).
2. Put the left and right terms into the BiKAT two-argument embedding `⟨c | c′⟩`, which the paper defines right after Definition 4.1 as `⟨a] # [b⟩` (Section 4.1, p. 7).
3. State a pre-relation `R` and post-relation `S` as bitests over the paired state.
4. Prove the zero equation, or an equivalent inclusion ending in `S`; the relational-model soundness theorem says this is equivalent to the semantic ∀∀ judgment (Theorem 4.6(a), p. 10). Alternatively, per Theorem 4.6(b), find an aligned term `B` with `R; ⟨c | d⟩ ≤ R; B` (the adequacy condition) and `R; B; ¬S = 0` (p. 10).

Verus form (Inference): represent the pre- and post-relations with predicates over paired mathematical values, then prove a Rust function’s `requires` and `ensures` for each side. For two distinct implementations, use a proof `fn` that takes both input states and establishes the relational postcondition. Loop alignment facts become `invariant` clauses on each loop and assertions relating the two ghost/specification states. Verus does not provide BiKAT’s embeddings; the relation and any paired state must be encoded explicitly.

evidence: Theorem 4.6(a) states that, in a relational BiKAT, the semantic condition holds iff `R; ⟨c | d⟩; ¬S = 0` (p. 10). This is a formal soundness theorem under the paper’s relational-model assumptions. In the factorial noninterference example, the authors use `[n =¥ n]` as the pre-bitest and `[r =¥ r]` as the post-bitest (Section 2, pp. 3–4).

limits: Theorem 4.6 is stated for relational BiKATs in which the sub-identity relations representing `R` and `S` are among the BiKAT’s tests (p. 10); the paper says “Lemma 4.5 and Theorem 4.6 can be straightforwardly adapted to trace models.” (Section 4.2, p. 10). The paper also proves that it is undecidable whether a given identity holds in all *-continuous BiKATs (Theorem 4.4, p. 8). Inference: the algebra therefore does not make alignment search or all verification obligations decidable; the paper itself says “We do not need decidability in order to derive useful alignments for specific programs” (Section 4.1, p. 8).

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

evidence: the loop rule `dWh` of Fig. 1 is proved sound using Equation (3), and Theorem 6.1 proves the rules of Fig. 1 sound in any BiKAT (Section 6, pp. 13–14); the sum example derives equivalence without proving the full functional result. For the two sum programs, the text states that “a simple relational loop invariant, [x =¥ x] [i =¥ i], suffices to establish equivalence.” (Section 5, p. 10). These are formal derivations, not measured success rates.

limits: Inference: lockstep alone does not suffice when iteration counts differ or when control paths do not line up; the paper’s sum example unrolls one left iteration first (Section 5, p. 10), and Sections 5 and 6 give more flexible alignments for other cases. Inference: the remainder terms of Equation (3) must still be handled in the proof; dropping unmatched iterations would not be justified by the law.

## technique 3: align unequal loop rates by algebraic tiling

what it is: rewrite one loop so that two iterations on one side correspond to one on the other. The “Double Square” example aligns two iterations of `D1` (which loops 2x times) with one iteration of `D2` (which loops x times). Section 2 describes the invariant as `z` on the left being twice `z` on the right and `y` on the right being twice `y` on the left (Example 2.2, p. 4); Section 5 writes it as `I = [y =¥ 2y]; [z =¥ 2z]` (p. 11), so the two places use different orientation for `y`. The transformed KAT expression groups two left bodies before applying Equation (3) (Section 5, p. 11).

when to use it: use unequal-rate alignment for optimizations or refactorings where one implementation performs a fixed multiple of the other’s work, such as loop unrolling or batching.

how to do it:
1. Use unary KAT laws to rewrite the loop with more iterations (here `D1`) as a repeated group, for example `([z>0]; b; [z>0]; b)*` followed by `([z>0]; b + 1); [z>0]`, where `b` is the loop body (Section 5, p. 11).
2. Apply the loop expansion (3) to the grouped left body and the single right body (Section 5, p. 11).
3. Choose a relational invariant expressing the scale change; the paper uses `I = [y =¥ 2y]; [z =¥ 2z]` (Section 5, p. 11).
4. Prove three obligations: the grouped left body paired with the right body preserves `I`; the grouped left body with only the right guard test `[z>0]` preserves `I`; and the left guard test with the right body preserves `I` (Section 5, p. 11).
5. Inference: prove the post-relation from the invariant and the terminal tests; the paper’s Double Square derivation stops at the invariant-preservation obligations and does not display this step.

Verus form (Inference): write a proof `fn` for the grouped step and establish that two concrete iterations of one Rust loop imply the relational state after one iteration of the other. Keep the scale relation in loop `invariant` clauses or ghost variables. A Verus loop still executes one body per iteration; the two-for-one correspondence belongs to the proof relation.

evidence: the paper’s worked derivation explicitly states that “This example uses an alignment where two iterations of the loop in the first program are related to one iteration of the second one” (Section 2, p. 4). The invariant-preservation decomposition is displayed in Section 5 (p. 11). No independent benchmark measures this technique.

limits: fixed-rate grouping does not cover data-dependent iteration ratios; the paper treats those with conditional alignments (Section 6, Example 6.3). Inference: the grouped rewrite of the loop must be justified by KAT laws, as the paper does in Section 5 (p. 11), before the alignment is valid.

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

evidence and limits: the paper presents the derivation and names the two invariants, but reports no runtime or benchmark denominator. Inference: the approach depends on finding a KAT rewrite that gives both programs the same nested shape and on supplying the representation relation by hand; the paper does not infer that relation automatically (it defers automation to future work, Section 8.1, p. 25).

## technique 5: conditionally align data-dependent loops

what it is: permit a left-only iteration, a right-only iteration, or a paired iteration based on relational predicates `Q` and `R`. Equation (7) expands the product into these alternatives. Rule `caWh` is proved for BiKATs satisfying the expansion law (Section 6, pp. 14–15). The worked example has gratuitous iterations and chooses left-only when `w%2 != 0`, right-only when `w%3 != 0`, and joint execution otherwise (Section 6, p. 15).

when to use it: use conditional alignment when loop counts depend on data or when one side performs stuttering work that has no counterpart on the other side.

how to do it:
1. Define `Q` for a left-only iteration and `R` for a right-only iteration (Section 6, pp. 14–15).
2. Prove the paired body preserves the relational invariant when neither condition holds.
3. Prove left-body-versus-skip preserves the invariant under `Q`.
4. Prove skip-versus-right-body preserves it under `R`.
5. Prove the side condition that the two loop guards agree except in the allowed `Q` or `R` cases (rule `caWh`, p. 14).
6. Use Equation (7), whose body has five alternatives (left-only under `Q`, right-only under `R`, paired when neither holds, and two guard-mismatch cases), to assemble the cases and obtain the terminating post-relation (Section 6, p. 15).

Verus form (Inference): encode stuttering as separate proof branches around the two loop-step specifications. A proof `fn` can establish the relation for left-body/right-skip and left-skip/right-body; the main loop proof maintains the disjunction or guarded invariant. Verus does not have a paired scheduler primitive, so the correspondence is a ghost proof structure.

evidence: for the example, the paper states that y =¥ y′ ∧ z > z ′ > 0 “is invariant and sufficient to establish the postrelation” (the majorization `z > z′`), and that “This reasoning is done using rule caWh in Nagasamudram and Naumann [2021]”; it then gives a BiKAT alignment derived from Equation (7) (Section 6, p. 15). The invariant is therefore asserted and attributed to prior work, not proved in this paper’s main text. Theorem 6.2 says Equation (7) holds in any *-continuous BiKAT and that `caWh` is sound in a BiKAT satisfying it (p. 15).

limits: Equation (7) is not asserted for every BiKAT: “We do not know whether (7) holds in all BiKATs, but it holds in relational BiKATs and trace BiKATs.” (Section 6, p. 15). A proof must therefore establish the model assumptions and all three case obligations.

## technique 6: ∀∃ witnesses for nondeterminism and simulation

what it is: forward simulation is `∀σ,σ′,τ. σRσ′ ∧ σcτ ⇒ ∃τ′. σ′dτ′ ∧ τSτ′`: for every left execution from related initial states, some right execution reaches a related final state. Backward simulation is `∀σ,τ,τ′. σcτ ∧ τSτ′ ⇒ ∃σ′. σRσ′ ∧ σ′dτ′`: for every left execution and every final state `τ′` related to its final state, some right execution ending in `τ′` starts from a state related to `σ` (Section 7.1, p. 16). BiKAT uses a witness `W` consisting of an aligned product plus bitest restrictions. The three witness conditions are: WC, the ∀∀ property on `W`; WO, `W` over-approximates left behavior; and WU, `W` under-approximates right behavior (Example 2.4, p. 5; Theorem 7.1, pp. 16–17). Theorem 7.1 is stated for a relational BiKAT over a KAT with top.

when to use it: use this for nondeterministic code, possibilistic noninterference, data refinement, and refinement proofs where matching executions are existential rather than pairwise universal.

how to do it:
1. State the forward relation `R` on initial states and `S` on final states (Section 7.1, p. 16).
2. Align the two programs and add bitests that restrict the right-side choices to a witness set.
3. Prove WC: the restricted product satisfies the universal relational postcondition.
4. Prove WO: every left behavior is represented by the witness (over-approximation).
5. Prove WU: every witness right behavior is permitted by the right program (under-approximation).
6. Conclude by Theorem 7.1 (forward simulation). For backward simulation use Theorem 7.2, whose b-validity conditions WCb, WOb and WUb are different inequalities (`W; S ≤ R; W; S`, `⟨c]; S ≤ [hav⟩; W`, `W; S ≤ ⟨hav | d⟩`), not a mere reversal of the forward ones (p. 17).

In the nondeterministic example (`E1: x:=any; y:=x`, `E2: t:=any; z:=t+1`, pre-relation true, post-relation `[y =¥ z]`) the paper aligns the programs in lockstep and uses the bitest `[x-1 =¥ t]` after the `any` assignments, so that `t` is restricted to `x-1` and `y = z` holds. The paper says this is sufficient because the bitest “does not restrict the behaviors of the left program (WO), nor does it add behaviors on the right that are not already allowed by the right program (WU).” (Section 2, p. 5).

Verus form (Inference): model the witness choice as a ghost value or an explicit existential witness passed to a proof `fn`; prove that the chosen right execution satisfies its function contract and that the witness is permitted by the implementation. Verus’s `ensures` can express the resulting relation for a supplied witness, but an executable nondeterministic search is outside this proof pattern. Do not encode the witness with an unproved `assume`.

evidence: The paper derives new forward- and backward-simulation proof rules and states their relational characterizations in Section 7. The contributions list says “To our knowledge this provides the first deductive system for backward simulation judgments.” (Section 1, p. 2); this is the authors’ hedged novelty claim. Fig. 2 gives forward-simulation rules (Theorem 7.8) and Fig. 3 backward-simulation rules (Theorem 7.9), both for relational BiKATs over a KAT with top; Theorem 7.3 shows that a simulation judgment holds if and only if it has a valid witness (p. 17). The Coq formalization covers “the basic definitions and results about BiKATs” (Section 1, p. 3); the paper says “Our Coq development already provides the basic BiKAT laws/lemmas” and that it “could be extended” to the forward/backward simulation rules (Section 8.1, p. 25), so those rules are not stated to be machine-checked.

limits: witness restrictions must satisfy both over- and under-approximation obligations; Inference: a witness that merely finds one convenient pair of executions is insufficient. The paper says that “Thorough investigation of loop rules for backward simulation is beyond the scope of this paper.” (Section 7.4.2, p. 23) and that it has “not investigated their completeness” for the simulation rules (Section 8.4, p. 29). It explores ∃∀ and ∃∃ properties and sketches TriKAT, but “we do not formally define TriKAT” (Sections 7.5–7.6, pp. 23–25), so the same completed development is not provided for every quantifier pattern.

## technique 7: derive relational Hoare rules and use procedure summaries

what it is: standard relational Hoare rules for sequencing, conditionals, loops, consequence, and one-sided `skip` are derived from the BiKAT equation. Theorem 6.1 states: “The rules of Fig. 1 are sound in any BiKAT.” (Section 6, p. 14). BiKAT can also take unary procedure summaries or relational hypotheses as hypotheses about primitive actions, so alignment can occur at procedure boundaries (Section 5, pp. 12–13).

how to do it:
1. Translate a desired relational judgment to `P; ⟨c | c′⟩; ¬Q = 0` (Section 6, p. 13).
2. Apply derived sequence, conditional, loop, consequence, and disjunction rules (Figure 1, p. 13).
3. For a procedure call, import a unary postcondition or a relational procedure judgment as a hypothesis (Section 5, p. 13).
4. Add any ghost pre-state relation needed to express postconditions referring to old values (Section 5, p. 13).
5. Prove the remaining alignment and postcondition obligations.

Verus form (Inference): use executable function `requires`/`ensures` contracts and proof `fn`s for relational procedure summaries. Keep pre-state values in ghost/spec variables rather than inventing unsupported syntax. Loop rules become explicit `invariant` clauses; conditional branches require separate `assert` facts. Verus’s contracts must still be proved for each implementation, so importing a summary is a trusted boundary unless its proof is present.

evidence and limits: the paper gives a worked `arrayInsert` example, with goal `[len =¥ len] [A =¥ A] ≈> [i =¥ i]`, where both executions are aligned at three places (after both first loops, after both `shift_array` calls, after both second loops) and either a relational hypothesis or unary specification of `shift_array` is used to keep `len` in agreement (Section 5, pp. 12–13). This is a formal example, not an empirical evaluation. The summary itself is an assumption until justified by a unary or relational proof.

## trusted boundary, contradictions, and scope

The formal guarantees are conditional on the KAT/BiKAT algebra, the semantics of primitive actions and tests, and the adequacy proofs for any chosen alignment. The paper’s Coq artifact covers the basic definitions and results, but the implementation semantics of a target Rust program, external procedure summaries, and Verus’s verifier remain outside this paper (Inference). Inference: Theorem 4.4’s undecidability result means automation can search or simplify but cannot decide all identities. The paper says “We save automation for future work” (Section 8.1, p. 25); its only tool experiment is a manual encoding of one concrete BiKAT, minus LRC, in which KMT “was able to verify some equivalence queries” (Section 8.1, p. 25).

No benchmark denominator, verification-time table, or success percentage is reported. The concrete evidence consists of algebraic soundness theorems, worked derivations, and the accompanying Coq formalization. The paper distinguishes proving a relational property from proving alignment adequacy. Section 8.2 adds that BiKAT “cannot directly encode adequacy checks expressed as assertions” (p. 26). Inference: omitting adequacy would leave a gap even when a simple invariant proves the aligned product.

Inference: a product generating verified Rust should treat BiKAT’s alignment catalog as a design aid for regression and translation-equivalence proofs. It reduces relational invariants when loop rates, shapes, or stuttering differ, but it does not remove the need to specify representation relations, prove procedure summaries, or check the exact quantifier pattern. VL should not redo a generic lockstep relational-logic derivation as a new contribution; a useful product experiment would instead measure how often agent-generated alignments preserve adequacy under real Rust refactorings.

## techniques for the catalog

- BiKAT relational encoding — represent two programs, paired-state tests, and a relational goal as an algebraic zero equation
- lockstep loop expansion — derive a common paired-loop star and preserve a relational invariant through corresponding iterations
- unequal-rate alignment — group fixed numbers of iterations on one side before applying relational loop reasoning
- loop-shape normalization — use unary algebraic rewrites to align flattened and nested loops
- conditional stuttering alignment — prove left-only, right-only, and paired steps under data-dependent guards
- ∀∃ witness alignment — restrict nondeterministic choices and prove universal correctness plus over- and under-approximation
- derived relational Hoare rules — use BiKAT equations to justify sequence, branch, loop, consequence, and procedure-summary rules
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Of course we interactively use LRC to obtain the desired alignment and do not give KMT instances of the LRC axiom, owing to undecidability."): I read the whole paper text (main text, references and the appendix, Section 9) and checked every quotation, theorem, figure, example and page reference against it, and the arXiv v4 link and tag. I changed: the appendix/Coq description; the abstract quotation (now lowercase and with its context) and the misplaced attribution of the backward-simulation novelty claim (it is in Section 1 p. 2, not the abstract, and is hedged); which loop is regrouped in the unequal-rate technique, the Double Square page range and invariant orientation, and its three obligations; the backward-simulation definition and Theorem 7.2 conditions; the `[x-1 =¥ t]` bitest description; the caWh example (the paper cites prior work for its proof); the Coq claim (not stated to cover the simulation rules); added limits from Sections 7.4.2, 8.1, 8.2 and 8.4; and labeled my own conclusions Inference. I did not check the Verus-form paragraphs beyond confirming they are labeled Inference, did not re-derive the proofs or the Coq artifact, and did not read the cited external papers.
