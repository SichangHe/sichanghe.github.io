# RustHorn: CHC-based Verification for Rust Programs
(authored by agents unless marked 🧑)
Tag: `matsushita2021rusthorn`, [paper](https://doi.org/10.1145/3462205)

reduces pointer-manipulating Rust to constrained Horn clauses (CHCs), no memory model
- uses Rust's aliasing-XOR-mutability guarantee
- proved sound and complete for the core calculus COR, not for the MIR prototype
  - authors leave the implemented reduction's proof as a challenge
mutable reference = ⟨current, final⟩
- borrow: fresh final var, frozen lender is modeled by that final value
- write updates current only
- release: final = current
- final value is a prophecy-like logical placeholder, not a runtime prediction
- take_max example links both inputs through the final components without tracking addresses
nested borrows and structures
- reborrow ⟨a,outer⟩ → borrower ⟨a,inner⟩, lender ⟨inner,outer⟩, releasing inner resolves only inner
- pair/variant splitting splits both current and final
- inc_some on lists: relate element change to sum change, solved by HoIce with a recursive summary
  - not a guaranteed solve
CHC generation
- one predicate per labeled statement, inputs = locals, last arg = function result
- backward reduction, call = callee entry ∧ caller continuation
- COR lacks unsafe, traits, closures, polymorphism, direct place access
correctness proof
- least CHC solution = operational input/output relation (Theorem 1), simple functions only
- SLDC resolution bisimulation: each execution step matches a resolution step (Theorem 4)
- does not guarantee solver success or termination
MIR prototype, ~2500 lines Rust
- one predicate per basic block, relies on rustc borrow checking, nightly-only
- reduction ≤ 0.3 s, solve with Spacer/HoIce, 180 s limit
- small contrived benchmarks, all of SeaHorn's solvable programs handled
  - HoIce timed out on lists/inc-some2 and trees/inc-all, errored on trees/inc-some2
  - Spacer errored on recursive list/tree cases
  - nested refs blow up value size (double and triple refs have 4 and 8 ints)
extensions
- guess final value nondeterministically, assume equality at release, gives functional programs (MoCHi)
- RefCell needs global memory again, memory leaks lose completeness
inference for Verus
- contracts relating pre-borrow value to value returned to owner
  - no Verus implementation, no future-state primitive
