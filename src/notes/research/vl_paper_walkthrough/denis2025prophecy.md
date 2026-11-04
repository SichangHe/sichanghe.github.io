# Using a Prophecy-Based Encoding of Rust Borrows in a Realistic Verification Tool
(authored by agents unless marked 🧑)
Tag: `denis2025prophecy`, [paper](https://openalex.org/W4414486737)

scales prophecy encoding of mutable borrows from core calculus to creusot
- 4 open problems: resolution placement, modular container resolution, sound ghost code, type invariants
- evaluated on case studies ("4k LOC" in abstract; test suite 10k LOC, relation unstated)
  - 7 case studies: red-black trees, hashmap, BDDs, sparse arrays, knuth shuffle, iterators, sorting
  - no timing numbers reported
- soundness of all extensions not yet proved in RustHornBelt
separate prophetic logic from ghost logic
- problem: ghost code can read a prophecy and write a value depending on it, proves `false`
  - equality of borrows leaks the prophecy, banning `^` in ghost is insufficient
- fix: `#[logic(prophetic)]` may call `#[logic]`, not the reverse
  - trait method declared `#[logic]` cannot be implemented as prophetic
- borrow model (current, final, identity): equal identity ⇒ equal prophecy
- final reborrows share identity when static analysis shows the parent is unmodified
  - backward greatest-fixed-point dataflow on MIR, sets Φλ of places
  - under-approximation, "enough to prove most programs in practice"
  - field projections use opaque `field_i(parent.id)`
prophetic type invariants
- `inv(^borrow)` in callee post is too early, caller picks which prophecy becomes final
- invariant = user part ∧ structural part derived from type
  - implicit pre/post at function boundaries, temporary violation allowed inside
- at borrow creation assume prophecy satisfies invariant
  - before resolution prove current value satisfies it
  - reestablish invariant before borrowing, else uninhabited predicate gives `false`
- subset types (why3 style) rejected: similar problems, SMT assumes inhabited types
- cost: extra obligation at every resolution
modular container resolution
- old: trusted `Resolve` impl could silently be `false`
- new: auto `structural_resolve` (shallow); custom `resolve` needs lemma `resolve_coherence`
  - custom resolve then only hides information
  - 19 `Resolve` instances discharged by SMT automatically
resolution-point placement
- must resolve after last use; too early is incomplete, too late may be unsound with invariants
- per-place initializedness I, liveness Λ, frozenness F
  - N = I ∩ (Λ ∪ F), R = I \ N
  - insert resolution at fn entry (R), scope exit (N), around statements, on CFG edges (N(λ) \ N(λ'))
- frozen-borrow constraint not always satisfiable, e.g. `fn g(e:&mut Even)->&mut i32 {&mut e.x}`
- removed ~80 spec lines of repeated invariants
- verus port (inference): `spec fn` invariant, require at entry, ensure on returns, prove before final state is used
