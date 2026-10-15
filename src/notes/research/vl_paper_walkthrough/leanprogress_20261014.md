# LeanProgress: Guiding Search for Neural Theorem Proving via Proof Progress Prediction
(authored by agents unless marked 🧑)
Tag: `george2025leanprogress`, [paper](http://arxiv.org/abs/2502.17925v3)

LeanProgress adds a global progress signal to tactic generation: a model predicts how many proof steps remain, and search combines that estimate with tactic log probability. The paper states, “We introduce LeanProgress, a method that predicts the progress in the proof.” (Abstract, p. 1) The paper identifies the gap as follows: “While Lean with LLMs offers valuable assistance with retrieving lemmas, generating tactics, or even complete proofs, it lacks a crucial capability: providing a sense of proof progress” (Abstract, p. 1). The implementation targets Lean, so Verus adaptations below are inferences. The authors report, “Our experiments show that LeanProgress achieves an overall prediction accuracy of 75.8% in predicting the amount of progress” (Abstract, p. 1).

## techniques

### shortest successful trajectory extraction

What it is: use best-first search with Reprover to explore reachable Lean states, retain successful proof trajectories, and choose the minimum-depth trajectory when multiple proofs reach `no_goals`. The paper states, “If multiple proofs are found for a theorem (i.e., multiple no_goals nodes are reached), we select the proof with the minimum depth” (Section 3.2, p. 5).

How to do it: (1) start from each theorem state; (2) expand states in best-first order using tactic log probability; (3) record every path that reaches `no_goals`; (4) choose the shortest path; (5) emit `(state, remaining steps)` pairs, where remaining steps equal path length minus the current index. Inference: for Verus, replace Lean tactics with candidate Rust/Verus proof edits and treat a successful Verus check as the terminal state. Shortest verified patches may be useful labels, but they can favor brittle proof scripts.

Evidence and limits: the authors construct approximately 80,000 trajectories from Lean Workbook Plus and Mathlib4 (Section 1, p. 2). The paper’s formal dataset construction selects a minimum-depth path, which is a label policy rather than proof of globally optimal proof effort.

### length-relative data balancing

What it is: the raw state distribution is dominated by short proofs. The authors down-sample short trajectories and up-sample long ones by five ranges: 1–5 steps ratio 0.01, 6–10 ratio 0.3, 11–15 ratio 0.5, 16–20 ratio 0.7, and 21+ ratio 1.0 (Section 3.3, p. 5). The original mean length is 2.47 and the balanced mean is 10.1; the paper cautions that Figure 3 bar heights are raw counts with incomparable totals.

How to do it: label every state with relative remaining steps; assign each trajectory to its length range; sample according to the stated ratios; split at theorem level so all states from one theorem stay in one partition. The test set contains 8,820 states (Section 3.3, p. 5). Inference: a Verus corpus should balance by proof-obligation depth or repair iterations, while preserving project-level separation to prevent the same function leaking across splits.

### remaining-step predictor with proof history

What it is: fine-tune DeepSeek Coder 1.3B to map a proof state and optional tactic history to the number of steps before `no_goals`. The exact prompts are `--- STATE_BEFORE: {state_before}` plus `--- STEPS_TO_NO_GOALS:` for state-only input, and an added `--- PROOF: {proof}` field for history input (Section 4.2, p. 7). Training uses MSE loss, AdamW, batch size 4, learning rate 1e−5, betas (0.9, 0.999), weight decay 0.01, and warmup ratio 0.03 (Section 4.1, p. 6).

How to do it: tokenize each `(state, remaining steps)` pair; train the regressor on state-only or state-plus-history prompts; evaluate mean absolute error (MAE), defined as the average absolute difference between predicted and actual remaining steps over all dataset pairs. Include history when the same current state can arise from different strategies. Inference: for Verus, serialize the Rust function, current verification diagnostics, and prior proof steps, and predict remaining proof obligations or repair rounds. The prediction is guidance; Verus still decides correctness.

Evidence: Table 1 evaluates 8,820 test states, with mean ± standard deviation over 3 runs. History gives 75.8 ± 1.5% overall exact-match accuracy and MAE 3.15 ± 0.20, versus state-only 62.5 ± 1.8% and MAE 5.08 ± 0.32 (Section 4.3.2, Table 1, p. 7). The 21+ range has 3,700 states and history accuracy 78.2 ± 2.2%, MAE 5.05 ± 0.45. These denominators are table sample counts, not theorem counts.

### progress-guided best-first search

What it is: combine normalized predicted remaining steps with cumulative tactic log probability. The paper defines `C(s_i) = αN(s_i) + (1 − α)P(s_i)`, with `N(s_i) = −2 n̂_i / N_max`, where `n̂_i` is predicted remaining steps and `N_max` is the maximum possible number of steps (Section 4.3.3, p. 8). Use `α = 0.2` in the main comparison.

How to do it: (1) generate candidate tactics and their log probabilities; (2) predict remaining steps for each resulting state; (3) normalize the prediction; (4) rank the frontier by `C`; (5) expand the highest-ranked state; (6) stop at a proved theorem or timeout. Their LeanDojo configuration uses beam size 1×32, a two-minute timeout, and 32 sampled candidates at temperature 0.7 (Section 4.3.3, p. 8; Table 2, p. 9).

Evidence: on Mathlib4-test, standard log probability has 41.4 ± 0.7% pass rate and “Steps as Critic” has 45.2 ± 0.6%, both means ± standard deviation over 3 independent runs with one 32-candidate sample per problem (Table 2, p. 9). Sensitivity shows α = 0.5 gives 44.5 ± 0.5%, α = 1.0 gives 18.5 ± 1.1%, and α = 0.2 is best in this setup (Table 3, p. 13). Increasing samples from 8 to 32 to 128 raises pass rate from 42.9 ± 0.7% to 45.2 ± 0.6% to 47.2 ± 0.6% (Table 5, p. 13). Inference: a Verus search can rank candidate proof edits with the same score, but Verus diagnostics and proof obligations are not numerically equivalent to Lean step counts.

### interactive progress tactic

What it is: LeanProgress integrates with LeanCopilot as a built-in tactic that both suggests tactics and reports predicted remaining steps. The paper names it `predict_steps_with_suggestion` (Section 1, p. 2).

Inference: a Verus IDE or agent loop could expose a command that proposes a proof edit and displays predicted remaining obligations, while requiring a fresh Verus run before accepting the edit. This is a usability layer; it does not enlarge the trusted proof kernel.

## what is proved, measured, and trusted

Lean’s kernel checks the final proof terms; LeanProgress measures prediction error and search pass rate. The progress model itself is not a proof of remaining-step correctness. The work trusts the Reprover-generated shortest trajectories, theorem-level split, model training, and search timeout. Inference: a Verus deployment additionally trusts the Verus verifier, Z3, Rust compiler, specifications, and external contracts. The α sensitivity and model swap results show method dependence: Qwen 2.5 Coder reaches 79.4 ± 1.4% prediction accuracy and 2.95 ± 0.18 MAE, with 46.4 ± 0.7% downstream pass rate under identical settings (Table 6 and Table 7, p. 14).

## what VL should reuse and threat

VL should reuse theorem/project-level data splits, explicit denominators, progress labels from successful verified trajectories, history-conditioned prediction, and mixed scoring rather than a progress-only ranker. It should not redo LeanCopilot integration or Lean-specific tactic engineering. Inference: the threat to agent-written verified Rust is moderate and operational: progress prediction can reduce search waste and expose stalled obligations, but it cannot validate that a Verus contract captures the product requirement. Long proofs, skewed lengths, and model calibration remain failure modes; pure progress scoring’s 18.5% pass rate in Table 3 is evidence against trusting the signal alone.

## techniques for the catalog

- shortest trajectory labeling — generate successful proof trees and label each state with steps remaining on the minimum-depth path
- length-relative balancing — resample proof states by trajectory-length ranges to counter short-proof dominance
- history-conditioned progress prediction — predict remaining steps from state plus prior tactics
- mixed progress search — rank frontier states with normalized progress and tactic log probability
- interactive progress feedback — expose a tactic that combines suggestions with predicted remaining steps

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numbers, references, techniques, and conclusions against the full paper; corrected nothing; did not independently reproduce experiments or verify external references.
