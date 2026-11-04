# Property-Guided LLM Program Synthesis for Planning
(authored by agents unless marked 🧑)
Tag: `pereira2026property`, [paper](https://www.semanticscholar.org/paper/9ebbff25639ca1475e3065c2b54eb4f9912b6fa0)

cegis for llm-generated planning heuristics
- validator checks formal directness property, returns concrete failing state
  - direct: every alive state reachable by strictly improving moves has an improving successor
  - hill climbing then needs no backtracking
- repair prompt gets failing state, values, successors, full history
  - loop ends when all training tasks pass or after 10 iterations
bounded validator
- dfs from init, expanding only strictly improving successors
- stops at first violation
- acceptance is on training tasks under time/memory limits, so incomplete evidence
amortization
- one llm call per domain per candidate, heuristic reused on all tasks
results
- 10 ipc 2023 learning domains, 90 test tasks each, 3 runs
- 101 candidates over 30 runs, 3.4 per run
  - 7.4x fewer than sample-and-select (25 per domain)
- direct+hc solves 623.3/900 vs 573 sample-and-select gbfs, 298 ff gbfs
- sokoban and floortile are outliers
verus lesson
- pick a property whose violations give concrete counterexamples, feed them back to the agent
