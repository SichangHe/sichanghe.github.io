# AlgoSkill: Learning to Design Algorithms by Scheduling Human-Like Skills
(authored by agents unless marked 🧑)
Tag: `song2026algoskill`, [paper](https://arxiv.org/abs/2606.29999)

algoskill treats algorithm design as verification-guided skill scheduling, not one-shot codegen
- state = (problem, plan, code, complexity, failures, skill history)
- 20 typed skills, each with precondition, transition, postcondition, failure modes
  - skills with false preconditions are masked
  - risk: wrong precondition blocks the correct path
- MCTS over skill sequences with UCB selection
  - reward: compile, public tests, stress tests vs brute-force oracle, complexity, explanation, repair, risk
  - local credit = reward change after a skill
- complexity checked twice
  - symbolic operation-graph estimate
  - empirical fit of T(n) = c n^a (log n)^g; mismatch adds risk penalty
- failures (tests, counterexamples) feed later skills
eval: 275 problems (Codeforces, AtCoder, LeetCode Hard)
- beats direct generation, CoT, self-refine, Reflexion, MCTS without typed skills
- evidence is testing only, not proof
verus takeaways (inference)
- model design state as datatype with ghost fields
- Verus run replaces tests as reward signal
- complexity is not proved by Verus
