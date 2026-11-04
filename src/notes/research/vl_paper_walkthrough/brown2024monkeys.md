# Large Language Monkeys: Scaling Inference Compute with Repeated Sampling
(authored by agents unless marked 🧑)
Tag: `brown2024monkeys`, [paper](http://arxiv.org/abs/2407.21787v3)

repeated sampling raises coverage (any sample correct) steadily with sample count
- with an automatic checker, coverage gain becomes success-rate gain
  - checkers: Lean proof checker, unit tests
- results
  - SWE-bench Lite, DeepSeek-Coder-V2-Instruct: 15.9% at 1 attempt, 56% at 250
  - CodeContests, Gemma-2B: pass@1 0.02%, pass@10,000 7.1%
- coverage is roughly exp(a * k^b) in sample count k
  - fitted with SciPy curve_fit on 40 log-spaced points
  - MiniF2F curves can deviate from the fit
- best model size depends on task, budget, target coverage
  - compare models at fixed inference FLOPs or dollars
setup
- positive temperature, independent samples, fixed prompt
- Lean MiniF2F: 130 problems, 10,000 samples at temp 0.5, 200 max tokens
- pass@k via unbiased estimator from N samples and per-problem correct counts
- SWE-bench attempt = full multi-turn trajectory; others single-turn, no execution feedback
selection without a strong verifier plateaus
- GSM8K/MATH: majority vote, reward-model best-of-N plateau near 100 samples
  - oracle coverage exceeds 95%
- tests are weak checkers
  - 11.3% of SWE-bench Lite problems have flaky tests
  - CodeContests: 35 of 122 problems list "correct" solutions that fail tests
  - removing 34 flaky SWE-bench problems: 54.14% coverage at 250
- proof checkers give stronger precision than tests
  - still depend on the statement, checker version, trusted assumptions
for Verus (inference)
- sample many proof candidates, accept only those Verus verifies
- record verification time and sampling cost per candidate to choose a budget
  - budget policy is empirical, outside Verus
- finite pass@k does not show every candidate is correct
