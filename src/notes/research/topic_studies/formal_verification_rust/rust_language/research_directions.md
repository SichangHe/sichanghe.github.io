research directions for ordinary Rust systems
(authored by agents unless marked 🧑)

main decision

- agent opinion: first test a narrow failure mechanism in real code
  - choose an observable rule that existing tools do not check well
  - compare against the closest existing method under the same budget
  - require a repeatable failing case before building a general framework
- shortlist below is provisional
  - no experiment has been run
  - literature gaps do not establish novelty
  - a failed novelty check is a reason to narrow or stop a proposal
- program-verifier proposals belong in the sibling studies
- compiler implementation belongs in the separate seamless Rust effort

1. cancellation that loses work despite valid memory

- question: can dropping and restarting a composed async operation lose acknowledged work, bytes, or resources?
- builds on
  - [Qin et al., real Rust concurrency bugs](https://songlh.github.io/paper/rust-tse.pdf)
  - [Tokio's cancellation-safety contracts](https://docs.rs/tokio/latest/tokio/macro.select.html#cancellation-safety)
  - [Loom](https://github.com/tokio-rs/loom) and [Shuttle](https://github.com/awslabs/shuttle)
  - evidence and exact source excerpts: [async review](async_concurrency_bugs.md)
- proposed contribution: test application effects when cancellation and thread ordering interact
  - ordinary schedule exploration is a baseline
  - testing individual library operations is another baseline
  - added value must come from composed behavior or external effects
- why it may matter: a service can preserve memory while abandoning a promised result
- first experiment
  - one byte-processing loop and one request-processing loop
  - obtain historical buggy and fixed versions
  - state the required byte or acknowledgment behavior independently
  - cancel at reachable pauses and replay the same inputs
- compare ordinary tests, Clippy, schedule exploration, cancellation testing, and combined testing
- convincing result: confirmed failures missed by the strongest comparable baseline
  - count distinct causes and independently reviewed false alarms
  - report replay failures, unsupported effects, and harness effort
- nearest-work gap: newer async cancellation analyzers and testing frameworks need a focused search
  - do not begin a broad framework before resolving that overlap

2. safe callers that invalidate unsafe-library assumptions

- question: which legal callback, trait, panic, or destruction behavior breaks an apparently safe API?
- builds on
  - [RustBelt](https://plv.mpi-sws.org/rustbelt/popl18/)
  - [Rudra](https://github.com/sslab-gatech/Rudra)
  - [Miri](https://ralfj.de/research/papers/2026-popl-miri.pdf)
  - SyRust and Crabtree client synthesis
    - original evaluations remain a reading prerequisite
  - evidence and exact source excerpts: [tool review](bug_finding_tools.md)
- proposed contribution: target a specified class of adversarial safe callbacks that current client synthesis misses
  - generating clients in general is established work
  - adding an LLM alone is insufficient novelty
- why it may matter: a safe interface must work for all allowed callers
- first experiment
  - reproduce historical panic and trait bugs
  - vary callback return values, panic points, reentry, and destruction order
  - execute generated safe callers in a pinned Miri version
- compare Rudra, existing client synthesis, and native fuzzing plus Miri replay
- convincing result: reproducible safe-client witnesses for new failures or an established missing class
  - measure confirmed causes per hour
  - separate model violations, intended API misuse, and actual soundness failures
- stop condition: existing synthesis already covers the selected behavior at comparable cost

3. migration units that preserve allocation responsibility

- question: which functions must migrate together to avoid complicated Rust/C or Rust/C++ ownership boundaries?
- builds on
  - [C2Rust](https://github.com/immunant/c2rust)
  - [Crown](https://komaec.github.io/files/ownership.pdf)
  - [Crubit](https://github.com/google/crubit)
  - VERT and SACTOR behavior checks
    - [translation review](c_to_rust_translation.md) provides papers and checked scope
- proposed contribution: choose migration groups using allocation lifetime, callbacks, and cleanup obligations
  - compare file boundaries and call-graph grouping
  - preserve the public foreign-language interface where feasible
- why it may matter: individually translated functions may leave a costly or unsafe shared-allocation interface
- first experiment
  - two libraries with callbacks and transferred buffers
  - manually identify allocation creation, transfer, and destruction
  - compare alternative migration partitions
  - measure remaining raw pointers, wrapper complexity, throughput, and reviewer effort
- convincing result: simpler ownership boundaries without changing required behavior or hiding cost
  - use independent hidden tests and differential fuzzing
  - reject comparisons whose C behavior is undefined
- nearest-work gap: migration partitioning and compositional C-to-Rust reasoning need further comparison
  - current review already rules out generic compiler-guided differential checking as a sufficient new contribution

4. dependency permissions that change between releases

- question: can build-time restrictions remain useful across features, targets, and dependency updates?
- builds on
  - [Cackle](https://github.com/cackle-rs/cackle)
  - [cargo-vet](https://github.com/mozilla/cargo-vet)
  - [Cargo build scripts](https://doc.rust-lang.org/cargo/reference/build-scripts.html)
  - documented RustSec malware incidents
  - evidence and exact source excerpts: [dependency review](supply_chain_security.md)
- proposed contribution: measure configuration-specific permission changes and their review cost
  - enforcement alone overlaps existing Cackle work
  - first establish a missing capability or a measurable maintenance problem
- why it may matter: a correct Rust program can still misuse build-machine access
- first experiment
  - packages using native libraries, code generation, procedural macros, and cross-compilation
  - observe necessary network, filesystem, and process actions
  - hold out later versions and configurations
- compare current Cackle policies, broad sandboxing, and version-specific permission records
- convincing result: less review effort or fewer unnecessary exceptions without missing documented attack actions
- stop condition: existing policies already generalize without meaningful cost

other directions worth retaining

- [kernel boundaries](kernels_infrastructure.md)
  - hypothesis: feature growth increases the absolute unsafe review burden even when its percentage stays small
  - measure versioned linked code and interface obligations
  - avoid using unsafe-line counts as a security score
- [empirical bugs](empirical_bug_studies.md)
  - executable historical failures can support the proposals above
  - another report collection needs a new explanatory result
- [compiler histories](compile_time_toolchain.md)
  - compare cached compilation with clean compilation after generated edit sequences
  - check existing incremental compiler testing before claiming novelty
- [LLM repair](llms_writing_rust.md)
  - measure behavior and resource changes after compiler-accepted edits
  - a rejected initial program needs independent requirements or an earlier working version
- [unsafe model disagreements](unsafe_soundness_models.md)
  - minimize disagreements between Stacked Borrows and Tree Borrows
  - model disagreement alone does not identify a real vulnerability

connection to the human's existing work

- [new-work arguments](../../../new_work_arguments.md)
  - existing proposal: make dependency assumptions explicit and testable
  - these experiments offer concrete failure mechanisms for testing that idea
- [Agave scope](../../../agave_verification_scope.md)
  - existing bounded sanitizer and buffer-view pilots concern functional verification
  - this shortlist studies runtime and library failures outside those proof scopes
- [static-analysis notes](../../../static_analysis.md)
  - existing verifier and proof-agent material remains the reference for proof synthesis

assessment limits

- strongest evidence comes from directly read primary papers and official documentation
- some papers are represented only by publisher abstracts or another paper's related work
  - each topic review identifies those cases
- source search failed during this pass
  - 2025–2026 completeness and proposal novelty remain unresolved
- ChatGPT consultation at Extra High is pending
  - its opinions will be separated from independently verified sources
