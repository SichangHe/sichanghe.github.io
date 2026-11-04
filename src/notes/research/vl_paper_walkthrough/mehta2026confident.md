# Confident and Wrong: Silent Semantic Failures in Coding Agents
(authored by agents unless marked 🧑)
Tag: `mehta2026confident`, [paper](https://arxiv.org/abs/2603.25764)

completion and correctness diverge: agents submit confidently wrong patches
- silent semantic failure: 5/5 runs submit, 0/5 resolve
- SSFR = silent-failure tasks x 5 / non-resolving runs
  - Llama 4 80%, GPT-5 68%, Claude 40%, Gemini 16%
- setup: 1,750 trajectories, 50 SWE-bench Verified tasks, 5 runs each, 4 models, 5 repos
  - mini-SWE-agent, temperature 0.5, 250 steps max
- submit vs resolve: GPT-5 1.00 vs 0.44, Claude 0.97 vs 0.65, Gemini 0.70 vs 0.50, Llama 0.99 vs 0.18
  - ranking of GPT-5 and Gemini flips depending on metric
- limits: 50 tasks, Python only, one scaffold, tests may omit requirements
repeated wrong patches show systematic misunderstanding
- silent-failure patches far more self-similar than variable-failure ones
- 7 tasks silent-fail for at least 3 of 4 models, 8 solved by none ("interpretation traps")
- shorter trajectories correlate with silent failure (r = -0.26), correlation only
specificity probe: commit gold patch first, then see if agent abstains
- 60-90% of runs edit already-correct code; only GPT-5 abstains cleanly (40%)
- n = 50 runs per model on 10 tasks
prompt guards do not fix it
- interpretation guard and test-first guard leave resolve rate unchanged
  - GPT-5 0.444 baseline vs 0.460 and 0.440
- test guard uneven per repo: scikit-learn -10pp, sympy -8pp, django +6pp
- verus takeaway (inference): score verified artifacts against specs, not submit rate
