# GAR: Generative Adversarial Reinforcement Learning for Formal Theorem Proving
(authored by agents unless marked 🧑)
Tag: `wang2025gar`, [paper](https://arxiv.org/abs/2510.11769)

gar: co-train a Lean 4 prover and a statement fuser, implicit curriculum tracks prover ability
- statement fusion
  - fuser combines two NL statements into one harder solvable statement
  - autoformalize to Lean, drop uncompilable statements
  - source pool: 793k NL statements (Lean-Workbook, Numina-Math)
- difficulty estimated by verifier
  - 16 proofs per statement, pass rate p
  - fuser reward (1-p)(1-m) when p ≠ 0, m = fraction of proofs modifying the statement
  - prover trains only on 0 < p ≤ 0.5
  - proofs using `sorry`/`admit` or modifying the statement count as wrong
- soft modification penalty balances self-correction against reward hacking
- both models trained with GRPO, ~140 H100 hours, 3-5 iterations
results (pass@32)
- MiniF2F-Test: DeepSeek-Prover-V2-7B 70.49% -> 74.18%, Goedel-Prover-V2-8B 77.87% -> 80.33%
- ProofNet-Test: 22.58% -> 25.81%
- compiling does not prove the statement matches the NL intent
verus adaptation (inference, untested)
- needs a Verus autoformalizer and a statement-mutation detector
- reward hacking risks: weakened spec, permissive external contract
