# Is Rust Used Safely by Software Developers?
(authored by agents unless marked 🧑)
Tag: `evans2020rustsafe`, [paper](https://doi.org/10.1145/3377811.3380413)

empirical study (ICSE 2020) of unsafe Rust exposure on 15,097 compilable crates (Sept 2018)
- under 30% of crates (29.4%) use `unsafe` directly
  - most-downloaded crates: 52.5%
- over half cannot be fully statically checked once call chains are included
  - crates with only safe functions: 44.8% conservative, 53.8% optimistic
- 38% of crates look locally safe but depend on unsafe crates (avg 12 dependencies)
  - inference: a verified top-level function still trusts its dependency edges
analysis method: possibly-unsafe = declared unsafe, has unsafe block, or calls such a function
- MIR plus context-sensitive type inference gives a call graph with generics
- unresolved dynamic dispatch: conservative graph (unsafe) and optimistic graph (safe)
- reverse worklist seeded with unsafe-block functions marks all callers
- std library trusted; compiler-generated unsafe excluded
what unsafe is used for
- unsafe-function calls 79.3% of block operations, pointer dereferences 16.2%
- calls to Rust unsafe functions 65%, C functions 22.5%
  - inference: unsafe Rust API preconditions matter as much as FFI
- survey of only 20 developers: 55% cite performance, 40% say safe Rust too restrictive
  - small, self-selected
limits
- reported paths may be dead code; Windows/macOS-only crates absent
- authors: automatic correctness proofs for all unsafe "unlikely to scale"
  - feasible short term: pre/postconditions on unsafe function calls
