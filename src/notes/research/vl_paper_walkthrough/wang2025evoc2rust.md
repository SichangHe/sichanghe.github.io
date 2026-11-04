# EvoC2Rust: A Skeleton-guided Framework for Project-Level C-to-Rust Translation
(authored by agents unless marked 🧑)
Tag: `wang2026evoc2rust`, [paper](https://doi.org/10.1145/3786583.3786856)

project-level C-to-Rust: compilable skeleton first, then bodies, then repair
- skeleton construction
  - tree-sitter parse, translate types/macros/signatures, includes -> `use`
  - every function gets translated signature + `unimplemented!()` body
  - bodies filled incrementally, parallelizable, isolated from cross-module breakage
- safety-preserving mappings
  - 7 categories: types, conversion, macros/functions, syntax, operators, globals, variadics
  - e.g. `Ptr<T>`, `cstr!()`, `Global<T>` with `Mutex`, `VaList`
  - top-10 pattern retrieval by BGE-M3 cosine similarity, injected as few-shot
- cascading repair, retain candidates that reduce compiler errors
  - bracket repair (LLM) -> regex rules -> LLM refinement
  - rules before LLM is best
  - ablation on C2R-Bench: all repairs removed 93.84% -> 74.29%, mappings too -> 56.67% ICompRate
results (DeepSeek-V3)
- C2R-Bench: 93.84% ICompRate, 97.41% SafeRate
- 10 larger projects (≤ 91k LoC): 75.61% ICompRate
- correctness checked only by predefined tests, no verification
- high SafeRate partly from hiding low-level ops in a fixed set of unsafe blocks
verus adaptation (inference, untested)
- build types and signatures first, attach contracts to signatures, fill bodies later
- placeholders must be gone before claiming verification
