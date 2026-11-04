# Math-Shepherd: Verify and Reinforce LLMs Step-by-step without Human Annotations
(authored by agents unless marked 🧑)
Tag: `wang2023verify`, [paper](https://arxiv.org/abs/2312.08935)

math-shepherd: process reward model (prm) trained without human step labels
- label step by completing it n times (n=8) and checking final answers against golden answer
  - hard estimate: 1 if any completion correct
  - soft estimate: fraction correct
  - experiments use hard estimate
- needs checkable golden answers
- labels noisy: bad step may reach right answer; more n costs compute
  - hard-estimate accuracy peaks at n=4 (86% with 70b completer), then declines
  - 160-step manual check
use 1: best-of-n reranking
- solution score = min step score
- 256 samples: llama2-70b metamath gsm8k 93.2 / math500 44.5 vs orm 91.8 / 40.4
- gap over orm and majority voting grows with n
- prm beats human-labeled prm800k on math
- small reward model verifying large generator hurts vs self-consistency
use 2: step-level ppo reward
- mistral-7b metamath: gsm8k 77.9 -> 84.1 (orm-ppo 81.8); math 28.6 -> 33.0 (orm-ppo 31.3)
- ppo + verification: 89.1 gsm8k, 43.5 math500
- after ppo, reward model alone is worse than self-consistency
out-of-distribution
- hungarian exam (33 questions): greedy 46, orm 54, prm 63
- one case study localizes errors in steps 2, 6, 9
verus transfer (inference)
- score partial proof steps by whether later attempts close the goal
- use score to schedule search only
- accept code only after verus checks it
