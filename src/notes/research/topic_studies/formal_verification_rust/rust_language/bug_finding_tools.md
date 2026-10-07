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

- [SafeDrop: Detecting Memory Deallocation Bugs of Rust Programs via Static Data-Flow Analysis, TOSEM 2022, author repository](https://github.com/VaynNecol/SafeDrop)
- searches paths across functions and fields for ownership and deallocation errors
  - source analysis uses Rust's intermediate representation
  - relevant to double frees and using memory after its owner frees it
- implementation maintenance matters
  - exact author notice: “We have integrated the features of SafeDrop into RAP”
  - [current RAPx repository](https://github.com/safer-rust/RAPx)
  - current repository includes both bug detection and proof-oriented features
  - this review concerns bug detection
- evidence limit: this pass verified the author repository, not the complete SafeDrop evaluation
  - avoid adding unverified bug counts or precision figures

API test synthesis

- SyRust, Yoshiki Takashima, Ruben Martins, Limin Jia, Corina S. Păsăreanu, PLDI 2021
  - [paper](https://doi.org/10.1145/3453483.3454084)
- Crabtree, Yoshiki Takashima, Chanhee Cho, Ruben Martins, Limin Jia, Corina S. Păsăreanu, OOPSLA 2024
  - [Rust API Test Synthesis Guided by Coverage and Type](https://doi.org/10.1145/3689733)
- generate well-typed library clients and run them in Miri
  - exact description in the Miri paper, §7: “automatically generating well-typed clients and executing them in Miri”
  - evidence here comes from the Miri authors' related-work discussion
  - original evaluations need a deeper follow-up before numerical comparison
- implication: writing a safe client that triggers unsafe-library failure is already an established research approach
  - a proposal needs a particular uncovered client behavior or measurable improvement

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
  - exact warning: “there can be a bug in the checked code even if Loom says there is no bug”
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

- proposed: find unsafe failures through hostile but safe callbacks
  - prior work: Rudra's panic and trait bugs; SyRust and Crabtree client synthesis; Miri
  - new contribution: synthesize callbacks that panic, change answers across calls, reenter an API, or trigger unusual destruction order
  - why it may matter: safe API clients may legally violate assumptions that ordinary tests never challenge
  - evaluation: historical fixed bugs plus previously unseen libraries
    - compare against client-generation baselines and ordinary fuzzing
    - count independently confirmed root causes
    - measure generation cost, replay cost, and false reports
  - risk: callback generation itself is not new
    - require a demonstrated class that existing methods miss

- proposed: optimize the handoff between native fuzzing and Miri
  - prior work: cargo-fuzz, sanitizers, Miri, API synthesis
  - new contribution: select a small set of executions that exercise distinct unsafe states rather than merely distinct native code edges
  - why it may matter: Miri's execution cost prevents replaying every fuzz input
  - evaluation: fixed CPU budgets on historical and held-out bugs
    - compare random replay, coverage-based replay, and unsafe-state-based replay
    - measure confirmed bugs per hour and time to first witness
    - report inputs rejected by Miri because of unsupported operations separately
  - novelty risk: search existing replay and hybrid-fuzzing work before committing to this idea

- proposed: measure which defects survive combinations of tools
  - prior work: Rudra, SafeDrop, Miri, native sanitizers, Loom
  - new contribution: a versioned benchmark with safe-client witnesses and explicit reasons each tool can or cannot analyze each case
  - why it may matter: developers need evidence about the remaining failure classes after their current checks pass
  - evaluation: reproduce original buggy and repaired commits
    - hold out libraries and root-cause families
    - report build failures, unsupported operations, timeouts, false alarms, and confirmed detections
    - test whether combinations discover more than their cheapest component
  - limit: this is initially a measurement study
    - a new detector needs evidence of a specific remaining gap

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

- strongest evidence: full Miri, Tree Borrows, and Rudra papers; official tool documentation
- SafeDrop implementation checked
  - full paper evaluation still needed
- SyRust and Crabtree included through an explicitly identified primary-author related-work discussion
  - original paper evaluations still needed
- these limits constrain numerical comparisons
  - they do not support ranking all tools by effectiveness
