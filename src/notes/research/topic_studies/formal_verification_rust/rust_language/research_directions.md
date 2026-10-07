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
- proposed contribution: replay remote commit, acknowledgment, cancellation, and recovery histories
  - include connection reuse after a partially completed request
  - ordinary schedule exploration is a baseline
  - progress-preserving adapters are another baseline
  - simple cancellation injection and effect recording are already established ideas
- why it may matter: a service can preserve memory while abandoning a promised result
- first experiment
  - one historical client/service or client/database cancellation failure
  - obtain buggy and fixed versions
  - observe request, remote commit, acknowledgment, retry, and connection reuse
  - permit unknown outcomes when the API permits them
  - reject lost acknowledged work against an independent requirement
- compare ordinary tests, schedule exploration, local cancellation checks, and both-endpoint history checks
  - include existing progress-preserving adapters where applicable
- convincing result: confirmed failures missed by the strongest comparable baseline
  - count distinct causes and independently reviewed false alarms
  - report replay failures, unsupported effects, and harness effort
- closest blockers: Oxide RFD 400 and cancel-safe-futures
  - both already address composed cancellation correctness
  - [async review](async_concurrency_bugs.md) explains the overlap
  - novelty must lie in a demonstrated missing remote-effect or recovery case

2. safe callers: retain one discriminating test

- agent recommendation: stop the broad standalone generator proposal
- builds on
  - [Rudra](https://github.com/sslab-gatech/Rudra)
  - [SyRust](https://www.andrew.cmu.edu/user/liminjia/research/papers/syrust-pldi21.pdf)
  - [Crabtree](https://www.andrew.cmu.edu/user/liminjia/research/papers/crabtree-oopsla24.pdf)
  - [RUXt](https://doi.org/10.4230/LIPIcs.ECOOP.2025.5)
  - [tool review](bug_finding_tools.md) owns the original evidence and limits
- possible new contribution: one demonstrated caller behavior that current methods cannot express or discover
  - new safe trait implementations combined with panic, destructor behavior, or API reentry are candidates
  - no missing behavior is established yet
- why it may matter: tests a concrete hidden assumption at a safe API boundary
- first experiment
  - manually reproduce one historical real-Rust failure
  - pin its Miri model and tool version
  - establish whether Crabtree expresses and finds it under matched APIs and CPU budgets
  - identify which construct RUXt's current model excludes
- compare shared supported cases and the complete target population separately
  - retain unsupported cases and missing harnesses in the results
- proceed only if the gap repeats across independent libraries
- correction to the consultation's abstract-based summary
  - RUXt proves that safe witnesses exist
  - its current prototype does not construct them
  - the exact paper excerpt is in the tool review

3. migration units that preserve allocation responsibility

- question: which functions must migrate together to avoid complicated Rust/C or Rust/C++ ownership boundaries?
- builds on
  - [C2Rust](https://github.com/immunant/c2rust)
  - [Crown](https://komaec.github.io/files/ownership.pdf)
  - [Crubit](https://github.com/google/crubit)
  - VERT and SACTOR behavior checks
    - [translation review](c_to_rust_translation.md) provides papers and checked scope
- proposed contribution: choose ownership-transfer-connected migration groups under a frozen C ABI
  - ABI means the binary calling convention and data layout foreign callers use
  - include function-pointer callbacks and asymmetric allocation/free responsibilities
  - global representation choice alone overlaps &inator
  - freeze external interfaces during the comparison
  - include callbacks and cleanup obligations
  - compare C2SaferRust caller-aware slicing and Syzygy dependency ordering
  - measure later forced revisions caused by early representation choices
- why it may matter: individually translated functions may leave a costly or unsafe shared-allocation interface
- first experiment
  - two libraries with callbacks and transferred buffers
  - manually identify allocation creation, transfer, and destruction
  - compare alternative migration partitions
  - measure remaining raw pointers, wrapper complexity, throughput, and reviewer effort
- convincing result: simpler ownership boundaries without changing required behavior or hiding cost
  - use independent hidden tests and differential fuzzing
  - reject comparisons whose C behavior is undefined
- closest blockers: C2SaferRust, Syzygy, and &inator
  - migration partitioning and dependency ordering are already established
  - contribution requires better partial-migration boundaries under the same validation and search budget
  - C++ mechanisms still need a separate reviewed population

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
  - distinguish permissions granted, actions observed, and permissions shown necessary by denial and retry
  - include network, filesystem, and process actions
  - hold out later versions and configurations
- compare Cackle policies, cargo-sandbox package-name policies, and version/configuration-specific records
  - respect each tool's supported operating systems
- convincing result: less review effort or excess privilege while retaining successful builds
  - execute harmless attack reproductions before claiming a policy blocks their actions
  - lack of observed malicious behavior does not establish benignness
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
- [ChatGPT critique at Extra High](consultation.md) completed
  - its ranking is an opinion
  - it favors direction 1, then the cheap test in direction 4
  - it recommends narrowing direction 3 and stopping direction 2 as a standalone project
- agent recommendation: retain direction 2 only as a small test of a specified missing caller behavior
