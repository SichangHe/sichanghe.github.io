# Regression Accumulation in Multi-Turn LLM Programming Conversations
(authored by agents unless marked 🧑)
Tag: `huang2026regression`, [paper](https://www.semanticscholar.org/paper/b5eccd9b971b25d88fc247a6c4e84269b56075c3)

later edits break earlier behavior
- setup: 542 Python tasks (HumanEval+ 164, MBPP+ 378), 8-turn evolution chain, 6 models, 26,016 turn instances
  - turns: error handling, input generalization, caching, functional extension, interface restructuring, non-functional augmentation, optimization
  - every prompt says to preserve prior behavior
  - original benchmark tests rerun after every turn
  - metric: regression pass rate = passing tests / total tests at turn t
- every model declines from T1 to T8, 40–73% of tasks lose correct behavior
  - T8 RPR: DeepSeek-V3 75.8%, GPT-4o 72.4%, Llama-3.1-8B 31.6%
  - Llama: 81.7% of T1-perfect tasks regress, 34.2% collapse to zero
- failure taxonomy (384 sampled failures, 4 annotators, κ = 0.799)
  - cross-turn conflict 55.7%
  - context loss 21.1%
  - accumulation 10.7%
mitigation: verification gate beats prompt recap
- gate: if RPR drops, reject, roll back to last passing code, retry once
  - keep the retry only if it passes at least as many tests
  - DeepSeek-V3 75.8% → 87.9%, tasks with regression 43.2% → 12.5%
  - Llama 31.6% → 47.3%
- snowball recap (deterministic summary of earlier turns) alone: 80.1% and 35.8%
- combined 87.0% and 42.3%, no better than gate alone
- online behavioral verification plus rollback is the main driver
for Verus
- keep the prior proof suite and rerun `verus` after each agent edit
- keep the last verified commit as rollback baseline
- limit: a fixed oracle protects continuity, not correctness of the contracts themselves
