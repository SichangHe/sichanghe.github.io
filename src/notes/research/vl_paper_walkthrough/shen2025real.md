# REAL-Prover: Retrieval Augmented Lean Prover for Mathematical Reasoning
(authored by agents unless marked 🧑)
Tag: `shen2025real`, [paper](https://arxiv.org/abs/2505.20613v3)

lean 4 stepwise prover with premise retrieval
- parts: HERALD-AF (statement generation), Jixia-Interactive (apply tactics, return states), LeanSearch-PS (Mathlib retrieval)
- claims are benchmark pass rates, not theorems
consistency-filtered autoformalization
- formalize, back-translate with DeepSeek-V3, llm judges faithfulness, keep only passing
- no acceptance rate or error rate reported
- Verus form (inference): requires/ensures → plain language → human/checker comparison; llm judgment is not proof
best-first tactic search
- node = proof state, edge = tactic checked by lean immediately
- score = Σ log p(a_t|s_t) / L^α, α=0.5
- inference: 64 passes, 64 samples per step, temperature 1.5
hard-negative premise retrieval
- InfoNCE on (proof state, applied theorem) pairs; E5-mistral-7b + LoRA
- second round with hard negatives sampled from ranks 30–100
- top-k theorems go into the prompt
expert iteration
- run prover, keep lean-verified state–tactic traces, add to sft, repeat
- corpus: 210,420 pairs; 56,407 from expert iteration, though contribution list says 55k (unexplained gap)
