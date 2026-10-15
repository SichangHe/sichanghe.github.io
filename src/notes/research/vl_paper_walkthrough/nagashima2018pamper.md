# PaMpeR: Proof Method Recommendation System for Isabelle/HOL
(authored by agents unless marked 🧑)
Tag: `nagashima2018pamper`, [paper](https://www.semanticscholar.org/paper/3d6ebb371fc0cafd61e4e2f83a302448bcbd1e99)

## what the paper builds

PaMpeR learns which Isabelle/HOL proof method is likely to help a proof state, then explains the recommendation. Its training data comes from hand-written proof corpora, including the Isabelle standard library and Archive of Formal Proofs (AFP). The central motivation is that Isabelle has 159 standard-library methods and that choosing among them requires expertise (Section I, p. 1). The abstract states: “Given a proof state, PaMpeR recommends proof methods to discharge the proof goal and provides qualitative explanations as to why it suggests these methods.” (Abstract, p. 1.)

The tool has a preparation phase that extracts boolean features and trains one regression tree per method, and a recommendation phase that evaluates the current state with a faster extractor. It recommends tactics; Isabelle remains responsible for checking the resulting proof. Inference: for VL, the reusable idea is context-sensitive recommendation of Verus proof constructs or solver settings with explanations, while Verus remains the sound gate.

## technique: expert-written boolean feature extraction

### what it is

PaMpeR represents a proof goal, chained facts, and the surrounding context by 108 manually written assertions in Isabelle/ML. Each assertion returns a boolean. Examples check constants, quantifier positions, types, theory-file membership, or whether a context contains lemmas produced by a specific declaration keyword. The paper says: “Currently we employ 108 assertions manually written in Isabelle’s implementation language, Standard ML, based on our expertise in Isabelle/HOL.” (Section III-A, p. 2.)

The assertions deliberately use meta-information rather than user-defined constant semantics. The authors can detect that a context contains `sep.elims` and infer that `sep` was defined with `fun`, even without inspecting the user definition (Section III-A, p. 2). This many-to-one abstraction makes unlike proof states share a feature vector.

### steps from the paper

1. Enumerate proof-state facts that experts use to choose methods: goal shape, chained facts, context declarations, constants, and types (Section III-A, p. 2).
2. Implement each fact as an assertion over Isabelle's proof state in Standard ML (Section III-A, p. 2).
3. Apply all assertions to obtain a boolean array for each state (Section II-B and III-A, pp. 2–3).
4. Attach qualitative text to assertions so a later recommendation can explain the active features (Section V-C, p. 4).

### Verus form

Inference: Define a Verus feature extractor over the current verification obligation, nearby `requires`/`ensures`, quantified variables, mutable references, loop invariants, called specs, and available lemmas. Assertions can test whether the goal is arithmetic, sequence/Set reasoning, ownership transfer, a loop postcondition, or a state-machine transition. A feature should report observable proof-state metadata, not inspect untrusted model output. Verus has no Isabelle/ML assertion API; a driver would need compiler or verifier diagnostics and source-level parsing. The abstraction may conflate distinct obligations, so the final proof remains checked by Verus.

## technique: logging proof corpora at method invocation

### what it is

The authors modify Isabelle's `apply` and `by` commands only while building the corpus. Each invocation logs the current feature vector and the method selected by the human proof. The paper gives the exact sequence: “1) apply assertions to the current proof state, 2) represent the proof state as an array of boolean values, 3) record which method is used to that array, 4) apply the method as the standard apply or by command, accordingly.” (Section III-B, p. 3.) Composite proof methods that are backtracked are ignored to avoid polluting labels.

The default extraction from the Isabelle library and AFP took 6,021 CPU hours 43 minutes and produced 425,334 unique data points (Section III-B, p. 3). This is a corpus-construction cost, not proof time per obligation.

### Verus form

Inference: instrument a Verus proof-generation workflow to record the feature vector immediately before each successful lemma call, `assert`, `reveal`, `broadcast use`, solver hint, or invariant edit. Keep only steps that occur in a proof accepted by Verus, and record the exact construct and arguments. A failed attempt can be stored separately for search diagnostics but must not be treated as a positive label. Verus proof macros and diagnostics may make exact interception difficult; this is an engineering gap absent from the paper.

## technique: per-method regression trees

### what it is

PaMpeR transforms the multi-output problem into one binary/real target per proof method, then builds a regression tree for each method. A leaf stores the average `used` value, interpreted as the estimated likelihood that the method is useful for states reaching that leaf. The tree greedily chooses the feature that most reduces residual sum of squares (RSS), recursively splits the two feature values, and stops at a preset maximum depth. The paper says: “In recursive binary splitting, we start constructing the regression tree from the root node, which corresponds to the entire dataset for a given method.” (Section IV-B, p. 3.)

### steps from the paper

1. Split the raw database into one database per method; mark a row `used=1.0` for the logged method and `used=0.0` for other methods (Section IV-A, p. 3).
2. At a node, evaluate each boolean feature's two-way split and choose the one with minimum RSS (Section IV-B, p. 3).
3. Recurse on the two child subsets until the fixed depth limit (Section IV-B, p. 3).
4. Store each leaf's average `used` value as the method expectation for that feature combination (Section IV-B, p. 3).
5. Persist the trees in `regression_trees.txt` so recommendation does not repeat corpus extraction (Section IV-B, p. 3).

Inference: A Verus implementation could train a small tree per proof construct (`lemma`, `assert`, `reveal`, arithmetic trigger, or solver-context preset). It should use a separate target for each construct and rank expectations. Verus has no built-in regression-tree trainer, so this would be an external tool that emits recommendations.

## technique: reduced fast extractor and explainable commands

After training, PaMpeR removes assertions that never occur as a branch in any tree. The `build_fast_feature_extractor` command creates this reduced extractor, then `which_method` evaluates a live state, looks up one node per method tree, and prints the 15 highest expectations. `why_method m` reports the active feature values along the tree path for method `m`; `rank_method m` prints its rank among all 239 learned methods (Section V, pp. 3–4). In the example, `simp` has expectation 0.4119, `auto` 0.1593, and `induction` 0.06137; these are model estimates, not success probabilities.

Inference: A Verus assistant could emit a “why this lemma” explanation naming active features such as a sequence-length equality in the goal or a previously proved sortedness lemma in context. These explanations must identify model features and not claim that the recommended construct will succeed. A reduced extractor can lower latency, but removing a feature that is not used in the current trees also prevents future methods from seeing it until retraining.

## evidence and limits

The evaluation extracts 425,334 points, reserves 10% at random for evaluation, and trains on the remaining 90% (Section VI, p. 4). It learns 239 methods: 160 standard-library and 79 AFP-defined; 171 appear in evaluation, including 38 AFP methods. Usage is heavily imbalanced: the three most frequent methods account for 59.1% of training invocations and 58.9% of evaluation invocations (Section VI, p. 4).

The reported metric is “coincidence rate”: how often the human-selected method appears in PaMpeR's top `n`, not whether PaMpeR's method independently closes the goal. For `simp`, 11,385 evaluation invocations form the denominator; it is top-ranked in 58% and in the top two in 98% (Table II, p. 4). The paper explicitly warns these are not success rates. Across all methods, recommending 3 methods gives at least 50% coincidence for 23 methods; 10 gives that threshold for 58 methods; 15 gives it for 72 (Figure 3, p. 5). For rare specialized methods, 34 methods appearing in under 0.1% of training data still reach 50% coincidence (Section VI, p. 5). Conversely, methods such as `normalization` and `vector` receive poor recommendations because the hand-written assertions did not capture their common properties (Section VI, p. 5).

The method labels reflect one human proof path even when several methods are valid. The authors note that multiple methods can discharge the same goal, so disagreement is not necessarily failure (Section IV-A and VI, pp. 3–4). Assertions also omit proof-method history and cannot see all user-defined semantics. These are key limits for a Verus transfer: a tree trained on one style can underrate an equivalent proof construct, and feature changes after a crate refactor can invalidate its advice.

## what remains trusted and product threat

The Isabelle kernel, corpus proof scripts, feature implementation, tree trainer, and model persistence are operational dependencies. Soundness does not depend on PaMpeR's prediction because Isabelle checks the selected method. The corpus's human proofs and assertions are trusted as training evidence, but they are not specifications of all valid tactics.

Inference: VL should not redo hand-written method recommendation, regression-tree ranking, or proof-state explanations as general ideas. The open Verus work is extracting ownership-aware features, recording successful proof actions, and measuring whether recommendations reduce repair time and solver cost on unseen crates. The paper's own future direction combines recommendations with PSL best-first search, which is an existing pattern to reuse rather than claim as new.

Inference: The threat to an agent-written verified-Rust product is medium. Context-sensitive method advice could reduce wasted proof attempts and expose specialized lemmas, but this paper does not address Rust, Verus specifications, unsafe code, solver soundness, or intent. The coincidence metric can look high while a recommendation still fails, and the 10% random split may place closely related states from one development in both sets.

## techniques for the catalog

- expert boolean abstraction — encode proof-goal, chained-fact, and context properties as hand-written boolean assertions
- proof-action corpus logging — record each successful method invocation against the feature vector of its pre-state
- per-method regression trees — train one RSS-minimizing tree per tactic and store leaf expectations
- reduced feature extraction — retain only assertions used by trained tree branches for faster online lookup
- explainable tactic ranking — return top methods, feature-based reasons, and a rank for a user-specified method

Checked 2026-10-15 against the paper by a Codex agent for pamper_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
