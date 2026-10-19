# LeanProgress: Guiding Search for Neural Theorem Proving via Proof Progress Prediction
(authored by agents unless marked 🧑)
Tag: `george2025leanprogress`, [paper](http://arxiv.org/abs/2502.17925v3) (link from the fetch record)

LeanProgress predicts remaining proof steps and combines that prediction with tactic log probability to guide search. The authors state, “We introduce LeanProgress, a method that predicts the progress in the proof.” (Abstract, p. 1) The paper was published in TMLR in December 2025; this copy is arXiv:2502.17925v3, dated 18 January 2026 (p. 1). Its implementation uses Lean; the Verus adaptations below are inferences.

### shortest successful trajectory extraction

What it is: use Reprover with best-first search to collect successful proof trajectories, then select the shortest one found for each theorem. The paper states, “In particular, if multiple proofs are found for a theorem (i.e., multiple no_goals nodes are reached), we select the proof with the minimum depth (the length of the path from the root node to the no_goals node) to ensure the quality and consistency of the training data.” (Section 3.2, p. 5)

How to do it: expand states by cumulative tactic log probability, summing each tactic’s average token log probability along the trajectory (Section 3.2, p. 4). Collect successful paths, select a minimum-depth path, and extract `(state, remaining steps)` pairs. The formal label is `n − l`, where `n` is the selected trajectory length and `l` is the state index (Section 3.2, p. 5). The introduction reports “approximately 80k proof trajectories from Lean Workbook Plus and Mathlib4” (Section 1, p. 3).

Inference: this labels distance along a discovered successful path, not the globally shortest possible proof or total search effort. For Verus, candidate proof edits could replace Lean tactics and a successful Verus check could define completion. Shortest verified patches could supply labels, but patch length need not measure proof robustness.

### length-relative data balancing

What it is: resample the collected data to reduce short-proof dominance. Figure 3 states, “Panel (b) shows the training set after balancing, where we down-sample short proofs and (lightly) up-sample longer ones, yielding fewer total states and a higher average length Lbalanced = 10.1.” (p. 6)

How to do it: use the paper’s proof-length ranges and sampling ratios: 1–5 steps, 0.01; 6–10, 0.3; 11–15, 0.5; 16–20, 0.7; 21+, 1.0. The original mean length is 2.47 and the adjusted mean is 10.1 (Section 3.3, p. 6). The labels remain counts of remaining steps, rather than fractions of a proof. Figure 3 cautions, “Bar heights are raw counts, so the totals differ and the y-axes are not directly comparable.” (p. 6)

Split at theorem level: “The dataset was partitioned randomly at the theorem level, meaning that all states from a given theorem belong to the same split (either training, validation, or test).” The test set has 8,820 proof states; the training and validation counts are left as `N_train` and `N_val` (Section 3.3, p. 6).

Inference: a Verus corpus could balance by repair rounds or another explicitly defined completion distance. Project-level separation could reduce leakage between closely related functions.

### remaining-step predictor with proof history

What it is: fine-tune DeepSeek Coder 1.3B to predict remaining steps from the current proof state, optionally including previous tactics. The paper states, “This model is trained to predict the number of remaining steps based on the current proof state and, optionally, the history of applied tactics.” (Section 4.1, p. 6)

How to do it: use `--- STATE_BEFORE: {state_before}` followed by `--- STEPS_TO_NO_GOALS:` for state-only input. For history input, insert `--- PROOF: {proof}` between them; `{proof}` is the sequence of tactics applied so far (Section 4.2, p. 7). Training uses MSE loss and AdamW, batch size 4, learning rate 1e−5, betas (0.9, 0.999), weight decay 0.01, and warmup ratio 0.03 (Section 4.1, p. 7). Evaluate MAE, the average absolute prediction error in steps (Section 4.3.1, p. 7).

Evidence: Table 1 reports results on 8,820 states as “mean ± std over 3 runs” (p. 8). With history, reported overall accuracy is 75.8 ± 1.5% and MAE is 3.15 ± 0.20; state-only results are 62.5 ± 1.8% and 5.08 ± 0.32. In the 21+ range, 3,700 states yield history accuracy 78.2 ± 2.2% and MAE 5.05 ± 0.45. Table 6 clarifies, “Accuracy is exact-match on remaining steps; MAE is mean absolute error in steps.” (p. 14) These are state sample counts, not counts of theorems.

Inference: for Verus, serialize the function, verification diagnostics, and previous proof edits, then train against a defined number of remaining repair rounds. The estimate would guide search; a verifier run would still establish whether the edited program verifies.

### progress-guided best-first search

What it is: mix predicted remaining steps with tactic log probability. Section 4.3.3 defines `C(s_i) = αN(s_i) + (1 − α)P(s_i)` and `N(s_i) = −2 n̂_i / N_max`, where `n̂_i` is predicted remaining steps. It defines `N_max` as “the maximum possible number of steps from all states in a proof” (p. 8).

How to do it: generate candidate tactics, obtain resulting states, predict their remaining steps, compute `C`, and expand the highest-scoring state. The main comparison uses `α = 0.2`, versus `α = 0` for log probability alone. Section 4.3.3 reports a two-minute timeout and beam search size `1 × 32` (p. 8); Table 2 states, “Sampling used temperature 0.7; for each problem we sampled 32 candidates once.” (p. 9)

Evidence: Table 2 reports Mathlib4-test pass rates of 41.4 ± 0.7% for Original LogP and 45.2 ± 0.6% for Steps as Critic, with “mean ± standard deviation over 3 independent runs” (p. 9). Inference: the difference is 3.8 percentage points. Table 3 reports 44.5 ± 0.5% at `α = 0.5` and 18.5 ± 1.1% at `α = 1.0`; its caption states, “Moderate weighting (α ∈ [0.2, 0.5]) performs best, while relying only on the progress predictor (α = 1.0) degrades substantially.” (p. 13) Table 5 reports pass rates of 42.9 ± 0.7%, 45.2 ± 0.6%, and 47.2 ± 0.6% for 8, 32, and 128 samples, respectively, with `α = 0.2` and temperature 0.7 (p. 13).

Inference: reproducing the score requires resolving details not specified separately in Section 4.3.3: how its `P` relates to the cumulative log probability named `L`, and how `N_max` is obtained during unfinished search. A Verus search could use the same mixed ranking idea, but Lean step counts would not directly calibrate Verus repair rounds.

### interactive progress tactic

What it is: add remaining-step feedback to LeanCopilot tactic suggestions. Appendix C states, “The whole functionality is wrapped into a single tactic predict_steps_with_suggestion that is directly usable within a standard Lean workflow.” (p. 15) It displays the predicted remaining steps from each tactic candidate (Appendix C, pp. 14–15).

Inference: a Verus IDE or agent loop could show a proposed proof edit together with predicted remaining repair rounds, and run Verus to check the edit.

## what is proved, measured, and trusted

The paper measures prediction accuracy, MAE, and proof-search pass rate. Its supervision comes from successful Reprover trajectories: “Our training dataset D is then constructed by extracting (state, remaining steps) pairs from the selected proof trajectories” (Section 3.2, p. 5). Inference: this establishes a training target based on found proofs, not a correctness guarantee for the predictor’s estimates. The reported results depend on the generated trajectories, splits, models, and search settings.

Model choice also affects results. Table 6 reports Qwen 2.5 Coder accuracy of 79.4 ± 1.4% and MAE of 2.95 ± 0.18; Table 7 reports its downstream pass rate as 46.4 ± 0.7%, versus DeepSeek Coder 1.3B’s 45.2 ± 0.6% (p. 14). Table 7 specifies “identical search settings (temperature 0.7, 32 samples, same α and reranking).”

## techniques for the catalog

- shortest trajectory labeling — label states with steps remaining on the minimum-depth successful path found
- length-relative balancing — resample collected data by proof-length ranges to reduce short-proof dominance
- history-conditioned progress prediction — predict remaining steps from state plus previous tactics
- mixed progress search — rank frontier states with normalized predicted steps and tactic log probability
- interactive progress feedback — combine tactic suggestions with predicted remaining steps
