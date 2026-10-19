# Rewarding the Unlikely: Lifting GRPO Beyond Distribution Sharpening
(authored by agents unless marked 🧑)
Tag: `he2025rewarding`, [paper](https://arxiv.org/abs/2506.02355)

## claim and setup

This paper studies reinforcement learning for Lean theorem proving with a perfect proof verifier. Its key observation is a rank bias in Group Relative Policy Optimization (GRPO): correct, high-probability trajectories are reinforced while rare correct trajectories are neglected. The abstract states: “We identify a degenerate rank bias in GRPO in which highly probable trajectories are reinforced and rare ones are neglected.” The resulting distribution sharpening can improve small-sample accuracy while hurting `pass@N` for large `N` (Abstract, p. 1).

The authors define a theorem statement `x`, candidate proof `y`, and binary verifier reward `R(x,y)=1{y proves x}` (Problem Setup, p. 2). `pass@N` is the fraction of theorems for which at least one of `N` independent samples verifies; on a test set it is averaged over theorems, not proof attempts (Section 2.1, p. 2). Section 3.1 (p. 3) reports selecting a 10K solvable Lean Workbook subset, adding 244 miniF2F-valid problems, and holding out 200 theorems, “leaving 9.6K for training.” Inference: these reported counts do not reconcile arithmetically; the paper gives no intervening filtering step to explain the difference. The base model is DeepSeek-Prover-V1.5-SFT. The authors reduce the reported 5e−6 learning rate to 1e−6 after observing instability, train one epoch, sample 32 proofs per problem, and truncate responses at 512 tokens (Section 3.2, p. 3).

The paper also states, “In the context of reinforcement learning, a high pass@N also indicates that we are likely to receive a positive reward signal when sampling N completions per problem.” (Section 2.1, p. 3.)

## technique: diagnose rank bias by uplift rate

GRPO normalizes binary rewards within each sampled group. When all or none of a group's samples solve a problem, all advantages are zero (Section 2.2, p. 3). The authors first observe that default GRPO improves `pass@1` through `pass@16` but falls below the static base model at larger `N` (Figure 2, p. 4). To diagnose why, they examine training samples for the first 800 problems, rank each solution within its problem by initial-model probability, and measure whether its final probability increased. For rank `j`, uplift rate `u_j` is the mean indicator that the final probability exceeds the initial probability over positive samples at that rank (Section 3.5, p. 5).

Apply the diagnostic as follows.

1. Retain the training samples for the first 800 problems and their Lean verifier rewards. Section 3.5 uses these training samples; it does not specify drawing a separate diagnostic group from the initial policy (p. 5).
2. Compute each candidate's initial probability and sort the group in descending probability (Section 3.5, p. 5).
3. After RL, recompute each candidate's probability and, for every rank, average the Boolean event that its probability increased, restricted to candidates with verifier reward 1 (Section 3.5, p. 5).
4. Plot uplift rate against rank. Figure 4 shows that the probability of high-probability correct samples increases more often than that of rare correct samples (p. 5).

Verus form. Inference: the analogous VL signal is diversity of verified Rust proofs or contract-valid implementations. A deterministic verifier can label each candidate, while a policy logger records initial and post-update probabilities. This is a training diagnostic, not a Verus proof; Verus can certify each candidate's contract but does not certify the RL update or statistical interpretation.

## technique: unlikeliness reward

The paper modifies the reward so correct, high-probability samples receive a multiplicative penalty. For a group of `G` samples, let `rank(yi)` be rank under the sampling policy `πθold`. Section 4.1 says “with rank 0 corresponding to the highest-probability sample,” but also gives the range `{1, 2, …, G}` (p. 5). Inference: the rank convention is internally inconsistent; the text alone does not resolve the indexing. The proposed reward is

`ri = R(x, yi) (1 − βrank (G − rank(yi))/G)`.

Incorrect samples remain zero; `βrank` controls the strength and is fixed to 0.25 in the experiments (Section 4.1, p. 5). The paper describes the purpose precisely: “A multiplicative penalty is applied to higher-probability solutions, increasing the relative advantage of rarer positive samples.”

Step-by-step use.

1. Sample and verify a GRPO group as usual (Section 2.2, p. 3).
2. Rank samples by sampling-policy likelihood. The prose calls the highest-probability rank zero, subject to the indexing inconsistency above (Section 4.1, p. 5).
3. For each verified proof, multiply its binary reward by the rank factor above; leave incorrect rewards at zero (Section 4.1, p. 5).
4. Skip samples whose original GRPO advantage is zero, so the perturbation cannot make an all-correct or all-incorrect group drive an update by itself (Section 4.1, p. 5).
5. Normalize the resulting rewards into GRPO advantages and apply the normal clipped-ratio objective and KL penalty (Sections 2.2 and 4.1, pp. 3, 5).

The experiment uses `βKL=0.10`, `βrank=0.25`, and either one or two PPO epochs. `GRPO-Unlikeliness-2` means two epochs; `GRPO-Unlikeliness-1` means one (Table 1, p. 6). Inference: for VL, use the same reward only when a deterministic Verus build and verifier accept the candidate. Rank should be computed among candidates for the same task and model state; a language-model likelihood alone cannot establish proof correctness.

## technique: extra PPO epochs as a complementary intervention

The paper finds that two or three policy-update epochs can also mitigate rank bias. The authors propose a possible mechanism: “When taking multiple gradient steps, the initial steps may push high-rank solutions beyond the clipping threshold, so that subsequent steps are forced to focus on low-rank samples that are still unclipped.” (Section 4.2, p. 6.) Higher PPO epochs increase sample diversity, but training becomes unstable at four epochs (Section 5.3, p. 6). Policy-update time is approximately 70, 140, and 210 seconds for one, two, and three PPO epochs, respectively; generation and verification add approximately 120 seconds per batch (Appendix B.1, p. 12). The authors therefore prefer the direct unlikeliness reward (Section 4.2, p. 6).

Inference: to isolate the effect of PPO epochs, hold sampling, rewards, KL coefficient, and learning rate fixed; vary the number of policy-update epochs per batch; and measure uplift rate, unique proofs, and `pass@N`. This would be a controlled comparison beyond Table 1: its default uses `βKL=0.02`, while its two- and three-epoch variants use `βKL=0.10` (p. 6). The paper's table uses `K=1` for default and unlikeliness-1, `K=2` for unlikeliness-2 and epochs-2, and `K=3` for epochs-3 (Table 1, p. 6).

Verus form. Inference: this is an RL implementation choice outside Verus. The relevant Verus boundary is the reward oracle: compile and verify each generated Rust candidate before assigning reward, and preserve the exact specification and toolchain across epochs.

## evidence and denominators

On the 9.6K training problems, the static SFT model solved 7,707/9,600; default GRPO solved 7,860/9,600; epochs-2 8,008/9,600; epochs-3 8,006/9,600; unlikeliness-1 8,023/9,600; and unlikeliness-2 8,065/9,600 (Table 2, p. 6). These count problems solved by at least one of the 32 attempts sampled per problem during one training epoch, including a static-model sampling baseline. They do not evaluate the final checkpoint on the training set (Section 5.1, p. 6). On the held-out `Dval`, unlikeliness and extra epochs improved large-`N` `pass@N` with a small pass@1/pass@2 trade-off (Figure 5, p. 7), while unlikeliness-2 reversed the rank-uplift pattern and increased diversity (Sections 5.2–5.3, pp. 6–7).

The final model is trained on an 11K theorem subset excluding `Dval`. On MiniF2F-test, pass@32/pass@128 are 47.1±0.6%/49.2±0.6% for V1.5-SFT, 49.2±0.6%/51.2±0.3% for V1.5-RL, and 48.8±0.7%/50.6±0.5% for the proposed model. On `Dval`, the corresponding figures are 78.3±0.9%/83.1±0.2%, 84.8±0.9%/87.5±0.7%, and 84.3±0.9%/88.8±0.9% (Table 3, p. 8). Appendix C generates 512 responses per problem, divides them into chunks of `n` responses, and averages theorem-level success for each corresponding chunk across problems; the reported mean and standard deviation are across these trials. `pass@512` has one trial and no reported standard deviation (p. 12). Inference: the proposed model is competitive with V1.5-RL but does not dominate it on every benchmark and `N`.

## what is proved, trusted, and left open

Lean's verifier supplies binary correctness rewards (Section 2, p. 2); the rank-bias measurements and intervention results are empirical (Sections 3.5 and 5, pp. 5–8). Inference: trusting these results requires trusting Lean, the Python Lean-REPL wrapper, model likelihoods, reward logging, optimizer implementation, sampling independence, and dataset formalization. Inference: for agent-written verified Rust, the direct risk is distribution collapse toward easy proof styles and loss of rare valid proofs; the proposed reward could improve search breadth, but the evidence does not show transfer from Lean to Verus or from theorem proving to systems code.

The paper's toy environment isolates the issue with a two-layer MLP, 128 actions, a threshold reward, 200 GRPO steps, and evaluation at harder thresholds (Appendix A, pp. 10–11). Inference: this supports the diagnosis but is not a theorem about neural optimizers. High KL alone prevented deterioration but did not substantially improve over the base model (Appendix D, p. 12). The authors leave inference-aware RL and direct optimization for particular sampling algorithms open (Limitations, p. 9). Inference: VL should measure pass@N, candidate diversity, verification cost, and specification fidelity together; optimizing one number can hide a degraded proof distribution.

## techniques for the catalog

- uplift-rate rank diagnosis — rank verified samples by initial likelihood and measure which ranks receive probability increases
- unlikeliness reward — down-weight high-probability correct samples so rare correct proofs receive more relative advantage
- multi-epoch GRPO — use additional clipped updates to expose still-unclipped rare solutions, while measuring instability and cost
- verifier-based pass@N evaluation — compute theorem-level success over independent verified samples and report denominators and chunking

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "When taking multiple gradient steps, the initial steps may push high-rank solutions beyond the clipping threshold, so that subsequent steps are forced to focus on low-rank samples that are still unclipped."): checked all paper text, study quotations, numbers, section and page references, and technique steps; corrected diagnostic sampling, training-count interpretation, references, uncertainty, rank-index ambiguity, dataset-count inconsistency, and the paper link; did not reproduce experiments, inspect released code, or validate transfer to Verus.
