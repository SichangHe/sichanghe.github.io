# FATE: A Formal Benchmark Series for Frontier Algebra of Multiple Difficulty Levels
(authored by agents unless marked 🧑)
Tag: `jiang2025fate`, [paper](https://arxiv.org/abs/2511.02872v4)

idea: graded Lean benchmark for abstract/commutative algebra
- FATE-M textbook (141 -> 150), FATE-H honors/graduate (100), FATE-X PhD qualifying+ (100)
- best prover: 3% pass@64 on H, 0% on X
  - DeepSeek-Prover-V2-671B 62.7% on M
curation
- expert-formalized in Lean by Mathlib contributors, 2 reviewers per problem
- difficulty validated by humans: 73% on H, 21% on X (natural language), 7/10 professors rate at qualifying level or harder
evaluation
- pass@64, 64k tokens, 300 s timeout
- reject `sorry`, axioms, changed statement, errors; kernel check
two-stage diagnosis
- natural-language pass@1 vs formal pass@64
  - DeepSeek-R1 on H: 71.0 NL vs 0.0 formal
  - DeepSeek-Prover-V2 on H: 39.0 vs 3.0
- bottleneck is translating a correct informal proof into precise formal code
- caveat: expert NL labels vs automated formal, diagnostic not like-for-like
formalization error taxonomy (failed with correct NL proof, FATE-H)
- Mathlib hallucination 35/39 (Prover-V2), 70/71 (R1)
- Lean proficiency 36/39, 70/71
- general capability 19/39, 18/71; misalignment 3/39, 0/71
- categories overlap; retrieval/type guidance suggested, untested
Verus form (inference)
- categories: wrong `requires`/`ensures`, unsupported syntax, missing ownership facts, spec/code mismatch
- keep exact verifier diagnostic per failure
