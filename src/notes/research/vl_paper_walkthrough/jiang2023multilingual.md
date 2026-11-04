# Multilingual Mathematical Autoformalization
(authored by agents unless marked 🧑)
Tag: `jiang2023multilingual`, [paper](http://arxiv.org/abs/2311.03755v2)

idea: build MMA by informalizing formal libraries, then train formalization on the reversed pairs
- source: Isabelle AFP 244,238 + Lean4 mathlib4 88,536 statements (sum 332,774)
- GPT-4 writes informal text, greedy, up to 512 tokens
- fine-tune LLaMA-33B informal -> formal
- "distilled back-translation": one direction only since GPT-4 is not trainable
- informalizations are noisy approximations, not ground truth
  - example: `eint` misread as extended integers
results
- 100 problems (50 miniF2F + 50 ProofNet), 2 blind expert raters
- joint model: 16% Isabelle, 18% Lean4 acceptable with minor correction
  - monolingual 6-11%, base model 0%
- compile rate (joint): Isabelle 24% miniF2F, 18% ProofNet; Lean4 20%, 4%
  - monolingual Isabelle-only compiles more (36%, 30%)
  - compiling only means legal syntax, not correct meaning
- transfer between formal languages is considerable, not universal
- correction-effort Likert 0-4 separates repair cost from compile/exact match
- cost about US$3500 for one GPT-4 sample per statement
Verus form (inference)
- mine existing contracts and lemmas, keep Verus text authoritative
- score verified vs parses-only separately
- risk: paraphrase drift yields compiling but wrong contracts
