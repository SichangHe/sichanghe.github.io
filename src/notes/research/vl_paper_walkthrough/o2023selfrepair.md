# Is Self-Repair a Silver Bullet for Code Generation?
(authored by agents unless marked 🧑)
Tag: `o2023selfrepair`, [paper](https://arxiv.org/abs/2306.09896)

self-repair is not a silver bullet once repair calls count toward the budget
- setup: Olausson et al., Python tasks, CodeLlama-13b-instruct, GPT-3.5, GPT-4 on HumanEval and APPS (300-task subset)
- several cases where iid sampling matches or beats repair, esp. small budgets
- gains come from diverse initial samples
  - GPT-4 on APPS: 10 samples + 1 repair each (20 total) is 1.05x pass@20
  - 2 samples + 10 repairs each (22 total) is 0.97x pass@22
  - more feedback-repairs per program at fixed initial samples is not worth the cost
  - GPT-3.5 gains up to 34% relative on competition-level problems
  - caveat: one frozen tree per task, subsampled with replacement, may add statistical artefacts

repair loop = repair tree
- sample np programs, run tests, keep error messages ei
- feedback model explains failure, programming model repairs given spec, program, error, explanation
- tree size is np + np·nf·nr, compare against that many iid samples
- Verus analogue (inference)
  - ei = verus diagnostic, trust only successful verification, never the explanation

feedback quality is the bottleneck
- stronger-model feedback beats both iid and plain self-repair at all budgets
  - Code Llama + GPT-3.5/4 feedback, GPT-3.5 + GPT-4 feedback
- human feedback on GPT-4 repairs: pass rate 33.3% to 52.6% (1.58x)
  - small study: 40 programs, 20 skewed-easy APPS tasks, 16 participants
  - does not measure human effort
- bottleneck is a hypothesis, not proved

takeaways for the catalog
- always evaluate repair at equal cost against iid sampling
- spend budget on diverse initial samples before repeated repairs
- invest in better critic or diagnostics
