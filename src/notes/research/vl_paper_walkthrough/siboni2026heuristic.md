# LLM-Driven Heuristic Synthesis for Industrial Process Control: Lessons from Hot Steel Rolling
(authored by agents unless marked 🧑)
Tag: `siboni2026heuristic`, [paper](https://arxiv.org/abs/2603.20537)

gemini 2.5 pro writes readable python controllers for a hot-steel rolling simulator
- search: ideate 3 strategies, select, implement, evaluate with per-component feedback
  - up to 3 repairs for compile/runtime failures
  - modes: exploration, refinement, radical exploration
- 52 runs, 730 iterations
- best heuristic 55.5 (8 scenarios), 60.9 (81 held-out) vs hand-coded 41.0 / 46.7
  - different sets, not comparable
- most gains early, half of runs peak by iteration 4
luby restarts
- 15 runs / 160 iterations, 4.1 h vs 36 h ad hoc
- best 51.6 vs 55.5 outlier, median 35.1 vs 33.5
verification of the best heuristic
- 65 checks, 61 pass, 0 errors
  - 29 ast checks: 27 pass, 2 warnings
  - 9 interval checks: 8 pass
  - 10 z3 checks: 9 pass, 5 proved for all valid inputs, 4 deferred
  - 17 property tests on 207 inputs: all pass
- z3 proves 3 safety and 2 monotonicity specs
  - monotonicity via two translations with shared inputs, unsat of negated relation = proof
  - one spec has a z3 counterexample at degenerate near-zero force
- unsupported properties are explicitly deferred to testing
  - e.g. responsiveness, epsilon-delta continuity
trusted
- python-to-z3 translator, simulator, specs, input ranges, test harness
limits
- case study only
- radical exploration can crash, rewards -79 to -88
- context compaction loses micro-modifications
- interval ranges that exclude a real value give false safety
takeaways for verus
- inference: tests are evidence, not proof, report deferrals
- inference: restarts diversify agent search, proof obligations stay the same
