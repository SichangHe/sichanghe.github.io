# Review Beats Planning: Dual-Model Interaction Patterns for Code Synthesis
(authored by agents unless marked 🧑)
Tag: `miller2026reviewbeats`, [paper](https://arxiv.org/abs/2603.03406)

two models: coder reviewed by reasoner beats reasoner planning for coder
- setup: Qwen2.5-Coder-14B (coder), Qwen3-32B (reasoner), AWQ 4-bit, greedy decoding
  - HumanEval+ 164 problems, MBPP+ 378 problems, pass@1
- HumanEval+: raw coder 78.0%, plan-then-code 75.6%, review-then-fix 87.8%, with retry 90.2%, debate 86.6%
  - plan-then-code: 15 regressions vs 14 improvements
- MBPP+: review-then-fix 69.8% vs raw 67.5%, only +2.3
review-then-fix pipeline
- coder generates freely, reasoner reviews against spec, coder fixes in one pass
  - review must be concrete ("line X does Y, should do Z"), not an abstract plan
  - 2-3 calls without retry, 2-7 with retries
- retry layer: run visible doctests and compile errors, up to 3 retries
  - hidden tests never used in retries
  - retry adds 2.4 points (87.8% to 90.2%)
spec richness moderates gain
- HumanEval+ gain +9.8 vs MBPP+ +2.3
  - lean specs raise missed bugs and false positives
- mitigations failed
  - spec-gated review: 84.1% / 69.0%, worse on both
  - spec-enriched review: 88.4% / 69.8%, +0.6 / 0 for 1 extra call
  - generated enrichment does not replace real spec detail
adversarial dual generation
- both models generate independently, cross-validate on doctests, review only on disagreement
  - 86.6% on HumanEval+, below review-then-fix with retry
limits
- single-function Python only, one model pair, reviewer diagnosis soundness not established
for verus
- inference: second model reviews Rust against requires/ensures, Verus result is the acceptance criterion
  - never let agent silently weaken ensures, treat changed contracts as separate artifacts
