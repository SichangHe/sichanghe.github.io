# Psychometric-Based Evaluation for Theorem Proving with Large Language Models
(authored by agents unless marked 🧑)
Tag: `zhang2025psychometric`, [paper](http://arxiv.org/abs/2502.00855v1)

## problem and contribution
The authors state, “This study proposes a psychometric-based evaluation method for theorem proving with LLMs.” (Section 2, p.3)

The paper argues that ordinary Pass@N evaluation gives every theorem equal weight and tests every item, even when theorem information differs. It proposes two components: dataset annotation and adaptive evaluation. The abstract says, “Specifically, we annotate each theorem in the miniF2F dataset and grade them into varying difficulty levels according to the performance of LLMs, resulting in an enhanced dataset: miniF2F-Graded.” (Abstract, p.1) It reports, “It also reduces evaluation costs by using only 23% of the theorems in the dataset.” (Abstract, p.1)

Inference: for VL, this is an evaluation design for verifier-based code generation, not a proof technique. The transferable idea is to measure agent ability with a calibrated, information-rich subset while retaining a fixed held-out audit set so adaptive selection cannot hide failures.

## technique: annotate difficulty and discrimination
The method uses the Lean-formalized portion of miniF2F, comprising 488 theorems in the experiment (Section 4.2, p.7). Four annotation models—codegeex4, llemma, TheoremLlama, and DeepSeek-Prover-V1.5-RL—make 128 attempts per theorem. Each model's prior ability is its whole-dataset Pass@128; for theorem x, each model's attempt success rate is successes divided by 128, and P(x) is the average across four models (Section 3.1.2, p.4).

Difficulty first applies a correction: P'(x) subtracts epsilon (0.005) times the reciprocal prior ability of every model that solved x. The paper then maps this to `Difficulty(x) = −P'(x)/(1−P'(x))`, a reciprocal transformation intended to separate success rates near 0 and 1 (Section 3.1.2, pp.4–5). Discrimination averages, over all six model pairs, the ratio of their theorem success-rate difference to their prior-ability difference. The authors suggest that negative discrimination may indicate contamination or an unusually strong low-ability model (Section 3.1.2, p.5). Difficulty is normalized to [0,1] and discrimination to [−1,1].

The resulting miniF2F-Graded divides 488 items into four levels: 120, 120, 121, and 127 theorems respectively; Level 4 has difficulty exactly 1 because every annotation model had zero success (Table 2, p.8). The authors report that pass rates decrease from Level 1 to Level 4 for each of the six evaluation models, unlike the original manual grading (Section 5.1, pp.8–9; Table 3, p.9).

Inference: VL could annotate tasks by Verus proof-pass rates across independently chosen models and classify contracts by difficulty and discrimination. This does not alter Verus proof semantics; it changes how a benchmark is sampled and reported. The annotation models, attempt count, and contamination checks would be part of the trusted evaluation protocol.

## technique: information-based theorem selection
For a current ability score θ, the method computes modified Fisher information with the formula I(x, θ) = a(x)^f · P(x, θ) · (1 − P(x, θ)) (Section 3.2.1, p.5), where a is discrimination and f controls its influence. The paper says, “Here, f is a hyperparameter.” (Section 3.2.1, p.5) Candidate theorems are ranked by information, with the last-selected items from the previous 10 rounds excluded to avoid repeatedly fitting the same items; the top five are selected each round (Section 3.2.1, p.5).

Step by step: start with annotated difficulty and discrimination; compute each candidate's probability as `P(x, θ) = 1/(1+exp(−a(x)·(θ−b(x))))`, where b is difficulty (Equation 5, Appendix B.1, p.14); compute information; remove recently selected items; select five highest-information theorems. The paper tunes the discrimination factor and update step to `[f, η] = [0.49, 0.004]` (Section 3.2.2, p.6).

Inference: for VL, selection can prioritize tasks near an agent's current proof ability and high model-disagreement, but a mandatory random or fixed audit subset is needed to detect overfitting to the selector.

## technique: adaptive ability update and convergence
Algorithm 1 initializes θ = 0.5 and a stability counter S = 0. Each selected theorem is tested with 128 proof attempts, yielding rate rᵢ. For 0 < rᵢ < 0.1, the algorithm replaces rᵢ with log(1+rᵢ), because a few successes may be random. It updates θ by `θ ← θ + η·aᵢ·(rᵢ − P(tᵢ, θ))`, clamps θ to [θmin, θmax], and increments S when |θ−θprev| < 0.01, resetting S to zero otherwise. It stops after 10 consecutive stable rounds and returns θ (Algorithm 1; Section 3.2.2, p.6).

The proof settings use Lean 4.13, maximum proof length 2,048 tokens, and 128 attempts per theorem (Section 4.1, p.7). The evaluation covers six evaluation models and four annotation models. Table 1 reports evaluation costs from 55 to 195 theorems per model; the average reduction is 76.13% relative to testing all 488 (Section 4.2, pp.7–8; Table 1, p.8). The abstract reports 23%; Table 1 gives the per-model counts. Inference: these counts measure theorem tests, not necessarily distinct theorems, because Table 6 repeats theorem names (Appendix F.1, p.19).

Inference: a VL benchmark can report an adaptive ability score, but product claims should still include absolute proof-pass rates on a fixed corpus. Adaptive scores are model-relative and inherit the annotation models' ability scale.

## evidence, trust, and limitations
The paper compares adaptive-score rankings with Pass@16, Pass@32, Pass@64, and Pass@128 (Section 5.2, pp.9–10; Figure 3, p.11). It also evaluates difficulty-level separation (Section 5.1, pp.8–9) and theorem-count cost (Table 1, p.8). Table 1 places Qwen2.5-Coder above DeepSeek-Prover-V1.5-Base by ability score but below it by Pass@128 (p.8). It does not prove that psychometric scores predict real software reliability. Four annotation models are few for psychometric estimation; the authors therefore use direct formulas rather than standard item-response estimation (Section 3.1.2, p.4). The authors report no negatively discriminating theorems among the annotation results (Appendix E.2, p.18). Inference: the four annotation models’ zero successes on Level 4 do not distinguish those items by observed success; this is not a claim that all evaluation models fail them. Table 3 reports nonzero Level 4 performance for DeepSeek-Prover-V1.5-SFT (p.9).

The stated selection rule excludes the previous ten rounds (Section 3.2.1, p.5; Algorithm 2, p.15), but Table 6 repeats its first theorem at test 16, after only three five-theorem rounds (Appendix F.1, p.19). Inference: the example does not follow that exclusion rule, so the published algorithm and example need reconciliation before reproduction.

Inference: Verus remains the correctness authority for each proof; this paper's formulas, model attempts, dataset split, and selection code are trusted measurement machinery. Adaptive selection must not replace complete regression verification for safety-critical VL code.

## threat to VeruLaw
Inference: a VL team could overstate progress by optimizing an adaptive score while omitting hard failures, or by including training items in annotation. A possible use is a cheaper evaluation loop that samples informative contracts while preserving a fixed, exhaustive release prerequisite check. The paper does not address Rust ownership, concurrency, specification adequacy, or Verus soundness.

## techniques for the catalog
- model-derived difficulty grading — compute theorem difficulty from multi-model proof success and normalize it into graded levels
- discrimination scoring — average pairwise success-rate differences divided by prior ability differences to find separating items
- information-ranked selection — choose high-information items near the current ability while avoiding recent repeats
- adaptive ability convergence — update and clamp a score from repeated proof rates until it stabilizes over ten rounds
- Inference: fixed-audit complement — a proposed VL extension, absent from the paper: pair adaptive evaluation with a fixed audit set to detect selector overfitting

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The results from our evaluation method are represented by ability scores, which belong to a different dimension than pass rates and cannot be directly compared."): checked all quotations, numbers, page and section references, technique steps, tables, and appendices against the full text; corrected quotations and page references, completed the logistic and stability rules, distinguished inferred VL extensions, and noted the selection-rule/example inconsistency; did not reproduce experiments, inspect code or the external dataset, or validate cited papers.
