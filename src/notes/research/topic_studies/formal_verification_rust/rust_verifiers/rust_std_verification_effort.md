Rust standard-library verification: substantial coverage with explicit gaps
(authored by agents unless marked 🧑)

takeaway
- the campaign verifies production library code in a maintained Rust fork
- successful checks cover particular properties and functions
  - they do not establish full correctness of the entire standard library
- this note records the June 2026 paper's snapshot
  - current project documentation was checked on 2026-10-06
  - [Cook et al., Verifying the Rust Standard Library](https://arxiv.org/abs/2606.17374)
  - [public repository](https://github.com/model-checking/verify-rust-std)

the target and organization
- `core`, `alloc`, and `std`, totaling 33,955 functions in the paper's analyzed snapshot
- an open challenge program combines contributed specifications, proofs, review, and continuous integration
  - the fork is periodically synchronized with upstream Rust
  - source evidence, paper §1: “integrated four verification tools”
    - Kani, ESBMC, VeriFast, and Flux
    - Verus, Creusot, KRust, and RAPx were under review in that snapshot
  - [project introduction](https://model-checking.github.io/verify-rust-std/): “memory safety and a subset of undefined behaviors”
- specifications include valid-call conditions, promised results, and loop conditions
  - safe input representation alone is insufficient for unsafe functions requiring a particular allocation or ownership history

what was actually established
- automatic Kani harnesses
  - 16,748 generated; 11,970 successfully verified
  - 4,778 unsuccessful due to missing models, timeouts, or unsupported features
  - generated harnesses include 4,645 unsafe functions and 1,126 safe wrappers over unsafe code
  - successful checks establish Kani-supported properties on the admitted inputs
  - failures are not automatically implementation bugs
- function-contract proofs
  - 989 functions, comprising 295 automatic and 694 manually contributed proofs
  - this count measures a different kind of artifact from automatic harness success
    - do not add the counts as disjoint coverage
- VeriFast linked-list proofs
  - 19 directly verified functions and 5 additional functions justified through verified callees
  - include functional postconditions and stronger pointer reasoning on the covered operations
  - still subject to the paper's reference-validity and aliasing-model qualifications
- observed fixes include SIMD shift behavior, missing unsafe annotations, incorrect safety comments, and panic documentation
  - these are distinct outcomes; a documentation fix is not a newly discovered exploitable memory bug
  - all counts and outcomes above come from Cook et al., §§4–5

proof boundaries
- automatic checks do not cover every class of Rust undefined behavior
  - paper §2 identifies unchecked “pointer aliasing rules”
  - data races, invalid inline assembly, and some pointer-provenance behavior are also outside the reported Kani coverage
  - pointer provenance means the allocation and access rights associated with a pointer's origin
- bounds and assumptions matter
  - successful unwinding checks justify the chosen iteration limit for admitted inputs
  - restricted input lengths restrict the claim
  - loop contracts can establish induction without fixed expansion
  - the paper did not prove loop termination with Kani
    - [current Kani support differs](kani.md)
- generic functions remain the largest automatic-harness exclusion
  - 9,635 skipped functions
  - concrete type instantiations do not establish correctness for every type
- concurrency challenges remain open in the paper's snapshot
  - atomic types and `Arc` had no accepted challenge solutions
  - proofs of simplified implementations with stronger memory ordering do not settle the standard library's relaxed-memory implementations
- upstream compiler semantics, intrinsic models, and tool implementations remain trusted dependencies
  - source evidence, paper §6.1: “71 unsupported Rust intrinsics and 813 unmodeled library functions”
  - 721 unmodeled functions were LLVM-internal SIMD intrinsics
- the SIMD challenge used randomized testing of 565 executable intrinsic models
  - the paper explicitly distinguishes this from formal proof
  - two upstream bugs were found

Creusot work after the campaign snapshot
- [official Creusot research list](https://creusot.rs/research) lists Xia and Jourdan's RustVerify 2026 presentation
  - title: “Verifying the Rust standard library with Creusot”
  - [associated repository](https://github.com/Lysxia/creusot-rust-std)
- this is evidence of additional work
  - it does not change the June campaign's reported accepted-tool counts
  - a presentation title alone does not establish complete standard-library verification

research we could do: recommendations, not established results
- shared specifications for the most influential intrinsics
  - builds on the paper's intrinsic-model gap and SIMD challenge experience
  - proposed contribution: one precise operation specification, translated to multiple verifiers with cross-checked behavior
  - start with a small SIMD family shared by many callers
  - why it may matter: repairing one missing model can unblock many function proofs
  - evaluation: newly verified callers, architecture differences, seeded model errors, agreement with instruction documentation
  - testing against implementations increases confidence but does not prove the model is correct
- proof maintenance across upstream releases
  - builds on the maintained fork and its continuous verification
  - proposed contribution: identify changes to admitted inputs, specifications, models, and checked properties even when proofs still pass
  - compare against ordinary CI success/failure and dependency-based rerun selection
  - why it may matter: preserving a green result does not necessarily preserve its original meaning
  - evaluation: replay actual Rust updates and introduce controlled specification and model changes
- histories for ownership-sensitive APIs
  - builds on `MaybeUninit` and paired raw-pointer conversion APIs discussed in §6.2
  - proposed contribution: express initialization and ownership histories with a common contract and validate it in more than one tool
  - start with one API family, rather than all pointer provenance
  - why it may matter: valid bits alone do not establish legal use of unsafe interfaces
- a small shared benchmark for generic verification
  - builds on automatic-harness exclusions and existing deductive verifiers
  - proposed contribution: same production functions and same safety requirements checked using concrete instances and generic proofs
  - measure annotation effort, unsupported features, proof strength, and discovered faults separately
  - why it may matter: function counts otherwise hide differences in what each tool has established

what to read next
- [Le Blanc and Lam, Lessons Learned So Far, 2025](https://arxiv.org/abs/2510.01072)
  - independent early account of tool limits and specification obstacles
  - the authors explicitly describe it as “work-in-progress”
  - useful for distinguishing longstanding difficulties from the 2026 campaign's new scale
- [campaign paper](https://arxiv.org/abs/2606.17374)
  - mechanisms, counts, and threats to validity
- [challenge book](https://model-checking.github.io/verify-rust-std/)
  - live targets and contribution requirements
- [Kani note](kani.md)
  - bounded checking, induction, current termination support, and limits
- [existing static-analysis study](../../../static_analysis.md)
  - broader comparison already present in the human's research notes
