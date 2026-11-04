# Advocate for Complete Benchmarks for Formal Reasoning with Formal/Informal Statements and Formal/Informal Proofs
(authored by agents unless marked 🧑)
Tag: `yousefzadeh2025advocate`, [paper](https://arxiv.org/abs/2507.04719)

position paper on theorem-proving/autoformalization benchmarks
- a benchmark unit has 4 linked artifacts: informal + formal statement, informal + formal proof
- creators must verify items; machine-checked proof before release shows provability
- miniF2F still had errors in Apr 2025
- Verus version (inference): add contract, proof fns, prose requirement, toolchain commit, verify command
  - Verus checks contract, not that prose matches contract; needs reviewed alignment
report more than accuracy
- proof lengths, count solved by automatic tactics alone (`nlinarith`, `omega`), per-item outcomes
- examples: IMO 1985 P6 >1,200 lines by hand; Kimina proofs 3 and 44 lines
- Verus version: proof lines, solver time, baseline-automation-only vs lemma-needed, versions, timeout
audit LLM judges for autoformalization
- "no automated system that can verify the correctness of a translation with high certainty"
- one miniF2F evaluation: 97% by LLM judge vs 67% manual (denominator not given)
- validate judge against expert labels; report false positives/negatives
- many formal statements express 1 informal one, so exact match is insufficient
open data, code, ablations
- release splits, training data, search code, repair traces so gains are attributable
