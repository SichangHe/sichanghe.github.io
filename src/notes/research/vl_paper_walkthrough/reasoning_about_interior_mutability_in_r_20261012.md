# Reasoning about Interior Mutability in Rust using Library-Defined Capabilities
(authored by agents unless marked 🧑)
Tag: `poli2024reasoning`, [paper](https://arxiv.org/abs/2405.08372)

problem: safe apis over `UnsafeCell` mutate through `&`, so ordinary type framing is unsound or too weak
- Mendel: trusted library annotations `#[capable(...)]` give framing and non-aliasing facts to clients
  - unsafe library code verified separately, annotations trusted
implicit capabilities
- core: `readRef`, `writeRef`; fine-grained: `read`, `write`, `immutable`, `unique`, `local`; deny: `noReadRef`, `noWriteRef`
  - `Cell` is `local`, so `get; set(v+1); get` provably returns v+1 with no client annotation
- rules: structural (ref to field/pointee), implication (`writeRef ⊢ readRef ⊢ immutable ⊢ read`), incompatibility (non-aliasing via distinct roots)
- framing across a statement
  - `immutable(p)` always frames p
  - `unique(p)` frames p if p absent from statement
  - `local(p)` + `noWriteRef(p)` frames assignment or pure call
conditional capabilities
- `capable(type if e => c)`, e.g. `Arc` is `local(strong_ptr)` when `strong_count == 1`
  - holds only in the branch; after a failed test, another thread may change the count
purity classes
- `#[pure]` no interior-mutable contents, `#[pure_memory]` may depend on addresses, `#[pure_unstable]` any memory
  - pure_unstable (`Cell::get`) needs a postcondition to identify its result
validating a `readRef` capability
- rewrite client to keep a converted shared ref alive across the unknown call, e.g. `deref`
  - need only identify the rewrite is possible, not perform it
  - conversion method must be pure, total, no panic, no synchronization; identified manually
encoding
- Viper: memory versions, root places for disjointness, type snapshots, capability axioms
  - implementation reuses Prusti, no closures, traits, loops, quantifiers, iterators
evidence
- 12 clients, 4.8-34.6 s, 10 runs each; `cell.rs` 8.8 s, `refcell.rs` 13.5 s, `arc.rs` 10.0 s
- many clients need zero contract lines
- incomplete: `Arc<RwLock<Vec>>` (2 assertions) and `AtomicI32` (2)
trust
- library annotations, ghost methods, Viper/Boogie, borrow info, unsafe library soundness
- no formal soundness proof of Mendel, only intuitions
- Arc model assumes weak count 0, mutex model assumes no poisoning
verus transfer (inference)
- unstable location = ghost `PPtr` plus permission token, lemmas for implication and disjointness
- conditional capability = token guarded by predicate, concurrency needs atomic invariant
