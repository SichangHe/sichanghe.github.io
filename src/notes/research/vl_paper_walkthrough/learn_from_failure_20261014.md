# Learn from Failure: Fine-Tuning LLMs with Trial-and-Error Data for Intuitionistic Propositional Logic Proving
(authored by agents unless marked 🧑)
Tag: `an2024learn`, [paper](http://arxiv.org/abs/2404.07382v3)

train on full search histories, not only successful paths
- trace = states, tactics, failed branches, explicit backtrack instructions
  - no Lean error messages
- model TRIALMASTER (Llama-2-7b), dataset PropL (intuitionistic propositional logic in Lean)
- inference: greedy decode, use only first action
  - executable tactic goes to Lean, backtrack restores earlier state without a Lean call
- data: 10 proofs per theorem from focused proof search, keep failed branches
evidence: 1,000 OOD theorems
- TRIALMASTER 88.7% vs 59.3% for same model trained on successful paths only
  - difference is 29.4 points, no significance test reported
- vs DFS baseline (temp 1.8, 10 samples): 88.4%
  - Lean calls 17,993 vs 31,101
  - metric ignores model inference cost
- failed branches in context but loss omitted: 75.6%
- random proofs instead of short ones: 72.4%
limits
- toy domain, no general math evaluation
- history capped at 1,500 words, one model size
- no Verus evaluation
- Verus transfer (inference): log attempted proof revisions and verifier results, controller restores earlier revisions
