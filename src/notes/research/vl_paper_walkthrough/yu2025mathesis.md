# Mathesis: Towards Formal Theorem Proving from Natural Languages
(authored by agents unless marked 🧑)
Tag: `yu2025mathesis`, [paper](https://arxiv.org/abs/2506.07047v1)

end-to-end NL -> Lean4 pipeline: sample statements, compile, score semantics, prove
- failure motivating semantic check: improper formalization gives misleading proofs or unprovable problems
  - example 1: desired conclusion added as assumption
  - example 2: summation range changed
- proof gate excludes `apply?` endings and vacuous `: True` statements
- full system, 32 proof attempts: 64.3% MiniF2F-Test, 18.0% Gaokao-Formal (488 problems)
  - prose says 7.2% -> 18.4% for autoformalizer gain, Table 5 gives 18.0%, inconsistent
- Verus analogue (inference): contract compiles under Verus, separate semantic checker compares it with the requirement
  - semantic checker never replaces the proof check
autoformalizer trained with composite RL rewards
- reward = Rsem (LLM judge says "Appropriate") + Rver (Lean compile), GRPO, G=14
  - init from Kimina-Autoformalizer, ~32k curated problems
- HPO adds DPO preferences from downstream verified proof success
  - needs a strong base model for meaningful candidates
  - a proved statement may still be a wrong or too-weak contract
- Gaokao-Formal LC+LSC@6: 67% -> 71% with HPO, vs Kimina-7B 49%
LeanScorer: structured semantic scoring
- decompose into subtasks, rate each A match / B minor / C major, map to 1 / 0.5 / 0
- aggregate with Sugeno fuzzy integral, any C vetoes
- human-labeled Gaokao subset (size unstated), alpha=0.6
  - LeanScorer precision 94%, recall 89%, F1 0.92
  - LLM-as-judge 73% / 100% / 0.85
  - re-informalization 93% / 50% / 0.65
- still LLM heuristic, false positives reported, Eq. 3 underspecified
prover by verified expert iteration
- Qwen2.5-Math-7B, retrain on Lean-accepted proofs
- cannot bootstrap classes with no seed proofs
