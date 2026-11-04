# RefinedRust: A Type System for High-Assurance Verification of Rust Programs
(authored by agents unless marked 🧑)
Tag: `gaher2024refinedrust`, [paper](https://doi.org/10.1145/3656422)

foundational semi-automated verification of safe and unsafe Rust
- refinement types over Rust types, as Iris separation-logic predicates, proofs checked by Coq
- pipeline: MIR + annotations → Radium → Lithium proof search in Coq
- case study: simplified Rustonomicon `Vec` + `RawVec`
  - 120 lines Rust, 76 lines annotations, ~1,200 lines generated Radium
  - whole API ~6 min wall, 22 min CPU on M1 Max
  - ~80 lines manual Coq for representation invariant
  - `Vec::pop`: ~3,000 automatic steps, 100 pure side conditions, 5 manual (~20 lines Coq)
- automation "fairly basic compared to previous non-foundational Rust verification tools"
- unsupported: concurrency, recursive types, traits, closures, unsized types
refinement boundary specs
- `rr::params`, `args`, `requires`, `returns`, `ensures` link Rust values to math values
  - example `box_add_42`: `requires x + 42 ∈ i32` since panics are also verified
- verus analogue (inference): `requires`/`ensures` over `int` with range precondition; no Coq/Iris types
borrow names for `&mut`
- mutable ref = pair (current value x, borrow name γ), inspired by RustHorn prophecy
- postcondition `Res γ (x + 42)` resolves lender's placeholder `∗γ` after lifetime ends
- verus analogue (inference): keeps post-state in referenced value; no `gname`/`Res`
reborrow specs with placeholders
- `Vec::get_mut` returns `Some (xs !!! i, γ_i)`; vector gets element `i` replaced by `∗γ_i`
- verus cannot verify reborrowing fns returning `&mut` like `get_unchecked_mut` (§7, as of paper)
  - needs different API shape, e.g. set-at-index; current verus unchecked by this note
representation invariants for unsafe pointer APIs
- `refined_by` + `field` map concrete fields to math values
  - `RawVec`: `(b, c)`, capacity bound, `freeable` ownership
  - `Vec`: list `xs`, first `length xs` slots `Some`, rest `None`, `length xs ≤ c`
- every API op unfolds and re-establishes invariant
- verus cannot verify raw-pointer `Vec` directly; needs permission-carrying pointer types, which are trusted (§7)
unfold, yoink, borrow, restore
- `get_unchecked_mut`: yoink invariant from under `&'a mut`, offset pointer, borrow element for `'b`, block array, extend `'b` to `'a`
- restore `Vec` from parts behind `blocked'a` when `'a` ends
- soundness needed new "pinned borrows" in lifetime logic
Radium and layout-parametric semantics
- MIR subset semantics with byte-level values, bounded ints, in-bounds pointer offsets
- results proven for an arbitrary layout algorithm, instantiated for closed programs
- unmodeled: niche optimizations, some validity invariants, pointer-int casts, aliasing model
soundness and trust
- Theorem 5.1: verified `main: () → ()` runs without UB or panic
  - functional postcondition via closed program that panics on failure
- formalization ~21k lines spec, ~14k lines proof
- trusted: Radium, frontend, top-level safety statement, Coq kernel
  - frontend lifetime hints need no trust
- verified `Vec` is not the std implementation: global allocator, direct `get`/`get_mut`, allocation shims
- vs Verus: "more mature, supports larger subset of safe Rust" but proofs "not foundational"
