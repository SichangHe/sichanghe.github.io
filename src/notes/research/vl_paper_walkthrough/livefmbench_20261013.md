# LiveFMBench: Unveiling the Power and Limits of Agentic Workflows in Specification Generation
(authored by agents unless marked 🧑)
Tag: `xu2026livefmbench`, [paper](https://arxiv.org/abs/2605.01394)

empirical study: llm acsl annotation generation for frama-c/wp, 630 c programs
- livefmbench = 270 pre-2025 + 360 sv-comp 2025 programs, 15 model configs, 32 samples each
  - temporal split separates possible training contamination
  - filters: verifies, has assert, dedup by unixcoder cosine >90%, domain filter
  - nothing proved, trust frama-c 27.1, alt-ergo, z3, ground-truth annotations
- faithfulness gate: count a verified output only if program ast unchanged and every given assertion still present
  - models edit program or assertions, no model fully faithful
  - changed outputs 8.74%-72.82%
  - pass rate drops ~21.1% relative on average (4.02%-38.51%), not 20 points
  - worst: llama3.3-70b 2025 pass@1 3.56 to 0.25
  - check is syntactic, rejects harmless rewrites too
  - verus version: compare executable rust after stripping ghost code, reject assume/admit/external_body
  - report pass@k with and without the gate
- one batch of 32 samples, unbiased estimator gives pass@1/5/32
- thinking beats non-thinking, large gains
  - e.g. qwen3-32b 2025 pass@1 0.29 to 7.44
- agent ablation (autospec): verifier feedback carries the gain, program analysis hurts
  - verifier-only beats whole agent in all 10 cells on 2025 subset
  - analysis-only worse than whole agent everywhere
  - 5 refinement rounds vs 5 samples, deepseek-v3.2: 79.26% vs 67.04% pre-2025, 57.50% vs 25.83% on 2025
  - agent at pass@5 loses to direct for deepseek-r1
- failure taxonomy by pairing with ground truth (difflib 0.8-0.99 = typo)
  - loop invariants are the largest error group, missing > extra
  - patterns: no invariant bounding index, outer invariant omitting processed-prefix property of nested loop
  - text similarity overcounts equivalent invariants
- agent without thinking ~2000 tokens, pass@1 49.70 vs thinking direct 27.44 (pre-2025)
  - tokens count unspecified, no equal-token comparison against sampling
- paper inconsistencies
  - pass@1 mislabeled as pass@5 in text
  - table 4 vs 5 pass@1 differ
  - four vs five agent backbones, gpt-oss-120b has no row
