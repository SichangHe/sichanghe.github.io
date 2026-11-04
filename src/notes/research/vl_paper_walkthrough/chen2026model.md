# Can Large Language Models Model Programs Formally?
(authored by agents unless marked 🧑)
Tag: `chen2026model`, [paper](https://arxiv.org/abs/2604.01851)

Model-Bench: python program -> executable TLA+ model checked by TLC
- 400 programs from HumanEval, MBPP, LiveCodeBench; 1,639 tests
  - 683 originals, 41.4% eliminated after filtering imports, rewriting hard features, type limits, execution check
- oracle models: GPT-4o draft refined by 3 practitioners over 2 months; no proof they match python
deterministic CFG lowering
- basic blocks -> actions guarded by a pc variable
- strings lowered to ascii arrays
- claimed semantics-preserving, no mechanized proof
metrics
- Runnable@k: at least 1 of k samples (n=3) passes TLC
- state similarity: fraction of oracle states matched in generated model
  - definition inconsistent for auxiliary variables, theta=1.0 example contradicts it
results
- few-shot matters most
  - original code, all-model avg Runnable@1 9.25% zero-shot -> 26.82% few-shot
  - similarity 2.42% -> 33.86%
- transforming code raises similarity (DeepSeek-V3 49.55% -> 68.54%) but often lowers Runnable@3 (66.25% -> 56.00%)
- higher cyclomatic complexity, loop depth, variable count -> lower runnability
  - uncorrelated with algorithmic difficulty
takeaways for Verus (inference)
- reusable: executable-oracle benchmark with attrition reporting, few-shot examples, compiler-feedback rounds, failure classification
- passing the checker only certifies the written model, oracle stays trusted
