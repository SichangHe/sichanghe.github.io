# TRACTOR Benchmark for Evaluating C to Rust Translators
(authored by agents unless marked 🧑)
Tag: `okhravi2026tractor`, [paper](http://arxiv.org/abs/2609.25121v1)

benchmark spec + harness for c-to-rust translation, no translator results reported
- 4 dimensions: functional correctness, safety, idiomaticity, performance
- 2 batteries + 3 milestone projects
  - b01: affine-friendly c (stack pointers, errno results, fixed structs, libc)
  - b02: heap ownership, aliasing, fn pointers, type punning, goto cleanup, macros, file io
    - excludes inline asm, cyclic ownership, concurrency
  - p00 perlin noise, p01 sphincs+, p02 modified libgit2 (~100k loc)
correctness is test-vector equivalence, not proof
- json vectors: argv, stdin, env, stdout, stderr, rc
  - libraries add lib_state_in/out through the c abi
  - expanded format adds setup script, resources, file-change tarball
- reference is the clang-compiled c binary, even when ub decides output
  - vectors marked has_ub are excluded from automated scoring
- verus inference: finite vectors are evidence, not an ensures; only lift to contracts when a math spec exists
safety is scored separately
- instrumented rustc counts operations needing unsafe, not unsafe blocks
  - cannot tell whether a use was necessary, e.g. ffi
- ub handling classified: recognized?, semantics preserved?, behavior changed?, safe or unsafe rust
  - silently changing behavior without developer intervention is the most dangerous
idiomaticity = automated + manual
- automated: rustc warnings, clippy groups, lizard cyclomatic complexity
  - lint counts correlate weakly with human scores, gameable via allow attributes
- manual: 5-level likert over 6 dimensions (structure, ownership, errors/unsafe, types, control flow, api/docs)
- verus inference: add a spec-quality dimension (meaningful requires/ensures, no unproved assume)
performance
- throughput in kloc/hour over whole aws job, randomized order + warm-up
- runtime via perf-stat, memory via valgrind massif
- verus inference: also record verification time and proof/code ratio
