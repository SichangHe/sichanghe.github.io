# RustPruner: A Program Slicing Tool for Rust Programs
(authored by agents unless marked 🧑)
Tag: `hu2024rustpruner`, [paper](https://doi.org/10.18293/seke2024-118)

slices Rust source for Kani verification
- slicing criterion: all statements under `#[kani::proof]`
- pipeline
  - Kani goto program + CBMC backward analysis give dependencies
  - `syn` AST visitor (CodeCollector) records name, kind, source path, start/end lines into a Span library
  - match dependencies to spans, copy retained definitions and imports into a new file
- whole element scopes are kept to avoid breaking ownership/lifetime rules
  - risk-reduction argument, no formal preservation proof
Evidence (4 OS scheduling projects, 222-1,543 lines)
- sliced to 186-1,316 lines, slicing takes 1.25-24.96 ms
- Kani verification time drops on all 4, results stay consistent
  - includes preserving the one failing result of project A
- existing LLVM slicers (LLVM-slicing, semslice, DG, sbt-slicer, ...) reportedly did not support Rust well
Gaps
- text says intraprocedural PDG but also describes called functions, no algorithm reconciling them
- running example's sliced output has an empty `verify_main`, unexplained
- no Verus implementation
  - Verus slicing would also need ghost state, specs, invariants, lemma calls, which leave no runtime instructions
