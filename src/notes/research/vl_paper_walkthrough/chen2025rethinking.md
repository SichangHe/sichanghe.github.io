# Rethinking Fine-Tuning when Scaling Test-Time Compute: Limiting Confidence Improves Mathematical Reasoning
(authored by agents unless marked 🧑)
Tag: `chen2025rethinking`, [paper](https://arxiv.org/abs/2502.07154)

cross-entropy (CE) fine-tuning hurts pass@N at large N
- pass@N: sample N completions, an oracle verifier accepts any one
- Llama-3-8B-base on MATH, 12k train, 500 test
  - pass@1 rises with epochs, pass@N falls for N≥256
  - same pattern for Llama-3-70B-base
- cause is overconfidence
  - CE concentrates probability on a few answers
  - large-N search needs spread over alternatives
- requires an efficient trusted verifier
  - fits Verus as verifier, but the paper never evaluates Verus
Direct Coverage Optimization (DCO) trains for pass@N directly
- loss −log[1−(1−p)^N′], p = full completion probability
  - gradient = CE gradient × F(N′,p) = N′(1−p)^(N′−1)p/[1−(1−p)^N′]
  - N′=1 recovers CE
  - F shrinks once confidence exceeds ~1/N, attenuation not a hard cap
- replace examples with F below 0.3 to keep batch size
- no N′ is best for all N
  - the frontier is the max over models trained with different N′
- test-time budget N should guide N′
DCOstep for proof trees (Lean)
- apply F to each tactic's confidence with N_eff as approximate branching factor
- Qwen2.5-Math-1.5B on LeanDojo, pass@4k
  - MiniF2F: CE 37.4%, DCOstep 39.0% (N_eff=4), 39.5% (N_eff=8)
  - Mathlib: CE 55.6%, DCOstep ~56.1–56.5%
  - ensemble of 5 N_eff models: 62.2% Mathlib, 43.6% MiniF2F
    - CE at 20k samples: 57.0%, 39.5%
    - ensemble costs 5× samples
DCOa for chain-of-thought
- Monte Carlo estimate of final-answer probability fed into F
- N′=64 on CoT MATH, epoch 5
  - pass@64: DCOa 64.3±0.6 vs CE 60.9±0.6
  - pass@1: DCOa 7.8 vs CE 9.9
  - GRPO pass@1 14.6 but pass@64 only 35.4, overconfidence
expert iteration
- harvest proofs of untraced Mathlib theorems with pass@1k, retrain once
- ensemble pass@4k 62.15% → 64.8%
- harvest count and data mixing unspecified
caveats
- gains are small and specific to LeanDojo/MATH
- proves analytic lemmas about confidence and pass@N under calibration assumptions
  - an error in Theorem 4.2 was corrected in the revised version
- Verus use (inference): DCO is training-side, trusted separately from the Verus checker
