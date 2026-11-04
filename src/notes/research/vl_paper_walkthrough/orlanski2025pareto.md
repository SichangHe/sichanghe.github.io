# Pareto Optimal Code Generation
(authored by agents unless marked 🧑)
Tag: `orlanski2025pareto`, [paper](https://arxiv.org/abs/2506.10056)

verification of generated code is an accuracy vs throughput frontier
- strong verifier (full tests): accurate, slow
- weak verifier (syntax, lint, first N tests): fast, lossy
- metrics: Best-of-k accuracy, programs per second (PPS)
- evidence is single-file python only, not Rust or Verus
staged verification: cheap filter, then outcome reward model (ORM), then pick top
- failing a test proves a candidate wrong, passing a subset proves nothing
- CodeContests, Qwen 2.5 Coder 7B, 1.5B ORM + 10 tests (VS10+θ): 18.06% Best-of-64, 65.80 PPS
  - full tests: 20.69%, 2.95 PPS
- first 10 tests remove 90 to 97% of candidates
- syntax and lint filters remove only 1.3% and 2.6%, and cost throughput
- headline ratios (8.60x, 11.64x, 12.41x) are aggregates, not single-cell ratios
ORM = scalar ranker trained on correct/incorrect pairs
- Bradley-Terry loss, 128 samples per problem, Qwen family only (possible bias)
- 500M ORM is 1.44x faster than 1.5B at 4.99% accuracy loss
- over-ranks surface-similar bugs, e.g. `while len(x)`, big-int arithmetic, `.remove()` in loops
random test subsets as triage
- 1 random test: FPR 86.3% (1.5B gen), 79.6% (3B)
- 10 random tests: FPR 60.1%, 51.2%
- low variance across subsets
verus transfer (inference)
- cheap checks and ORM only order candidates, verus proof is the final stage
- never assert `ensures` from an ORM score
- rank proved above merely compiling
- author warning: staged verification is a selection tool, not a test replacement
