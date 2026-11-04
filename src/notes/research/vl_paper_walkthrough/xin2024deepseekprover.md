# DeepSeek-Prover: Advancing Theorem Proving in LLMs through Large-Scale Synthetic Data
(authored by agents unless marked 🧑)
Tag: `xin2024deepseekprover`, [paper](http://arxiv.org/abs/2405.14333v1)

DeepSeek-Prover (V1): 8M synthetic Lean 4 proofs from autoformalized competition problems
- 869,659 nl problems -> 712,073 filtered formal statements
- DeepSeekMath-Base 7B: miniF2F-test 46.3% at 64 samples, 52.0% cumulative
  - GPT-4 23.0%, Hypertree Proof Search 41.0% at 64
autoformalization
- fine-tune on MMA (mathlib statements back-translated by GPT-4)
- prompt asks only for the core Lean declaration
- failure: translated statement can encode a different theorem
  - e.g. determinant case with inconsistent universal hypothesis
statement filtering
- score excellent..poor, drop fair and poor
- hypothesis rejection: replace conclusion by `False`, if provable the hypotheses are inconsistent
  - equal-data comparison: high score 42.6% vs fair/poor 38.1% miniF2F-test pass@128
  - does not show faithfulness to source problem
prove statement and negation concurrently
- stop when either succeeds, negation proofs kept as data augmentation
- ≥20% of statements still wrong after filtering
- no speedup measurement reported
iterative enhancement
- fine-tune on verified pairs, regenerate, repeat
- miniF2F-test pass@128: 34.0% -> 39.3 -> 41.4 -> 45.1 -> 46.3% over iterations 0-4
- data scaling: 1k -> 8M examples, 24.18% -> 40.16%
trust and caveats
- Lean checks proofs, not statement fidelity
- FIMO denominator inconsistent (148 vs 149)
Verus takeaways (inference)
- vacuity check: prove `false` under the same `requires`, reject contract if provable
- keep contract and executable skeleton separate in generation
- more data can amplify systematic contract errors
