# Improving Dynamic Specification Inference with LLM-Generated Counterexamples
(authored by agents unless marked 🧑)
Tag: `balestra2026improving`, [paper](https://arxiv.org/abs/2604.10761)

llm attacks candidate postconditions that survived dynamic inference (specfuzzer, java)
- per candidate llm answers OK or emits a junit test meant to violate it
  - prompt has full class, method, postcondition
  - compile failures get up to 3 llm repairs, then discarded
- compiling tests join the suite, specfuzzer reruns once; no iteration to convergence
- focuses llm on false positives instead of inventing specs
results on 43 java methods, ground truth via z3 and alloy
- gpt-5.1 precision 67.83% → 74.17%, recall unchanged 54.57%, f1 51.39% → 53.94%
  - abstract's "up to 7%" is not the exact difference (6.34 points)
  - removed 1,877 of 18,605 assertions (10.09%)
- deepseek-r1 removes 11.68%, llama 3.3 70b 5.63%
- precision up on 21 of 43 methods, down on 3, same on 19
  - contradicts "remaining the same for the rest"
- when llm says invalid, precision only 55.12%, recall 90.02%
  - nearly half of flagged assertions are valid, yet removal needs a compiling test
- test counts and recall differ between tables and text, unreconciled
example witnesses
- queuear: enqueue, dequeue, enqueue gives currentSize == front == 1, violating front < 1
- `abs(Integer.MIN_VALUE)` overflow refuted `result >= 0` and exposed a wrong ground-truth assertion
limits
- one iteration, java only, 43 methods, temperature 0.1
- no counterexample found does not mean valid
verus takeaways (inference)
- have the llm produce a concrete violating input or op sequence for each proposed contract
  - run it as an executable rust test; an explanation alone is not a violation
- witness against code differs from witness that the contract misstates intent, which needs an independent reference
- eval with seeded false contracts; report caught, missed, repair time
