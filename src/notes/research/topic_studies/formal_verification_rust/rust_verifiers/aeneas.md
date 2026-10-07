Aeneas: prove Rust behavior through ordinary functions
(authored by agents unless marked 🧑)

takeaway
- Aeneas removes much of the pointer bookkeeping from proofs of safe Rust
  - you prove the behavior of translated functions in Lean, HOL4, F*, or Rocq
  - the translation and models of external functions remain proof boundaries
- evidence checked on 2026-10-07
  - current support below comes from the project README
  - paper results remain dated results

how it works
- Charon reads the Rust compiler's intermediate program
  - it produces LLBC, a representation that keeps ownership and borrowing explicit
  - the [Charon paper, CAV 2025](https://arxiv.org/abs/2410.18042) calls its output a "clean, stable AST"
  - an AST is the program represented as a tree of operations and declarations
- Aeneas turns LLBC into functions without mutable memory
  - the [Aeneas paper, ICFP 2022](https://arxiv.org/abs/2206.07185) explains the translation
  - changing a borrowed value becomes computing and returning an updated value
  - generated backward functions propagate updates when a mutable borrow ends
- the user writes mathematical specifications and proofs in the selected prover
  - proofs can live separately from executable Rust
  - the [original paper, implementation section](https://arxiv.org/pdf/2206.07185) puts specifications outside Rust
  - this describes the original Aeneas workflow
  - [hax 0.4](hax.md) adds Rust contracts on top of the same translation for its Lean backend
- translated functions can model failure and nontermination
  - a theorem must state whether it proves a correct result only when execution finishes, or also proves successful termination
  - the [current README, backend support](https://github.com/AeneasVerif/aeneas#backend-support) names "extrinsic proofs of termination"
  - extrinsic means the termination proof is separate from the function definition

what it handles
- the project's current target is safe Rust
  - [maintainers, targeted subset](https://github.com/AeneasVerif/aeneas#targeted-subset-and-current-limitations): "Aeneas currently functionalizes a subset of safe Rust"
- ordinary mutable borrows, returned borrows, and loops are central use cases
  - [Ho and colleagues, ICFP 2024](https://arxiv.org/abs/2404.02680) introduce a join operation for reasoning where loop paths meet
  - author wording: "add support for loops to the Aeneas framework"
- current remaining restrictions include particular nested-loop exits
  - return inside nested loops and break or continue to an outer loop remain listed restrictions
  - instantiating a generic type with a mutable reference also remains restricted
  - [current limitation list](https://github.com/AeneasVerif/aeneas#targeted-subset-and-current-limitations)
- unsafe code and concurrency are ongoing extensions
  - the current README describes adding separation logic
  - separation logic reasons about who may access each part of memory
  - this is a development plan rather than evidence of general support today
- external dependencies require models when they are not translated
  - [maintainers, external definitions](https://github.com/AeneasVerif/aeneas#adding-models-of-rust-definitions-to-the-lean-backend): "hand-written models"
  - a proof using a model establishes the result under that model
  - matching the model to the dependency's implementation requires separate evidence
- trait, closure, and async coverage should be checked on the exact crate and version
  - [Charon paper, limitations section](https://arxiv.org/abs/2410.18042) lists unsupported "dynamic trait dispatch (dyn Trait), generic associated types, trait aliases, async"
  - this is the 2025 paper's scope rather than a checked 2026 feature list
  - extraction may retain an incomplete crate by marking unsupported declarations missing
  - users must check whether the theorem relies on such a declaration
  - the inspected sources do not provide a complete current feature matrix
  - successful extraction alone does not establish that all required behavior was proved

what the proofs assume
- the original implementation remains part of what must be trusted
  - [Ho and Protzenko, implementation section](https://arxiv.org/pdf/2206.07185): "The implementation is, naturally, trusted"
- the 2024 semantic result establishes a substantial mathematical connection
  - the [paper abstract](https://arxiv.org/abs/2404.02680) describes a "low-level pointer-based language à la CompCert"
  - it relates LLBC execution, symbolic execution, and borrow checking
  - it does not by itself prove every line of the production extractor or Rust compiler correct
- additional assumptions include library models and the prover's trusted checking code
  - inference from the translation architecture
  - source correctness also does not establish compiler correctness or binary timing behavior

demonstrated programs
- a resizing hash table in the 2022 paper
  - supports insertion, immutable lookup, mutable lookup, and removal
  - proves map behavior, preservation of structural invariants, and conditions governing failure
  - [authors, evaluation section](https://arxiv.org/pdf/2206.07185): "4 person-days" for "201 LoC without blanks and comments"
  - this is a small handwritten implementation
  - the effort is an author report rather than a controlled comparison with other tools
- a tree example in the same paper remained unfinished
  - [authors, non-lexical lifetimes section](https://arxiv.org/pdf/2206.07185): "our verification efforts are ongoing"
  - running a tree through extraction should not be counted as completed verification
- the current project has a [Lean tutorial](https://github.com/AeneasVerif/aeneas/tree/main/tests/lean/Tutorial)
  - useful for inspecting generated functions alongside proofs
  - teaching examples are not evidence of deployment in a large system
- an existing greatest-common-divisor crate illustrates proof work on third-party code
  - [Cryspen's December 2025 comparison](https://hax.cryspen.com/blog/2025/12/08/verifying-a-real-world-rust-crate/) demonstrates Aeneas on the binary `u8` implementation
  - author conclusion: "terminates and does not panic"
  - several displayed supporting arithmetic lemmas use `sorry`
  - `sorry` accepts a theorem without checking a proof
  - interpretation: the displayed result depends on assumed supporting lemmas
  - it should not be counted as an assumption-free end-to-end proof
- SymCrypt: substantial production cryptography evidence
  - [Ho et al., Scaling Verification of Cryptographic Software with Aeneas, Rust, and Lean, September 2026 draft](https://arxiv.org/abs/2609.15648v1)
    - abstract: “237 KLOC Lean” and “16.7 KLOC of Rust”
    - §1: “deployed Rust implementations, such as SHA-3 and ML-KEM”
  - reported safety, panic freedom, and functional correctness across x86-64 and ARM code
  - totals combine deployed algorithms and experimental additions
    - ML-DSA, FrodoKEM, and HPKE additions are not claimed production-ready
  - §5 reports support for common nested borrows, traits, and mutable iterators
    - unsafe raw-pointer operations and unsupported functions use trusted models
    - example: wiping secret memory has an axiomatized model
  - standard formalizations and platform intrinsics still need expert review
  - source-level functional proofs do not establish compiled side-channel resistance
  - §3 also trusts compiled native_decide and bv_decide machinery
    - these are Lean proof-decision tools whose compiled implementation is part of this development's trust boundary
  - ML-KEM sampling termination uses a separate mathematical argument
  - [public subset of code and proofs](https://github.com/microsoft/SymCrypt/tree/feature/verifiedcrypto)
    - paper says public release includes ML-KEM and SHA-3
    - not all of the reported development was public at that snapshot
  - reported counts and deployment status were not independently reproduced
- JPEG XL remains an application lead
  - no sufficient primary proof-scope evidence recovered in this pass
  - [AeneasVerif repositories](https://github.com/AeneasVerif) expose additional ongoing work

2025–2026 changes that matter
- Charon has become a reusable analysis framework
  - [2025 paper](https://arxiv.org/abs/2410.18042) demonstrates Aeneas, Rust-to-C translation through Eurydice, and other analyses
  - its implementation section reports "2 person-years" of development
  - the extractor includes frontend infrastructure developed jointly with hax
  - inference: sharing extraction work reduces repeated engineering across research tools
- hax's new Lean backend uses Charon and Aeneas
  - [release announcement, 2026-09-29](https://hax.cryspen.com/blog/2026/09/29/hax-04-easier-to-install-and-configure-and-a-new-lean-backend/): "The new Lean backend does not use the hax engine"
  - the tools now overlap in the Lean pipeline
  - comparing hax Lean with Aeneas as independent translators would be misleading

research we could do
- check the translation on each build
  - builds on [Aeneas's semantic work](https://arxiv.org/abs/2404.02680) and [Charon's shared representation](https://arxiv.org/abs/2410.18042)
  - proposed contribution: generate a small proof of correspondence for each translated function
  - check that proof separately from the translator
  - why it may matter: reduce how much implementation code a user must trust
  - first experiment: mutable-return functions, nested reborrows, and loop joins
  - compare against ordinary differential tests with deliberate translation faults
  - novelty remains unresolved against compiler proof certificates and translation validation
- prove a safe data structure together with its unsafe dependency
  - builds on [the functional translation](https://arxiv.org/abs/2206.07185) and the project's [planned separation-logic extension](https://github.com/AeneasVerif/aeneas#targeted-subset-and-current-limitations)
  - proposed contribution: a checked connection between a container's unsafe implementation and the pure model used by its clients
  - why it may matter: replace an assumed library model with a verified boundary
  - first experiment: a limited vector API used by the verified hash table
  - measure changes required in existing client proofs and assumptions removed
  - novelty needs comparison with RustBelt, RefinedRust, and hybrid safe/unsafe verification
- measure proof maintenance on unmodified Rust changes
  - builds on [separate proofs in Aeneas](https://arxiv.org/abs/2206.07185) and [hax proof scenarios](https://hax.cryspen.com/blog/2026/09/29/hax-04-easier-to-install-and-configure-and-a-new-lean-backend/)
  - [the SymCrypt report](https://arxiv.org/abs/2609.15648v1) already discusses agent-assisted maintenance and production integration
  - proposed contribution: a controlled longitudinal comparison of realistic refactorings and dependency upgrades
    - it must add evidence beyond that existing case study
  - why it may matter: initial proof effort does not reveal recurring maintenance cost
  - record broken proofs, changed models, changed assumptions, and repair time separately
  - compare theorem reuse with full proof regeneration
  - keep identical functional specifications across versions

reading order
- [Aeneas, ICFP 2022](https://arxiv.org/abs/2206.07185): the translation and original hash-table study
- [sound borrow checking, ICFP 2024](https://arxiv.org/abs/2404.02680): semantic justification and loops
- [Charon, CAV 2025](https://arxiv.org/abs/2410.18042): extraction as shared infrastructure
- [current README](https://github.com/AeneasVerif/aeneas): today's limits and backend workflow

- [SymCrypt report, September 2026](https://arxiv.org/abs/2609.15648v1): production scale, newer supported idioms, assumptions, and released subset
