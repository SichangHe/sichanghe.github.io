open problems in Rust program verification
(authored by agents unless marked 🧑)

main distinction
- a successful proof establishes a specified property of the supported program model
- deploying a correct system additionally needs adequate specifications, correct translation, justified dependencies, and proof maintenance
- each problem below separates a documented limitation from an agent inference

unsafe libraries behind safe APIs
- documented problem
  - [standard-library campaign](rust_std_verification_effort.md) encounters pointer aliasing, reference validity, intrinsics, and generic code
  - [Flux](flux.md) relies on refined wrappers for pointer operations
  - [hybrid Gillian/Creusot](gillian_rust.md) already combines safe and unsafe proof methods
- agent inference
  - useful progress is connecting checked contracts across tools
  - another wrapper around a trusted unsafe function leaves the central proof obligation unresolved
- concrete question
  - does the unsafe proof justify the exact ownership and functional rules assumed by safe callers?

concurrent code and actual hardware
- documented problem
  - [Kani](kani.md) focuses on sequential code
  - [RefinedRust](refinedrust.md) and [VeriFast](verifast.md) have different restrictions from their underlying proof logics
  - [verified systems](verified_systems.md) prove selected controller, kernel, storage, and security properties
    - each uses explicit environment or hardware assumptions
- agent inference
  - a logic's ability to express concurrency does not show its Rust frontend supports arbitrary atomics, interrupts, or devices
- concrete question
  - which memory-ordering and device effects must the proof model include for one chosen guarantee?
  - [unsafe foundations](unsafe_rust_foundations.md) explains evolving aliasing models

specifications that describe the intended behavior
- documented problem
  - the October collection (local note; not yet published) distinguishes translated theorem success from source-code correspondence
  - [existing specification notes](../../../autoverus_citations_20260801.md) discuss non-vacuity and documentation-derived requirements
- a vacuous proof is one whose assumptions admit no relevant execution
- agent inference
  - passing tests or surviving mutations supports a specification's usefulness
  - neither establishes completeness against every intended requirement
- concrete question
  - can independent examples and deliberately incorrect implementations expose omissions before proof automation begins?
  - coordinate with [LLM specification research](../llm_for_verification/specifications.md)

proof-producing backends with trusted frontends
- documented problem
  - [Flex and Rust-Prover](newer_tools_2025_2026.md) check target proofs in Lean
  - [VerusBelt](newer_tools_2025_2026.md) justifies a significant subset of proof-oriented types
  - these results leave distinct translation and execution gaps
- agent inference
  - reducing trust in the solver does not automatically reduce trust in the source-language translation
- concrete question
  - can a restricted translator produce a checkable certificate of semantic preservation?
  - overflow, panics, indexing, borrowing, and proof-code removal need separate treatment

ordinary Rust without rewriting it for the verifier
- documented problem
  - tool support differs for traits, closures, iterators, external libraries, and unsafe code
  - [Aeneas](aeneas.md), [hax](hax.md), [Creusot](creusot.md), and [RefinedRust](refinedrust.md) take different approaches
- agent inference
  - comparing annotation counts is misleading if one tool verifies a rewrite and another verifies upstream source
- concrete question
  - how much source adaptation is needed for the same property on the same crate version?
  - report modeled dependencies and missing functions separately from verified code

keeping proofs useful after code changes
- documented problem
  - the [standard-library effort](rust_std_verification_effort.md) follows upstream releases
  - [Verus](verus.md) research documents solver instability under semantically irrelevant changes
- distinguish three causes of failure
  - the implementation violates the property
  - the specification no longer fits the interface
  - the property remains true but the proof search fails
- agent inference
  - proof-maintenance experiments should measure diagnosis and repair across these causes
  - a synthetic variable-renaming benchmark alone misses real API and dependency changes
- concrete question
  - can checking a changed contract identify exactly which caller proofs need repair?
  - coordinate with [practical proof maintenance](../practical_fv/proof_maintenance_repair.md)

fair evaluation across tools
- agent recommendation
  - fix the source version, target property, architecture, and dependency assumptions
  - report source adaptation, specification work, proof work, unchecked functions, and verification time
  - distinguish bounded checking, inductive proof, and proof-assistant checking
  - include failed targets and unsupported features
  - record whether proof artifacts were reproduced
- why
  - successful proofs of different claims do not form a meaningful ranking
- [research proposals with small first experiments](research_directions.md)
