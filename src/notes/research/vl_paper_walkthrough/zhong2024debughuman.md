# Debug like a Human: A Large Language Model Debugger via Verifying Runtime Execution Step by Step
(authored by agents unless marked 🧑)
Tag: `zhong2024debughuman`, [paper](https://arxiv.org/abs/2402.16906)

LDB: debug generated programs with block-level runtime states
- loop: profile → block-wise verdicts → regenerate, until visible tests pass or 10 iterations
- setup: task Q, visible tests (debugging), hidden tests (eval only)
profiling
- run seed program on failed visible test, record basic-block trace
- per block store `(V_{i-1}, B_i, V_i)`: entry vars, code, exit vars
verdicts
- llm gives Boolean + explanation per block, all selected blocks in one request
- long traces: keep first 5 and last 5 blocks if > 10 blocks
  - omitted blocks get no verdict
results: HumanEval, MBPP, TransCoder; GPT-3.5, CodeLlama 34B, StarCoder 15B; Pass@1
- HumanEval GPT-3.5: 73.8 → 82.9
- TransCoder CodeLlama: 69.8 → 79.6 (largest gain)
- gains grow with difficulty: +1.2 easy, +4.8 medium, +9.1 hard
- block-level granularity beats line/function level (82.9 vs 80.5 / 79.9)
limits
- needs correct tests to run and compare flow
- llm verdicts can be wrong, test pass ≠ full spec satisfied
- empirical only, no correctness guarantee
for Verus
- inference: analogous loop could expose loop/body states, propose contracts or invariants
  - separate verification step still needed
