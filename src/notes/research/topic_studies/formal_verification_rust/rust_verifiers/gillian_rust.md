Gillian-Rust: verify unsafe libraries, then prove their safe clients
(authored by agents unless marked 🧑)

takeaway
- Gillian-Rust checks unsafe implementation code while Creusot checks safe clients using the resulting contracts
  - Ayoun, Denis, Maksimović, and Gardner, [PLDI 2025](https://doi.org/10.1145/3729289), abstract
    - the authors describe dividing proof effort between automated safe Rust and targeted unsafe Rust
  - the value is a connection between library proofs and client proofs
  - its evaluated vector proof has an explicit unfinished obligation

how it works
- users supply ownership predicates, contracts, and selected proof commands
  - an ownership predicate describes the memory belonging to a value and the rules its representation must satisfy
- the compiler translates MIR into Gillian's intermediate language
- Gillian symbolically executes functions
  - it reasons about unknown inputs instead of enumerating concrete test inputs
  - its memory model handles byte allocations, typed accesses, raw pointers, and mutable borrows
  - separation logic tracks memory ownership; see [the shared foundations note](unsafe_rust_foundations.md)
- RustBelt supplies the lifetime reasoning and RustHornBelt supplies reasoning about borrowed values' eventual contents
- shared specification macros interpret library contracts for Gillian-Rust and Creusot
  - Creusot assumes these contracts at calls; Gillian-Rust checks the unsafe implementations
  - [paper §6](https://doi.org/10.1145/3729289) gives the precise conversion
  - matching a contract across both tools is part of the proof boundary

actual verified code and boundaries
- a subset of upstream LinkedList
  - new, push_front, pop_front, push_back, pop_back, front_mut
  - the paper's §7 table reports 130 executable lines, 227 annotation lines, and 0.45 seconds for functional correctness
  - the discussion reports 0.72 seconds including auxiliary lemmas
  - these are different totals, not contradictory performance claims
  - closure calls were manually inlined
- a subset of upstream Vec and a simplified MiniVec
  - table: Vec has 294 executable lines and 107 annotation lines for functional correctness
  - table: 2.57 seconds for that Vec proof; 1.35 seconds for MiniVec
  - these are authors' measurements on their specified 2019 MacBook Pro
  - allocator genericity was removed, closures inlined, and trait layers manually expanded
  - zero-sized element types were excluded
  - §7: “left unproven for now”
    - this refers to the borrow extraction obligation for mutable element access
    - the Vec functional-correctness result is conditional on that unfinished proof
  - do not present this as a complete proof of upstream Vec
- safe clients proved through Creusot include merge sort, gnome sort, and right padding
  - [§7](https://doi.org/10.1145/3729289) reports 68 executable lines for merge sort and 6.3 seconds wall time
  - this demonstrates composition on small clients, not an entire production application
- no production-system verification or newly discovered bug was established by the case studies read here
  - the concrete achievement is selected standard-library code and client examples

supported properties and missing features
- checks type safety and functional correctness for supported unsafe code
  - safe wrappers must preserve ownership invariants for every allowed safe caller
  - checked panic paths must be unreachable under the contract
- the 2025 implementation is explicitly a proof of concept
  - [§8](https://doi.org/10.1145/3729289) identifies closures and other unimplemented MIR constructs
  - specifications support at most one lifetime
  - this blocks iterator APIs needing relationships between multiple borrowed lifetimes
- shared references and their ownership predicates are unfinished
- concurrent constructs and Send/Sync obligations are outside the evaluated support
  - general concurrent usefulness of a specification is not verification of thread creation or atomic operations
- no checked aliasing model connection to Stacked Borrows or Tree Borrows
- do not infer termination or async support from symbolic execution

what still needs trust
- compiler translation, Gillian's implementation and memory model, solver answers, and contract conversion
- unlike RefinedRust, these runs do not emit Rocq-checked proofs of every verified function
- the paper also identifies gaps in the mathematical justification
  - [§8](https://doi.org/10.1145/3729289): “small gaps in the justification of its soundness”
  - its treatment of time-dependent logical rules and prediction variables is argued for, rather than fully formalized
  - compare performance only after accounting for these proof-boundary differences

research we could do
- proposal: finish the mutable-borrow proof before enlarging the benchmark
  - builds on [the hybrid paper's Vec caveat](https://doi.org/10.1145/3729289)
  - new contribution: checked extraction proofs for get_mut/index_mut with explicit ownership restoration
  - why it may matter: removes a stated assumption from a widely cited library result
  - evaluate changed proof obligations, supported element types, and whether safe clients retain the same contracts
- proposal: compositional proofs of mutable iterators
  - builds on [Gillian-Rust's lifetime logic](https://doi.org/10.1145/3729289) and [RefinedRust's iterator extension](https://doi.org/10.1145/3839484)
  - new contribution: multi-lifetime specifications plus a checked safe-client connection
  - start with IterMut over a selected linked-list implementation
  - why it may matter: repeated mutable access is central to useful collection APIs
- proposal: check specification conversion between tools
  - builds on [the Gillian-Rust/Creusot hybrid encoding](https://doi.org/10.1145/3729289)
  - new contribution: independently check that both backends interpret integer bounds, sequence models, and borrowed results identically
  - why it may matter: proving a library contract and assuming a subtly different client contract can defeat composition
  - evaluate deliberately altered contracts and actual upstream API revisions

reading status
- read the collected PLDI 2025 full text and its limitations
- [artifact](https://doi.org/10.5281/zenodo.15183201)
- no claim here that the 2025 limitations remain unchanged in every later repository revision
