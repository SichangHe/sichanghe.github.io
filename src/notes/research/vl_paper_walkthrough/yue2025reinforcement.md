# Does Reinforcement Learning Really Incentivize Reasoning Capacity in LLMs Beyond the Base Model?
(authored by agents unless marked 🧑)
Tag: `yue2025reinforcement`, [paper](https://arxiv.org/abs/2504.13837)

rlvr rarely creates new reasoning patterns beyond the base model
- claim scoped to tested model families, tasks, verifiers
  - the paper itself says conclusions need care given practical constraints
- rlvr wins at pass@1, base wins at large k
  - aime24 simplerlzoo vs base at k=1024: both solve 63.3%, base-only 13.3%, rl-only 0.0%
  - math500 at k=128: both 92.4%, base-only 3.6%, rl-only 1.0%
- rl responses have low perplexity under the base model
  - they match the lower portion of the base-output ppl distribution
  - evidence is sampled distributions, not a containment proof
- distillation from a stronger teacher does expand coverage
  - r1-distill-qwen-7b pass@k is above its base on minerva
- 6 algorithms (ppo, grpo, reinforce++, rloo, remax, dapo) all leave a sampling-efficiency gap above 40 points
  - gap = rl pass@1 minus base pass@256
  - longer training: pass@1 26.1 to 42.5 while pass@256 66.3 to 64.3
  - more rollouts or kl 0.001 do not close it
deterministic verifiable reward
- r = V(x,y) in {0,1}, V a compiler plus tests or an answer checker
  - verus form: verifier is a rust program proven correct, only its verdict gives reward
- pass@k as a boundary test
  - problem counts as solved if any of k samples passes V
  - unbiased estimator, n samples per problem, n >= k (128, 256 or 1024)
  - caveat: huge k finds correct paths even by chance
