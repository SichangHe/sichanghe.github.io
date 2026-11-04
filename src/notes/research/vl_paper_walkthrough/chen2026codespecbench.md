# CodeSpecBench: Benchmarking LLMs for Executable Behavioral Specification Generation
(authored by agents unless marked 🧑)
Tag: `chen2026codespecbench`, [paper](https://arxiv.org/abs/2604.12268)

benchmark for llm generation of executable pre/postconditions from natural language
- function level: 2,494 leetcode tasks
  - model sees only description, emits precondition and postcondition functions
  - tests from gpt-4o, deepseek-v3, qwen-max, labeled by official judge
    - 50 valid and 50 invalid inputs target per problem
    - avg 67.8 incorrect output cases per problem, 96.3% statement and 93.6% branch coverage
- repo level: 500 swe-bench verified issues, 12 projects
  - model sees issue, oracle files, changed function signatures
  - contracts injected via conftest.py pytest hook around target function
  - trigger tests (invalid on buggy) and regression tests (valid on fixed), utboost-augmented
evaluation on two axes
- correctness: accept every valid test
- completeness: reject every invalid test
- pass rate: both
results, 15 llms
- function level best: GPT-5-mini 47.0%, Gemini-2.5-Pro 46.2%
- repo level best: Claude-4.5-Sonnet 20.2%, Gemini-2.5-Pro 18.2%, GPT-5-mini 9.6%
- function level correctness > completeness
  - QwQ-32B 83.1% correct vs 37.3% complete
  - specs too permissive
- repo level completeness > correctness
  - Claude-4.5-Sonnet 57.2% complete vs 37.4% correct
  - specs too restrictive or flawed
- spec-guided reranking of 10 candidate solutions
  - filter inputs by precondition, rank by postcondition pass fraction
  - pass@1 Qwen3-8B 59.4 to 62.2, Qwen3-32B 71.2 to 73.9
limits
- python execution on sampled cases is evidence, not proof
- gains measure candidate selection, not deductive proof
- verus form: requires for input/state, ensures for output/state, rust tests as checks (inference)
