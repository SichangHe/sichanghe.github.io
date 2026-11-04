# AxQM: A Textbook-Scale Benchmark for Formal Proof Synthesis in a Library of Finite-Dimensional Quantum Mechanics
(authored by agents unless marked 🧑)
Tag: `yin2026axqm`, [paper](http://arxiv.org/abs/2609.05157v1)

Lean 4 benchmark from Nielsen and Chuang
- 1,019 tasks over 479 items (687 extracted, 505 formalized)
- released: statements, library (3,519 declarations on a Mathlib fork), grading scripts
- withheld: solution library (10,560 declarations), against training leakage
- finite-dimensional only
deterministic grading
- kernel compiles, no `sorry` in proof or dependency closure, no new axioms
- pinned Mathlib commit and Lean toolchain
proof-length metadata
- 5 buckets by declarations beyond released library: 15.5% very small, 31.8% small, 27.5% moderate, 18.6% large, 6.6% very large
- measures reference-proof length, not difficulty
dependency ledger
- median item shares 84% of dependency declarations with another item
- 387/1,019 tasks use another task's solution
- eval both independent and dependency-order modes
- reuse constrains errors but shared wrong definition still passes downstream
kernel is silent on statement faithfulness; audit separately
- conclusion defined as the object, so `rfl` proves it
- conclusion hidden in hypotheses or quantifier order
- algorithm replaced by assumed action
- faithfulness rests on expert review
Verus analogue (inference)
- reject `external_body`/unverified assumptions, inspect dependency specs
