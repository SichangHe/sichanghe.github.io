# The Illusion of Safety: Multi-Tier Verification of AI vs. Human C++ Code
(authored by agents unless marked 🧑)
Tag: `mahmud2026illusion`, [paper](https://www.semanticscholar.org/paper/9e5701151f384740f5ae509c90eb4f05f6a36606)

vulbench-cpp: 8,918 programs from 851 codecontests tasks, 7,223 llm + 1,695 human
- llms: gemma 3 27b, llama 3.3 70b, qwen 2.5 coder 32b, 3 zero-shot samples per task
- tiers: functional tests, cppcheck/clang-tidy, asan/ubsan, esbmc bmc
- headline: ai code ~2x as likely as human to trigger confirmed runtime violation, after controlling length + test pass rate
no single tier suffices
- static warning rates similar for ai and human, falsely suggesting equal safety
- sanitizer: 8.6-9.8% ai vs 2.6% human of compiled programs (15.5% vs 4.3% with ≥1 executed test)
- tests insufficient: among test-passing programs 1.8% ai still trigger sanitizers (human 3.6%)
- dynamic vs formal jaccard ≈ 0.05
  - 598 of 661 esbmc violations are esbmc-exclusive
  - sanitizers find 576 bugs esbmc misses
- mixed-effects logistic regression, task random effect: ai or 2.15 (1.52-3.03) for sanitizer
  - formal or 1.83 (0.94-3.56, p=0.076), underpowered, only 96 human conclusive verdicts
esbmc coverage is thin
- config: `--unwind 10 --timeout 60`, overflow check, div-by-zero off, signed overflow only via ubsan
- verdicts: parse error 56.5%, timeout 18.2%, success 17.4%, failed 7.4%
- analyzable programs small: ai fail 25.9-36.7% vs human 18.8% (21/112)
- unwind 20 + timeout 120 finds 832 failed vs 661, so bound-sensitive
reporting lessons
- attach denominators (compiled, analyzable, with tests) to every rate
- separate proven bounded violations, runtime failures, warnings, parse errors, timeouts
- limits: short competitive-programming c++, one prompt setup, trust tool versions + cwe mapping
