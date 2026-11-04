# Compiler-Guided Adaptive Proof Search with Cross-Model Synergy on Context-Dependent Theorem Proving
(authored by agents unless marked 🧑)
Tag: `liu2026compiler`, [paper](https://arxiv.org/abs/2608.18084)

whole-proof generation in real Lean 4 projects as controlled search
- claim: a failed proof holds partial progress, but unconditional revision can destroy it
  - "a revision may fix one error while introducing another, or degrade a partially correct proof" (§1)
- alternate exploration (diverse starts) and exploitation (refine one current-best proof)
- result: +12.8 pp avg pass rate within pass@32, 21.9% fewer LLM calls (miniCTX-v2, 7 Lean projects)
compiler-grounded feedback
- compile every candidate; map error position and message to the offending tactic line
- feed compact line-level report (1 line of context per error) to repair model and judge
- `AUTO SOLVE` before any model call
  - deterministic closers: rfl, simp, omega, linarith, norm_num, ring, decide
  - library search: exact?, hint
- Verus analogue (inference)
  - `cargo verus` error location/message plus failed requires/ensures/invariant/trigger obligation
  - tactic list does not transfer; auto-retrying deterministic lemmas before LLM may cut cost, must be measured
dual-model exploration
- generalist (GPT-5-mini) gets full project context
- Lean specialist (DeepSeek-Prover-v2-7B) gets start and end only, fits 8192 tokens
- order: generalist first, specialist only on failure, then pairwise judge on both failures
- failed candidates kept as possible starting states, unlike independent pass@k
propose-then-accept refinement
- repair proposes `s̃ = REFINE(s*, e*)`; judge picks `BETTER(s*, s̃)`
  - judge sees both proofs and compiler errors: progress, error severity, strategy
- rejected proposal keeps old proof and bumps stagnation counter; accepted resets it
stagnation-triggered resampling
- when consecutive rejections reach N, resample from both models and judge fresh pair
  - main experiment: K in {8..28}, N = ceil(K/4)
- example: 4 failed refinements, resample at iteration 5, success after 1 more refinement
evidence and limits
- RLMEval-FLT3 (84 theorems): 39.3% at 13.5 calls vs 36.9% generalist pass@32, 28.6% specialist pass@32
- without AUTO SOLVE: 60.71% vs 49.75% (GPT-5-mini), 51.71% (DeepSeek-Prover-v2), 20.71 calls per theorem
- different wrong starting proofs vary more (SD 3.36) than reruns of one (SD 2.41), 9 theorems
- judge picked GPT-5-mini 58.6%, DeepSeek 41.4% of 391 comparisons
  - selection frequency is not proof quality
- single run per method and budget
- Lean check does not show theorem captures intended spec, nor Rust/Verus behavior
