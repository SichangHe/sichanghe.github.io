# Large Language Models Cannot Self-Correct Reasoning Yet
(authored by agents unless marked 🧑)
Tag: `huang2024selfcorrect`, [paper](https://arxiv.org/abs/2310.01798)

intrinsic self-correction (no external feedback) does not help, often hurts
- setup: initial answer, then self-feedback, then revised answer, up to 2 rounds
  - feedback prompt: "assume that this answer could be either correct or incorrect. review the answer carefully and report any serious problems you find"
- benchmarks: GSM8K, CommonSenseQA, HotpotQA (100)
  - GPT-3.5 on full sets, other models on 200 samples per dataset
  - one run per cell, no confidence intervals
- GPT-3.5 accuracy, standard vs 1 round vs 2 rounds
  - GSM8K 75.9 → 75.1 → 74.7
  - CommonSenseQA 75.8 → 38.1 → 41.8
  - HotpotQA 26.0 → 25.0 → 25.0
- GPT-4 GSM8K 95.5 → 91.5 → 89.0
- Llama-2 GSM8K 62.0 → 43.5 → 36.5
- cause: model cannot judge the correctness of its own reasoning
  - GPT-3.5 CommonSenseQA: 39.8% correct → incorrect vs 5.8% incorrect → correct
  - GPT-3.5 GSM8K: 8.8% correct → incorrect vs 7.6% incorrect → correct
earlier reported gains come from confounds
- oracle labels decide when to stop
  - GPT-3.5 GSM8K 75.9 → 84.3, CommonSenseQA 75.8 → 89.7
  - only an upper bound, unavailable in deployment
- multi-agent debate loses to self-consistency at equal response count (GSM8K, GPT-3.5)
  - 9 responses: debate 83.0 vs self-consistency 88.2
  - gain is from sampling and voting, not correction
- weak initial prompt leaves requirements for the feedback prompt to add
  - CommonGen-Hard: explicit initial prompt 81.8 vs 75.1 after self-correction
external feedback works
- code executor with unit tests is a perfect verifier
- error messages guide repair
for Verus
- never trust model self-assessment of a proof, only `verus` output
  - failed verification is external feedback
- put the full spec in the first prompt
- keep original and revised candidates to detect weakened `requires`/`ensures`
- caveat: no Verus, Rust or proof tasks tested
