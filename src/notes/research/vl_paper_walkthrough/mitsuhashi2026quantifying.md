# Quantifying Empirical Compute-Supervision Tradeoffs in RLVR
(authored by agents unless marked 🧑)
Tag: `mitsuhashi2026quantifying`, [paper](https://arxiv.org/abs/2605.25252)

## question and result

This paper tests whether more reinforcement-learning compute can compensate for a noisy verifier. It post-trains Qwen2.5 0.5B and 1.5B with GRPO on GSM8K, deliberately flips binary correctness labels, and varies the number of rollouts per prompt. The paper tests a prediction from recent theory (Rad et al., 2026) that verifier noise "affects only the rate of learning, not its final outcome" (Section 1, p. 1). The central empirical claim is that added compute helps sub-linearly but does not close the gap caused by verifier noise. False negatives (rejecting correct answers) hurt more than false positives (accepting wrong answers). The paper is a 4-page workshop paper (CTB@ICML 2026) with appendices on pp. 6-8.

The authors frame the question as follows: “Our primary goal is to recover compute–verifier tradeoff curves that quantify how much additional compute is required to reach a fixed level of true performance under degraded supervision” (Section 1, p. 1). All validation uses the exact GSM8K checker, so the measured outcome is true capability rather than the noisy training reward.

## technique: controlled asymmetric verifier noise

what it is and when to use it

Use this experiment when a verifier can make distinct false-positive and false-negative errors and one wants to measure their separate effects. Let (y^\star\in\{0,1\}) be the ground-truth correctness label. Flip a correct label to incorrect with probability (p), and flip an incorrect label to correct with probability (x). The paper says, “This parameterization lets us independently vary the false-negative rate p and false-positive rate x, covering the full space of symmetric and asymmetric noise regimes” (Section 3, p. 3).

how to do it

1. Choose a task with an exact binary evaluator; the authors use GSM8K and its checker (Section 3, p. 2).
2. For every training reward, obtain the true label (y^\star) (Section 3, p. 3).
3. If (y^\star=1), return (1-y^\star) with probability (p); if (y^\star=0), return (1-y^\star) with probability (x); otherwise return (y^\star) (Equation in Section 3, p. 3).
4. Sweep (p,x\in\{0,0.1,0.2,0.3,0.4,0.5\}). The pair (0,0) is perfect and (0.5,0.5) is random noise (Section 3, p. 3).
5. Apply noise only during training; evaluate every hold-out answer with the exact checker (Section 3, p. 3).

Verus form (Inference:)

Inference: a Verus analogue is a deliberately fault-injected proof or test oracle used for an experiment, not a production verifier. Define a `spec fn` for the exact correctness predicate and a separate executable function that flips outcomes according to a controlled input. Use `ensures` to state the flip probabilities only in a statistical model outside ordinary deterministic Verus proofs; deterministic properties such as the fact that p=0 preserves correct labels can be proved with `assert` and `proof fn`. Keep the exact Verus result as the evaluation oracle and treat injected noise as an experiment parameter.

## technique: rollout compute sweep and fitted tradeoff surface

what it is and when to use it

Use rollout count as a controlled compute axis when each prompt can produce a group of independent GRPO responses. The authors sweep (r\in\{8,16,32\}), keep batch size 32, and fit validation accuracy as a second-order polynomial in (p,x) plus a log-linear term in (r).

how to do it

1. Train Qwen2.5 0.5B and 1.5B with GRPO using NeMo-RL, AdamW learning rate (5\times10^{-6}), weight decay 0.01, gradient clipping 1.0, 50-step warmup, KL coefficient 0.01, ratio clipping 0.2, and generation temperature 1.0 (Section 3, p. 2).
2. Hold batch size at 32 and vary rollouts per prompt because preliminary tests found batch size had negligible effect while rollout count affected stability and final performance (Section 3, p. 3).
3. For every ((p,x,r)) configuration, run one seed for one epoch. The authors use one epoch because training reward plateaus before the end of an epoch (Section 3, p. 3).
4. Record final-step and best-step validation accuracy; the main analysis uses final-step and the appendix checks best-step robustness (Section 3, p. 3).
5. Fit (y\approx ax^2+bxp+cp^2+dx+ep+f\log r+g). The paper cautions that three rollout values do not identify the functional form in (r) (Section 4, p. 4).
6. Inspect the accuracy heatmaps (Figure 2, p. 3) and maximize the fitted surface only over the sampled ([0,0.5]^2) region (Section 4, p. 4).

The 1.5B final-step fit uses 108 observations and is (y=-0.936x^2-1.052p^2-1.978xp+0.565x+0.577p+0.0344\log_2r+0.508), adjusted (R^2=0.782) (Section 4, p. 4). The fitted optimum is approximately ((p,x)=(0,0.3)), predicted about 0.07 above the perfect-verifier point, but the paper reads this as an optimum on the (p=0) boundary, indicating that "false negatives monotonically hurt training while a moderate rate of false positives is beneficial" (Section 4, p. 4). It cites Plesner et al. (2026) for the regularization explanation, and the Conclusion (p. 4) says the boundary optimum near (0, 0.3) "should be interpreted carefully". Table A1 (Appendix A, p. 6) gives the same fit for best-step accuracy and for 0.5B; the r coefficient is 0.0344 per doubling of r for 1.5B final-step and 0.0621 for 0.5B final-step.

Verus form (Inference:)

## evidence and limitations

Across the 1.5B grid, increasing (r=8\to32) improves validation accuracy but cannot eliminate noise-induced gaps; false negatives damage accuracy more than false positives (Section 4, p. 4). Appendix C expands symmetric noise to (r\in\{4,8,16,32,64\}) and reports cases where more compute overtakes a perfect low-rollout baseline: ((p,r)=(0.3,64)) beats ((0,4)) for Qwen 1.5B, and ((0.4,64)) beats ((0,4)) for Qwen 0.5B (Appendix C, p. 7). The paper says that "in many cases, the increase in compute eventually compensates for the error rate" (Appendix C, p. 7), and also reports plateaus for the larger model at many rollouts and low error rate. Inference: these examples do not contradict the main claim that compute cannot close all gaps; they show that the comparison depends on the baseline rollout budget. The abstract and Conclusion claim ("the gap persists under substantial scaling") rests on the r in {8,16,32} grid, and Appendix C only covers symmetric noise (p = x).

Each model has (N=108) configurations (six p values × six x values × three rollout values), one seed per configuration and one epoch (Section 3, p. 3). Inference: the one-seed design is a major limitation. The paper states, “Lastly, we run one seed per configuration due to compute constraints” (Conclusion, p. 4). The Conclusion also notes that GSM8K consists of "relatively simple arithmetic reasoning tasks", that only small Qwen models were trained, and that the paper does not propose mitigation strategies (p. 4). The polynomial surface is an approximation, not a mechanistic law; the authors explicitly note that it does not account for model size and treats rollout increases equally (Appendix C, p. 7).

## what is proved, measured, and trusted

Measured quantities are exact-checker validation accuracies after GRPO under controlled noise and rollout counts. No theorem is proved about practical RLVR. Inference: trusted components include GSM8K labels and checker, NeMo-RL, GRPO implementation, random noise injection, optimizer, model initialization, one-epoch stopping choice, floating-point fitting, and the assumption that the hold-out checker measures the desired capability.

## techniques for the catalog

- asymmetric verifier injection — flip true labels separately for false negatives and false positives during training
- rollout compute sweep — vary GRPO rollouts per prompt while holding batch and training settings fixed
- exact hold-out evaluation — apply the unmodified checker only at evaluation time to measure true capability
- compute–supervision surface fit — fit accuracy as a function of verifier error rates and log rollout count
- symmetric-noise extension — test larger rollout counts to reveal when compute can beat a low-compute clean baseline
