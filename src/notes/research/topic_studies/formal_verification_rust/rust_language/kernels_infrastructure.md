Rust in kernels and infrastructure
(authored by agents unless marked 🧑)

main point

- assessment: Rust changes which code must be trusted, but architecture determines how much protection that buys
  - Linux puts Rust around existing C interfaces
  - Asterinas confines unsafe operations to an OS framework
  - Theseus uses ownership to simplify component replacement and recovery
  - Hyperlight uses hardware virtual machines to isolate functions
- assessment: the strongest research opportunity is measuring failures at these boundaries
  - counting Rust lines alone misses C dependencies, device behavior, shared state, and incomplete APIs
- evidence checked on 2026-10-06
  - papers and project reports below describe their own experiments
  - none establishes a controlled, general comparison of Rust and C across all systems
- prior local context
  - [static analysis](../../../static_analysis.md) already covers kernel verification and Asterinas proof generation
  - this review studies architecture, deployment, and measured behavior outside those program verifiers

Linux: gradual adoption through safe interfaces

- primary source: [Linux kernel documentation, general information](https://docs.kernel.org/rust/general-information.html)
  - kernel developers: “subsystems should provide as-safe-as-possible abstractions as needed”
  - kernel developers: “The abstractions are correct (“sound”).”
- fact: bindings declare existing C functions and types for Rust
  - abstractions wrap those bindings and expose interfaces for drivers and filesystems
  - the documentation conditions its protection on sound abstractions and correctly implemented unsafe operations
- inference: a driver written entirely in safe Rust can still depend on a faulty C implementation or faulty wrapper
  - test the whole interface rather than treating the driver's language as an independent isolation boundary
- primary source: [Linux Rust general information, no_std](https://docs.kernel.org/rust/general-information.html#no-std)
  - source section: kernel crates opt out of the standard library with no_std
- fact: userspace libraries cannot be assumed to work unchanged inside the kernel
  - allocation, sleeping, interrupts, and resource ownership need kernel-specific interfaces
- limitation: these documentation pages provide design rules, not a measured security improvement
  - no causal estimate of vulnerabilities prevented by Rust for Linux was found in the inspected primary sources
  - do not transfer Android userspace outcomes directly to kernel drivers

Android: substantial deployment evidence with attribution limits

- primary source: [Jeff Vander Stoep, memory safe languages in Android 13, 2022](https://security.googleblog.com/2022/12/memory-safe-languages-in-android-13.html)
  - Google: “zero memory safety vulnerabilities discovered in Android’s Rust code”
- author-reported scope
  - approximately 1.5 million Rust lines in Android's open-source codebase
    - includes components and their open-source dependencies
  - Rust accounts for about 21% of new native code in Android 13
    - denominator: new C, C++, and Rust code
  - examples include Keystore2, ultra-wideband support, DNS-over-HTTP3, and the Android Virtualization Framework
- interpretation: zero discovered vulnerabilities is an observation at publication time
  - it does not establish zero existing vulnerabilities or continued absence after 2022
  - the source does not report equal exposure, testing effort, or code age for matched C++ components
- primary source: [Jeff Vander Stoep and Alex Rebert, eliminating memory safety vulnerabilities at the source, 2024](https://security.googleblog.com/2024/09/eliminating-memory-safety-vulnerabilities-Android.html)
  - Google: “the percentage of memory safety vulnerabilities in Android dropped from 76% to 24% over 6 years”
- author-reported outcome
  - memory safety issues were 76% of Android vulnerabilities in 2019 and 24% in 2024
    - denominator: vulnerabilities, not lines of code or user installations
  - 2024 absolute count was projected to 36
    - 27 observed through the September security bulletin
  - authors report Rust change rollback rates below half the C++ rate
    - rollback means reverting a change after an unexpected bug
    - raw counts and adjustment for change difficulty are not supplied in the post
- limitation: this is an Android-wide transition to memory-safe languages
  - the authors also identify improvements to unsafe code
  - the trend supports adoption but does not isolate Rust's causal contribution
- inference: deployment evidence makes incremental adoption a credible strategy
  - it leaves open which components should be rewritten and which should receive new safe interfaces

Asterinas: a small framework supports a mostly safe kernel

- paper: [Yuke Peng et al., Asterinas: a Linux ABI-compatible, Rust-based framekernel OS with a small and sound TCB, USENIX ATC 2025](https://arxiv.org/abs/2506.03876)
  - authors, abstract: “a minimized, memory-safety TCB of only about 14.0% of the codebase”
- definition: the trusted computing base, or TCB, is the code whose correctness the stated protection depends on
  - here the protection is kernel memory safety
  - application correctness and permissions can depend on more code
- design: unsafe code lives in OSTD, a framework exposing safe interfaces
  - kernel services run in the same address space and use ordinary function calls
  - service code relies on Rust's checks rather than separate process address spaces
- measured TCB, paper §6.2 and table 9
  - Asterinas: 10,571 linked source lines out of 75,285, or 14.0%
  - Theseus: 43,978 out of 70,468, or 62.4%
  - RedLeaf: 17,182 out of 25,992, or 66.1%
  - Tock, selected nrf52840dk board: 2,903 out of 6,628, or 43.8%
- method matters
  - counts source lines represented in optimized linked LLVM code
  - counts unsafe-containing crates and dependencies of trusted crates
  - excludes Rust toolchain-provided core and alloc from the runtime TCB
  - systems support different workloads and hardware
    - these percentages measure architectural concentration, not equal security or functionality
- performance experiment, paper §6.1
  - single-core comparison against Linux 5.15
  - host: Intel i7-10700, 32 GB RAM, Ubuntu 22.04, QEMU 9.1.0
  - Linux CPU mitigations and huge pages disabled to match Asterinas feature availability
  - measured Redis GET throughput: 218,670.04 requests/s versus 155,994.34 on Linux
    - paper appendix B, Redis 7.0.15
    - about 40.2% higher in this setup
  - measured SQLite Vacuum performance: 72% of Linux with IOMMU enabled
    - paper §6.1.2, SQLite 3.46.1, speedtest1 base size 1000
  - authors explicitly defer comprehensive multicore evaluation
- interpretation: results support competitive performance for selected configurations
  - faster TCP results partly reflect absent congestion control in Asterinas's network library
  - comparing feature-incomplete stacks does not establish equivalent production behavior
- testing contribution: KernMiri extends Miri to simulate kernel memory and page tables
  - paper §6.3, table 10: 134 tests across seven OSTD memory-management submodules
  - measured line coverage: 93%
  - measured unsafe-block coverage: 100% within those submodules
  - total execution: 50.50 s interpreted versus 2.18 s native
    - approximately 23.2× from the table totals
    - reaching each block does not cover every input or execution order
- current primary source: [Hongliang Tian, Asterinas 0.18.0 release, June 2026](https://asterinas.github.io/2026/06/04/announcing-asterinas-0.18.0.html)
  - Tian: “fix a page cache bug that leaks uninitialized memory to userspace”
- fact: subsequent release notes include permission, signal, memory-mapping, and filesystem fixes
  - the release's application checks are compatibility tests
    - they do not mean formal correctness proofs
- inference: the page-cache example is a useful research target
  - language memory safety alone does not establish confidentiality at the kernel-to-user boundary
  - root cause and affected versions need examination before classifying that bug

Theseus: ownership helps recovery and live replacement

- paper: [Kevin Boos, Namitha Liyanage, Ramla Ijaz, and Lin Zhong, Theseus, OSDI 2020](https://www.usenix.org/conference/osdi20/presentation/boos)
  - authors: “reducing the states one component holds for another”
- design: small independently replaceable components avoid retaining unnecessary state for their callers
  - Rust's ownership rules help keep responsibility for resources clear
  - the OS can replace code while preserving surrounding task state
- measured live update, paper §7.1 and figure 2
  - switching inter-task communication from synchronous to buffered asynchronous channels
  - median application downtime: 385 microseconds
  - total cell-loading and replacement work differs from application downtime
  - selected case studies also replace scheduler/runqueues and a network driver/update client
- measured fault experiment, paper §7.2
  - authors: “we injected 800,000 faults”
  - 0.083% produced observable failures
  - recovery succeeded for 69% of manifested faults
    - denominator is observable failures, not all injected faults
  - failures include limitations of unwinding after hardware faults
- measured microbenchmarks, paper table 3
  - context switch: 0.35 ± 0.00 microseconds on Theseus versus 0.61 ± 0.06 on Linux
  - one-byte communication round trip: 1.06 ± 0.00 versus 3.65 ± 0.35 microseconds
  - experiments generally use an Intel NUC 6i7KYK, four cores/eight hardware threads, 32 GB RAM
- interpretation: Linux and Theseus implement different operations
  - Theseus's current-task function is compared with Linux's getpid path
  - Theseus application spawning differs from fork followed by exec
  - Linux uses a pipe where Theseus uses a channel
  - results demonstrate feasibility and architecture costs, not a universal Rust speed advantage

Hyperlight: Rust hosts a hardware isolation boundary

- primary source: [Microsoft Azure Core Upstream team, introducing Hyperlight, November 2024](https://opensource.microsoft.com/blog/2024/11/07/introducing-hyperlight-virtual-machine-based-security-for-functions-at-scale/)
  - Microsoft: “Hyperlight is able to create new VMs in one to two milliseconds”
- design: a Rust library executes small functions in a virtual machine
  - guest contains a minimal runtime rather than booting a general OS
  - host and guest communicate through exposed function interfaces
- author-reported comparison
  - Wasmtime sandbox start: below 0.03 ms
  - Hyperlight virtual-machine creation: 1–2 ms
  - optimized traditional virtual-machine creation: above 120 ms
- limitation: announcement does not give sufficient machine, workload, or statistical details for reproduction
  - these are vendor performance claims, not a peer-reviewed causal comparison
  - hardware virtualization supplies guest isolation
    - Rust alone does not supply the virtual-machine boundary
- research relevance: two protections interact
  - language checks reduce implementation bugs in the host
  - virtual-machine protection contains an untrusted guest or runtime escape
  - host-call validation remains an important attack surface

research we could do

- proposal 1: measure which kernel security bugs survive a move to safe Rust
  - prior work: Android adoption evidence, Linux wrappers, Asterinas KernMiri and release history
  - question: after memory safety improves, where do permission and data-disclosure failures move?
  - new contribution: a versioned, reproduced corpus connecting real bugs to the precise boundary that failed
    - distinguish unsafe implementation bugs, soundness bugs, device behavior, and safe-code logic bugs
  - why it may matter: tells maintainers which defenses remain necessary after adopting Rust
  - evaluation
    - reproduce historical Linux Rust and Asterinas fixes on vulnerable versions
    - use matched C/Rust components where available
    - measure exploit consequences, detection coverage, and repair difficulty
    - compare ordinary tests, fuzzing, Miri/KernMiri, and fault injection
  - novelty status: proposed gap, not established novelty

- proposal 2: test whether a small unsafe core remains small under realistic feature growth
  - prior work: Asterinas's linked-code TCB measure and Linux's abstraction layer
  - new contribution: longitudinal measurements tied to actual feature additions and supported configurations
    - track dependency growth and unsafe assumptions, not just unsafe block count
  - why it may matter: a smaller fraction can hide a growing absolute review burden
  - evaluation
    - build releases and feature configurations reproducibly
    - trace trusted dependencies and configuration-specific device interfaces
    - correlate growth with fixes and review effort
    - compare linked-code and source-code measures
  - hypothesis: feature growth increases boundary complexity faster than simple TCB percentages suggest

- proposal 3: compare ownership-based recovery under realistic state corruption
  - prior work: Theseus live replacement and its 800,000-fault experiment
  - new contribution: paired failures at component boundaries rather than uniformly random memory mutations
    - include outstanding DMA, shared buffers, pending callbacks, and half-completed I/O
  - why it may matter: successful recovery must preserve user-visible results, not merely keep the kernel running
  - evaluation
    - reproduce original fault experiment as a baseline
    - inject faults during selected real workloads
    - check filesystem contents, message delivery, resource leaks, and application progress
    - report recovery fraction, data corruption, and interruption time separately
  - novelty status: requires related-work checks against OS recovery and live-update literature

- proposal 4: find the real cost of isolating every infrastructure function
  - prior work: Hyperlight's virtual-machine cold-start claims and Theseus's cheap language-based calls
  - new contribution: a matched workload comparison including boundary checks and failure containment
  - why it may matter: service operators need a security/performance tradeoff under load
  - evaluation
    - same function and input distribution on native Rust, Wasmtime, and Hyperlight
    - separate cold creation, warm calls, concurrency, host calls, and serialization
    - measure tail latency, resident memory, CPU cost, and containment after injected guest faults
    - specify CPU, hypervisor, runtime versions, and initialization policy
  - limitation: measurement alone needs a surprising result or an actionable explanation to become a strong paper

reading order

- Asterinas paper §§2–4 for safe interfaces and device assumptions
- Asterinas §§6.1–6.3 for baseline choices and TCB/testing methods
- Theseus §§3–6 for state ownership, then §7 for recovery limits
- Android 2022 and 2024 reports for deployed outcomes and their denominators
- Linux abstractions documentation and Hyperlight announcement for contrasting deployment boundaries

paper collection

- added primary PDFs to /hdd1/sichanghe/paper_collection
  - Theseus, OSDI 2020
  - Asterinas, USENIX ATC 2025, arXiv 2506.03876v1
- web retrieval used direct publisher and project URLs
  - the web search tool returned a service error during this pass
