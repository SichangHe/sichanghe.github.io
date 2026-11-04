# &inator: Correct, Precise C-to-Rust Interface Translation
(authored by agents unless marked 🧑)
Tag: `chen2026inator`, [paper](https://doi.org/10.1145/3808270)

&inator: whole-program c-to-rust interface (type) inference via smt
- pipeline
  - c to llvm (mem2reg) to typed source language with explicit drops, type labels
  - generate smt constraints, solve with z3
- picks per-label rust fragment: Box, Rc, &, &mut, Ref/RefMut, Cell, slices, lifetimes, ghost (no indirection)
  - joint solving rather than sequential ownership/mutability/lifetime passes
  - nullability left to later Option choice
- constraint groups
  - type consistency: fragment parity, finite recursive structs via integer ranks, arrays
  - semantic preservation: moves must not invalidate live paths
  - borrow checking: nll-style lifetimes, loans, conflicts, drop conflicts
  - precision: minimize Cell, transformation cost, runtime cost, arrays, in priority order
    - optimum not necessarily unique
scope and limits
- guarantee: correct interface for c without undefined behavior, modulo limits
- whole program only, no multithreading, libraries need a client test suite
- partial or no support: function pointers, polymorphic pointers, unions, variadics, ternary
- RefCell panics and Rc cycles may remain, interface may not admit panic-free or leak-free body
- libc external-function constraints written manually
evidence
- 6 programs manually validated correct and precise (running example, ulidgen, leftpad, amp, nandc, rbtree)
- 3 larger programs only for scalability: carrays 618 loc, jccc 1,394, tisp 3,656
- inputs modified for unsupported features
relevance to verus (inference)
- interface synthesis only; does not verify bodies or give verus contracts
- ownership shape could guide later verified translation
