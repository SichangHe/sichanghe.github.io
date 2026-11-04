# JURY-RL: Votes Propose, Proofs Dispose for Label-Free RLVR
(authored by agents unless marked 🧑)
Tag: `chen2026juryrl`, [paper](http://arxiv.org/abs/2604.25419v1)

JURY-RL: votes propose, proofs dispose, for label-free rlvr
- rollouts vote, formal verifier checks only the plurality answer once
  - verified: reward 1 to rollouts matching it
  - inconclusive: ResZero fallback
    - penalize unverified plurality, reward residual answers by leave-one-out support
    - global offset makes group rewards sum to zero, penalty c=0.01
    - unanimous group gets zero reward
  - then group-normalized advantages with GRPO
- verifier is a lean cascade
  - autoformalizer (Goedel-Formalizer-V2-32B), up to 8 formalizations
  - consistency checker (QwQ-32B), bidirectional semantic alignment
  - prover (Goedel-Prover-V2-32B), up to 16 proof attempts
  - results cached per question-answer pair
results
- 7,500 MATH train problems, G=8, 8 A100
- avg pass@k vs GT reward
  - Qwen3-1.7B-Base 59.41 vs 55.36
  - Llama-3.2-3B-Instruct 48.48 vs 45.46
  - Qwen2.5-7B 64.04 vs 62.48
- verifier parts on MATH500
  - autoformalizer valid lean for 477/500 (95.4%)
  - consistency checker accuracy 85.3%, recall 94.9%, F1 91.1%
  - prover@16 87.6% acc, 324 s; prover@64 91.1%, 656 s
- pipeline is imperfect (precision 84.5%) though lean prover has 0% false positives
  - proof is sound for the lean statement, not for fidelity to the original question
limits
- plurality may be wrong, so a correct minority answer gets no reward
- math with lean, not verus; mapping to verus patches is inference
- cache key and invalidation unspecified (verus would need code, contract, verifier version)
