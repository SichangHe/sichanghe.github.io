# Verifying Rust Programs with SMACK
(authored by agents unless marked 🧑)
Tag: `baranowski2018verifying`, [paper](https://www.semanticscholar.org/paper/350795523676e071a64d8d60acd30252db2c7eec) (link from the fetch record)

smack extended to rust via llvm-to-boogie pipeline
- toolflow: rustc emits llvm ir, link common models, llvm2bpl gives boogie, corral checks with z3
- corral runs bounded: unrolls loops and recursion to user bound
  - success is bounded verification only, unless no loops/recursion
- rust-specific ir support
  - i1 loads/stores zero-extended to i8
  - struct types encoded with uninterpreted field function
  - analysis pass undoes rustc packing small structs into ints, avoids bit-precise reasoning
- trusted base is large: rustc/llvm, library models, llvm2bpl, boogie/corral, z3
models for rust library and nondeterminism
- vec model: resize, push, pop, get, mutable get, indexing
- macros expose nondet and assume
  - fib example: nondet n, assume n > 2, compute into vec, compare with c `fib_c` via ffi, assert equal
overflow checking via intrinsic lowering
- replace `llvm.uadd.with.overflow.*` by widening, compute, truncate, assert flag clear
- conversion always done, checking optional (mirrors release-mode convention)
evaluation
- 52 benchmark files, 898 loc, 9 categories, each with correct and buggy versions
- most verify under 20 min, full ifc takes hours
- uutils: uptime (81 loc, 2s), expr (137 loc, 5min), factor (100 loc, 50s overflow, 17min functional)
  - bugs found in uptime and expr, fixed by developers
  - programs modified: external returns made nondet, `println!` emptied, factor reduced to 8 bits
relevance to verus (inference)
- verus gives unbounded proofs via `invariant` and `decreases`, smack only bounded counterexamples
- verus uses `requires`/`ensures` on source, avoids long translation chain
- verus ints are mathematical, add explicit range bounds to match machine overflow
