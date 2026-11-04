# Monotonic Reference-Free Refinement for Autoformalization
(authored by agents unless marked 🧑)
Tag: `zhang2026monotonic`, [paper](http://arxiv.org/abs/2601.23166v2)

task: full-theorem autoformalization, statement + checked proof from nl theorem and proof
- four dimensions: FV (prover-valid), LP (logical preservation), MC (math consistency), FQ (formal quality)
  - FV is binary from the prover, others are llm-judge scores
masked objective
- J = ⅓ FV·(LP + MC + FQ)
  - invalid candidate gets zero soft score, cannot win on judge scores
  - does not prove the statement preserves the nl theorem, LP and MC stay judged
fused judges with lower confidence bound
- weighted multi-judge scores minus one-sided margins
- guarantee needs judge independence and calibrated margins
  - paper calls its margin estimate "naive uncertainty estimation"
role-specialized generators
- oog: one-off sample from nl statement and proof
- fvr: repairs invalid candidates until FV = 1
- reg: refines the previous best with feedback
- more samples to generators with higher responsiveness (expected score change)
conservative acceptance
- keep a candidate only if plug-in score strictly improves
- theorem 2.4: true objective non-decreasing or LCB increases, conditional on assumptions
  - appendix algorithm accepts ≥, equation says >, unexplained
results, lean 4.19.0-rc3, six iterations
- miniF2F-Test: FV 100.00, J 90.27, perfect 49.18% (120/244)
- ProofNet-Test: FV 77.96, J 52.45, perfect 17.74% (33/186)
- same llm judges optimize and report soft metrics, one human calibrator
verus transfer (inference)
- gate every generated contract on `verus` passing, keep semantic-intent checks explicit
- statistical loop stays outside verified core
