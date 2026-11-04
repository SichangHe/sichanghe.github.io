# AdverMCTS: Combating Pseudo-Correctness in Code Generation via Adversarial Monte Carlo Tree Search
(authored by agents unless marked 🧑)
Tag: `li2026advermcts`, [paper](https://arxiv.org/abs/2604.10449)

problem: pseudo-correct code passes public tests but fails hidden ones
- sparse public tests are the bottleneck
  - MCTS-Thought on Qwen3-4B-Instruct: APPS pass@1 43.44% to 55.33% when full hidden tests verify (Fig 8)
core idea: adversarial game between a Solver and an Attacker
- Solver MCTS searches partial chains of thought, then completes each into a code candidate
  - strict admission: a candidate enters the code pool only if it passes public tests and all global adversarial tests
  - a candidate later failing a new test gets a penalty -V (V = 0.1) on its solver nodes
  - final rerank by public pass rate, then global pass rate; hard filter beats soft penalty (APPS Intro 61.0 vs 57.0)
- Attacker MCTS searches testing strategies, e.g. boundary N = 0, large primes
  - persistent tree rooted at problem + current pool, runs only when pool has at least 2 codes
  - generates k tests per strategy, keeps the one with highest output divergence among candidates
  - LLM arbiter gives expected output + validity flag; invalid or ambiguous tests are dropped
  - valid tests join the global filter
evidence: APPS and TACO, 100 problems per split, 5 public tests, Qwen3-4B-Instruct
- pass@1 averages: APPS 49.67 vs RethinkMCTS 43.67, TACO 38.00 vs 33.67
- removing the attacker tree gives the largest ablation drop
- attacker analysis over 291 pseudo-correct codes: 165 killed (recall 56.7%), 44/274 true-correct mis-killed (16.1%)
- arbiter test validity on TACO 79.88% vs 37.88% for majority voting
- attacker rollouts 1 to 2 help, more can hurt
- paper inconsistency: TACO average 38.00 in Tables 1-2 but 37.33 in Table 3, unexplained
limits
- divergence cannot detect all candidates agreeing on the same wrong output
- arbiter can mislabel; test suites stay finite, so no semantic correctness proof
Verus takeaways (inference)
- attacker analog: generate counterexamples to candidate specs, invariants and abstraction boundaries before trusting a proof
- admission requires Verus verification plus regression tests; an MCTS value never replaces a proof result
- arbiter-expected output is trusted input unless proved against a reference `spec fn`
