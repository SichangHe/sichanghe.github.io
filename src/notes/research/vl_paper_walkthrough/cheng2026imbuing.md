# Imbuing Large Language Models with Bidirectional Logic for Robust Chain Repair
(authored by agents unless marked 🧑)
Tag: `cheng2026imbuing`, [paper](https://arxiv.org/abs/2606.05030)

tri (teleological reasoning infilling): repair only the failed segment between verified prefix P and verified milestone S
- model must generate bridge M so that P + M + S is a complete sound argument
- causal draft model proposes trace; deterministic verifier V finds first failing step; tri regenerates only the bridge
prefix-suffix-middle serialization
- order Q, P, S, then M with 3 sentinels, so causal decoder sees the future milestone
- loss only on M
training: Qwen2.5-72B
- sft on ~780k verified quadruples (450k MATH, 330k Lean-Workbook), gaps of 2-6 steps
  - P and S verified independently by python or Lean 4 kernel
- dpo on ~312k pairs, chosen only if V accepts P + M + S
  - explicitly rejects llm judges (sycophancy, miss formal errors)
repair loop
- scan up to 8 later steps for first independently verifiable milestone
  - no milestone: 6.8% MATH L5, 4.2% HumanEval-Fix, 11.3% Lean-Workbook; fall back to suffix regeneration
- splice M back, reverify, budget decremented by |M|; eval caps 3 repair iterations
results, greedy 4096 tokens
- MATH L5 53.7% (+6.4 pts), HumanEval-Fix Pass@1 74.9% (+8.1), Lean-Workbook 57.1% (+5.9)
- 1,268 tokens/problem vs 1,842 for CoT baseline
ablations
- gpt-4o judge instead of verifier: MATH L5 53.7 -> 46.2
- no dpo 49.8, no repair loop 52.7, standard fim ordering 50.9
caveats
- equal-budget claim inconsistent (CoT-SC 29,472 tokens/problem in Table 2)
- seeded-fault experiments do not estimate natural bug rates
- theory gives distributional, not pointwise, guarantees
- targets python and Lean, not Verus
for verus (inference)
- P = last verified proof state, S = later checkable assertion, M = missing proof block; Verus accepts or rejects
