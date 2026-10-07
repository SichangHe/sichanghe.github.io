Rust program verifiers
(authored by agents unless marked 🧑)

start here
- a proof checks code against a stated property under a chosen model
- tools differ in supported Rust, properties, proof automation, and trusted components
- [actual verified systems](verified_systems.md) shows what these distinctions mean in practice
- [research directions](research_directions.md) proposes experiments rather than ranking tools
- reviewed October 7, 2026
  - reported results have not been independently reproduced
  - current project documentation can differ from older paper snapshots

choose a reading path
- checking ordinary code for selected failures
  - [Kani](kani.md) for symbolic harnesses and machine values
  - [Flux](flux.md) for bounds and rules attached to types
- proving functional behavior of safe code
  - [Prusti](prusti.md) and [Creusot](creusot.md) for contracts
  - [Aeneas](aeneas.md) and [hax](hax.md) for proof-assistant extraction
- proving unsafe libraries
  - [RefinedRust](refinedrust.md), [Gillian-Rust](gillian_rust.md), and [VeriFast](verifast.md)
  - read [unsafe foundations](unsafe_rust_foundations.md) before comparing their safety claims
- proving system-specific guarantees
  - [Verus](verus.md) and [verified systems](verified_systems.md)

all notes
- [collected primary papers](collected_papers.md): newly archived source texts and provenance
- [verus](verus.md): proof-oriented Rust for concurrency, low-level code, and systems properties
- [prusti](prusti.md): safe Rust contracts through Viper and the state of the Prusti project
- [creusot](creusot.md): Rust contracts through Why3, borrowed values, and newer ghost-ownership APIs
- [kani](kani.md): machine-precise checking, loop contracts, and explicit bounds and missing checks
- [rust std verification effort](rust_std_verification_effort.md): the standard-library campaign, its counts, and proof coverage limits
- [aeneas](aeneas.md): safe Rust translated into functional code for proof assistants
- [hax](hax.md): Rust extraction for cryptographic proofs and backend-specific boundaries
- [flux](flux.md): inferred type refinements, TickTock, Thrust, Flex, and Forte
- [refinedrust](refinedrust.md): Rocq-checked safe and unsafe Rust proofs, including the ACE allocator
- [gillian rust](gillian_rust.md): unsafe-library proofs composed with Creusot safe-client proofs
- [verifast](verifast.md): explicit ownership proofs and early Rocq certificates with known model gaps
- [unsafe rust foundations](unsafe_rust_foundations.md): RustBelt, aliasing models, Miri, and the obligations of safe wrappers
- [newer tools 2025 2026](newer_tools_2025_2026.md): RustyDL, Corten, Flex, Rust-Prover, and recent semantic foundations
- [verified systems](verified_systems.md): actual systems and the exact properties and components proved
- [open problems](open_problems.md): documented limitations and the questions they leave open
- [research directions](research_directions.md): five proposed studies with prior work, novelty risks, and first experiments

related existing notes
- [static analysis](../../../static_analysis.md): prior tool map and assumption-carrying verification
- [October Verus collection](../../../verus_frontier_20261006.md): recent primary papers and existing proposal
- [new-work arguments](../../../new_work_arguments.md): earlier research arguments to build on
- [Agave pilot scope](../../../agave_verification_scope.md): already-sized synchronous component targets
- [complete four-part study](../index.md)

consultation status
- parallel agents and a fresh reviewer examined the notes
- ChatGPT requests verified the Extra High setting
  - requests returned no usable answer
  - no ChatGPT opinion is represented as evidence
- requested Opus and Fable models were unavailable in this session
  - available agents performed the parallel review
