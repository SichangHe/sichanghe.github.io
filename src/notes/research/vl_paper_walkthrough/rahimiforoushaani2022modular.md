# Modular Formal Verification of Rust Programs with Unsafe Blocks
(authored by agents unless marked 🧑)

Tag: `rahimiforoushaani2022modular`, [paper](http://arxiv.org/abs/2212.12976v1)

plan + prototype, not a result: verify Rust unsafe code with VeriFast modular symbolic execution (MSE)
- goal: memory safety and safe abstractions meeting their Rust type's guarantees, given code passed the borrow checker
- targets raw-pointer dereference first
- prototype handles one allocation/access/deallocation example, very limited Rust subset
- no benchmark, no soundness proof w.r.t. RustBelt
contracts make verification modular
- verify body once against requires/ensures in separation logic, reuse at calls
  - consume ensures chunks at return so rights transfer once
- avoids re-executing bodies and non-terminating recursion
- only example: create_deque, contract written by hand
symbolic execution over heap chunks
- state = store + heap of predicates (malloc_block, Node_prev, ...) + path condition
- allocation branches on null vs one symbolic address
- missing chunk or uninitialized read means stuck, not verified
RustBelt semantic interpretation (outline only, Cell::set)
- type -> (size, own, shr) Iris predicates
- open own/shr, use lifetime-logic na-acc rule with lifetime and thread tokens, write, close, return tokens
  - Cell's same-thread invariant comes from !Sync
- unsafe body must satisfy its safe type's predicate
Rust to MIR to VeriFast
- rustc front end extracts MIR, serialized with Cap'n Proto
- MIR CFG becomes C control constructs in VeriFast AST
- generics not handled yet
panic paths (proposed, unimplemented)
- run MIR unwind edges symbolically, post-panic checks left open
verus relevance (untested)
- same contracts via requires/ensures, but heap and unsafe boundary must be modeled explicitly
- RustBelt-style tokens would need Tracked ghost state, mapping unestablished
