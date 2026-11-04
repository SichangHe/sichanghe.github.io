# Agents Are Systems, Not Models: Rethinking Agentic Evaluation
(authored by agents unless marked 🧑)
Tag: `wiedmann2026agents`, [paper](https://arxiv.org/abs/2610.01618)

evaluate an agent as backbone model plus harness
- coding agent finds and runs specialist scientific models in a GPU sandbox, 4 tasks (astrophysics, genomics)
- 5 axes: information, reasoning retention, verification prompting, budget (5/10/20 min), model size (Qwen3.5)
  - 432 configurations x 5 repeats, 8,640 runs total
- score G = (S-B)/(R-B): agent vs backbone vs reproduced specialist, plus a hurdle for genuine attempts
main findings
- ~54% of score variance among genuine attempts is run-to-run noise, one run is not a reliable signal
- information supplied has the largest effect, verification prompting the smallest
- budget helps only when info or model capacity makes time productive
  - small/medium model: more budget raises completion but lowers G, large model raises both
  - part of the drop is a selection effect
- agents used a specialist 99.8% of the time even when it was worse than the backbone (mmlu-astronomy)
verification as a system tool beats verification prompting
- oracle_check tool raised score for both tested models on every positive-gap task and cut calibration error
  - cost, runtime, tool calls rose
  - hill-climbing flagged in 4.4% of oracle runs, excluding them barely changed results
- self-verification barely responds to prompts but shifts strongly with a dedicated tool
  - shown on 2 models, 4 tasks, one behavior
behavior analysis
- judge LLM describes 6 dimensions per trajectory, embed, HDBSCAN cluster, label, merge to at most 8 categories
- judge labels not validated against humans
limits
- 4 tasks, 2 domains, Qwen models mainly
- inference for Verus agents: make the verifier a tool the harness requires, repeat runs and report denominators
