# PaMpeR: Proof Method Recommendation System for Isabelle/HOL
(authored by agents unless marked 🧑)
Tag: `nagashima2018pamper`, [paper](https://arxiv.org/abs/1806.07239)

Page numbers below are pages of the 16-page arXiv v1 PDF (arXiv:1806.07239v1); pages 13–16 are the appendix tables and a screenshot.

## what the paper builds

PaMpeR learns which Isabelle/HOL proof method is likely to help a proof state, then explains the recommendation. Its training data comes from existing hand-written proof corpora: the Isabelle standard library and the Archive of Formal Proofs (AFP) (Section III-B, p. 4). The introduction motivates the work with the fact that “Isabelle/HOL comes with 159 proof methods defined in its standard library” and that picking the right one “still requires ITP specific expertise” (Section I, p. 1). The abstract states: “Given a proof state, PaMpeR recommends proof methods to discharge the proof goal and provides qualitative explanations as to why it suggests these methods.” (Abstract, p. 1.)

The tool has a preparation phase that extracts boolean features and trains one regression tree per method, and a recommendation phase that evaluates the current state with a faster extractor (Section II-B, p. 2). It recommends proof methods; Isabelle still checks the resulting proof. Inference: for VL, the reusable idea is context-sensitive recommendation of Verus proof constructs or solver settings with explanations, while Verus remains the sound checker.

## technique: expert-written boolean feature extraction

### what it is

PaMpeR represents a proof goal, chained facts, and the surrounding proof context by 108 manually written assertions in Isabelle/ML. Each assertion yields a boolean. Table I (p. 4) lists examples: constants in the goal, constants at certain positions (outermost meta-universal quantifier, a non-outermost HOL existential), types such as `Word.word`, schematic variables, constants from theory files such as Nat, Real, Set, and the Isar keyword (`datatype`, `record`, `primcorec`, `inductive`, ...) with which a type or constant in the goal was defined. The paper says: “Currently we employ 108 assertions manually written in Isabelle’s implementation language, Standard ML, based on our expertise in Isabelle/HOL.” (Section III-A, p. 3.) It groups them as assertions about proof goals themselves and assertions about the relation between goals and the proof context (Section III-A, p. 3).

The assertions deliberately avoid user-defined constants because the developers “cannot access concrete definitions of user-defined constants” (Section III-A, p. 3). Instead they use meta-information: the extractor checks whether the context contains a lemma named `sep.elims`, and if so infers that the user defined `sep` with the `fun` or `function` keyword (Section III-A, p. 3). The paper describes the abstraction as many-to-one: it “may map multiple distinct proof states into to the same array of boolean values” (Section II-B, p. 2).

### steps from the paper

1. Write assertions from the developers' Isabelle expertise, in two categories: facts about the goal (and chained facts), and relations between the goal and its context (Section III-A, p. 3). Some assertions were included without knowing whether they would help; the evaluation was used to learn which mattered (Section III-A, p. 3).
2. Implement each assertion in Standard ML over Isabelle's proof state (Section III-A, p. 3).
3. Apply all assertions to a proof state to obtain its boolean array (Sections II-B and III-A, pp. 2–3).
4. At recommendation time, `why_method` shows “qualitative explanations tagged to both these features and their values” (Section V-C, p. 7). The paper does not describe how those explanation texts were written.

### Verus form

Inference: Define a Verus feature extractor over the current verification obligation, nearby `requires`/`ensures`, quantified variables, mutable references, loop invariants, called specs, and available lemmas. Assertions can test whether the goal is arithmetic, sequence/Set reasoning, ownership transfer, a loop postcondition, or a state-machine transition. A feature should report observable proof-state metadata, not inspect untrusted model output. Verus has no Isabelle/ML assertion API; a driver would need compiler or verifier diagnostics and source-level parsing. The abstraction may conflate distinct obligations, so the final proof remains checked by Verus.

## technique: logging proof corpora at method invocation

### what it is

The authors modify Isabelle's `apply` and `by` commands, only to build the database; this “is the only modification we made to Isabelle’s source code” (Section III-B, p. 4). Each invocation logs the current feature vector and the method the human proof used. The paper gives the exact sequence: “1) apply assertions to the current proof state, 2) represent the proof state as an array of boolean values, 3) record which method is used to that array, 4) apply the method as the standard apply or by command, accordingly.” (Section III-B, p. 4.) The logging ignores `apply` commands that contain composite proof methods, because naive logging would record steps that are later backtracked (Section III-B, p. 4).

The default database construction from the standard library and AFP took “about 6021 hours 43 minutes of CPU time” on three multi-core servers and produced 425334 unique data points (Section III-B, p. 4). This is a corpus-construction cost, not proof time per obligation.

### Verus form

Inference: instrument a Verus proof-generation workflow to record the feature vector immediately before each successful lemma call, `assert`, `reveal`, `broadcast use`, solver hint, or invariant edit. Keep only steps that occur in a proof accepted by Verus, and record the exact construct and arguments. A failed attempt can be stored separately for search diagnostics but must not be treated as a positive label. Verus proof macros and diagnostics may make exact interception difficult; this is an engineering gap absent from the paper.

## technique: per-method regression trees

### what it is

PaMpeR transforms the multi-output problem into one single-target problem per proof method (the “single-target method”, Section IV-A, p. 5), then builds a regression tree for each method. A leaf stores the average `used` value, “the expectation that the method is useful to proof states abstracted to the combination of feature values to that leaf node” (Section IV-B, p. 6). The tree greedily picks the feature giving the greatest reduction in residual sum of squares (RSS), splits the data into the subsets where the feature is 1.0 and 0.0, and repeats until the depth reaches a pre-defined upper limit (Section IV-B, pp. 5–6). The paper says: “In recursive binary splitting, we start constructing the regression tree from the root node, which corresponds to the entire dataset for a given method.” (Section IV-B, p. 5.)

### steps from the paper

1. Split the raw database into one database per method; for method m, a row has `used=1.0` if the logged method was m and `used=0.0` otherwise (Section IV-A, p. 5; Section IV-B, p. 5).
2. At a node, evaluate each boolean feature's two-way split and choose the one minimizing the summed squared deviation from the subset averages, i.e. the RSS of equation (3) (Section IV-B, p. 6).
3. Recurse on the two child subsets until the preset maximum depth (Section IV-B, p. 6).
4. Store each leaf's average `used` value as the method's expectation for that feature combination (Section IV-B, p. 6).
5. Save the trees in `regression_trees.txt` so users can avoid repeating the data extraction and tree construction (Section IV-B, p. 6).

The authors chose this simple algorithm because it permits qualitative explanations and “works well for small datasets for rarely used methods”; they leave comparison with other learning algorithms to future work (Section IV, p. 5).

Inference: A Verus implementation could train a small tree per proof construct (`lemma`, `assert`, `reveal`, arithmetic trigger, or solver-context preset). It should use a separate target for each construct and rank expectations. Verus has no built-in regression-tree trainer, so this would be an external tool that emits recommendations.

## technique: reduced fast extractor and explainable commands

After training, assertions that “do not result in a branch in the regression trees” are removed. The `build_fast_feature_extractor` command builds this faster extractor (Section V-A, p. 6). `which_method` then evaluates the live state with it, looks up one node in each method's tree, and shows the 15 most promising methods with their expectations (Section V-B, p. 6). `why_method m` checks the features used to evaluate the expectation for `m` and their values, and prints the qualitative explanations tagged to them; in the example the two reasons correspond to the first two branchings in the tree for `induction` (Section V-C, p. 7). `rank_method m` prints the rank of `m` among the learned methods, for example “coinduction 123 out of 239” (Section V-D, p. 7). In the example, `simp` has expectation 0.4119, `auto` 0.1593, and `induction` 0.06137, and the paper reports `induction` at fourth place out of 239 (Section V-B, p. 6).

Inference: these expectations are model scores, not calibrated success probabilities; the paper itself says its coincidence rates “are not the success rates” (Section VI, p. 7). A Verus assistant could emit a “why this lemma” explanation naming active features such as a sequence-length equality in the goal or a previously proved sortedness lemma in context. These explanations must identify model features and not claim that the recommended construct will succeed. A reduced extractor can lower latency, but removing a feature that is not used in the current trees also prevents future methods from seeing it until retraining.

## evidence and limits

The evaluation is a cross-validation-style split: the database of 425334 data points is split by randomly choosing 10% for evaluation and building trees from the remaining 90%, with no overlap (Section VI, p. 7). PaMpeR learnt 239 proof methods: 160 defined in the standard library and the others (by subtraction, 79) user-defined in AFP entries. 171 methods appear in the evaluation set, 133 from the standard library and 38 from the AFP (Section VI, pp. 7–8). Usage is heavily imbalanced: the three most frequent methods (`simp`, `auto`, `rule`) account for 59.1% of training data points and 58.9% of evaluation data points (Section VI, p. 8).

The reported metric is “coincidence rate”: how often the human-selected method appears in PaMpeR's top `n`, not whether PaMpeR's method independently closes the goal. For `simp`, 11385 evaluation invocations form the denominator; PaMpeR ranks it first for 58% and in the top two for 98% (Table II, p. 8). The paper explicitly says these “are not the success rates of PaMpeR’s recommendation but its conservative estimates” (Section VI, p. 7), because other methods may be equally suitable. Fig. 3 (p. 9; discussed on p. 8): recommending 3 methods reaches 50% coincidence for 23 methods; 10 methods for 58 methods; 15 methods for 72 methods. For rare specialized methods, PaMpeR “achieved 50% of coincidence rate for 34 proof methods that appear less than 0.1% of times in the training dataset” (Section VI, p. 8). For the 38 AFP-defined methods in the evaluation data, it reaches 50% for 12 when allowed 15 recommendations (Section VI, p. 9). Conversely, `normalization` and `vector` get poor recommendations because the authors “did not manage to develop assertions that capture the properties shared by the proof goals” those methods handle (Section VI, p. 8). Coincidence rates are also low for general-purpose methods such as `safe`, `clarsimp`, `best`, `bestsimp`, because several general methods can handle the same goal (Section VI, p. 8).

The method labels reflect one human proof path even when several methods are valid: “existing proof corpora describe only one way of attacking it” (Section IV-A, p. 5). The paper also notes that some methods work well only with certain arguments or following methods, so the labels ignore arguments and combinations (Section IV-A, p. 5; Section VII, p. 10). No assertion takes the sequence of earlier proof methods into account (Section VII, p. 10), and assertions cannot rely on user-defined constants (Section III-A, p. 3). Inference: these are key limits for a Verus transfer; a tree trained on one style can underrate an equivalent proof construct, and feature changes after a crate refactor can invalidate its advice.

## what remains trusted and product threat

Isabelle's logical kernel is isolated by the Standard ML module system (Section II-A, p. 1). The paper argues the training labels are reasonable because “Isabelle mechanically checks the proof scripts”, the standard library was written by experienced developers, and the AFP accepts proofs only after peer review (Section IV-A, p. 5). Inference: soundness does not depend on PaMpeR's prediction because Isabelle checks whatever method the user applies; the corpus proof scripts, feature implementation, tree trainer, and persisted trees are operational dependencies affecting only recommendation quality. The corpus's human proofs and assertions are evidence about which methods were used, not specifications of all valid tactics.

Inference: VL should not redo hand-written method recommendation, regression-tree ranking, or proof-state explanations as general ideas. The open Verus work is extracting ownership-aware features, recording successful proof actions, and measuring whether recommendations reduce repair time and solver cost on unseen crates. The paper's own future direction is to use PaMpeR's recommendations to navigate PSL's search, “changing PSL’s evaluation strategy from the IDDFS to the best-first search” (Section VII, p. 10); this is an existing pattern to reuse rather than claim as new.

Inference: The threat to an agent-written verified-Rust product is medium. Context-sensitive method advice could reduce wasted proof attempts and expose specialized lemmas, but this paper does not address Rust, Verus specifications, unsafe code, solver soundness, or intent. Coincidence with the human's method ignores arguments, so a high coincidence rate does not guarantee a recommendation would close the goal, and the random 10% split of data points may place closely related states from one development in both sets.

## techniques for the catalog

- expert boolean abstraction — encode proof-goal, chained-fact, and context properties as hand-written boolean assertions
- proof-action corpus logging — record each successful method invocation against the feature vector of its pre-state
- per-method regression trees — train one RSS-minimizing tree per tactic and store leaf expectations
- reduced feature extraction — retain only assertions used by trained tree branches for faster online lookup
- explainable tactic ranking — return top methods, feature-based reasons, and a rank for a user-specified method

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Since there are often multiple equally valid proof methods for each proof state, it is only reasonable to expect that which_method should be able to recommend the proof method used in the evaluation dataset as one of the most important methods for each proof method invocation."): read all of the paper text (title page through the appendix tables) and checked every quotation, number, section and page reference, and the technique steps against it; changed page references to the arXiv v1 PDF pages (they were IEEE-style pages that did not match), fixed the 6021-hour wording ("about"), the fun/function inference, the "composite methods" description, the step 4 explanation-text claim, added the section references for the evaluation counts, replaced the Semantic Scholar link with the arXiv link from the paper text, removed the word "gate", marked unsupported conclusions as Inference, and replaced the claim that the coincidence metric can look high while a recommendation fails with a supported statement about ignored arguments; did not check the Verus-transfer inferences against Verus itself, the cited related work, Figure 2/3 values beyond the numbers the text states, or appendix Tables III-V row by row beyond the 12-of-38 count (taken from the text, not recounted).
