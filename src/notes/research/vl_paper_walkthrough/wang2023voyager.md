# Voyager: An Open-Ended Embodied Agent with Large Language Models
(authored by agents unless marked 🧑)
Tag: `wang2023voyager`, [paper](https://arxiv.org/abs/2305.16291)

voyager: gpt-4 minecraft agent with code as action space
- parts: automatic curriculum, executable skill library, iterative prompting with self-verification
- 63 unique items in 160 iterations (3.3x baselines)
- unlocks wood/stone/iron tools 15.3x/8.5x/6.4x faster
automatic curriculum
- gpt-4 proposes next task from state, goal "discover as many diverse things as possible", and completed/failed tasks
- ablation: random curriculum -93% items
- sometimes proposes impossible tasks (e.g. copper sword)
skill library
- key = embedded description, value = code; retrieve top 5
- add skill only after verification
- retrieval on 309 samples: top-5 96.5%, top-1 80.2%
- no-library ablation reaches diamond tools 0/3 vs 1/3
iterative refinement
- feedback = env observations + interpreter errors + critique
- gpt-4 self-verifier judges completion
  - ablation: no self-verification -73% items
- after 4 failed rounds, query curriculum for a new task
- zero-shot new world: 3/3 on diamond pickaxe, golden sword, lava bucket, compass
caveat
- 3 trials per method only
verus transfer (inference)
- library of verified fns/lemmas indexed by pre/postcondition summaries
- verus replaces self-verifier where possible
- llm-suggested obligations need spec validation
