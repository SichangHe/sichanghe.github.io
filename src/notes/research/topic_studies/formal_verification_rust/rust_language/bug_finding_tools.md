tools that find Rust bugs without full proofs
(authored by agents unless marked 🧑)

main point

- different tools search different failures
  - static analysis searches suspicious program structure
  - fuzzing searches inputs and API call sequences
  - sanitizers observe native executions
  - Miri checks richer execution rules
  - concurrency testing searches execution orders
- proposed research should measure complementary discoveries and remaining blind spots
  - tool count or test coverage alone is weak evidence
- source check: 2026-10-07

Miri, POPL 2026

- Ralf Jung, Benjamin Kimock, Christian Poveda, Eduardo Sánchez Muñoz, Oli Scherer, Qian Wang
  - [paper](https://ralfj.de/research/papers/2026-popl-miri.pdf)
  - [official repository and limits](https://github.com/rust-lang/miri#readme)
- interprets Rust while checking memory accesses, initialization, type validity, pointer identity, aliasing, and data races
  - tracks properties that a native sanitizer may lose during compilation
  - [models and their status](unsafe_soundness_models.md)
- abstract reports testing more than 100,000 libraries
  - exact result: “successfully execute more than 70% of the tests across their combined test suites”
  - this is executable-test coverage
  - not the fraction of libraries proven safe
- §6.3 measures a synthetic computation
  - roughly 3,000× to 7,000× slower than native execution
  - this is a microbenchmark result, not a universal slowdown
  - paper concludes typical fuzzing is too expensive at that speed
- important testing limits
  - exact README words: “Miri fundamentally cannot ensure that your code is sound”
  - a run examines one input and one chosen execution
  - varying seeds explores additional executions
  - weak-memory exploration remains incomplete
  - unsupported foreign functions and operating-system interactions exclude code
  - future compiler versions can change the interpretation of unsafe behavior
- research directions in the paper itself
  - better foreign-function support
  - compiler-assisted faster checking
  - systematic concurrency exploration
  - network APIs for async code
  - proposed work in these areas must add more than restating that list

Rudra, SOSP 2021

- Yechan Bae, Youngsuk Kim, Ammar Askar, Jungwon Lim, Taesoo Kim
  - [paper](https://github.com/sslab-gatech/Rudra/blob/master/rudra-sosp21.pdf)
  - [implementation](https://github.com/sslab-gatech/Rudra)
- detects unsafe patterns involving panics, assumed trait behavior, and incorrect thread-sharing bounds
  - a safe callback may panic while an unsafe operation has temporarily broken an invariant
  - a safe trait implementation may behave differently from what unsafe code assumes
  - generic types may incorrectly claim they can be moved or shared across threads
- abstract's ecosystem experiment
  - scans 43,000 packages in 6.5 hours
  - reports 264 previously unknown memory-safety bugs
  - results include 76 CVEs and 112 RustSec advisories
  - exact finding: “two in the Rust standard library”
- scope limit: targeted bug classes and the historical registry snapshot
  - neither the speed nor the discovery rate directly predicts performance on today's crates
- current implementation status
  - exact README notice: “This project is archived and no longer maintained”
  - reproducing the paper requires its pinned artifact
  - research comparison must report packages that cannot compile

SafeDrop and its successor

- Mohan Cui, Chengjun Chen, Hui Xu, Yangfan Zhou
  - [SafeDrop, full April 2021 preprint](https://arxiv.org/abs/2103.15420v2)
  - [TOSEM published article, 2023](https://doi.org/10.1145/3542948)
  - author repository calls it TOSEM 2022
    - publisher metadata records acceptance in 2022 and publication in 2023
- searches paths across functions and fields for ownership and deallocation errors
  - uses Rust's intermediate representation
  - reports use-after-free, double free, dangling pointers, and invalid memory access
  - includes unwind paths where a temporary owner is dropped after a panic
- measured results in the preprint, §5
  - all nine selected CVEs reproduced across eight crates
  - manually classified warnings include false positives
  - eight additional crates have previously unknown reported issues
  - six of those eight crates have no classified false positives
  - remaining two have at most two each
  - this is a selected study of relevant crates
    - not an ecosystem-wide precision or recall estimate
- compilation cost in the preprint
  - abstract gives 1.0%–110.7% additional time
  - §5.3.3 gives 1.2%–110.7%
  - preserve the discrepancy rather than choose an apparently precise minimum
- important coverage limits in §5.4.2
  - unsupported primitive arrays, closures, pointer offsets, and function pointers
  - missing intermediate code for some inlined functions loses alias relationships
  - exact consequence: “will introduce false negatives”
- implementation maintenance matters
  - exact [author repository](https://github.com/VaynNecol/SafeDrop) notice: “We have integrated the features of SafeDrop into RAP”
  - [current RAPx repository](https://github.com/safer-rust/RAPx)
  - current repository includes both bug detection and proof-oriented features
  - this review concerns bug detection
- evidence limit: full preprint checked
  - published TOSEM PDF was inaccessible
  - do not silently attribute preprint measurements to the final article

API test synthesis

- SyRust, Yoshiki Takashima, Ruben Martins, Limin Jia, Corina S. Păsăreanu, PLDI 2021
  - [original paper, author-hosted PDF](https://www.andrew.cmu.edu/user/liminjia/research/papers/syrust-pldi21.pdf)
- synthesizes straight-line API call sequences that respect ownership and generic type relationships
  - encodes restrictions as Boolean constraints
  - learns from compiler rejection when trait requirements do not match
  - uses Miri to execute accepted clients
- reported evaluation
  - 30 libraries, ten-hour timeout per library
  - four new bugs in three libraries
  - includes a bitvec dereference after freeing memory and pointer-model violations
  - not all reports mean a crash in ordinary native execution
- explicit scope limits in §7.4
  - at most 15 chosen APIs per library
  - user-provided inputs are not mutated
  - no synthesized closure bodies
  - exact consequence: “asynchronous APIs are off the table as well”

- Crabtree, Yoshiki Takashima, Chanhee Cho, Ruben Martins, Limin Jia, Corina S. Păsăreanu, OOPSLA 2024
  - [original paper, author-hosted PDF](https://www.andrew.cmu.edu/user/liminjia/research/papers/crabtree-oopsla24.pdf)
- adds direct trait modeling, closure synthesis, and input fuzzing
  - prioritizes sequences that discover useful types and increase code coverage
  - reuses fuzz inputs across sequences with the same prefix
  - learns available trait implementations from library and selected dependency information
- closure bodies are themselves synthesized API sequences
  - supports borrowed and ownership-moving captures
  - models iterator operations such as map followed by collect as a combined operation
  - tracks the closure's required return type and which values remain usable afterward
- evaluation samples 30 libraries
  - ten from SyRust, ten from RULF, ten recently updated popular libraries
  - four newly reported memory-safety bugs accepted by authors
  - affected libraries: leapfrog, sparsey, integer-encoding, oxidebpf
  - all four involve trait APIs or trait-constrained types
  - also reproduces SyRust's four earlier bugs
    - three found faster
  - fails to reproduce RULF's regex bugs
    - poor coverage of the parser that consumes regex expressions
- comparison needs care
  - tools report different failure classes
  - Crabtree and SyRust ignore unwrap failures because they generate too many irrelevant reports
  - mutation testing supplements coverage comparisons
  - synthetic mutants often alter outputs without violating memory safety
  - no automatically generated assertions check those outputs
- explicit limits in §8
  - exact scope: “does not generate any multi-threaded or async tests”
  - unsupported generic or lifetime variables inside associated types
  - missing input types make some APIs unreachable
  - repeated compilation and Miri execution are major cost limits
  - new-type priority can spend too little time fuzzing short parser sequences
- implication for our proposal
  - synthesizing safe callbacks is already a Crabtree contribution
  - using traits or ownership-moving closures alone is not a new research claim
  - existing trait implementations are inputs to its database
    - this differs from synthesizing new, deliberately awkward safe implementations
  - inference: unexplored targets may include deliberate panics, changing trait answers, and API reentry
    - this paper does not establish that every such behavior is absent from its implementation
    - baseline reproduction must test the proposed distinction

fuzzing and native sanitizers

- [cargo-fuzz, official repository](https://github.com/rust-fuzz/cargo-fuzz)
  - exact description: “A cargo subcommand for fuzzing with libFuzzer”
  - supports targets, corpus reduction, failing-input reduction, and coverage reporting
  - generated inputs still need a target that constructs meaningful library use
- [Rust Unstable Book, sanitizers](https://doc.rust-lang.org/unstable-book/compiler-flags/sanitizer.html)
  - AddressSanitizer detects memory-access and deallocation failures
  - MemorySanitizer detects uninitialized reads
  - ThreadSanitizer detects data races
  - exact caution: “might not catch all possible issues”
- inference: native fuzzing can cheaply find inputs for later Miri replay
  - replay may identify additional type or aliasing failures
  - successful native execution is not a certificate that replay is valid

foreign-function checking

- Ian McCormack, Joshua Sunshine, Jonathan Aldrich, ICSE 2025
  - [A Study of Undefined Behavior Across Foreign Function Boundaries in Rust Libraries](https://arxiv.org/abs/2404.11671)
- combines Miri and an LLVM interpreter
- abstract reports “46 instances of undefined or undesired behavior in 37 libraries”
- contribution beyond ordinary Miri: observes interactions with foreign code
  - interpreted LLVM remains a particular execution model
  - cannot assume it covers every native library or assembly behavior

concurrent execution testing

- [Loom, official repository](https://github.com/tokio-rs/loom)
- repeats tests under different allowed execution orders
  - exact README words: “permuting the possible concurrent executions of that test”
- model and instrumentation limit the result
  - README states that its C11 model is incomplete
  - some sequentially consistent operations receive weaker treatment and can cause false alarms
  - some load-buffering executions remain unexplored
  - warning: a clean report can miss a bug
    - exact excerpt: “Loom says there is no bug”
- [async and concurrency review](async_concurrency_bugs.md) owns the broader bug literature

compiler testing as adjacent evidence

- Qian Wang and Ralf Jung, Rustlantis, OOPSLA 2024
  - [paper](https://doi.org/10.1145/3689780)
- generates Rust programs for differential compiler testing
  - differential testing compares executions that should agree
  - Miri excludes generated programs with undefined behavior
  - exact Miri §7 description: “used Miri as an oracle”
- implication: disagreement between optimized binaries is informative only after validating the input program
- [toolchain literature](compile_time_toolchain.md) owns the full compiler-testing review

research we could do

- proposed: expose hidden safety assumptions with deliberately awkward safe clients
  - prior work: Rudra's panic and trait bugs; SyRust and Crabtree client synthesis; Miri
  - proposed distinction from Crabtree: synthesize new safe trait implementations and deliberately place panics or API reentry inside callbacks
    - callbacks and trait-aware call sequences alone are already supported by Crabtree
    - changing answers across calls tests assumptions beyond type compatibility
    - whether the baseline already reaches these behaviors must be measured
  - why it may matter: safe API clients may legally violate assumptions that ordinary tests never challenge
  - evaluation: historical fixed bugs plus previously unseen libraries
    - compare against client-generation baselines and ordinary fuzzing
    - count independently confirmed root causes
    - measure generation cost, replay cost, and false reports
  - novelty gate: first reproduce Crabtree and add only an adversarial-client behavior it demonstrably misses
    - compare identical APIs, starting types, and CPU budgets
    - count memory-safety witnesses separately from deliberate harmless panics

- proposed: optimize the handoff between native fuzzing and Miri
  - prior work: cargo-fuzz, sanitizers, Miri, API synthesis
  - new contribution: select a small set of executions that exercise distinct unsafe states rather than merely distinct native code edges
  - why it may matter: Miri's execution cost prevents replaying every fuzz input
  - evaluation: fixed CPU budgets on historical and held-out bugs
    - compare random replay, coverage-based replay, and unsafe-state-based replay
    - measure confirmed bugs per hour and time to first witness
    - report inputs rejected by Miri because of unsupported operations separately
  - novelty risk: search existing replay and hybrid-fuzzing work before committing to this idea

- shared proposal: compare tools on executable historical failures
  - tools here contribute complementary checks and distinct support limits
  - [empirical review](empirical_bug_studies.md) owns corpus construction, deduplication, and evaluation

- proposed: carry pointer information across real Rust/C boundaries at lower cost
  - prior work: the ICSE 2025 interpreter combination; Miri's provenance checks
  - new contribution: selective boundary instrumentation with a stated subset of checked obligations
  - why it may matter: wrappers around native libraries are excluded by ordinary Miri workflows
  - evaluation: reproduce the published foreign-function bugs
    - compare support, runtime, and failure detection against the interpreter baseline
    - include callbacks, allocation transfer, and retained pointers
  - risk: incomplete instrumentation may create false confidence
    - report every property lost at the boundary

limits of this pass

- full Miri, Tree Borrows, Rudra, SyRust, Crabtree, and SafeDrop preprint checked
- SafeDrop final TOSEM article remains inaccessible
  - preprint and publisher dates are distinguished above
- synthesis implementations were not executed
  - claimed differences in proposed clients remain hypotheses until baseline reproduction
- tool effectiveness cannot be ranked from these differing populations and failure definitions
