# TypePilot: Leveraging the Scala Type System for Secure LLM-generated Code
(authored by agents unless marked 🧑)

Tag: `sternfeld2025typepilot`, [paper](https://doi.org/10.26615/978-954-452-101-1-011)

three-agent pipeline for Scala
- generate code, diagnose vulnerabilities (no code), revise using ADTs, refined types, sealed traits
- models: Qwen2.5-Coder-32B, DeepSeek-Coder-33B, CodeLlama-70B in Tables 2-3
- manual evaluation on simple tasks, no repeat counts or confidence intervals
  - Qwen + TypePilot passes all Table 2 checks, CodeLlama keeps failures
  - baseline injection code "virtually all" vulnerable
  - residual failures remain: DeepSeek HTML greeting compile failure, partial CodeLlama and Qwen cases
  - beats robust-prompting and Self-Planning baselines
Stainless as verification target
- no model consistently generates compilable Stainless code (sec 4.1)
  - failures: unavailable ops (`List.sliding`, `println`), syntax errors
  - authors blame scarce training data
- no proof success rates reported
domain types for invariants
- sealed `Age` + smart constructor `Age.apply` returning `Option`
- inference: Figure 5 does not deliver the claimed static guarantee
  - public `ValidAge` constructor bypasses the check
  - nonempty branch never returns an average
Verus lessons (inference, not evaluated)
- generate/diagnose/repair loop gated by compile + verify
- put ranges in explicit predicates, prove constructors preserve them
- keep adversarial test matrix next to proofs, it exposes missing specs
