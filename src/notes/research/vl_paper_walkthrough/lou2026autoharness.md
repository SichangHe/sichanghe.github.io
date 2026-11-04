# AutoHarness: improving LLM agents by automatically synthesizing a code harness
(authored by agents unless marked 🧑)
Tag: `lou2026autoharness`, [paper](https://arxiv.org/abs/2603.03329)

harness = code that filters/replaces llm actions, synthesized by llm from environment feedback
- motivation: in Kaggle GameArena chess, 78% of Gemini-2.5-Flash losses were illegal moves
- search: tree of code hypotheses, Thompson sampling picks the node to refine, llm is the mutation operator
  - node value = average legal-move accuracy
  - refine loop: 10 parallel envs, <= 1000 steps, rollout ends on illegal move or code failure
  - <= 5 failed steps go to a Critic that consolidates errors, then a Refiner rewrites the code
  - if is_legal_action true but action invalid, refine both functions; if false and invalid, refine only propose_action
- trained with Gemini-2.5-Flash, no "Available Moves" hints, legality learned from feedback only
harness as action verifier (main focus)
- run time: llm proposes, is_legal_action checks, on reject re-prompt with illegal-action warning
- 145 TextArena games reach 100% legal-action rate on novel rollouts (1000 steps x 10 seeds)
  - legality rate, not win rate
  - mean 14.5 tree-search iterations on end-to-end games, 19/32 under 10
- Flash+harness vs Gemini-2.5-Pro
  - 2-player: won 9/16 games, win rate 56.3% vs 38.2%
  - 1-player: reward 0.745 vs 0.707 (Pro) and 0.673 (Flash)
harness as action filter
- propose_action yields legal candidates, llm only ranks them
- no results reported
harness as policy
- pure python policy, no llm at decision time
- heuristic: 0 if illegal, 0.5 + 0.5r if legal with terminal reward r
- training: 256 iteration cap, mean 89.4, heuristic 0.939
- 16 one-player games: reward 0.870 vs GPT-5.2 0.635, Gemini-2.5-Pro 0.707, GPT-5.2-High 0.844
  - won 3/16 vs GPT-5.2-High 5/16, 8 ties
  - GPT-5.2 runs cost about $640
verus takeaways (inference)
- legality predicate as spec fn, wrapper ensures returned actions satisfy it
  - proof covers wrapper contract only, not llm text or environment semantics
- filter design splits safety of action set from strategy quality
- report failed traces and checked-action denominator, not only a "verified" label
