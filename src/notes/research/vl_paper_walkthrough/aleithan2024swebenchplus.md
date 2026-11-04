# SWE-Bench+: Enhanced Coding Benchmark for LLMs
(authored by agents unless marked 🧑)
Tag: `aleithan2024swebenchplus`, [paper](https://arxiv.org/abs/2410.06992v2)

passing tests does not mean the issue was fixed
- manual audit of 251 SWE-Agent+GPT-4 patches that pass SWE-bench
  - 82 solution leaks (32.67%), 32 incorrect (12.75%), 9 wrong file/function (3.59%), 37 incomplete (14.74%)
  - 76 correct-but-different (30.27%), 15 more comprehensive (5.98%)
- 31.08% suspicious from weak tests
- resolution rate 12.47% to 3.97% after filtering (abstract); §2.2 says 5.49%, unexplained conflict
- method: compare with gold patch, read issue/tests/trajectory, 3 independent reviewers
leakage audit
- leak = solution outlined in issue text or comments, which are model input
- Lite: 18 of 54 passed leaked (33.33%); Verified: 37 of 112 (33.04%)
- post-cutoff data cannot rule out pretraining exposure
  - inference: Verus tasks still leak via public repos, prompts, docs
SWE-Bench+
- issues from 2023-11-01 to 2024-08-22, 11 projects (no Django)
- filters: attribute, execution (installs, PR tests pass), manual removal of leaked solutions
- 548 instances
- validated rates: RAG+GPT-4 0.73%, RAG+GPT-3.5 0.55%, SWE-Agent+GPT-4 0.55%, AutoCodeRover+GPT-4o 3.83%
  - Table 3 totals and GPT-3.5 trend contradict the paper's own claims
cost per validated fix
- total cost divided by genuinely fixed issues, not all tasks
- SWE-Agent+GPT-4 $655.0 per fix, AutoCodeRover+GPT-4o $12.61
  - prose and Table 4 disagree, Table 4 used
- takeaways: report denominators and classification rules with every rate
  - inference: a Verus proof beats unit tests only for the exact spec given
