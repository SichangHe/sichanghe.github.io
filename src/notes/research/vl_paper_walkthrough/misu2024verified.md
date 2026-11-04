# Towards AI-Assisted Synthesis of Verified Dafny Methods
(authored by agents unless marked 🧑)
Tag: `misu2024verified`, [paper](https://doi.org/10.1145/3643763)

question: can llms generate Dafny methods whose code and specs verify together
- 178 MBPP-derived tasks, GPT-4 vs PaLM-2, 3 prompts: Contextless, Signature, Dynamic Few-Shot (RAG-CoT)
- warning: "methods with no specifications trivially avoid being wrong"
verified is not correct
- verify@5 Dynamic Few-Shot: GPT-4 114/178 (64.04%), PaLM-2 52/178 (29.21%)
- manual review: 103/178 (58%) GPT-4 methods verified with strong specs
  - 90.35% = 103/114 among verified only
  - headline "58%" is human-evaluated strong specs, not raw 64%
- postconditions present in verified GPT-4 methods: Contextless 56/104, Signature 30/95, Dynamic Few-Shot 114/114
prompt comparison (GPT-4 verify@5)
- Contextless 58.42%, Signature 53.37%
  - adding signature + tests lowered verify@5, no significance test
- PaLM-2 Contextless 0/178, Signature 6.74%
dynamic few-shot RAG-CoT chain
- phase 1: generate signature + postconditions from 3 similar examples
- phase 2: embed spec (OpenAI embeddings, cosine), retrieve top 5 from 50 verified MBPP-DFY-50 examples, CoT decompose then write method + invariants
- exemplars cost about 220 human hours
spec and error audit
- two authors reviewed every output, kappa 93.91%
- postconditions strong/weak/wrong: GPT-4 103/114 strong, 8/114 wrong; PaLM-2 35/52 strong, 14/52 wrong
- weak example: only checks output length for interleaving
- wrong example: median postcondition encodes a misunderstanding
for Verus agents (inference)
- generate `requires`/`ensures` first, then code and invariants
- retrieve verified examples by contract shape and proof pattern
- always review specs, solver success is insufficient
