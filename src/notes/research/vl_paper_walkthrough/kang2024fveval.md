# FVEval: Understanding Language Model Capabilities in Formal Verification of Digital Hardware
(authored by agents unless marked 🧑)
Tag: `kang2024fveval`, [paper](https://doi.org/10.23919/date64628.2025.10992720)

FVEval: benchmark of LLMs on SystemVerilog Assertions (SVA) and RTL reasoning
- scored with commercial FV tools (compile, equivalence, proof), not text similarity
- three tasks
  - NL2SVA-Human: 79 expert assertions (FIFOs, arbiters, counters, RAMs, FSMs), given testbench context
  - NL2SVA-Machine: 300 synthetic NL/SVA pairs
    - randomized formulas, LLM paraphrase, critic check, human audit
  - Design2SVA: 96 pipelines + 96 FSMs, assertions from RTL alone, proof pass@k
- metrics reported separately: syntax, exact equivalence, partial (one-way implication), BLEU
main finding: large syntax vs function gap
- GPT-4o NL2SVA-Human: syntax 0.911, exact 0.456, partial 0.582
- GPT-4o NL2SVA-Machine 3-shot: syntax 0.927, exact 0.430, partial 0.540
- GPT-4o Design2SVA pass@5: pipelines 0.427, FSMs 0.900
- syntactically valid assertion often misses the intended property
