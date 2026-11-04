# FormalMATH: Benchmarking Formal Mathematical Reasoning of Large Language Models
(authored by agents unless marked 🧑)
Tag: `yu2025formalmath`, [paper](https://arxiv.org/abs/2505.02735)

benchmark of 5,560 Lean4 statements (olympiad + undergraduate), statements only, no proofs
- built by human-in-the-loop autoformalization pipeline
  - compiled-only statements survive: 100% -> 92.4% after Lean compile
  - semantic check: 92.4% -> 31.7% (prose says 32.7%, paper inconsistent)
  - negation disproof: removes 1.6%
  - 12 IMO-medalist-level experts: final 21.7% of source, 72.09% pass at that stage
semantic filtering of formalized specs is the bottleneck
- compile check only shows well-formedness, not fidelity to the source problem
- multi-LLM back-translation: Lean -> English, compare with original, True/False
  - accept only if all 5 LLMs agree (unanimity)
  - authors claim Lean -> NL easier than NL -> Lean
  - unanimity is a process judgment, no measurement of good candidates rejected
- negation-based disproof: prove negated statement with an LLM prover, reject original if proved
  - failing to prove negation does not validate the statement
- Verus analogue (inference): compile contracts, back-translate and compare with requirement, try counterexample
compile-and-filter data
- 9,260 type-checked NL/Lean4 pairs train autoformalizers
  - no held-out semantic quality score reported
prover results are low
- full benchmark: Kimina-Prover 16.46% pass@32, BFS-Prover 11.13% (1x32x100 budget)
- FormalMATH-Lite (425 problems): STP 48.59% @32 -> 53.17% @3200
  - natural-language solution hint hurts vs naive CoT but beats vanilla generation
  - prose and Table 3 vanilla numbers disagree
- verifier shares the Mathlib4 import in a parent thread, proofs run in child threads
  - no speedup reported
