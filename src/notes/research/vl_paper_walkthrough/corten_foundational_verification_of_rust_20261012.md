# Corten - Foundational Verification of Rust Programs
(authored by agents unless marked 🧑)
Tag: `farka2026corten`, [paper](https://arxiv.org/abs/2609.04372v1)

what: foundational Rust verification in Rocq on Iris separation logic
- operates on THIR via Hax/hax2rocq, so proof goals pretty-print to surface Rust
  - rustc supplies parsing, name resolution, type checking
- claim shown by examples, not for all Rust syntax
pipeline
- spec = Iris proposition; `fn_item_ok` requires it to entail the function's `wpfn`
- syntax-directed WP rules (each an under-approximation) for patterns, statements, place/value exprs, control flow, calls
- `wp_engage` loops: normalize premises, pick the unique matching rule, sequentialize control flow, solve separation side goals
  - specialised tactics: `wp_fn`, `wp_call`, `wp_if`
  - stalled goals fall back to Iris Proof Mode
- kernel-checked by Rocq
memory model
- values and locations as paths from stack/heap/global roots
- `ℓ ↦q v` with fraction 0 < q ≤ 1: full permission mutates, fractions share reads
- structs split into layout fact plus field facts; `layoutq` abstracts padding
- out of scope: `transmute`, atomics, memory-mapped I/O
- borrow checker ignored by proofs, only an oracle that obligations are easy
- move = swap `ℓ ↦ v` for `ℓ ↦uninit`
- borrow end = next WP rule consuming `ℓ ↦ v` again, so lifetimes become spatial ownership transfer
control flow
- `CF A` has six outcomes: seq, return, break, continue, nomatch, match
- `wpCF A = (CF A -> iProp) -> iProp`, continuation monad plus exceptions
- loops are one-unfoldings with user invariants
- unsupported: labelled break/continue, break values
- separate `wppexpr` (place) and `wpvexpr` (value)
- integer ops require `nooverflow`
modular specs and soundness
- function specs persistent, reused at every call site
- soundness via interaction-tree (ITree) denotation with heap/UB events plus logical handler
  - one adequacy lemma per new event type
  - adequacy done only for literals, unary/binary ops, expression statements, let
  - pending: variables, borrows, tuples/ADTs, if/block, match, loop, call/return, patterns
  - proves internal consistency only, not agreement with Rust
proof compression
- definition sealing: opaque recursive `wpblock`, unfold one statement at a time
- evaluation reordering: constant pattern first, only when side-effect-free
- join points: shared postcondition `R`, prove continuation once
- defunctionalized continuation stacks `scont`/`hcont` replace closure trees, cutting Qed time
- Verus analogs (inference): opaque lemmas, branch lemmas, ghost enums for continuations
evidence
- ten synthetic collections; automated proofs ~2-4x shorter than raw, specs ~2x source size
  - exception: `ifs` raw 112 vs auto 140 lines from join-point overhead
- buddy allocator: ~300 lines Rust, ~2,800 lines Rocq
  - 250 specs, 800 generic Rust reasoning, 1,400 free-list invariant lemmas
  - proves memory safety/representation preservation only, not best-fit or success
  - core functions rest on unproven specs
  - most effort is domain invariants, not generic automation
trusted base
- Rocq kernel, rustc front end, unverified hax2rocq, hand-authored test oracle
- no scalability study beyond one allocator, no bug-finding rate
- planned: extract ITree interpreter, differential tests vs rustc/Miri
