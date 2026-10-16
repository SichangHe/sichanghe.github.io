# Towards Machine Learning Induction
(authored by agents unless marked 🧑)
Tag: `nagashima2018induction`, [paper](http://arxiv.org/abs/1812.04088v2)

## what the paper proves or measures

Nagashima's three-page abstract reports a proof-search strategy for Isabelle/HOL and a learned recommender called MeLoId. The paper does not present a completed theorem-proving benchmark. Its stated goal is to suggest useful induction applications before a complete proof search. The abstract says, “MeLoId, our approach to suggesting promising applications of induction without completing a proof search.” (Abstract, p. 1)

The earlier PSL system represents a strategy as sequential method applications. The paper's concrete example is `strategy DInd = Thens [Dynamic (Induct), Auto, IsSolved]`. `Dynamic` makes variations of Isabelle's `induct` method from arguments found in the goal and context; `Auto` attacks the resulting goals; `IsSolved` checks whether any goal remains. PSL repeats this combination until `auto` closes every sub-goal or the generated variations are exhausted (§1, p. 1). The paper states, “PSL keeps applying the combination of a specialization of induct method and auto, until either auto discharges all remaining sub-goals or DInd runs out of the variations of induct methods.” (§1, p. 1)

### technique: dynamic induction strategy

Use this when a goal probably needs induction but the useful induction variable, arbitrary variables, or induction rule is unknown. The paper's procedure is:

1. collect promising arguments from the proof goal and its background context (§1)
2. let `Dynamic (Induct)` generate combinations of those arguments (§1)
3. apply each generated induction method (§1)
4. run `Auto` on the resulting sub-goals (§1)
5. stop when all sub-goals are discharged or no generated induction variation remains (§1)

The paper's code shape is the `DInd` strategy above. The method can include combinations such as induction on `x`, on `y`, or with an `arbitrary` variable; the MeLoId figure later shows examples such as `apply(induct s t arbitrary: u)` (figure, p. 2).

Inference: In Verus, the same search target is a choice of induction variable and auxiliary facts in a proof function. A practical encoding would keep executable Rust unchanged, state the theorem in a `spec fn`, and try candidate `decreases` measures and recursive `proof fn` cases. Verus has no Isabelle `Dynamic` strategy or `Auto` method, so an external controller would generate candidate proof snippets and invoke Verus; each accepted candidate still needs ordinary Verus contracts, invariants, and lemmas. This transfer is an inference from the paper's method, not a result reported by Nagashima.

### technique: conjecture-assisted induction with pruning

Use this when the original goal needs an auxiliary lemma. The paper defines a `Conjecture` atomic strategy that generates possible intermediate propositions and inserts each as a premise of the original goal. For every conjecture, PSL creates two obligations: prove that the conjecture implies the original goal, and prove the conjecture itself (§1, p. 1). The paper's strategy is `strategy CDInd = Thens [Conjecture, Fastforce, Quickcheck, DInd]`.

Apply it step by step:

1. start from the target proof goal (§1)
2. generate candidate conjectures (§1)
3. replace the target by the implication from each conjecture to the target plus the conjecture itself (§1)
4. run `Fastforce` to remove conjectures too weak to imply the target (§1)
5. run `Quickcheck` to remove conjectures equivalent to false (§1)
6. run the dynamic-induction strategy on the surviving goals (§1)

The paper cautions that induction can preserve provability even with inappropriate arguments, so a counterexample finder cannot always discard a bad induction variation. It also says that multiple induction and conjecturing steps make the search space grow rapidly (§1). The exact limitation is: “Since the induct method usually preserves the provability of proof goal, even when the induct method has arguments that are inappropriate to discharge the proof goal, counter-example finders, such as Quickcheck, cannot discard them.” (§1, p. 1)

Inference: In Verus, a conjecture is naturally a candidate `ensures`-compatible lemma, encoded as a separate `lemma` or `proof fn` whose postcondition supplies the missing relation. A generator can first ask whether the candidate is strong enough to imply the target, then ask Verus to prove the candidate or produce a failed obligation. Verus does not provide Isabelle's `Fastforce` or `Quickcheck`; bounded tests or counterexample harnesses can prioritize candidates, but only a successful Verus proof establishes the contract. This is an inferred workflow.

### technique: active mining and learned induction recommendations (MeLoId)

Use MeLoId when a corpus of human Isabelle proofs exists and the desired output is ranked induction applications rather than a complete proof. The preparation phase collects invocations of `induct` from proof corpora and converts each invocation to a Boolean feature vector using an assertion-based extractor (§2, p. 2). Active mining then creates different induction methods, applies them to goals, and records whether each is useful. The paper's figure gives rows such as `(apply(induct x arbitrary: y), used)` and `(apply(induct y arbitrary: x), not)` (figure, p. 2).

The procedure is:

1. gather proof corpora, including AFP and the Isabelle standard library (figure, p. 2)
2. extract `induct` invocations from those proofs (§2)
3. generate distinct argument combinations and apply each to the goal (active mining, §2)
4. inspect the resulting goal, context, induction arguments, and emerging sub-goal (§2)
5. evaluate about 40 structural assertions into Boolean features (§2)
6. fit a regression tree whose leaves associate feature vectors with promising induction variants (§2)
7. in recommendation mode, use a faster feature extractor and tree lookup to rank candidate `induct` calls (figure, p. 2)

MeLoId differs from PaMpeR because it includes the post-induction sub-goal and actively tests combinations. The paper reports implementation of active mining and “around 40 assertions.” (§2, p. 2) Its only evaluation statement is that a preliminary experiment suggests the extractor captures some undesirable argument combinations; “more comprehensive evaluation and further engineering efforts remain as our future work.” (§2, p. 2) Thus there is no denominator, accuracy, timing, or comparative success rate to report. The result is a prototype mechanism, not evidence of a measured theorem-proving improvement.

Inference: For VL, a training corpus could contain verified Verus lemmas and failed proof attempts. Features could describe the target's quantifiers, recursive data shape, available lemmas, and candidate induction measure; a recommender could rank proof-function templates or lemma applications. The generated proof must still pass Verus. A regression tree is attractive for inspectability, but the paper gives no evidence that its model transfers from Isabelle/HOL syntax or semantics to Rust ownership and Verus's solver obligations.

## trusted boundary, reuse, and product threat

The paper proves no new mathematical theorem and reports no completed proof-search success rate. It relies on Isabelle/HOL, PSL's method execution, the assertion extractor, and the regression-tree learner. The corpus, assertions, and generated ranking are inputs to a recommendation process; they do not themselves prove the recommended induction is sound. Inference: a Verus integration would additionally trust the candidate-generation controller, feature extraction, corpus labels, Verus's verifier and solver, and the correctness of each written specification. A learned suggestion can waste time or bias search, but a false suggestion should not make verified Rust pass unless a separate specification or verifier defect exists.

Inference: The idea is a moderate threat to a product that writes agent-generated verified Rust because it could automate one recurring proof decision—choosing induction structure—and reduce proof-search interaction. The threat is limited by the paper's lack of quantitative evaluation, its dependence on human proof corpora, and the mismatch between Isabelle induction methods and Verus proof functions. VL should reuse the separation between recommendation and proof acceptance, and should measure candidate-ranking quality on held-out Verus obligations instead of treating rankings as evidence.

## techniques for the catalog

- dynamic induction strategy — generate induction-argument variants from a goal and context, then apply automation to each
- conjecture-assisted induction — generate auxiliary propositions, prune weak or false candidates, and search induction on the remaining obligations
- active-mined induction recommendation — learn a regression tree from tried induction variants, structural assertions, and resulting sub-goals

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
