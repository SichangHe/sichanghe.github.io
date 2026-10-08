Flux, Thrust, and refinement types for Rust
(authored by agents unless marked 🧑)

why read this
- Flux checks useful numeric and access-control rules with fewer handwritten loop invariants than a general proof tool
- TickTock shows this approach can help verify an existing embedded OS
- stronger borrow reasoning and a smaller trusted proof engine are active research directions
- status: primary papers read; reported experiments not reproduced

Flux
- [Lehmann et al., PLDI 2023](https://arxiv.org/abs/2207.04034), §1 and §4
  - authors: “automatically synthesize loop-invariant annotations”
  - a refinement type adds a logical rule to a type
    - example: a vector carries its length, and an index must be smaller than that length
  - Flux runs over Rust compiler intermediate code after borrow checking
  - it uses Rust ownership to track which values a function may change
  - it turns type checks into logical implications with unknown predicates
    - a predicate is a rule that evaluates to true or false
    - unknown predicates describe facts needed at loops and function boundaries
  - the solver searches candidate predicates to fill those gaps
    - these candidates are called qualifiers
    - users sometimes supply extra candidates
  - ordinary mutable references preserve the tracked refinement
  - a special strong reference permits changing it
    - the function signature states the resulting refinement
- useful properties
  - array bounds, numeric relations, container element rules, and data-dependent access control
  - some generic code and trait specifications
    - [Lehmann et al., Generic Refinement Types, POPL 2025](https://doi.org/10.1145/3704885)
    - verified examples include policy checks in small web applications using Diesel
  - unbounded loops when the solver finds an adequate invariant
    - this differs from checking only a fixed number of loop iterations
- proof boundary
  - Flux trusts the compiler, its translation, the constraint solver, the SMT solver, and declared trusted functions
  - the [Flux book, configuration](https://flux-rs.github.io/flux/guide/specifications.html#ignored-and-trusted-code) explains trusted functions
    - author documentation: “Flux won't verify its body against its signature”
    - callers can still use the declared signature
  - unsafe pointer writes need additional models or trusted wrappers
  - the [standard-library lessons paper, Le Blanc and Lam, §2 and §4](https://arxiv.org/abs/2510.01072)
    - authors: “it cannot track values written through pointers”
    - authors: “KMIR and Flux do not support concurrency”
  - its original logical fragment cannot express every exact container-content property
    - the PLDI 2023 paper restricts refinements to simple formulas combined with type constructors
    - Flex below extends what can be proved
- original comparison with Prusti
  - PLDI 2023, table 1: seven vector benchmarks and four Wave modules
  - Flux: 944 source lines, 145 specification lines, 7.13 seconds total
  - Prusti: 921 source lines, 315 specification lines, 246.65 seconds total
  - interpretation: evidence for these bounds-oriented tasks
    - source and specifications were adapted for each tool
    - this does not establish that Flux is faster for arbitrary functional correctness proofs

TickTock: the main systems result
- [Rindisbacher et al., SOSP 2025](https://cseweb.ucsd.edu/~dstefan/pubs/rindisbacher:2025:ticktock.pdf), §2, §5, figures 13 and 15
  - authors: “22KLOC Rust source”
  - authors: “yielding six bugs that broke isolation”
  - authors: “125 are marked #[trusted]”
- target: process isolation in Tock's ARMv7-M platforms and three 32-bit RISC-V platforms
  - checks memory-protection configuration and process memory layout
  - checks relevant ARM interrupt/context-switch assembly through a Rust hardware model
  - the hardware model covers the subset needed by Tock
- exact reported scale
  - 22,131 Rust lines and 3,603 specification lines
  - 2,581 functions, including 125 trusted functions
  - seven bugs found in total
    - five in memory-protection configuration
    - two in interrupt handling
    - six break isolation; one is a denial-of-service overflow
- redesign helped proof cost
  - monolithic kernel verification: 5 minutes 19 seconds
  - granular kernel verification: 36 seconds
  - context-switch overhead within 0.3% of upstream Tock
- what remains assumed
  - refined pointer wrappers and parts of the standard library
  - hardware specifications and compiler behavior
  - selected functions excluded because of tool limitations or scope
  - some arithmetic facts checked separately in Lean are trusted by Flux
  - safe capsule code relies on Rust's language guarantees
- reading implication
  - a checked isolation property is narrower than proving every driver, scheduler behavior, or arbitrary concurrent Rust program

other Flux applications
- Wave sandboxing modules
  - Flux PLDI 2023, §5
  - four modules previously verified in Prusti
  - checked memory-region access and file-path confinement properties
  - this is a partial re-verification of Wave
- Rust standard library
  - [Cook et al., NFM 2026](https://arxiv.org/abs/2606.17374), tool descriptions and issue table
  - Flux checks numeric bounds and safety preconditions
  - paper records a fixed incorrect SAFETY comment found through Flux proofs
  - see [the standard-library campaign](rust_std_verification_effort.md)
- Forte: differential-privacy kernels
  - [Abuah, September 2026 preprint](https://arxiv.org/abs/2609.30254), §5–6
  - author: “Flux checks Forte as an ordinary library”
  - sensitivity means how much changing input can change output
  - wrapper types track sensitivity through exclusive mutable borrows
  - Flux checks clients; Verus establishes mathematical facts behind primitive signatures
  - evaluation: five OpenDP transformation families, 131 kernel lines and 23 specification lines
  - assumptions include primitive implementations, sampler behavior, and budget-token creation
  - checked local sensitivity rules do not establish that all of OpenDP is verified

Thrust: stronger automatic reasoning about mutable borrows
- [Ogawa, Sekiyama, and Unno, PLDI 2025](https://www.riec.tohoku.ac.jp/~unno/papers/pldi2025.pdf), §1, §5–6
  - authors: “currently unsupported features, such as traits and modules”
- a mutable borrow carries the current value and a logical name for its eventual final value
  - the eventual value is a prophecy variable
  - when the borrow ends, this value updates the owner
  - supports cases where a runtime branch selects which reference to mutate
- generates constrained Horn clauses
  - these are implications whose conclusions mention unknown predicates
  - Z3's Spacer engine solves them and infers loop/recursion facts
- its soundness theorem assumes well-behaved borrowing under an adapted Stacked Borrows model
  - this is a theorem about a core language
  - the compiler integration and solver remain trusted
- reported evaluation: small benchmark programs
  - shows stronger handling of conditional borrows than Flux
  - no production-system case study identified in the paper
- engineering limits
  - missing traits/modules and external-crate support in the evaluated tool
  - unsafe and interior-mutability reasoning is limited
  - source-level Rust support must be checked separately from the core-language theorem

RustHorn: the earlier prophecy approach
- [Matsushita, Tsukada, and Kobayashi, ESOP 2020 / TOPLAS 2021](https://arxiv.org/abs/2002.09002)
  - authors: “clears away pointers and memories by leveraging ownership”
- turns ownership-respecting pointer programs into constrained Horn clauses
  - mutable references use current/final-value pairs
  - solvers include Spacer and HoIce
- useful foundation for later borrow-aware verifiers
  - evaluated on small programs
  - lacks the broad library and modular-specification support needed for ordinary crate adoption

Flex: proofs checked by Lean
- [Khan et al., July 2026 preprint](https://arxiv.org/abs/2607.12226), abstract and evaluation
  - authors: “kernel checkable proofs of the CHC propositions”
- replaces trusting a constraint-solving answer with checking a generated proof
- Flux integration permits stronger functional properties using Lean proofs
  - case studies include sorting, a deque, a hash table, and TickTock arithmetic facts
- important boundary
  - a checked proof of generated clauses does not by itself verify Flux's Rust-to-clause translation
  - the paper separately proves clause generators for two small languages
  - those results should not be read as proving rustc or the complete Flux frontend
- see [newer tools](newer_tools_2025_2026.md) for the broader 2026 context

research candidates, agent proposals
- prove refined interfaces for unsafe modules once
  - builds on Flux clients and [hybrid Creusot/Gillian verification](https://doi.org/10.1145/3729289)
  - new question: can one checked unsafe contract be consumed reliably by both tools?
  - first experiment: vector or ring-buffer operations with matching ownership and length rules
  - why it may matter: removes a concrete trusted boundary in safe-client proofs
  - novelty unresolved: hybrid verification already exists
    - the contribution must concern checked contract correspondence or reduced migration cost
- measure and improve qualifier discovery
  - builds on Flux inference and Thrust's broader constraint solving
  - first experiment: remove supplied qualifier hints from existing examples
  - measure verification loss and recovery from automatically proposed candidates
  - why it may matter: distinguishes effortless inference from hidden expert work
- test whether verification-guided redesign transfers
  - builds on TickTock's granular memory-protection abstraction
  - first experiment: one additional device subsystem with the same property before and after redesign
  - measure proof time, specification changes, and runtime cost
  - why it may matter: tests a reusable systems method beyond one OS case study
- [cross-tool proposals and evaluation plans](research_directions.md)

sources and limits
- full texts read: Flux, TickTock, Thrust, RustHorn
- newer preprints and project documentation inspected
- no verifier artifacts reproduced
- volatile commit counts and star counts omitted
- upstream notes preserved as background
  - [static analysis](../../../static_analysis.md)
  - October Verus collection (local note; not yet published)
