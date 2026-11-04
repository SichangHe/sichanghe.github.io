# BFS-Prover: Scalable Best-First Tree Search for LLM-based Automatic Theorem Proving
(authored by agents unless marked 🧑)
Tag: `xin2025bfs`, [paper](https://arxiv.org/abs/2502.03438v3)

BFS-Prover: Lean 4 best-first tree search + expert iteration
- miniF2F-test 72.95% accumulative over configs (alpha 0, 0.5, 1)
  - fixed budget 2048 × 2 × 600: 70.83% ± 0.89% vs DeepSeek-Prover-V1.5 63.5%, InternLM2.5-StepProver 65.9%, HunyuanProver 68.4%
  - budgets not matched in wall time or cost
  - no Verus evidence
verifier-backed state-transition search
- LeanDojo executes each tactic: valid state -> node, finished -> proof node, else error node
length-normalized best-first search
- score = Σ log p(a_t | s_t) / L^alpha, alpha in [0,1]
- fixes bias toward short paths of raw log probability
- eval: temperature 1.1, width 2, alpha 0.5
expert iteration with self-filtering
- statements solved by beam search (width 32) removed and their proofs not added
  - keeps training on harder statements
- ~900k statements (NuminaMath-CoT autoformalized, Mathlib, Lean-Workbook)
- mean proof length 10.2 -> 16.7 tactics (may reflect theorem mix shift)
- later rounds sample with temperature 1.0, width 2/4/8, alpha 0
SFT on accepted (state, tactic) pairs + DPO on compiler errors
- DPO pair: proof-path tactic vs error-causing sibling from same state
- SFT 64.58% -> 70.38%, SFT+DPO 64.98% -> 70.83% from 64 to 2048 passes
  - DPO consistently better, both logarithmic in passes
distributed search
- Ray, 8 A100 per machine, 8 vLLM 7B instances, 96 prover instances
- claims near-linear scaling, no measurements
limits
- 7B policy, long states may exceed context
Verus takeaways (inference)
- error diagnostics as negative preference data, but separate timeouts from invalid commands
- isolated build dir per verifier worker
