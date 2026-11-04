# Formal Mathematics Statement Curriculum Learning
(authored by agents unless marked 🧑)
Tag: `polu2022formal`, [paper](http://arxiv.org/abs/2202.01344v1)

result: expert iteration (search interleaved with training) on Lean beats search-only at same compute
- miniF2F (244 valid + 244 test): 47.3% valid, 36.6% test at pass@64
  - full run ~2000 A100 days; one proof search ~0.1 A100 hour
- learns harder statements without ground-truth proofs
- limit: cannot chain more than 2-3 non-trivial reasoning steps
lean-gym
- `init-search` returns state + ids; `run_tac` applies tactic string
  - stdin/stdout REPL, scales to thousands of workers
  - blocking REPL prevents inner-proof parallelism
- Verus (inference): worker takes source snapshot + proof edit, returns diagnostics
  - Verus rechecks source, no stable tactic state; regenerate temp crate per candidate
proofstep + proofsize objectives
- 774m decoder, 300B CommonCrawl + 72B WebMath tokens pretraining
- `DECL <name> GOAL <g> PROOFSTEP <tac>` conditions on declaration name as weak context proxy
- proofsize predicts 11 buckets (0 = unprovable, 10 = shortest); value = weighted bucket average
  - slightly better than outcome objective (mathlib-valid pass@1 56.3 vs 55.6%)
  - prefers shorter proofs
expert iteration
- 512 expansions, 8 samples; fine-tune θ0 one epoch per round on globally deduplicated data
  - keep min proof size per goal; label unproved visited goals infinite size
  - global dedup deemed important, no ablation
- mathlib-train proved 67.8% → 76.0% over 9 iterations; mathlib-valid pass@1 56.3 → 62.6%
- exponent higher than test-time compute scaling alone
- Verus (inference): store source, diagnostics, solver config per attempt
synthetic difficulty curriculum
- `synth-ineq`: 5600 inequality statements, depth ND 0-6 × obfuscation NS 0-7
  - only ND=1 seeds proved by hand
  - expert iteration closes 6 of 800 at ND=6; sample-only stuck at 0
- Verus (inference): parameterize by invariant depth/aliasing; check contracts are meaningful
manual transfer curriculum
- 327 hand-formalized statements, disjoint from miniF2F; 100 closed
- full curriculum vs mathlib-only (valid pass@64 47.3 vs 44.1%)
  - uses more statements and compute; equal-compute comparison only in Figure 4
trust
- Lean kernel decides; search, scores, buckets are untrusted
- threat to Verus product: high training/search cost, not autonomous verification
