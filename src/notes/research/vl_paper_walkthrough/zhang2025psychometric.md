# Psychometric-Based Evaluation for Theorem Proving with Large Language Models
(authored by agents unless marked 🧑)
Tag: `zhang2025psychometric`, [paper](http://arxiv.org/abs/2502.00855v1)

## problem and contribution
The authors state, “This study proposes a psychometric-based evaluation method for theorem proving with LLMs.” (Abstract, p.1)

The paper argues that ordinary Pass@N evaluation gives every theorem equal weight and tests every item, even when theorem information differs. It proposes two components: dataset annotation and adaptive evaluation. The abstract says the method “annotate[s] each theorem in the miniF2F dataset and grade[s] them into varying difficulty levels according to the performance of LLMs” (Abstract, p.1), then dynamically selects the most informative theorems. The reported cost uses only 23% of the dataset (Abstract, p.1).

## technique: annotate difficulty and discrimination
The method uses the Lean-formalized portion of miniF2F, comprising 488 theorems in the experiment (Section 4.2, p.7). Four annotation models—codegeex4, llemma, TheoremLlama, and DeepSeek-Prover-V1.5-RL—make 128 attempts per theorem. Each model's prior ability is its whole-dataset Pass@128; for theorem x, each model's attempt success rate is successes divided by 128, and P(x) is the average across four models (Section 3.1.2, p.4).

Difficulty first applies a correction: P'(x) subtracts epsilon (0.005) times the reciprocal prior ability of every model that solved x. The paper then maps this to `Difficulty(x) = −P'(x)/(1−P'(x))`, a reciprocal transformation intended to separate success rates near 0 and 1 (Section 3.1.2, pp.4–5). Discrimination averages, over all six model pairs, the ratio of their theorem success-rate difference to their prior-ability difference. Negative discrimination can indicate contamination or an unusually strong low-ability model (Section 3.1.2, p.5). Difficulty is normalized to [0,1] and discrimination to [−1,1].

The resulting miniF2F-Graded divides 488 items into four levels: 120, 120, 121, and 127 theorems respectively; Level 4 has difficulty exactly 1 because every annotation model had zero success (Table 2, p.8). The authors report that pass rates decrease monotonically from Level 1 to Level 4, unlike the original manual grading (Section 5.1, p.8).

## technique: information-based theorem selection
For a current ability score θ, the method computes modified Fisher information with the formula I(x, θ) = a(x)^f · P(x, θ) · (1 − P(x, θ)) (Section 3.2.1, p.5), where a is discrimination and f amplifies its effect. The paper says, “The selection algorithm is outlined in C” (Section 3.2.1, p.5). Candidate theorems are ranked by information, with the last-selected items from the previous 10 rounds excluded to avoid repeatedly fitting the same items; the top five are selected each round (Section 3.2.1, p.5).

Step by step: start with annotated difficulty and discrimination; estimate each candidate's probability at the current θ using the paper's logistic function; compute information; remove recently selected items; select five highest-information theorems. The paper tunes the discrimination factor and update step to `[f, η] = [0.49, 0.004]` (Section 3.2.2, p.6).

## technique: adaptive ability update and convergence
Algorithm 1 initializes θ = 0.5 and a stability counter S = 0. Each selected theorem is tested with 128 proof attempts, yielding rate rᵢ. For 0 < rᵢ < 0.1, the algorithm replaces rᵢ with log(1+rᵢ), because a few successes may be random. It updates θ by `θ ← θ + η·aᵢ·(rᵢ − P(tᵢ, θ))`, clamps θ to [θmin, θmax], and increments S when |θ−θprev| < 0.01. It stops after 10 consecutive stable rounds and returns θ (Algorithm 1; Section 3.2.2, p.6).

The proof settings use Lean 4.13, maximum proof length 2,048 tokens, and 128 attempts per theorem (Section 4.1, p.7). The evaluation covers six evaluation models and four annotation models. Table 1 reports evaluation costs from 55 to 195 theorems per model; the average reduction is 76.13% relative to testing all 488 (Section 4.2, p.7; Table 1, p.7). The abstract's 23% figure is an overall dataset-use summary, while per-model costs vary; these denominators should not be conflated.

## evidence, trust, and limitations
The paper measures ranking agreement between adaptive ability scores and Pass@128, difficulty-level separation, and theorem-count cost. It does not prove that psychometric scores predict real software reliability. Four annotation models are few for psychometric estimation; the authors therefore use direct formulas rather than standard item-response estimation (Section 3.1.2, p.4). A theorem with negative discrimination requires investigation, and Level 4's zero successes makes fine discrimination impossible.

## techniques for the catalog
- model-derived difficulty grading — compute theorem difficulty from multi-model proof success and normalize it into graded levels
- discrimination scoring — average pairwise success-rate differences divided by prior ability differences to find separating items
- information-ranked selection — choose high-information items near the current ability while avoiding recent repeats
- adaptive ability convergence — update and clamp a score from repeated proof rates until it stabilizes over ten rounds
- fixed-audit complement — pair adaptive evaluation with full or random fixed sets to detect selector overfitting
