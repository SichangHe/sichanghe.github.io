hax: choose a prover for each Rust property
(authored by agents unless marked 🧑)

takeaway
- hax translates selected Rust code to languages used by several proof tools
  - it is particularly established around cryptographic software
  - proof scope depends on the backend, selected code, specifications, and assumptions
- hax 0.4's recommended Lean backend uses Charon and Aeneas
  - its older direct Lean backend is now called legacy-lean
  - use [the Aeneas note](aeneas.md) for that pipeline's borrowing limits
- evidence checked on 2026-10-07

how it works
- the developer selects code and a proof backend
  - Rust annotations express input requirements, output guarantees, and selected proof information
  - [Bhargavan and colleagues, 2025 tool paper](https://eprint.iacr.org/2025/142): "different verification tools are better at handling different kinds of verification goals"
- the F* and several other backends use hax's compiler-facing frontend and translation engine
  - [engine documentation](https://github.com/cryspen/hax/blob/main/engine/README.md): "a sequence of rewrite phases"
  - these phases turn the compiler's typed program into the chosen prover's language
  - F* supports mathematical specifications and automated proof obligations
  - ProVerif analyzes protocol security using an abstract model of cryptographic operations
  - SSProve supports proofs about probabilistic cryptographic programs
- the new Lean backend follows a different route
  - Charon extracts Rust, and Aeneas generates pure Lean functions
  - hax adds extracted contracts, core-library models, and a Lean project
  - [0.4 release, 2026-09-29](https://hax.cryspen.com/blog/2026/09/29/hax-04-easier-to-install-and-configure-and-a-new-lean-backend/): "The new Lean backend does not use the hax engine"
- extraction is not a finished proof
  - the 0.4 backend emits a theorem with Lean's placeholder `sorry`
  - the user must replace that placeholder with a checked proof
  - a successful Lean build can contain such placeholders
  - [release's Lean/Aeneas section](https://hax.cryspen.com/blog/2026/09/29/hax-04-easier-to-install-and-configure-and-a-new-lean-backend/)

properties and feature boundaries
- contracts can establish mathematical results and absence of modeled failures
  - the new Lean backend models panics and integer overflow
  - a suitable theorem proves successful execution and the stated output property under its input requirement
  - [0.4 release, Lean/Aeneas section](https://hax.cryspen.com/blog/2026/09/29/hax-04-easier-to-install-and-configure-and-a-new-lean-backend/)
- loops require a proof of the relevant invariant and sometimes termination
  - an invariant states what remains true across every loop iteration
  - [January 2026 legacy-Lean tutorial](https://hax.cryspen.com/blog/2026/01/19/verifying-a-real-world-rust-crate/) proves termination and panic freedom for a `u16` greatest-common-divisor function
  - author wording: "we did not have support for while loops then"
  - this historical tutorial predates the new Aeneas-based backend
- backend maturity differs
  - [current README](https://github.com/cryspen/hax#supported-backends) labels F* "stable"
  - Rocq, ProVerif, SSProve, and EasyCrypt are labeled experimental
  - Lean is under active development
- support for traits, closures, unsafe code, and async cannot be summarized by one backend-independent yes/no
  - this pass did not recover a complete current feature matrix
  - the Aeneas route's current limits include unsafe code and concurrency
  - a translated model of an intrinsic does not prove its implementation
  - check the exact selected function, backend, target architecture, and assumptions

what must be trusted
- translation and library models require justification outside ordinary client proofs
  - [tool paper abstract](https://eprint.iacr.org/2025/142): "systematically test our translated models"
  - testing increases confidence without proving all translations correct
- abstract cryptographic proofs also have explicit assumptions
  - a symbolic protocol model does not by itself establish a computational security theorem for compiled code
  - inference from the multiple-backend architecture
- Rust compiler, external functions, and platform behavior remain separate boundaries
  - [libcrux README](https://github.com/celabshq/libcrux/blob/main/Readme.md): "executables compiled from the code in this repository are *not* verified to be side-channel resistant"
  - side channels reveal secrets through observations such as execution time
  - source-level secret independence and compiled timing security are different properties

real applications
- libcrux contains both generated HACL* code and Rust verified through hax
  - [maintainers' README](https://github.com/celabshq/libcrux/blob/main/Readme.md) distinguishes these verification routes
  - proofs of HACL* source do not automatically cover the top-level Rust wrappers
  - crates and feature sets have different proof coverage
- libcrux ML-KEM has detailed partial verification evidence
  - ML-KEM is a standardized way to establish a shared secret using public-key cryptography
  - the [crate README](https://github.com/celabshq/libcrux/blob/main/libcrux-ml-kem/README.md) names portable and AVX2 arithmetic, polynomial operations, serialization, and generic algorithms
  - the [detailed status file](https://github.com/celabshq/libcrux/blob/main/libcrux-ml-kem/proofs/verification_status.md) warns: "treat the table below as a rough guide"
  - its portable arithmetic row records 13 functions, with `13/13` panic-free and `13/13` correct
  - its AVX2 arithmetic row records `12/12` panic-free and `11/12` correct
  - its Neon arithmetic row records `0/13` in both proof columns
  - the table's correctness column covers several possible properties
    - output ranges, mathematical identities, or full input/output specification
    - do not sum these entries into a claim of whole-library correctness
  - these are repository-maintainer reports
    - proof replay and correspondence with a deployed release were not checked here
- Bert13 combines functional and protocol-security proofs
  - [Bhargavan and colleagues, CCS 2025](https://eprint.iacr.org/2025/980) describe a post-quantum TLS 1.3 implementation
  - exact author wording: "verified both for security and functional correctness"
  - the paper connects several proving tasks within one Rust-centered workflow
  - the [artifact repository](https://github.com/cryspen/bertie) still contains an older Bertie README
    - it says "strictly work-in-progress"
    - this does not identify the completed paper artifact's exact branch or whole-repository proof status
  - complete size, proof effort, and discovered-bug counts were not recovered from the accessible abstract
- greatest-common-divisor crate tutorial
  - [January 2026 example](https://hax.cryspen.com/blog/2026/01/19/verifying-a-real-world-rust-crate/) establishes termination and panic freedom for selected Euclidean code
  - the demonstrated postcondition is true
  - that theorem alone does not prove the returned value is the greatest common divisor

2025–2026 activity
- [2025 tool paper](https://eprint.iacr.org/2025/142) explains the multi-prover architecture and model testing
- [CCS 2025 protocol paper](https://eprint.iacr.org/2025/980) presents Bert13
- [September 2026 release](https://hax.cryspen.com/blog/2026/09/29/hax-04-easier-to-install-and-configure-and-a-new-lean-backend/) changes installation and the recommended Lean route
  - proof scenarios in `hax.toml` pin selection, backend, and extraction configuration
  - extraction failures now produce a nonzero exit status
  - source contracts written with `anodized` can also be extracted
  - the announcement states: "Our main goal for the next release is robustness"
  - interpretation: broad crate coverage is still a goal

research we could do
- make proof coverage depend on the actual shipped build
  - builds on [libcrux's status reporting](https://github.com/celabshq/libcrux/blob/main/libcrux-ml-kem/proofs/verification_status.md) and [hax proof scenarios](https://hax.cryspen.com/blog/2026/09/29/hax-04-easier-to-install-and-configure-and-a-new-lean-backend/)
  - proposed contribution: check that every reachable implementation selected by features and CPU dispatch has the required theorem
  - include theorem dependencies, external models, and accepted assumptions
  - why it may matter: a verified portable path can coexist with an unproved optimized path
  - first experiment: ML-KEM portable, AVX2, and Neon builds
  - evaluate deliberately stale proofs, changed features, and missing dispatch alternatives
  - novelty needs comparison with existing proof-status tooling and build-specific assurance work
- connect protocol proofs to concrete parsers and cryptographic implementations
  - builds on [Bert13's multi-prover methodology](https://eprint.iacr.org/2025/980)
  - proposed contribution: reusable checked correspondence lemmas across the backend boundary
  - why it may matter: separate successful proofs can still disagree about message encoding or cryptographic interfaces
  - first experiment: one TLS message's parsing, serialization, and protocol interpretation
  - measure assumptions removed rather than only proof automation success
- test whether the two translation routes agree
  - builds on [hax model testing](https://eprint.iacr.org/2025/142) and its [new Aeneas-based backend](https://hax.cryspen.com/blog/2026/09/29/hax-04-easier-to-install-and-configure-and-a-new-lean-backend/)
  - proposed contribution: compare F* and Lean behavior on identical Rust arithmetic and parsing examples
  - why it may matter: disagreement can expose extraction or library-model bugs
  - first experiment: overflow, signed division, casts, array bounds, and panic paths
  - deliberately mutate one model to measure detection
  - agreement is evidence of consistency rather than a soundness proof

reading order
- [hax tool paper](https://eprint.iacr.org/2025/142): architecture and testing
- [Bert13 paper](https://eprint.iacr.org/2025/980): combined functional and security verification
- [libcrux ML-KEM proof status](https://github.com/celabshq/libcrux/blob/main/libcrux-ml-kem/proofs/verification_status.md): concrete coverage boundaries
- [hax 0.4 release](https://hax.cryspen.com/blog/2026/09/29/hax-04-easier-to-install-and-configure-and-a-new-lean-backend/): current workflow
