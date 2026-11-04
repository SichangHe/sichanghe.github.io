# A Lightweight Formalism for Reference Lifetimes and Borrowing in Rust
(authored by agents unless marked 🧑)
Tag: `pearce2021lightweight`, [paper](https://doi.org/10.1145/3443420)

FR: small flow-sensitive calculus for Rust lifetimes and borrowing
- covers move/copy, mutable borrow, reborrow, partial moves, lifetimes, tuples, conditionals
- handwritten soundness proof (Theorem 4.12, Corollary 4.14)
  - needs a well-formed environment; borrow exclusivity needs a borrow-safe start
- limits: Rust 1.0 lexical lifetimes, no unsafe, no NLL, no loops
  - no memory-leak guarantee
core rules
- move invalidates the source; copy needs a copyable type
- immutable and mutable borrows cannot coexist for the same resource
  - `&x` needs no conflicting mutable borrow, `&mut x` needs no borrow at all
- reborrow `&mut *p` suspends the original until the nested lifetime ends
- references cannot outlive referents, preventing dangling
- branch join: `&x` joined with `&y` is a reference to either
- `(&mut x, &mut x)` rejected by carrying operand types left to right
validation by bounded model checking
- Java implementation compared against rustc 1.39.0 on generated programs
  - abstract says >500B inputs in model checking, 2B in compiler testing
  - zero accepted programs faulted at runtime
- found bugs in earlier FR versions and a compiler issue (rust-lang 63719)
trust and use (inference)
- proofs are on paper, not mechanized
- FR is a checklist of lifetime, move, borrow, reborrow, drop obligations
  - rustc and Verus already enforce these; unsafe, traits, closures fall outside
