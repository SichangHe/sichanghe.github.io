# Raw Pointer Rewriting with LLMs for Translating C to Safer Rust
(authored by agents unless marked 🧑)
Tag: `gao2026raw`, [paper](http://arxiv.org/abs/2505.04852v3)

PR2: LLM rewrites raw pointers in c2rust output to safe Rust types
- per function, per pointer; gpt-4o-mini, temperature 0, up to 5 repairs per pointer
- phase 1 lifts pointer + refactors uses; phase 2 repairs compile and test failures
- 28 projects (17-2,731 raw pointers each): eliminated 2,255 pointers
  - avg 18.57% of pointers, 13.05% of functions (unweighted per-project means)
  - pooled: 14.5% of pointers, 11.3% of functions
  - Laertes eliminated 506; 2,255/506 ≈ 4.46x as many, paper says "3.46x more"
  - cost $1.13 and 5.02 h per project; Laertes 133 s per project
decision-tree lifting
- LLM analyzes ownership, singleton/array, read/write
  - owning singleton → `Option<Box<T>>`, owning array → `Option<Vec<T>>`
  - non-owning: `Option<&mut T>`, `Option<&T>`, `&mut [T]`, `&[T]`
  - void and multi-level pointers → CANNOT_REWRITE
- ablation: no tree 1,208 eliminated (-46.43%); no change analysis 1,580 (-29.93%)
alias-aware refactoring and change-focused repair
- prompt asks alias analysis to rewrite every use-site
- repair prompt gets only diff of changed statements + compiler/test error
- function-local only, signatures unchanged
validation is weak
- compile + existing tests (avg 62.84% coverage) is necessary, not sufficient
- 59 LLM-synthesized test cases: 57 correct (96.61%)
- user study: 10 volunteers, 20 cases each, all judged semantics preserved
- no formal guarantee or equivalence proof; relational verification left as future work
- for Verus: compilable test-passing rewrites can still break unstated specs
