# Towards verifying unsafe Rust programs against Rust’s pointer-aliasing restrictions
(authored by agents unless marked 🧑)
Tag: `tas2026verifying`, [paper](https://arxiv.org/abs/2603.28326v1)

status: work in progress toward a modular program logic for unsafe Rust aliasing compliance
- no implementation, benchmark, or soundness theorem
- planned: VeriFast implementation, real-world programs, soundness vs Tree Borrows
- claims RefinedRust, Verus, Gillian-Rust "ignore these rules and are therefore unsound" (Sec. 4.1), authors' claim, not independently assessed
λPA: model only the aliasing core
- values are ints or pointers, ops: new, free, deref, mut/shared borrow, write, let
- pointer = address + provenance (owning / mut-ref / shared-ref)
  - pointers to same cell carry different permissions
- `&mut x as *mut T` becomes `&mut *x`
- unsupported Rust constructs are modeling gaps, not proved safe
- Verus: tracked ghost tokens with allocation identity and provenance, raw addresses abstract (inference)
fractional separation logic
- full `p ↦ v` needed to write or free, fractions allow read aliases
- Verus's safe-reference ownership covers some of this, raw pointers need explicit ghost state (inference)
mutable borrow
- consumes lender's full points-to, gives borrower full points-to plus reference-ending resource `r ⇑ p`
- `reference-end` view shift `p' ↦ v * p' ⇑ p ⇛ p ↦ v` returns ownership
- open issue: fraction q ≠ 1 at reference-end may conflict with literal Rust rule, Tree Borrows might allow
shared borrow
- splits into read-only fractions, no party can get full permission while aliases live
- freezes only memory directly behind the reference
  - `&&mut T` can recover a mutable ref and write, recursive freezing is future work
- `UnsafeCell` not covered, would need an explicit interior-mutability invariant (inference)
extensions in tech report, prose only here
- two-phase borrows, functions, interior mutability, Boxes
  - calls reborrow mutable args, hide ending resources during the call
  - `Box<T>` acts like `&'static mut T` for aliasing
- structs and recursive freezing remain future work
trusted base: chosen reading of Rust's aliasing rules, fractional semantics, all axioms, any future VeriFast encoding
