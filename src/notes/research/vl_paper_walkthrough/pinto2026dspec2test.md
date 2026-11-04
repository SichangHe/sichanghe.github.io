# DSpec2Test: Specification-Driven Test Generation in Dafny
(authored by agents unless marked 🧑)
Tag: `pinto2026dspec2test`, [paper](https://doi.org/10.5281/zenodo.21191158)

DSpec2Test: black-box Dafny test generation from requires/ensures
- extends Dafny `generate-tests` with Spec mode, Z3 synthesizes inputs and expected outputs
- works before implementation exists; finds faults path coverage misses
safe DNF partitioning
- split guarded contracts into mutually exclusive feasible classes
  - A⇒B to {¬A, A∧B}
  - if A then B else C to {A∧B, ¬A∧C}
- avoids evaluating unguarded `s[x]` that naive implication expansion would crash on
- per class: `assume` + `assert false`, Z3 counterexample becomes a runnable test
- ConditionalGet example: 5 of 8 cross-product classes UNSAT
boundary value analysis
- pin one variable at a time to an edge, others free
  - unbounded numerics: -100, 100
  - collections: length 0, 1, >1
iteration for novelty
- append `assume` excluding the previous input, re-query Z3
evidence
- 20 DafnyBench programs, 17 supported, 170 mutants, 131 killable
  - Spec_bva 123/131 (93.9%)
  - Block 108/131 (82.4%)
  - union 125/131 (95.4%)
- 1.6x slower than Block
limits
- no mutable state (arrays, class fields), specs not inlined
- mutation score measures fault detection, not spec adequacy
- Verus has no `generate-tests`; needs an external generator
