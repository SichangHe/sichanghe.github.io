Rust compilation and toolchain research
(authored by agents unless marked 🧑)

research takeaway

- inference: the useful research question is which compiler work an edit makes necessary
  - measuring only clean builds hides the cost developers repeatedly pay
  - reusing work also creates a correctness obligation: a cached answer must match recomputation
- scope: literature and research proposals
  - implementation experiments belong to [seamless Rust setup](seamless_rust_setup.md)
  - no new engineering work is proposed for this notes repository
  - sources checked 2026-10-07

compilation cost and reuse

- general build theory: Mokhov, Mitchell, and Peyton Jones
  - [Build systems à la carte, ICFP 2018](https://doi.org/10.1145/3236774)
  - [expanded JFP 2020 paper and author page](https://www.microsoft.com/en-us/research/publication/build-systems-a-la-carte/)
  - author quotation: “a systematic, and executable, framework for developing and comparing build systems”
  - contribution: separates choices about which tasks to execute from choices about when previous results remain reusable
  - relevance: a vocabulary for explaining Cargo and compiler caches without confusing scheduling with correctness of reuse
  - limit: general build-system research, not a measured Rust compiler speedup
- rustc's incremental compilation
  - [Rust Compiler Development Guide, incremental compilation](https://rust-lang.github.io/rustc-dev-guide/queries/incremental-compilation.html)
  - documentation quotation: “it may be that it still produces the same result”
  - mechanism: records dependencies among compiler computations
    - unchanged results can stop later computations from repeating
    - dependency reads preserve their original order
  - documentation quotation: “many of those results are very cheap to recompute”
  - implication: serializing every intermediate result can cost more than recomputation
  - limit: describes the algorithm, not universal latency guarantees
- generic code duplication
  - [Rust Compiler Development Guide, monomorphization](https://rust-lang.github.io/rustc-dev-guide/backend/monomorph.html)
  - monomorphization means creating concrete copies of generic code for the types used
  - documentation quotation: “compiler stamps out a different copy of the code of a generic function for each concrete type needed”
  - implication: source lines alone are a poor predictor of generated work
  - documentation explains compile-time and binary-size costs
    - downstream use of generic functions can generate code in the downstream crate
  - limit: more copies do not alone prove a particular application's dominant bottleneck
- configuration affects repeated work
  - [Cargo Book, features and resolver version 2](https://doc.rust-lang.org/cargo/reference/features.html)
  - documentation quotation: “this can increase build times because the dependency is built multiple times”
  - context: separating feature sets for build dependencies, procedural macros, and normal dependencies
  - implication: deduplicating package versions alone does not identify duplicated compilation
- compiler performance corpus
  - [rustc-perf benchmark suite](https://github.com/rust-lang/rustc-perf/blob/master/collector/compile-benchmarks/README.md)
  - source quotation: “Primary, Secondary, and Stable”
  - contribution: real crates plus reduced examples stressing trait solving, macros, deeply nested types, async code, and other costly patterns
  - source quotation: “not necessarily reflective of typical Rust code being written today”
    - applies to the old stable benchmark group
  - implication: long historical comparability and present-day representativeness require different samples
  - limit: official compiler benchmark results are engineering evidence, not automatically a peer-reviewed study

compiler correctness research

- RustSmith: Sharma, Yu, and Donaldson, ISSTA 2023 tool demonstration
  - [RustSmith: Random Differential Compiler Testing for Rust](https://doi.org/10.1145/3597926.3604919)
  - [author-maintained artifact](https://github.com/rustsmith/rustsmith)
  - artifact quotation: “find compiler crashes and mis-compilations”
  - contribution: generates Rust programs for compiler testing
  - differential testing means running a program through different compiler versions or settings and comparing behavior
  - limit: artifact purpose is checked; no paper-level bug count claimed here
- Rustlantis: randomized differential testing, OOPSLA 2024
  - [paper](https://doi.org/10.1145/3689780)
  - [publisher-deposited abstract](https://api.crossref.org/works/10.1145/3689780)
  - [author-maintained artifact](https://github.com/cbeuw/rustlantis)
  - abstract quotation: “Rustlantis directly generates MIR, the central IR of the Rust compiler for optimizations”
  - MIR is the compiler's intermediate program representation used before machine-code generation
  - contribution: bypasses source-level generation difficulties while exercising optimization and code generation
  - author-reported result: 22 previously unknown compiler bugs in the paper's campaign
    - historical result, not today's artifact total
  - artifact quotation: “A discrepancy between testing backends always indicate a bug in them (or a bug in Rustlantis)”
  - limit: the generator and execution comparison are part of the trusted test machinery
    - a disagreement requires investigation
    - agreement does not establish absence of bugs
- Clozemaster: Gao, Yang, Sun, Wu, Zhou, and Xu, ICSE 2025
  - [Clozemaster: Fuzzing Rust Compiler by Harnessing LLMs for Infilling Masked Real Programs](https://doi.org/10.1109/ICSE55347.2025.00175)
  - title quotation: “Infilling Masked Real Programs”
  - paper identity checked against [publisher-deposited metadata](https://api.crossref.org/works/10.1109/ICSE55347.2025.00175)
  - relevance: uses existing source programs as context for generated test inputs
  - limit: full text inaccessible in this pass
    - cannot compare coverage, confirmed bugs, or LLM costs with RustSmith and Rustlantis yet

research proposals

- proposal 1: benchmark real edit sequences instead of only isolated builds
  - prior: rustc-perf, incremental query algorithm, Build systems à la carte
  - question: which everyday edits invalidate unexpectedly large amounts of compiler work?
  - new candidate: a representative edit corpus connecting observed developer edits to repeated compiler computations
    - distinguish edits inside function bodies, public interfaces, generic code, macros, and configuration files
    - include changes across crates
  - why it may matter: identifies reusable work that clean-build benchmarks cannot reveal
  - evaluation
    - replay historical edits with pinned dependencies and compiler versions
    - measure wall time, CPU work, memory, repeated query count, and critical path
    - separate clean build, unchanged build, and edited build
    - report median and slow-tail latency
    - hold out projects when testing a cost predictor
  - novelty risk: compiler performance monitoring and incremental benchmarks already exist
    - contribution requires better workload evidence or a causal explanation, not another timing dashboard
- proposal 2: discover correctness failures specific to cached compilation
  - prior: RustSmith, Rustlantis, rustc's incremental algorithm
  - new candidate: generate sequences of edits and compare cached builds with clean builds after every edit
    - compare accepted programs' observable behavior
    - also compare acceptance and rejection
  - why it may matter: single-program fuzzing can miss errors requiring a previous compiler state
  - evaluation
    - seed with existing incremental-compilation regression tests
    - vary public types, trait implementations, macros, features, and crate boundaries
    - compare equal search budgets with existing regression tests and single-program fuzzers
    - count confirmed distinct root causes, not raw disagreements
    - reduce both the program and the edit history needed to reproduce each issue
  - limit: identical wrong results in clean and cached builds evade this comparison
  - novelty risk: sequence-based and stateful testing are established techniques
    - survey existing incremental compiler fuzzing before claiming the edit-sequence idea is new
- proposal 3: quantify when generic-code reuse is worth its cost
  - prior: monomorphization, code-generation partitioning, build theory
  - new candidate: workload-level cost model connecting generic instantiations, edit patterns, compilation time, and executable performance
  - why it may matter: optimizing clean-build time can worsen edited-build time or runtime
  - evaluation
    - real projects plus controlled generic-code stress cases
    - compare reuse strategies under equal optimization settings
    - measure compilation, runtime, binary size, memory, and cache storage together
    - include public generic APIs whose code is instantiated downstream
  - limit: a predictive cost model is a research result only if it generalizes beyond the training projects
  - coordination: any implementation belongs to the separate compile-speed effort
- proposal 4: measure build extensions as both a performance and security cost
  - prior: procedural macros, build scripts, rustc-perf macro workloads
  - [Rust Reference](https://doc.rust-lang.org/reference/procedural-macros.html)
    - documentation quotation: “same resources that the compiler has”
  - new candidate: characterize nondeterminism and undeclared inputs in extensions that prevent safe reuse
  - why it may matter: the same external actions can harm reproducibility, caching, and build-machine security
  - evaluation
    - repeat builds while changing only controlled environment and filesystem inputs
    - observe generated outputs and external actions
    - measure build success, cache reuse, overhead, and missed inputs under restricted execution
  - overlap: [dependency security proposal](supply_chain_security.md)
    - one joint study should answer both questions instead of creating duplicate projects

recommended starting point

- opinion: begin with proposal 2 if correctness is the priority
  - has a concrete comparison between cached and recomputed results
  - can build on existing fuzzing rather than requiring a new compiler
- opinion: begin with proposal 1 if developer latency is the priority
  - first establish which repeated work matters in actual edit histories
- remaining reading gaps
  - obtain RustSmith and Clozemaster full text before numerical comparisons
  - find prior edit-sequence compiler fuzzing and workload studies before novelty claims
  - distinguish peer-reviewed findings, official design documentation, and candidate hypotheses
