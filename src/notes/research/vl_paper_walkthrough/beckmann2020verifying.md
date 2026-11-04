# Verifying Safe Clients of Unsafe Code and Trait Implementations in Rust
(authored by agents unless marked 🧑)
Tag: `beckmann2020verifying`, [paper](https://www.semanticscholar.org/paper/417738a0b6b1e2772bd3947e5d53cabbd8e6033a)

master's thesis (ETH 2020) extending Prusti to verify safe clients of unsafe rust
- problem: unsafe rust relaxes guarantees prusti relies on, so prusti is unsound for such programs
- status: only a ch3 (traits) prototype exists
  - ch4 interior mutability is design only, "the author did not implement the approach"
  - ch5 contract derivation is theoretical
  - no benchmark or quantitative coverage reported
unsafe trait contracts
- encode the safety obligation of an unsafe trait method as a postcondition
  - e.g. Searcher must return utf-8 boundary ranges, via a pure `is_on_utf8_boundary`
- verify each impl against it like a normal trait
- limit: documentation properties are often hard to state as rust expressions
- verus form (inference): `spec fn` predicate + `ensures` on each impl
marker-trait invariants and contract refinement
- marker trait with semantic meaning gets an invariant applied to every implementing type, e.g. `Eq` implies `self.eq(&self)`
- refinement: a marker trait strengthens a super-trait method contract, e.g. `TrustedLen` on `size_hint`
  - preconditions joined by implication, postconditions by conjunction
- scoping of invariants at call sites is not implemented
- no quantified invariants
interior mutability (`Mutex`, `RwLock`, `RefCell`, `Cell`)
- unsound baseline: a `pure` trusted `Cell` getter lets `assert!(v1 == v2)` verify after `cell.set(5)`
- `UnsafeCell` itself is out of scope
- mutex encodings in viper
  - state machine with abstract predicates `Mutex` and `Locked`, but it verifies double lock
  - `CanLock` capability + magic wand restoring it on guard release
  - rely/guarantee layer for monotone-counter-style invariants
  - none checks deadlock freedom
- `RwLock` reuses the mutex encoding with read permission
- `RefCell`/`Cell` use user-declared states and transitions
- prusti lacks concurrency, so the mutex encoding is "not very useful in practice"
- verus form (inference): ghost state machine + permission predicates, never mark a mutating accessor pure
derived contracts
- derive contracts for `#[derive]` traits from documented behavior
  - `PartialEq`, `Ord`, `Default`, `Clone` handled
  - `Eq`, `Copy` just marker invariants, `Hash` unsolved
- operators encoded as abstract domain functions over snapshots
  - manual `PartialEq` needs a separate `eq()` axiom extracted from the body
  - non-pure operators unsupported, operators returning new snapshots slow verification
trust
- annotations are assumed to formalize the documentation faithfully
