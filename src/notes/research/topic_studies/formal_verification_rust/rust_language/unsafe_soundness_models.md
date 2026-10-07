the rules of unsafe Rust
(authored by agents unless marked 🧑)

main point

- unsafe Rust needs rules that permit useful low-level code and justify compiler optimizations
- research models provide increasingly precise rules
  - acceptance by a model is evidence about those rules
  - it does not establish that every safe use of a library is safe
- this review concerns language foundations
  - program proof tools belong in the sibling Rust-verifier review
- source check: 2026-10-07
  - original papers and official documentation retrieved directly

terms

- undefined behavior: an operation for which the language gives no guarantee about the resulting execution
- sound library: every allowed safe client preserves the language's safety requirements
- aliasing: multiple pointers refer to overlapping memory
- pointer provenance: information about which allocation a pointer may access
- operational model: rules describing execution one step at a time

what the language currently promises

- the Rust Reference assigns responsibility to unsafe-code authors
  - exact words: “unsafe only means that avoiding undefined behavior is on the programmer”
  - [Rust Reference, behavior considered undefined, introduction](https://doc.rust-lang.org/reference/behavior-considered-undefined.html#undefinedintro)
- exact pointer-aliasing rules remain unsettled
  - exact words: “The exact aliasing rules are not determined yet”
  - [Rust Reference, pointer aliasing](https://doc.rust-lang.org/reference/behavior-considered-undefined.html#undefinedalias)
- inference: a paper's executable model should not be presented as the final language specification

RustBelt, POPL 2018

- Ralf Jung, Jacques-Henri Jourdan, Robbert Krebbers, Derek Dreyer
  - [paper and machine-checked development](https://plv.mpi-sws.org/rustbelt/popl18/)
- establishes safety for a model of Rust and a method for admitting unsafe libraries
  - exact scope from abstract: “a language representing a realistic subset of Rust”
  - each unsafe library must meet a condition that preserves safety for safe clients
- essential contribution: library internals may use unsafe operations while clients retain safety
  - this explains why counting unsafe blocks is a poor substitute for checking the boundary they expose
  - inference from the paper's extensible safety theorem
- limit: a model and selected library proofs
  - not a proof of the entire compiler, standard library, or ecosystem

RustBelt Meets Relaxed Memory, POPL 2020

- Hoang-Hai Dang, Jacques-Henri Jourdan, Jan-Oliver Kaiser, Derek Dreyer
  - [paper and formal development](https://plv.mpi-sws.org/rustbelt/rbrlx/)
- extends the earlier foundation to atomic operations whose effects need not appear in one global execution order
  - earlier RustBelt assumed sequential consistency
  - exact result from abstract: “uncovering a data race in the Arc library”
- practical lesson: safe-looking ownership wrappers can depend on subtle ordering during memory reclamation
  - inference: reference counting and dropping the last reference deserve targeted testing

Stacked Borrows, POPL 2020

- Ralf Jung, Hoang-Hai Dang, Jeehoon Kang, Derek Dreyer
  - [paper, appendix, Coq development, artifact](https://plv.mpi-sws.org/rustbelt/stacked-borrows/)
- gives execution rules for which pointers may access each region of memory
  - a stack records access permissions
  - later pointer uses can invalidate earlier permissions
- justifies compiler transformations using local reasoning
  - exact abstract phrase: “optimizations that reorder memory accesses around unknown code and function calls”
- tests compatibility by interpreting large parts of the standard-library test suite
  - compatibility evidence depends on the executed tests
- importance: makes optimizer assumptions executable and debuggable
  - inference: disagreement becomes a concrete failing trace rather than a vague argument about ownership

Tree Borrows, PLDI 2025

- Neven Villani, Johannes Hostert, Derek Dreyer, Ralf Jung
  - [paper](https://ralfj.de/research/papers/2025-pldi-tree-borrows.pdf)
  - [artifact](https://doi.org/10.5281/zenodo.15002703)
- replaces the permission stack with a tree of reference ancestry
  - each node tracks how its permission changes after accesses through related or unrelated pointers
  - supports borrowing patterns that Stacked Borrows rejects
  - includes delayed activation of mutable access
- preserves most previously justified optimizations and adds read-read reorderings
  - formal proofs use Rocq and Simuliris
  - exact abstract phrase: “retains most of the Stacked Borrows optimizations”
- measured compatibility improves
  - §4 examines 674,748 tests from 29,990 crates
  - starts from the 30,000 most-downloaded crates
  - about 68% of tests pass a preliminary run with both aliasing checks disabled
  - excludes unsupported operations, timeouts, ordinary test failures, and unrelated undefined behavior
  - comparison finds 6,568 Stacked Borrows violations and 3,023 Tree Borrows violations
  - reduction: 53.97%
  - 31 tests pass Stacked Borrows but violate Tree Borrows
- important limit: this measures test compatibility
  - not a 54% reduction in vulnerabilities
  - not evidence that Tree Borrows permits every intended unsafe idiom
  - ecosystem code had already adapted to Stacked Borrows
  - Tree Borrows incurs substantially more comparison-run timeouts
- explicit unresolved foundation
  - exact §6 words: “not yet been formally proven”
  - refers to well-typed safe programs never violating Tree Borrows
- explicit research gaps in §6
  - proofs involving both data races and the aliasing tree
  - moving the write that activates a mutable reference later
  - a framework for proving individual programs correct under Tree Borrows

Miri connects models to real code

- [Jung et al., Miri: Practical Undefined Behavior Detection for Rust, POPL 2026](https://ralfj.de/research/papers/2026-popl-miri.pdf)
- executes Rust's intermediate representation while tracking information native execution usually loses
  - allocation identity, initialization, type validity, access permissions, and thread conflicts
- [official README](https://github.com/rust-lang/miri#readme) marks both aliasing checks “Experimental”
- a passing run is limited evidence
  - exact README words: “cannot ensure that your code is sound”
  - [testing tools and evidence limits](bug_finding_tools.md)

foreign-language boundaries test the models

- Ian McCormack, Joshua Sunshine, Jonathan Aldrich
  - [A Study of Undefined Behavior Across Foreign Function Boundaries in Rust Libraries, ICSE 2025](https://arxiv.org/abs/2404.11671)
- combines Miri with an LLVM interpreter to execute foreign functions
- reported result from abstract: “46 instances of undefined or undesired behavior in 37 libraries”
- Tree Borrows accepts more foreign-language patterns than Stacked Borrows
  - abstract distinguishes undefined behavior from undesired behavior
  - do not count all 46 as confirmed Rust vulnerabilities
- inference: language boundaries are a useful stress test for rules inferred from ordinary Rust libraries

research we could do

- proposed: explain model disagreements in terms of safe library use
  - prior work: Stacked Borrows, Tree Borrows, Miri, the foreign-function study
  - new contribution: classify minimized disagreement traces by intended API contract and actual compiler consequences
  - why it may matter: distinguishes overly restrictive rules from a library that exposes a real safety failure
  - evaluation: reproduce published disagreement cases plus recent crates
    - pin compiler and model versions
    - compare Stacked Borrows, Tree Borrows, native optimized execution, and maintainers' intended contracts
    - measure distinct root causes and confirmed fixes
  - risk: a disagreement alone does not establish which model is correct

- recommendation: stop the broad hostile-safe-client generator proposal
  - foundation: RustBelt requires safety for every allowed safe client
  - RUXt already proves that modeled failures have safe-client witnesses
    - its prototype does not yet construct the witnesses
  - [one discriminating experiment and closest-work comparison](bug_finding_tools.md)
    - require a demonstrated gap in Crabtree and RUXt before building a framework

- proposed: measure how unsafe-code repairs age as rules change
  - prior work: Miri's evolving checks and Tree Borrows compatibility experiment
  - new contribution: track whether repairs motivated by one model remain necessary, correct, and efficient under later models
  - why it may matter: teams spend effort maintaining unsafe internals against changing interpretations
  - evaluation: longitudinal library versions and dated model versions
    - measure repair reversals, performance changes, and newly failing safe-client tests
  - risk: attributing a repair to a model requires issue or commit evidence

reading order

- Rust Reference for the current responsibility boundary
- RustBelt for the safe-client theorem
- Stacked Borrows for optimizer-facing execution rules
- Tree Borrows for compatibility and unresolved foundations
- Miri and the foreign-function study for testing those rules against deployed code
