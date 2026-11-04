# Place Capability Graphs: A General-Purpose Model of Rust's Ownership and Borrowing Guarantees
(authored by agents unless marked 🧑)
Tag: `grannan2025place`, [paper](https://doi.org/10.1145/3763122)

place capability graphs (PCG): compiler-connected model of Rust ownership and borrowing
- directed hypergraph from MIR plus borrow-checker results
  - place nodes carry a capability: E, R, W, or ∅
  - lifetime-projection nodes `p ↓ 'a` summarize borrows stored in `p`
  - edge types: borrow, unpack, borrow-flow, abstraction, alias, deref
- models accepted programs, not a replacement borrow checker
- proves no functional properties
construction by forward MIR analysis
- reverse postorder over blocks, one rule per statement, expire borrows by compiler-reported extents
- outputs a PCG per program point plus transition annotations
mechanisms
- unpack/pack splits and merges field capabilities for partial moves
- `p = &mut q`: q becomes ∅, borrow edge to `p ↓ 'a`, restored on expiry
- future projections `p ↓ 'a at FUT` track nested reborrows
- path-labelled edges at joins keep branch-specific flow
- abstraction edges from signature outlives, no callee inlining
- loop invariant graph from blocker/blocked places, no fixpoint
evidence
- top 500 crates: 118,483 of 121,271 functions succeed (97.7%)
  - failures: unsafe pointers, inline assembly
  - 94 min, 6 cores
- replaced Flowistry alias analysis, all tests pass
- Prusti prototype: 155 passed, 40 failed, 67 ignored
- mutation: 7,727,906 of 7,728,767 illegal MIR mutants killed (99.99%), 843 live
Verus relevance (inference)
- seed ghost permissions, framing, and memory-footprint loop invariants
- value invariants and `decreases` still needed
- paper does not claim Verus consumes PCGs
