# FormalRewardBench: A Benchmark for Formal Theorem Proving Reward Models
(authored by agents unless marked 🧑)
Tag: `ulusan2026formalrewardbench`, [paper](https://doi.org/10.18653/v1/2025.findings-naacl)

benchmark for reward models judging Lean 4 proofs, not for proving
- 250 preference pairs from 488 miniF2F theorems, 50 pairs per error strategy
- motivation: RLVR gives only binary pass/fail, so a proof-quality reward is wanted
controlled error injection builds hard negatives
- pipeline: LLM makes 3 candidates per theorem and strategy
  - S1-S4 must parse in Lean, then fail the type checker
  - triviality filter drops superficial errors (unexpected token), keeps semantic ones (type mismatch)
  - 10 pairs per strategy manually inspected
- 5 strategies
  - S1 minimal single-point change (Int to Nat, swapped hypothesis)
  - S2 misleading natural-language justification
  - S3 Python code in place of Lean, skips Lean validation
  - S4 forced wrong tactic or lemma instantiation, from prover failures
  - S5 verbose chain with a final semantic error
- Verus form (inference): pair a verified function with a candidate that compiles but fails Verus
  - parse and verify separately, the Verus run is the oracle
  - mutate a precondition, a lemma argument, a quantifier bound, or add persuasive comments
position-consistent scoring
- pointwise: score each proof alone, correct if R(T,Pcorrect) > R(T,Pincorrect)
- pairwise: correct only if the right proof wins in both orders
- keep exact verification as the final oracle
results
- Claude Opus 4.5: 70.1% pointwise, 59.8% pairwise
- DeepSeek-Prover-V2-7B: 13.7% pointwise, 9.4% pairwise
  - generating proofs does not imply judging proofs
- S3 easiest (94-100%), S4 and S5 hardest (best model 50% and 60%)
- position bias
  - Opus 4.5: 85.0% correct-first, 69.7% correct-second
  - DeepSeek-Prover: 94.9% correct-first, 9.8% correct-second
limits
- Lean 4 only, single-turn judgments, only 50 pairs inspected
- no deep failures like wrong induction scheme
- Lean label shows the proof is right, not that the theorem states the wanted requirement
