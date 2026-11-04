# MathAtlas: A Benchmark for Autoformalization in the Wild
(authored by agents unless marked 🧑)
Tag: `patel2026mathatlas`, [paper](http://arxiv.org/abs/2605.14061v1)

benchmark: graduate textbook math to Lean 4, dependency-aware
- ~52k entities (definitions, theorems, exercises, examples, proofs) from 103 textbooks, 87 areas
- ~178k dependency relations
  - entity refs, object refs, local-variable refs, proof-to-theorem edges
  - dependency depth = max tree height, dependency mass = unique nodes
- only statements and definitions evaluated, proofs left for future work
corpus pipeline
- Nougat pdf to markdown, `gpt-oss-120b` schema-constrained json extractors (entities, refs, names)
- relation retrieval: ChromaDB + Mistral E5, then llm selects the match
- definitions linked to 10 LeanSearch mathlib candidates
- human-checked samples: entities 90.4% valid (n=250), relation F1 94.8%
metric: correct = compiles ∧ faithful
- compile alone is misleading: Kimina 7B 27.3% compile but 2.3% correct
- faithfulness judge calibrated on MA-Align (200 items)
  - gpt-5.2 prompt 86.0 (definitions) / 80.0 (statements), CriticLean 32B 80.0 / 75.0
  - judges drop on graduate level, used CriticLean 32B for cost and openness
results
- best definitions: `gpt-oss-120b` tuned, 28.5% compile, 58.5% faithful, 16.7% correct
- best statements: ReForm 8B, 19.0% compile, 48.4% faithful, 9.8% correct
- MA-Hard (~700 deepest entities): correct 2.1% (`gpt-oss-20b`), 2.6% (`gpt-oss-120b`)
- correctness falls with dependency depth, ks p<0.001
- mathlib-grounded definitions 27.9% vs 16.8% ungrounded
- extra local context hurt best prompted system (definitions 20.3% to 17.4%)
takeaways for verus
- compiling and verifying does not show the spec matches intent, measure faithfulness separately
- missing dependencies are the main difficulty, retrieve or synthesize them first
- an llm judge is not ground truth, calibrate it on labeled data
