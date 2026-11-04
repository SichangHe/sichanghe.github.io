# Generative Language Modeling for Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `polu2020generative`, [paper](https://arxiv.org/abs/2009.03393)

result: GPT-f, a decoder-only Transformer proof-step generator for Metamath set.mm
- first deep-learning system with proofs accepted into a formal math library (23 shortened proofs)
- model proposes, kernel decides validity (modified LR(0) parser + export to external checker)
  - Verus analogue (inference): model proposes proof code, Verus rejects invalid
proof-step language modeling
- record format `GOAL <g> PROOFSTEP <s><EOT>`, ~3m steps over ~38k theorems
- 160m from scratch: 29.22% valid vs 21.16% MetaGen-IL
  - 160m → 400m → 700m: 28.96 → 30.23 → 31.58%
  - denominators ~1000 held-out theorems
verifier-filtered best-first search
- sample 32 tactics per goal, rank open goals by cumulative logprob, keep checker-valid
- best 700m model: 56.22% test (a=32, d=256)
  - much of gain over 47.21% comes from more attempts (valid 42.90 → 56.50% for a=2 → 32)
  - ~1k V100 GPU-hours to evaluate
  - failed bounded search does not disprove a theorem
synthetic proofs for sparse skills
- generated arithmetic and ring proofs, ~1% of training data (5% hurt)
- 9-digit addition 13% → 78%, ring equalities 6% → 77% on synthetic tests
- set.mm valid: 700m 40.28 → 42.56%
learned value function + iterative training
- label visited goals P/N by eventual resolution; goal value = product over siblings
- 700m: 43.15% policy-only → 47.21% policy+value
  - single runs, no variance; iteration 1 not monotone
  - ~20k V100 GPU-hours per iteration; overfitting hurts
pretraining on code and math
- 700m valid: scratch 31.58%, CommonCrawl 39.61%, GitHub 41.55%, WebMath 42.56%
- 1.5b WebMath (42.39%) no better than 700m, cause unclear
interactive use
- >200 theorems formalized with assistant; humans fix substitutions
- wrong substitutions often easy to fix
