# Machine-Learned Premise Selection for Lean
(authored by agents unless marked 🧑)
Tag: `piotrowski2023machinelearned`, [paper](https://www.semanticscholar.org/paper/94ed169dff07f700fd216cf1a794b816f1b19954)

## purpose and dataset

This paper builds a small premise recommender inside Lean 4. Given a theorem statement, it ranks lemmas and theorems likely to help close the goal. The authors require “tight integration with the proof assistant,” ease of installation, and a lightweight model (Abstract, p. 1). The implementation is in Lean rather than an external ML service. The data source is `mathlib3port4`, a Lean 3-to-Lean 4 port, because the Lean 4 library was still being ported (Section 2, p. 2).

The training unit is a theorem and its used premises. The extractor traverses a proof term and keeps constants whose types are propositions. It then applies three filters. `all` removes automatically generated names but retains implicit tactic lemmas; `source` keeps premises that appear explicitly in source code; and `math` keeps names on a whitelist of mathematical declarations, dropping basic core facts. For the example `div_ne_zero`, the source filter records `div_eq_mul_inv`, `mul_ne_zero`, and `inv_ne_zero` from `by rw [div_eq_mul_inv]; exact mul_ne_zero ha (inv_ne_zero hb)` (Section 2.2, p. 3). Table 1 reports, respectively, 96,915 premises/41,755 examples for `all`, 28,784/20,571 for `source`, and 67,462/40,187 for `math`; the corresponding averages are 3.12, 2.35, and 2.09 premises per example (Table 1, p. 3).

The authors also derive an intermediate proof-state dataset with LeanInk. Each code fragment is treated as a theorem, and features come from the “before” state while premises come from the fragment's tokens. It contains 91,292 examples and 143,165 premises, or about 1.57 premises per example (Section 2.2, p. 4). This data is auxiliary rather than the main theorem-level target.

## technique: structural theorem features

Use this when theorem text is too sparse or large for a simple classifier. Extract three feature families from hypotheses and conclusion: names (including hidden elaborated names and constants), bigrams consisting of a head symbol and each argument, and trigrams consisting of paths of length three in the syntax tree. For `div_ne_zero`, names include `H:Ne/OfNat.ofNat` and `T:Ne`; bigrams include `H:Ne/OfNat.ofNat/0`; trigrams extend the path with `Zero.toOfNat0` (Section 2.1, pp. 2–3). The features are sparse binary indicators.

Inference: in Verus, extract identifiers from the function signature, `requires`/`ensures`, visible hypotheses, types, and the current goal; add parent-child syntax paths for operators and method calls. Inference: preserve whether a symbol occurs in a precondition, postcondition, or local proof fact, because Verus obligations often depend on that role. Lean's elaborated constants and exact syntax-tree paths do not transfer automatically; the representation must come from Verus's internal Rust/SMT context.

## technique: premise labels and intermediate states

Use proof-term traversal to make labels that reflect the desired interaction. For theorem-level advice, label each theorem with a list of premises. For state-level advice, run LeanInk on every proof fragment, record its token list and before/after states, and extract labels from the fragment. The authors explain: “Given a Lean file, LeanInk generates all the states that a user might be able to see in the infoview” (Section 2.2, p. 4). The intermediate set can be used for pretraining or augmentation, although in their experiment neither improved theorem-level testing scores significantly (Section 4, p. 8).

Inference: a Verus label should be a lemma, spec function, or assertion fact actually used in a successful proof obligation. A state-level record can include the current Rust block, active invariants, and solver context before and after a proof step. Inference: exclude trusted external-body assumptions and unchecked axioms from ordinary positive labels or mark them separately; otherwise the recommender may optimize toward bypasses rather than reusable proofs.

## technique: k-nearest-neighbour ranking

Use k-NN when a simple nonparametric baseline and no offline training phase are wanted. For a new feature set, compute similarity to every training example. Their similarity counts shared features but gives rarer features more weight using `t(f)=log(|D|/|D_f|)` (Section 3.1, p. 5). Retrieve the `k` most similar examples, concatenate their premise lists, and rank premises by frequency. The paper fixes `k=100` for evaluation (Section 4, p. 7). Its benefit is simplicity; its cost is traversing the full dataset for each prediction.

Inference: a Verus prototype can use weighted overlap between obligation symbols and prior successful proof contexts, then return lemmas by weighted vote. Inference: this is useful as a fallback for small repositories but will become slow as a product's verified-code corpus grows; index features or switch to a trained model when latency matters.

## technique: online random-forest premise selector

Use the custom random forest when predictions must be fast and the repository changes incrementally. Each decision-tree node tests whether a feature is present, and each leaf stores a set of premises. During prediction, pass the feature vector down every tree, collect reached leaf labels, and vote across trees (Section 3.2, pp. 5–6). Unlike a batch forest, the paper updates trees online with one example at a time so newly proved theorems can influence suggestions immediately. Algorithm 1 appends the example to the reached leaf; if `SplitCondition(E)` holds, it creates `MakeSplitRule(E)`, partitions examples, and replaces the leaf with two children (Algorithm 1, p. 7). The split rule uses heuristics because globally optimal splitting is expensive.

The evaluation uses 300 trees, includes each example in a tree with probability 0.3, and makes three passes over training data (Section 4, p. 7). On 592 dependency-free test modules, trained from 2,436 modules, names+bigrams are best overall (Section 4, p. 7). For the `source` filter, random forest names+bigrams obtains Cover 0.29 and Cover+ 0.36; k-NN obtains 0.25 and 0.36 (Table 2, p. 8). Prediction averages are 0.28 seconds per theorem for the forest versus 5.65 seconds for k-NN in that same configuration (Section 4, p. 8). The denominators for Cover are theorem test examples in the 592 held-out modules; the paper reports averages rather than counts per row.

Inference: an online Verus forest could update after each verified proof and rank candidate lemmas or previously successful invariant patterns. The forest should only learn from artifacts whose contracts and proofs pass the current Verus build. Inference: online updates improve freshness but can introduce order-dependent behavior; retain reproducible snapshots and reject labels from changed specifications until they are rechecked.

## technique: Cover metrics and feature selection

Use Cover to measure whether the selector puts all actually used premises at the front of its ranking. If a theorem uses `P` of size `n` and the predicted ranking is `R`, the paper defines `Cover(T)=|P∩R[:n]|/n`. Cover+ uses the first `n+10` predictions, `|P∩R[:n+10]|/n`, to model a user inspecting ten extra suggestions (Section 4, p. 7). Both values lie in [0,1]. Cover rewards an exact initial segment; Cover+ gives credit to less precise but useful lists.

The table compares names (`n`), names+bigrams (`n+b`), and names+bigrams+trigrams (`n+b+t`) for all three filters and both models. Random forest with names+bigrams scores 0.57/0.67 on `all`, 0.29/0.36 on `source`, and 0.26/0.33 on `math` (Cover/Cover+; Table 2, p. 8). The paper reports that trigrams likely overfit: adding them lowers random-forest `math` Cover from 0.26 to 0.16. Intermediate-state testing is much lower (forest 0.09/0.24; k-NN 0.08/0.21), and mixing intermediate data did not produce statistically significant gains (Section 4, p. 8).

Inference: Verus should report both exact top-n coverage and a relaxed budget such as top-n+10, but choose the budget from interactive UX measurements rather than copying ten. Inference: evaluate separately on theorem-level and proof-state-level contexts; a low theorem-level score can hide useful state-sensitive suggestions, as the authors themselves note.

## technique: interactive suggestion and tactic probing

Wrap the predictor in an editor tactic. The Lean command `suggest_premises` computes a ranking and shows it in the infoview. For each suggested premise `p`, the tool asynchronously tries `apply p`, `rw [p]`, and `simp only [p]`, returning the first tactic that advances or closes the goal (Section 5, p. 9). A user can click the suggestion to insert the resulting tactic into the proof script. The asynchronous RPC design keeps the editor responsive while tactics run.

Inference: a Verus IDE integration can show ranked lemmas and asynchronously compile small candidate snippets, such as adding a lemma call or `assert` to the current proof. Only diagnostics from the same verified build should mark a suggestion successful. Inference: probing several syntactic forms is valuable because a useful Verus lemma may need `assert`, `assert ... by`, or a `calc` block rather than one fixed command; the exact forms must be drawn from Verus's supported constructs.

## what was demonstrated and what remains trusted

The paper demonstrates premise-ranking accuracy and latency on a fixed mathlib split, not end-to-end proof completion. The strongest practical result is the names+bigrams random forest: 0.28 seconds versus 5.65 seconds for k-NN on source-filtered examples (Section 4, p. 8). The experiments do not show that suggestions reduce human proof time, and the proposed online-update mode “has not yet been tested in the current stage” (footnote, p. 7). The labels inherit mathlib's proof terms and filtering choices; implicit tactic lemmas in `all` can inflate scores, while `math` can remove facts a user needs.

What is checked: Lean accepts the original proof terms used to construct labels, and the interactive tactic reports successful Lean tactic applications. What remains trusted: Lean, mathlib, LeanInk extraction, feature extraction, the random-forest implementation, heuristic splitting, and the user's final proof/specification. Inference: for VL, this is a low-soundness-risk but meaningful productivity technique. A Verus-checked candidate cannot silently invalidate a contract, yet poor premise ranking can consume agent search time or encourage overfitting to obsolete proof contexts. Existing theorem-prover hammer and premise-selection work means VL should treat this as an engineering adaptation for Verus rather than a new ML principle.

## techniques for the catalog

- syntax-tree features — represent theorem or Verus-obligation symbols as names, bigrams, and trigrams
- filtered proof labels — extract used premises and separate all, explicit-source, and mathematical subsets
- intermediate-state dataset — learn from before/after proof fragments captured by a state extractor
- weighted k-NN — rank premises by rarity-weighted feature similarity to nearby examples
- online random forest — update sparse binary decision trees with each newly checked proof
- Cover metrics — measure exact and relaxed top-ranked premise coverage on held-out modules
- interactive probing — asynchronously try candidate applications and insert the first verifier-advancing proof action

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
