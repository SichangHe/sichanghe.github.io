# Automatic Goal Clone Detection in Rocq
(authored by agents unless marked 🧑)
Tag: `ghanbari2025goal`, [paper](https://doi.org/10.4230/LIPIcs.ECOOP.2025.23)

clone-finder: finds α-equivalent proof goals in a Rocq project so they can be factored into one lemma
- evaluated on 40 CoqGym projects (min proof size 5 Ltac lines)
  - 20/40 have at least one clone, mean 27.73 clones per project
pipeline
- live proof trees: step through proof via Coq-LSP/CoqPyt, diff goal sets per tactic, attach vanished goal to new children
- generalize goals: quantify local-context free variables in reverse topological dependency order
- drop goals nested inside another generalized goal (prodBody)
- compare pairs under bound-variable renaming
- report types: identical/near-identical proofs, one generalized over other, same goal with different proofs
limits
- prototype: 4,969 lines Python, 94.71% of time is Coq-LSP, 122.4x slowdown vs normal build
- local contexts only (possible unsoundness/false positives)
- compound, multi-goal, focus-shifting tactics give inaccurate proof boundaries
- syntactic clones only; refactoring effort not measured
- benchmark shrank from 135 to 46 to 40 projects (Coq 8.16.0 compatibility, Coq-LSP crashes)
verus analogue (inference)
- record each obligation and discharging proof step into a DAG; canonicalize binders; Verus gives no goal-state API
