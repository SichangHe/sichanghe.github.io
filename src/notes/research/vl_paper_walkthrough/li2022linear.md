# Linear Types for Large-Scale Systems Verification
(authored by agents unless marked 🧑)
Tag: `li2022linear`, [paper](https://doi.org/10.1145/3527313)

Linear Dafny: linear types + SMT remove common-case alias reasoning
- linear values cannot be duplicated or discarded; SMT still handles aliasing and logic
- core type system proved sound (type, wp preservation, progress, region agreement)
  - type-checking algorithm sound and complete (proofs in supplement, not said machine-checked)
- evaluation: VeriBetrKV storage system (44K lines, ~24K implementation, 31K lines C++)
  - 91% of implementation layer linear, 9% nonlinear
  - proof lines -28% (conclusion says 27%), verification time -30%
  - one Dafny system only; results not about Rust
- Verus form (inference): Rust ownership gives the linear/shared discipline; Verus adds `requires`/`ensures`/`invariant`/`spec fn`

linear vs shared usages
- shared: duplicable only during a temporary borrow, cannot escape
- linear data updated in place, still reasoned about as values
- `inout` for in-place update, shared iterator for traversing recursive lists

regions for nonlinear data
- region = (name, private small heap), passed linearly, shared reads borrow
  - per-region `modifies` predicate replaces global Dafny `modifies` clause
  - `fresh_ref`, `valid_ref` give distinct allocation and membership
  - public boundary: `requires wf(a)`, `ensures wf(a)`
- Verus form (inference): owned struct with `Vec`/map, handles as indices checked by `wf`

linear data inside nonlinear data
- reading a linear field from shared region demotes it to shared; swapping needs linear region
- `Take`/`Give` with `Maybe<T>`: SMT proves `Some` before extraction
  - no runtime `RefCell` checks or panics

borrow/consume inference
- checker lazily infers environment splits with expected mode borrow/consume
- `e1; e2`: consumed sets disjoint, `e1` may borrow what `e2` consumes
- Rust does this before Verus; proof layer should state data relations only

incremental migration
- stage 1: linearize unaliased types, remove heap proof code
- stage 2: remove high-fidelity functional models, merge noninvasively (only 27% of implementation)
- converted module by module, build verified throughout
- proof lines -18% where models kept, -56% where merged
- 69 methods slow (>5s) before: half take ~half the time, 90% no slower
  - other 284 of 353: no significant difference
  - 8 methods slower, 3 by 10-30s from inlined proofs
- artifact keeps dynamic-frame structure, so understates from-scratch benefit

limits
- no returning mutable refs or storing shared refs in datatypes
  - cache needs pass-through methods, iterators copy node data
  - lifetimes would cut cache module 55% (242 lines)
- regions are verification-only, no runtime effect
- trusted base (inference): Dafny/Boogie, Z3, compiler/runtime, specs
