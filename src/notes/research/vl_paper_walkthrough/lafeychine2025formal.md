# Formal account of ghost snapshots in a verification tool for Rust
(authored by agents unless marked 🧑)
Tag: `lafeychine2025formal`, [paper](https://doi.org/10.5281/zenodo.20425557)

creusot ghost snapshots are unsound with prophecy-based mutable borrows unless restricted
- result: mechanised RustHornBelt model in Rocq proves the restriction sound and as expressive as the original model on all cases the initial model solved
  - internship report; does not cover full creusot, unsafe rust, or full rust semantics
prophetic encoding of mutable borrows
- borrow = (current value, prophecy of final value)
  - writes update only current; at borrow end resolve by current = final
  - lender need not stay in context for write or end, enabling local reasoning
- verus analogy (inference): contract-level only, report does not study verus
snapshots
- snapshot = logical copy of a value, erased to a zero-sized unit at compile time
- naive snapshot rule duplicates any value, including resolved borrows
  - causality loop: snapshot a borrow equality into the borrow itself, resolve, get beta = not beta, prove false
  - "the final value of a prophecy depends on its own current value"
  - semantic flaw, not a runtime bug
fix: non-extensional borrow identities
- borrow = (current, fresh id), final value only via prophecy assignment pi
  - snapshots have no access to pi, so they cannot inspect final values
  - mutend checks pi(i) = c; tuple split creates child ids tied to parent prophecy
  - predicate transformers thread pi through creation, write, end, split
- soundness proof in Iris
  - borrow owns value observer and prophecy controller; resolution consumes observer and emits pi xi = v
case study: InvCell
- axiomatised cell interface (snapshot map, new/get/set) justified by the model; cell_repeat proved against it
- verus lesson (inference): axiomatised interior-mutability or snapshot abstractions are trusted boundaries; an unsound one invalidates client proofs
open work
- type invariants, places / final-borrow analysis on real mir, relaxed memory
