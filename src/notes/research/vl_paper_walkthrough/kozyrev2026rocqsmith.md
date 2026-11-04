# RocqSmith: Can Automatic Optimization Forge Better Proof Agents?
(authored by agents unless marked 🧑)
Tag: `kozyrev2026rocqsmith`, [paper](https://www.semanticscholar.org/paper/3a657e698e99bd5e807d9e7833d509bb18994cb9)

automatic agent optimizers do not match a hand-engineered proof agent
- few-shot bootstrapping is the most consistently effective
- setup: simplified rocqstar loop, gpt-4.1, 20 tool calls, imm
  - 60 train theorems, 150 test (50 per length group)
  - dspy and koog use slightly different train subsets
- hand-written sota agent 53%
baseline: single-loop observe, reason, tool call
- koog simple 6%, koog react 20%, dspy react 19%
bootstrapfewshot: put <= 4 successful traces in prompt
- koog simple 6 -> 13%, koog react 20 -> 33%, dspy react 19 -> 40%
- limit is context length; may overfit train distribution
prompt optimizers in dspy
- miprov2 (light) 43%, 12 h
- simba 43%, 14 h
- gepa 17%, 32 h, below unoptimized baseline
  - complex optimizers not clearly better than bootstrapping
memory methods
- reasoningbank: top-5 retrieval beats injecting whole bank
  - koog react 25% vs 21% without retrieval
  - koog simple 17%
- ace 10% (simple), 17% (react); large context adds noise
adas: llm generates agent control-flow code
- 17%, best of 10 runs
- no monotonic improvement; brittle hard-coded logic, train bias
verus takeaways
- only verifier result marks success; model explanations untrusted
- store successful repair trajectories with toolchain versions
- measure held-out verified pass rate, cost, solver time, not prompt score
