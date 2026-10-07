Verus: proving systems code against explicit promises
(authored by agents unless marked 🧑)

takeaway
- Verus is a strong candidate when we can shape Rust code and its APIs around proofs
  - inference from its systems case studies and its proof-oriented types
  - proving unchanged arbitrary Rust remains a different task
- its main result is a proof that supported code meets a written specification
  - a specification is the exact promise the author asks the tool to prove
  - a successful proof does not establish that this promise matches the real requirement

how it works
- executable code, specifications, and proof code coexist in Rust-like source
  - executable code runs after verification
  - specifications describe mathematical values and desired behavior
  - proof code supplies intermediate facts and is removed before execution
- Rust ownership also controls proof resources
  - a resource can represent permission to access a particular memory location
  - preventing duplicated permission helps prove correct pointer use
  - Lattuada et al., OOPSLA 2023, title: “Verifying Rust Programs using Linear Ghost Types”
    - [paper](https://www.andrew.cmu.edu/user/bparno/papers/verus-ghost.pdf)
- the verifier turns proof obligations into formulas for Z3 and other automated solvers
  - users still supply contracts, loop invariants, and difficult intermediate lemmas
  - Hance et al., VerusBelt §6: “an automated solver, usually Z3”
    - [paper](https://iris-project.org/pdfs/2026-pldi-verusbelt.pdf)
- concurrency proofs connect executable operations to an abstract state machine
  - the state machine describes allowed steps and preserved facts
  - [Verus concurrency guide](https://verus-lang.github.io/verus/state_machines/)
    - page title: “Verus Transition Systems”

what it can verify
- supported sequential algorithms and data structures against functional contracts
- pointer-manipulating and concurrent code through proof-oriented APIs
  - this means supported encodings of low-level behavior
  - it does not mean automatic verification of every existing unsafe block
- system-specific safety, security, crash recovery, and progress properties
  - these need suitable models and substantial domain proofs
  - [verified systems and their actual boundaries](verified_systems.md)
- team README: “Verus currently supports a subset of Rust”
  - same README: “manipulates raw pointers”
  - [current source](https://github.com/verus-lang/verus/blob/main/README.md)
  - retrieved 2026-10-07

what remains outside a proof
- unproved assumptions about external libraries, hardware, foreign code, and the operating environment
- correctness of the user's specification
- complete correctness of the verifier, solvers, erasure, and Rust compiler
  - erasure means removing proof-only code before generating the executable
- VerusBelt improves the foundation without closing all these gaps
  - PLDI 2026 semantic proof covers proof-oriented types, borrows, lifetimes, and concurrency in a simplified language
  - Hance et al., abstract: “a significant subset of Verus”
    - [paper](https://iris-project.org/pdfs/2026-pldi-verusbelt.pdf)
  - §6 excludes standard-library specifications and the implemented source-to-formula translation
  - §6 also excludes the actual proof-code erasure scheme
  - the paper distinguishes its language from real Rust's layout, pointer rules, and two-phase borrows
  - these are author-stated boundaries, not evidence that those components contain bugs

systems evidence
- SOSP 2024 combines a distributed store, page tables, node replication, crash-safe storage, and an allocator
  - Lattuada et al., abstract: “6.1K lines of implementation and 31K lines of proof”
    - [paper](https://www.andrew.cmu.edu/user/bparno/papers/verus-sys.pdf)
  - author-reported verification speed improvement is 3–61× against the compared systems
  - the experiments support these particular comparisons
  - they do not establish a universal proof-effort or speed advantage
- later systems include Anvil, VeriSMo, PoWER, Vest, Verdict, and OwlC
  - [case-by-case evidence](verified_systems.md)
- 2025–2026 work also attacks unstable proofs and verification foundations
  - Cazamariposas, CADE 2025, diagnoses unstable solver-based proofs
    - Zhou et al., abstract: “semantically irrelevant changes”
      - [paper](https://www.andrew.cmu.edu/user/bparno/papers/cazamariposas.pdf)
    - compares successful and failed solver runs to isolate problematic quantified facts
    - a quantified fact states a property for all or some values
  - VerusBelt, PLDI 2026, establishes a semantic foundation for important proof APIs
    - [paper](https://iris-project.org/pdfs/2026-pldi-verusbelt.pdf)
  - Tunable Automation, FMCAD 2026, lets developers control which quantified facts the solver sees
    - Bai, Hawblitzel, Lattuada, abstract: “module, function, or proof context level”
      - [paper](https://doi.org/10.34727/2026/isbn.978-3-85448-093-8_38)
    - too many available facts can slow search
    - too few can require additional proof hints
    - evaluation includes IronKV, Splinter, Anvil, and CapybaraKV
    - experiments mainly expose facts throughout a project
    - they do not establish an optimal fine-grained selection policy
  - Rong, May 2026 thesis, formalizes the SST-to-AIR expression-translation phase in Lean 4
    - [official publication list](https://verus-lang.github.io/verus/publications-and-projects/)
    - this translation phase is narrower than the complete Verus pipeline
- the human's existing collection covers newer engine/GPU proof boundaries
  - [October 6 frontier collection](../../../verus_frontier_20261006.md)
  - avoid repeating its Vosti/RESOLVE contract-checking proposal as a new idea

research we could do
- recommendation: test whether proofs survive real dependency upgrades without keeping obsolete assumptions
  - builds on Verus system proofs, external-library contracts, and [VerusBelt's explicit scope](https://iris-project.org/pdfs/2026-pldi-verusbelt.pdf)
  - possible new contribution
    - a measured account of which code changes invalidate assumed contracts while client proofs still pass
    - checks that connect contracts to the exact linked implementations
  - why it may matter
    - a proof can remain valid while the program stops satisfying a trusted dependency assumption
  - decisive experiment
    - replay historical upgrades in a parser or storage project
    - compare existing CI with assumption checks on real and deliberately introduced incompatible changes
    - count caught changes, missed changes, false alarms, and repair effort
  - novelty is unresolved
    - compare assumption management, proof-carrying libraries, and existing project CI before claiming a new system
- recommendation: study proof fragility under behavior-preserving refactoring
  - builds on [Cazamariposas](https://www.andrew.cmu.edu/user/bparno/papers/cazamariposas.pdf), [Tunable Automation](https://doi.org/10.34727/2026/isbn.978-3-85448-093-8_38), and the SOSP systems artifacts
  - possible new contribution
    - a benchmark of real API and module changes with independently checked behavioral equivalence
    - an explanation of which proof dependencies cause avoidable failures
  - why it may matter
    - initial proof completion is less useful when routine maintenance repeatedly breaks it
  - measure proof repair time and verification cost
    - passing newly weakened specifications does not count as repair
- recommendation: learn small reusable solver-context policies from real proof maintenance
  - builds on [Tunable Automation](https://doi.org/10.34727/2026/isbn.978-3-85448-093-8_38)
  - possible new contribution
    - choose which lemmas to expose using measured proof dependencies
    - preserve useful settings across library revisions
  - why it may matter
    - reduces manual solver tuning while avoiding expensive indiscriminate automation
  - decisive experiment
    - compare default settings, expert settings, and learned settings across unseen revisions
    - measure proof success, time, stability, and engineer intervention
  - related automatic fact-selection work may already cover this idea
    - novelty remains unresolved
