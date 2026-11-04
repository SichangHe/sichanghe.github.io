# Fast and Reliable Formal Verification of Smart Contracts with the Move Prover
(authored by agents unless marked 🧑)
Tag: `unknown2022fast`, [paper](https://arxiv.org/abs/2110.08362v3)

Move Prover (MVP): fully automatic verifier for Move contracts, Boogie then Z3 or CVC5
- Move was co-designed for verification, reference semantics similar to Rust
- Diem framework: about 8,800 lines Move, 6,500 lines spec, verified in minutes in CI
- DiemAccount: 2,554 lines, 64 functions, 32 invariants, 7.340 s
  - older LibraAccount: 1,975 lines, 9.899 s
reference elimination via borrow rules
- one mutable xor many immutable refs, so aliasing needs no reasoning
- immutable ref becomes the value
- mutable borrow becomes read, functional update, write back at the end of the last reference
- dynamic origins use Mut<T> values and an interprocedural borrow graph
- Verus form (inference): safe references get value-level specs, no justification for raw pointers or unsafe
global invariants injected at the smallest footprint
- checked after each instruction unless suspended
  - suspended invariants are re-checked at the caller, never at public entry points
- inductive invariants: genesis base case plus step
- update invariants: relate a saved pre-state snapshot to the current state
- inject assumption or assertion only when accessed memory overlaps, generic ones by type unification
- Verus form (inference): state machine transition invariants, ghost snapshot for multi-field updates
monomorphization for solver-friendly formulas
- specialize generics to get a multi-sorted SMT domain
- skolemize the type parameter to verify all instantiations
- types index global memory, so type erasure fails
  - f<T> doing move_to<S<T>> and move_to<S<u64>> must verify f_T and f_u64
contract workflow
- omitted specs on nonrecursive functions are inlined at callers
- missing aborts_if is reported with an SMT counterexample trace
- Verus form (inference): explicit error postconditions for Result, keep counterexample tests
