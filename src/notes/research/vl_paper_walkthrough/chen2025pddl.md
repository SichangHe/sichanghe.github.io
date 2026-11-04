# Language Models For Generalised PDDL Planning: Synthesising Sound and Programmatic Policies
(authored by agents unless marked 🧑)
Tag: `chen2025pddl`, [paper](https://arxiv.org/abs/2508.18507)

llm writes python policies or value functions for pddl, sound by wrapper
- input: domain + 2 training problems + gripper code example, one generation per domain
- sound policy: replace any action outside applicable set A(s) with random applicable action
  - plan returned only after goal check, so always valid
  - no completeness or termination guarantee
- safe value function: map infinity to large constant, run greedy best-first search
  - sound, complete on finite state spaces
- combined search: policy-predicted queue + exhaustive heuristic queue
  - complete on finite spaces, pseudocode pushes pi(s) but intends successor state
- selection: 10 samples per domain, best by timed score on 10 small training problems
  - portfolio picks policy or combined search by validation score
- results: 900 test problems, 10 domains, 1800 s
  - policy 563, value 397, combined 424, portfolio 630, lama 557
- symbol ablation: meaningless names
  - value coverage 397 -> 406, policy 563 -> 424
  - authors say inconclusive
- verus analogue
  - `ensures` membership in applicable set checks wrapper, not usefulness of llm choice
