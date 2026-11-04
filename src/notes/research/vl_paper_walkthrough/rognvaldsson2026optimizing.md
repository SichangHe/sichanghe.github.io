# Optimizing the Cost-Quality Tradeoff of Agentic Theorem Provers in Lean
(authored by agents unless marked 🧑)
Tag: `rognvaldsson2026optimizing`, [paper](http://arxiv.org/abs/2606.04883v3)

control plane decides per target: attempt again or restart from a new breakdown
- data plane: decompose, formalize lemmas, prove
- lemma stack: prove only lemmas invoked by accepted proofs
  - breakdown first proved with lemmas as axioms
- Verus analogue (inference): top-level contract + `proof fn` per subclaim
  - an assumed lemma must later be discharged
- 85-problem PutnamBench, Goedel-Prover-V2-8B: 48/85 vs 23/85 whole-proof pass@256
  - AUC 88.2% above whole-proof 8B, 23.2% below 32B
marginal-value router
- actions {ATTEMPT, TERMINATE}, 2 forced attempts first
- attempt iff q-hat - lambda * c-hat > 0
  - q-hat: logistic regression, trained on 42 problems, predicts next-attempt success
  - c-hat: mean output-token cost of prior attempts
- features
  - proof similarity: canonicalized proof bodies, fuzzy-string ratio
  - error diversity: unique errors / total errors
  - attempt count
- extensible to model switching, self-correction, decomposition
router results
- AUC cost -28.9% vs fixed-step baseline, accuracy +7.9% at equal budget
- high budget: 43.6% at 20.4M SFLOPs vs 44.0% at 28.5M
- ablation: all features 28.9%, attempt count alone 13.1%
limits
- Lean only, no Verus measurement
- assumes attempts i.i.d. per target
- Verus needs a diagnostics-feature adapter, add Verus time to cost
