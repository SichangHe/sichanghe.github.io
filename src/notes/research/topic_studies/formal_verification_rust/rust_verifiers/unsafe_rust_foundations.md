unsafe Rust foundations: what a library proof must actually establish
(authored by agents unless marked 🧑)

takeaway
- proving an unsafe function safe for one caller is weaker than proving a safe API sound
  - a safe API must preserve the assumptions relied on by every allowed safe caller
  - [Gillian-Rust, PLDI 2025](https://doi.org/10.1145/3729289), §1: “no fully-safe program calling it may trigger UBs”
  - UB means undefined behavior, operations outside the language's allowed behavior
- distinguish ownership proofs, pointer-aliasing rules, and execution tests
  - ownership proofs explain why a component may access particular memory
  - aliasing rules determine which overlapping pointer accesses the compiler may assume cannot occur
  - execution tests inspect selected runs
  - these answer related but different questions

RustBelt: justify safe abstractions implemented with unsafe code
- Jung, Jourdan, Krebbers, and Dreyer, [POPL 2018](https://plv.mpi-sws.org/rustbelt/popl18/)
  - models Rust ownership and lifetimes in Iris, a logic implemented in Rocq
  - separation logic reasons about separately owned memory
  - proves that library implementations meeting suitable obligations preserve safe clients' guarantees
- its program language is an idealized Rust model
  - Gillian-Rust's [2025 account](https://doi.org/10.1145/3729289), §1 explains the model's simplifications
  - proofs of modeled libraries do not automatically establish correctness of current upstream source
- the paper's §1 reports modeled versions of Arc, Rc, Cell, RefCell, Mutex, RwLock, swap, and thread spawning
  - [RustBelt](https://plv.mpi-sws.org/rustbelt/popl18/): “λ Rust ports”
  - this covers library designs within the model, not a line-by-line check of current standard-library code
- use it to identify the obligations of a safe wrapper
  - do not treat it as a push-button checker for arbitrary crates

RustHornBelt: describe what borrowed values eventually become
- Matsushita, Denis, Jourdan, and Dreyer, PLDI 2022
  - [paper](https://doi.org/10.1145/3519939.3523704)
  - extends the ownership foundation to functional correctness with unsafe implementations
  - prediction variables let contracts describe a mutable borrow's value when it is returned
  - these predictions are constrained logical objects, not guesses accepted without proof
- Gillian-Rust's [2025 account](https://doi.org/10.1145/3729289), §1 describes manual Rocq proofs
  - code is manually translated into the model
  - it supplies a foundation for later automation, rather than production source verification by itself

Stacked Borrows and Tree Borrows: allowable overlapping pointer accesses
- [Stacked Borrows](https://doi.org/10.1145/3371109), POPL 2020
  - tracks access permissions through a stack-like history of pointer creation and use
  - constrains raw pointers as well as references
  - abstract: “optimizations that reorder memory accesses”
  - its Coq proofs justify selected compiler transformations under the model
  - the authors also ran substantial standard-library tests through an interpreter implementing the model
- [Tree Borrows](https://doi.org/10.1145/3735592), Villani, Hostert, Dreyer, and Jung, PLDI 2025
  - organizes related pointer permissions as a tree
  - addresses limitations of the earlier aliasing model
  - abstract: “Tree Borrows rejects 54% fewer test cases”
  - the evaluation studies the 30,000 most widely used crates
  - this compares rejection by two models, rather than measuring a 54% reduction in real bugs
  - the paper also gives Rocq proofs of supported compiler optimizations
- these models must not be silently identified with ownership typing
  - [Gillian-Rust §8](https://doi.org/10.1145/3729289) explicitly excludes Stacked Borrows and Tree Borrows
  - inference: a library ownership proof can still need a separate argument that its accesses obey the intended aliasing model

Miri: useful execution checking, not an all-input proof
- [official README](https://github.com/rust-lang/miri)
  - interprets Rust programs and tests
  - checks invalid memory accesses, uninitialized values, alignment, invalid values, and data races
  - supports experimental aliasing checks for Stacked Borrows and Tree Borrows
- the README states: “Miri tests one of many possible executions”
  - a passing test therefore does not establish correctness for all inputs or thread schedules
  - running multiple seeds and layouts can expose more mistakes
- the README also states: “Miri uses its own approximation”
  - its checked behavior follows evolving compiler assumptions
  - passing under one compiler version does not promise compatibility with every future version
- systems with external calls or platform-specific behavior may need replacements or narrower test harnesses

MiniRust and the remaining specification problem
- [MiniRust](https://github.com/minirust/minirust) defines an idealized MIR-like core language
  - README: “the translation does a *lot* of work”
  - translating real Rust into that model is a separate responsibility
  - the model makes evaluation order, representation, and undefined behavior explicit
  - its memory interface separates language execution from the selected memory model
- the [Unsafe Code Guidelines repository](https://github.com/rust-lang/unsafe-code-guidelines) is now primarily a discussion and issue tracker
  - README: “Most of it has been archived”
  - it points to the operational-semantics team's decisions and the Rust Reference for current consensus
  - do not cite an archived guideline as though it were a settled language rule
- [current Rust Reference on undefined behavior](https://doc.rust-lang.org/reference/behavior-considered-undefined.html)
  - pin the rules and compiler revision used for a proof

2025–2026 developments worth connecting
- [Gillian-Rust/Creusot, 2025](https://doi.org/10.1145/3729289)
  - combines automated safe-client proofs with targeted unsafe-library proofs
- [Tree Borrows, 2025](https://doi.org/10.1145/3735592)
  - provides a newer aliasing model to connect to those library proofs
- [Foundational VeriFast, January 2026 version](https://arxiv.org/abs/2601.13727v1)
  - produces early checked proof scripts but acknowledges an unvalidated execution model
- [RefinedRust extension, October 2026](https://doi.org/10.1145/3839484)
  - adds traits, closures, iterators, and a real allocator case study
  - these advances do not make the specification, frontend, and system-boundary questions disappear

research we could do
- proposal: connect one verified unsafe API to Tree Borrows
  - builds on [RustBelt](https://plv.mpi-sws.org/rustbelt/popl18/), [Tree Borrows](https://doi.org/10.1145/3735592), and an existing tool's library artifact
  - new contribution: prove the actual pointer-access pattern follows the aliasing rules alongside ownership and functional invariants
  - start with mutable linked-list element access
  - why it may matter: removes a gap explicitly acknowledged by Gillian-Rust
  - success means a theorem connecting the models, not only tests that pass under Miri
- proposal: compare verifier execution models on the same unsafe operations
  - builds on [Radium](https://doi.org/10.1145/3656422), [VeriFast certificates](https://arxiv.org/abs/2601.13727v1), and [MiniRust](https://github.com/minirust/minirust)
  - new contribution: a small shared suite specifying allocation identity, pointer casts, stack lifetimes, and storage reuse
  - why it may matter: isolates disagreements that a solver cannot fix
  - tests can find disagreement; model equivalence proofs are needed to establish agreement
- proposal: maintain proof assumptions through compiler upgrades
  - builds on Miri's evolving checks and unsafe-library proof artifacts
  - new contribution: explicit records linking proof rules to compiler version, library revision, and aliasing model
  - why it may matter: prevents an old result being presented as a proof of newer code
  - evaluate actual upgrades and separate model changes from implementation bugs

reading status
- read Gillian-Rust's full-text account of these foundations
- checked the collected RustBelt, Stacked Borrows, and Tree Borrows abstracts and selected passages
- checked current Miri, MiniRust, and Unsafe Code Guidelines READMEs
- no independent reproduction of these foundational proofs is claimed
