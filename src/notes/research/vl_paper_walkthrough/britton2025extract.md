# Verifying Extract Method Refactoring in Rust
(authored by agents unless marked 🧑)
Tag: `britton2025extract`, [paper](https://doi.org/10.1145/3758316.3765486)

2-page poster: REM-V adds zero-annotation equivalence check to REM extract-method refactoring for Rust
- compiling is not enough: ownership/lifetimes can change aliasing or observable effects
- REM repair loop (earlier tool: 92% success on 5 crates)
  - reify return/break/continue into a result enum
  - infer per free variable: by value, `&T`, or `&mut T`
  - iterate `cargo check` to fix signatures, then lifetime elision
- equivalence stage: Charon to LLBC, Aeneas to pure lambda calculus, proof in Coq
  - claim: for all x with call-site precondition Φ, results equal and observable effect traces equal
  - no user annotations
evidence is thin
- 10 cases adapted from rust-analyzer tests, all discharged
- full cycle ~2s
- no larger benchmark, no baseline, future work says "hundreds of different cases"
limits
- safe Rust only, Aeneas-supported fragment
  - no nested loops, closures, function pointers, concurrency
  - weak on interior mutability, nested borrows, heavy generics, async
- side effects (global state, time, nondeterminism, I/O) need extra modelling
- trusted: Charon, Aeneas, Coq, effect abstraction
for Verus: only the idea transfers (spec equal result + effects under same precondition), pipeline does not
