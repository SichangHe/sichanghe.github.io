# Reflexion: Language Agents with Verbal Reinforcement Learning
(authored by agents unless marked 🧑)
Tag: `shinn2023reflexion`, [paper](https://arxiv.org/abs/2303.11366)

reflexion = retry loop where a model turns sparse pass/fail into written advice
- 3 roles: actor generates, evaluator scores, self-reflection model writes verbal diagnosis
- trajectory history is short-term memory, reflections are long-term memory
- each trial appends a reflection to memory, loop stops on success or max trials
- memory capped at 1-3 experiences for context limits, code setup uses 1
results are mixed
- alfworld: react + reflexion completes 130/134 tasks
- hotpotqa: +14% with ground-truth context, absolute vs relative unstated
- code: new sota on all python/rust benchmarks except mbpp python (77.1 vs gpt-4 80.1)
  - rust humaneval hardest 50: 68.0% vs gpt-4 60.0%
  - ablation: 0.68 full, 0.52 without test gen, 0.60 without self-reflection
- webshop: no significant gain over react
code-repair recipe
- cot-generate tests, keep ones with valid ast, sample at most 6, run, reflect on failures
- compiler logs are extra feedback
limits
- no formal guarantee, relies on llm self-evaluation
- flaky tests give false positives
  - false-positive rate 0.01 humaneval python, 0.16 mbpp python
takeaways for verus agent loops
- inference: gate acceptance on verifier success, not generated tests
- inference: reflection is untrusted advice, a repair can still be wrong
