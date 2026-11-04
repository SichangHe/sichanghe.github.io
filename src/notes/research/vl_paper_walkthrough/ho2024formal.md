# Formal Verification of Rust Programs by Functional Translation
(authored by agents unless marked 🧑)
Tag: `ho2024formal`, [paper](https://theses.hal.science/tel-05004605v1)

aeneas thesis extends [ho2022aeneas](ho2022aeneas.md)
- translates borrow-checked Rust to pure lambda-calculus, now with loops and mutable borrows
- backends: F*, Coq, HOL4, Lean
- LLBC#: symbolic semantics whose successful execution is a formally justified borrow check
- translation consumes symbolic execution traces to build a functionally equivalent pure program
erase uniquely owned references
- no stray aliases, so track the value only
- `incr(x: &mut i32)` becomes `x + 1` in an error monad
- overflow check becomes a proof obligation
backward functions
- returned `&mut` becomes (value, continuation)
  - choose: `if b then (x, fun z => (z, y)) else (y, fun z => (x, z))`
- recursive data: borrow = value + reconstruction function
  - list_nth_mut backward rebuilds the list
- loops translate to an auxiliary recursive function, same as the recursive version
traits as explicit dictionaries
- structures not typeclasses, since backend inference may differ from Rust trait resolution
symbolic borrow checking
- region abstractions project input borrows by the callee signature
- soundness chain: PL (CompCert-style heap) refines HLPL, LLBC, LLBC#
  - proved as local state rewrites in a hybrid superset language, not one global simulation
- branch joins fixed-point over borrows/loans, which supports loops
partial functions
- HOL4: Knaster-Tarski encoding
- Lean: auto monotonicity/continuity, termination deferred to total-correctness proofs
earlier techniques in the thesis
- hybrid embedding: verify one generic Noise protocol implementation against an interpreter, specialize by partial evaluation
- zero-cost functors: DSL for staged rewriting, helped HACL* pass 100,000 lines of verified code
- module-based induction (Dafny-in-Dafny): abstract induction principle + small per-constructor lemmas
  - pinpoints proof failures
evidence and limits
- Charon 16 kLoC, Aeneas 35 kLoC, "naturally, trusted"
- borrow-check suite: 2,000 LoC micro-tests + hash table, AVL tree, b-ε tree (1,068 LoC), under 1 s total
  - accepts some programs rejected by Rust and Polonius, anecdotal
- soundness is pen-and-paper, mechanization ongoing
  - guarantees memory safety in the model, permits panic and divergence, not functional correctness
- formalism excludes nested borrows in signatures and borrow-containing ADTs; unsafe and interior mutability out of scope
- Inference: Verus still needs explicit loop invariants and decreases, no automatic join
