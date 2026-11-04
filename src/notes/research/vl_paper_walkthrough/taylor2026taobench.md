# TaoBench: Do Automated Theorem Prover LLMs Generalize Beyond MathLib?
(authored by agents unless marked 🧑)
Tag: `taylor2026taobench`, [paper](https://arxiv.org/abs/2603.12744)

benchmark: 150 Analysis I exercises from Tao's Lean formalization, each paired with an equivalent MathLib version
- isolates definition familiarity from math difficulty
- Lean provers drop sharply on bespoke definitions
  - DeepSeek-Prover-V2-7B pass@128: 62/150 (41.33%) vs 104/150 (69.33%) on MathLib
  - Goedel-Prover-V2-32B: 74/150 (49.33%) vs 109/150 (72.67%)
  - GPT-5.1 pass@8: 52.00% vs 64.67%
- more local definitions hurts more
  - TaoBench pass@128 averaged over models: 67.14% (0 defs) to 6.37% (10+ defs)
  - MathLib: 68.10% to 53.43%
  - Verus lesson: agents may memorize library idioms rather than reason; stratify by bespoke vs canonical lemmas
minimal compilable context per problem
- recursively retrieve only needed declarations with JiXia static analysis, plus a file-lookup tool for sugared syntax
- GPT-5 agent compiles in a clean env and iterates on compiler errors
  - declarations copied verbatim, no placeholder definitions
  - dependency proofs may become `by sorry`
- context matters: removing it drops DeepSeek-7B 62 to 44, Goedel-32B 74 to 46
- authors leave "all useful contextual information" retrieval to future work
paired translation with equivalence checks
- pipeline: rewrite to MathLib with GPT-5.1 + web search, compile and repair, extract target states, LLM equivalence judge, human labels A to D
- compiling is easy, equivalence is hard
  - 154 equivalence-check failures vs 79 compile errors across attempts
  - ~60% valid without web search, ~90% compiled with it
- human check: 108 label A, 31 label B, Gwet's AC2 0.89
  - paper inconsistent on corrections: 11 in appendix vs 33 in main text
- Verus lesson: LLM equivalence judgment alone is not evidence of semantic equivalence
