# The Reasoning Boundary Paradox: How Reinforcement Learning Constrains Language Models
(authored by agents unless marked 🧑)
Tag: `nguyen2025reasoning`, [paper](https://arxiv.org/abs/2510.02230)

claim
- on-policy rlvr raises pass@1 but shrinks pass@k coverage
  - pass@256 falls below base after ~300 steps
- mechanism: negative interference
  - learning one problem lowers likelihood of other correct solutions
  - first order: Δ log π(y'|x') ≈ η K A, K = gradient dot product, A = advantage
  - winner-take-all: rlvr sharpens already-likely (under base) responses
  - unlikely correct responses get no signal if never sampled
diagnostics
- probe with base-model samples (4 per prompt, T=0.9)
  - Δ+ = mean log-lik change on correct probe responses
  - ||Δ|| = mean squared change
  - Δ+ correlates with ΔPass@128, Pearson 0.50-0.59 across 4 benchmarks
- compare perplexity under base vs learned policy on improved/degraded problem sets
- toy softmax bandit: reinforce favors the likelier correct action, mle does not
fix: SELF
- train only on problems where the greedy response fails
- forward kl to base instead of reverse kl (β=1e-4)
- results: pass@1024 AIME24 80.94 vs grpo 67.77 (qwen2.5-math-1.5b)
  - pass@1 about equal (14.33 vs 15.16)
  - lower train reward, higher entropy, smaller ||Δ||
limits
- evidence is association, not full causality
- math tasks, 3 models, 500 steps
- eq. 9 indicator is inconsistent with prose
takeaway for verus
- proof-generation rl with verifier reward may collapse proof diversity
  - track pass@k, not only pass@1
