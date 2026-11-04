# An Executable Operational Semantics for Rust with the Formalization of Ownership and Borrowing
(authored by agents unless marked 🧑)
Tag: `kan2018executable`, [paper](http://arxiv.org/abs/1804.07608v2)

RustSEM: executable operational semantics for a Rust subset, in K
- checks ownership and borrowing system (OBS) invariants at memory level
- compared against the Rust compiler
- three levels
  - sequentially consistent memory model (stack, heap, OBS checks)
  - Core Language (CL) IR to avoid repeated semantic definitions
  - translation semantics Rust to CL
- memory model is language-independent
  - refinement proved from the graph abstraction to the memory model
OBS as graph invariants
- 5 invariants over owners, aliases, edges, lifetimes
- well-formedness implies exclusive mutation
- non-lexical lifetimes handled by extending a borrow's lifetime at each use
  - memory ops violating permissions are rejected
K engine uses
- runtime checking: uninitialized/dangling reads, double frees, races, borrow errors, buffer/index overflow
- symbolic reachability verification with pre/postconditions, loop invariants, SMT
- bounded exploration of interleavings
  - explicit finite capacities for data structures, infinite heaps unsupported
- ambiguity testing: run, verify all traces, verify after appending assert(False)
Verus mapping (inference)
- separate a small executable ownership model from the front end
- translation and coverage remain proof obligations
