# A Study of Undefined Behavior Across Foreign Function Boundaries in Rust Libraries
(authored by agents unless marked 🧑)
Tag: `mccormack2024undefined`, [paper](http://arxiv.org/abs/2404.11671v8); link from the fetch record

dynamic UB testing across Rust/C/C++ FFI
- MiriLLI = Miri + LLVM's LLI jointly interpret Rust MIR and LLVM IR
  - Miri keeps memory, threads, intrinsics, shims, UB checks
  - LLI interprets LLVM instructions
  - plain Miri cannot find UB triggered in foreign code
- study of 9,130 test cases from 957 libraries (125,804-crate snapshot, 2023-09-20)
  - 46 bugs in 37 crates
  - 24 ownership (17 Tree Borrows violations, 7 out-of-bounds), 12 typing, 10 allocation (9 leaks)
  - sample only covers crates statically linking foreign code by default; not an ecosystem UB rate
mechanisms
- conservative value translation: typed value sizes must match across the boundary
  - no formal Rust/LLVM ABI oracle exists
  - homogeneous aggregate expansion needed for 156/9,130 tests
  - opaque pointers typed `*mut u8` may give false alignment errors
- dual-mode initialization checking
  - mode 1 allows LLVM loads of uninit bytes (undef propagation)
  - mode 2 zero-initializes LLVM memory and errors on uninit reads
  - 5 of 12 typing bugs were incomplete initialization
- alias-model differential testing
  - 90 tests violated Stacked Borrows
  - 66% (59) passed or hit unsupported ops under Tree Borrows
  - 45 tests used pointer arithmetic Stacked Borrows rejects but Tree Borrows allows
- on average per memory mode: 61% unsupported op, 19% pass, 10% timeout, 1% fail, 9% potential bug
Verus takeaways (inference)
- dynamic runs cannot prove FFI wrappers sound
- foreign functions need explicit contracts: size, alignment, layout, aliasing, init, allocation, ownership transfer
  - `external_body` must not erase these obligations
- initialization as ghost predicate before `MaybeUninit::assume_init`
- state the alias model relied on; Stacked vs Tree Borrows differ
