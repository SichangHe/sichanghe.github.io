# FANS: Formal Answer Selection for LLM Natural Language Math Reasoning Using Lean4
(authored by agents unless marked 🧑)
Tag: `yao2025fans`, [paper](https://arxiv.org/abs/2503.03238)

pipeline: translate NL question and answer to Lean4, prover LLM proves, Lean checks, select verified answers
- the proof generator need not be trusted
- gains small: MATH500 ORM 62.6 to ORM+FANS 63.8 (+1.2pp), AMC23 +2.5pp
- strong on algebra, number theory, weak on geometry, combinatorics
translation fidelity is the weak point
- a proof can be valid for a mistranslated or vacuous theorem
- authors admit high false-positive rate and prover incompleteness
- external checker (QwQ-32B) beats self-check
  - Llama-3.2-3B MATH500: 61.0 vs 57.6
verified voting
- majority among proof-verified answers, below a threshold fall back to plain majority or ORM
Verus
- NL requirement to `requires`/`ensures`, verifier only checks the contract
- report "unverified" when no proof, second checker or human reviews contracts that verify too easily
