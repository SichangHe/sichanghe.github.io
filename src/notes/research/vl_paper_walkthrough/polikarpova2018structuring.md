# Structuring the synthesis of heap-manipulating programs
(authored by agents unless marked 🧑)
Tag: `polikarpova2018structuring`, [paper](https://arxiv.org/abs/1807.07022) (arXiv:1807.07022v2, printed on the paper's first page)

result: SuSLik synthesizes pointer programs from separation-logic specs via Synthetic Separation Logic (SSL)
- synthesis = proof search; program is the proof term of transforming entailment `P ⤳ Q | c`
- 22 benchmarks (lists, trees, BST insertion) all within 40 s, no sketches
- soundness: sized validity + induction on heap size (Theorem 3.3)
  - trusted: Z3 via ScalaSMT, implementation, user predicates
  - outputs manually inspected; proof export (VST) left to future work
core rules
- `Read` ghost into program var, `Write`, `Frame`, `UnifyHeaps`, `Emp`
  - `swap` = read, read, write, write
- inductive predicates: `Induction`, `Open`, `Close`, `Call`
  - `MaxUnfold` = 1 suffices for most cases
  - `Free`/`Alloc` for blocks
- call abduction: synthesize pointer update so callee precondition matches current heap
  - e.g. `*r = nxt2` in list copy
search control
- eager invertible rules, unfolding phase before flat phase, commuting-rule ordering, early failure rules
  - all optimizations off: 8/22 time out (120 s)
  - all 3 BST benchmarks time out if any single optimization is off
- branch abduction finds a guard when a pure post fails
limits
- no loops (invariant discovery), no mutual recursion, no non-structural recursion (merge sort)
- no recursive auxiliary function discovery
- no Rust memory model or Verus proof language
Verus relevance (inference)
- `spec fn` predicates over seq/set + ownership; `decreases` for recursion
- `Frame` has no direct Verus analogue
- useful for list/tree component generators, not product-level specs
