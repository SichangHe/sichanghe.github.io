finding bugs in concurrent and distributed Rust
(authored by agents unless marked 🧑)

takeaway
- check memory misuse, thread ordering, protocol behavior, and crash recovery separately
- agent recommendation: start with the property and execution boundary
  - choose a tool that observes both
  - sharing a test body does not make runtime wrappers and proof models equivalent

thread ordering
- [Loom README, introduction and “Unsupported features”](https://github.com/tokio-rs/loom)
  - exact source: “Loom currently does not implement the full C11 memory model”
  - replaces concurrency primitives and explores alternative executions with state reduction
  - useful for small atomic, lock, and wakeup tests
  - treats SeqCst accesses as AcqRel
    - weaker synchronization can produce false alarms
    - SeqCst fences are supported
  - omits some permitted load-buffering executions
    - passing can miss real bugs
  - “all schedules” applies only to configured exploration and modeled operations
- [Shuttle README, introduction and Loom comparison](https://github.com/awslabs/shuttle)
  - exact source: “a passing Shuttle test does not prove the code is correct”
  - randomized scheduling makes larger tests practical
  - controlled scheduling permits deterministic replay
  - includes wrappers for Tokio, rand, synchronization, and collections
  - probabilistic scheduling guarantees depend on the stated assumptions
  - agent recommendation: Loom for a small sensitive component
    - Shuttle for broader interactions where exhaustive exploration is impractical

memory misuse
- [Miri README, introduction and caveats](https://github.com/rust-lang/miri)
  - exact source: “Miri tests one of many possible executions of your program”
  - interprets Rust and detects undefined behavior in executed paths
  - examples include invalid memory access, invalid values, and data races
  - supports experimental Stacked Borrows and Tree Borrows aliasing checks
  - varying seeds exercises other executions
  - weak-memory emulation is incomplete
  - platform API support is limited
    - basic filesystem access exists
    - networking is unsupported
  - clean tests do not establish safety for every caller and execution

protocol exploration
- [Stateright README, “Examples” and “Features”](https://github.com/stateright/stateright)
  - exact source: “experimental/incomplete”
    - qualifies its eventual-progress checking
  - actor library with an embedded model checker and real UDP runtime
  - checks invariants and client-history consistency
  - provides configurable loss, duplication, and message ordering
  - examples reuse actors in checking and real execution
  - agent inference: shared actors reduce model drift
    - production networking remains a separate implementation boundary
  - relevant behavior must be expressed through model or actor interfaces
    - arbitrary existing Tokio services are not checked automatically

inputs and errors
- [fail-rs README, introduction and “Usage”](https://github.com/tikv/fail-rs)
  - exact source: “can be triggered conditionally and probabilistically”
  - named locations inject panic, early return, sleep, and other behavior
  - failpoints are disabled by default
    - enable their Cargo feature for testing
  - agent inference: coverage depends on developer placement
    - mechanism supplies injection, not complete schedule search or correctness checking
- [Bolero README, introduction and quick start](https://github.com/camshaft/bolero)
  - exact source: “fuzz and property testing front-end for Rust”
  - generates inputs for a property test
  - assertion failure or a false property detects a bug
  - agent inference: protocol faults must be represented as harness inputs or operations

bounded code checking
- [Kani README, introduction and harness example](https://github.com/model-checking/kani)
  - exact source: “The Kani Rust Verifier is a bit-precise model checker for Rust”
  - `kani::any()` supplies possible input values
  - checks assertions, panics, arithmetic overflow, and supported undefined behavior
  - supports function contracts
  - interpret results with harness assumptions and applicable exploration bounds
  - agent recommendation: begin with parsers and sequential transition functions
    - source does not establish replacement of a distributed scheduler
  - bibliography
    - current README lists ASE 2026 and [DOI 10.1145/3832783.3834499](https://doi.org/10.1145/3832783.3834499)
    - conference dates are 2026-10-12 through 2026-10-16
    - conference is after this review
    - numerical paper claims were not checked here

distributed faults
- [deterministic simulation study](deterministic_simulation_testing.md)
  - MadSim and Turmoil control asynchronous hosts and modeled I/O
  - repeatability requires dependency control as well as runtime control
  - persistence and completed client operations need explicit checks

verified Rust and the bug finding boundary, added 7 Oct 2026

- [Verus: A Practical Foundation for Systems Verification](https://www.microsoft.com/en-us/research/publication/verus-a-practical-foundation-for-systems-verification/), Lattuada, Hance, Bosamiya et al., SOSP 2024, distinguished artifact
  - exact source: "case-study systems, including distributed systems, an OS page table, a library for NUMA-aware concurrent data structure replication, a crash-safe storage system, and a concurrent memory allocator, together comprising 6.1K lines of implementation and 31K lines of proof"
  - exact source: "Verus verifies code 3–61x faster and with less effort than the state of the art"
  - agent inference: the proof covers what the spec says under stated environment assumptions
    - every tool above tests the parts outside that: the network glue, the OS, the assumptions
- [Anvil: Verifying Liveness of Cluster Management Controllers](https://www.usenix.org/conference/osdi24/presentation/sun-xudong), Sun, Ma, Gu, Ma, Chajed, Howell, Lattuada, Padon, Suresh, Szekeres, Xu, OSDI 2024, best paper
  - built on Verus and the kube client; verifies "eventually stable reconciliation", a liveness property, for ZooKeeper, RabbitMQ, FluentBit controllers
  - same group as Sieve and Acto, so this is the clearest before and after: test the controllers (2022, 2023), then prove them (2024)
  - detailed entry in [runtime checking](runtime_checking_and_invariants.md)
- [VeruSAGE: A Study of Agent-Based Verification for Rust Systems](https://arxiv.org/abs/2512.18436), Yang, Neamtu, Hawblitzel, Lorch, Lu, arXiv 2025
  - exact source: "849 proof tasks extracted from eight open-source Verus-verified Rust systems"
  - exact source: "The best LLM-agent combination in our study completes over 80% of system-verification tasks"
  - agent inference: if agents write most proofs, the scarce human work shifts to the spec and the environment model, which is exactly what fuzzing and simulation test
- [Kani in open source projects](https://aws.amazon.com/blogs/opensource/how-open-source-projects-are-using-kani-to-write-better-software-in-rust/), AWS open source blog
  - Firecracker: "In total, five bugs were found in the rate limiter implementation, the most significant one was a rounding error that allowed guests to exceed their prescribed I/O bandwidth by up to 0.01% in some cases"
  - "one bug in the VirtIO stack, where an untrusted guest could set up a virtio queue that partially overlapped with the MMIO memory region, resulting in Firecracker crashing on boot"
  - s2n-quic also uses Kani harnesses per the same post
  - agent inference: Kani wins on small, bounded, input-driven code; nobody has shown it on a message schedule

bug studies of Rust code
- [Understanding Memory and Thread Safety Practices and Issues in Real-World Rust Programs](https://pldi20.sigplan.org/details/pldi-2020-papers/76/Understanding-Memory-and-Thread-Safety-Practices-and-Issues-in-Real-World-Rust-Progra), Qin, Chen, Yu, Song, Zhang, PLDI 2020
  - exact source: "manual inspection of 850 unsafe code usages and 170 bugs in five open-source Rust projects, five widely-used Rust libraries, two online security databases, and the Rust standard library"
  - projects include Servo, TiKV, Parity Ethereum, Redox, Tock (from the paper; I did not reopen it)
- Understanding and Detecting Real-World Safety Issues in Rust, TSE 2024, artifact [lockbud](https://github.com/BurtonQin/lockbud)
  - search snippet: 70 memory bugs, 100 concurrency bugs, 110 panic bugs; five static detectors found 96 previously unknown bugs
  - I could not extract the PDF text, so these counts are unverified
- agent observation: both studies count memory and thread bugs; neither counts distributed bugs (lost writes, split brain, bad recovery) in Rust systems
  - that corpus does not exist; see the proposal below

how Rust projects test in practice, from primary sources
- RisingWave: [madsim in CI](https://risingwave.com/blog/applying-deterministic-simulation-the-risingwave-story-part-2-of-2/)
  - exact source: "we identified and fixed several bugs caused by concurrency, including panics, deadlocks, and calculation errors"
  - exact source, limitation: "Limited to Rust language projects"
- Sui (Mysten Labs): homegrown deterministic simulation, then [Antithesis](https://antithesis.com/blog/2025/mysten_interview/)
  - Mark Logan on the homegrown tester: it "started finding bugs. And then it was finding a bug a day"
  - why they moved: the single process design could not "test the interactions between different versions of our software"
- TiKV and TiDB: fail-rs failpoints plus [tipocket](https://github.com/pingcap/tipocket), "inspired by jepsen-io/jepsen", which "uses chaos-mesh to inject all-round kinds of nemesis on a TiDB cluster"
- Turso (Limbo): a seeded deterministic simulator in the repository, per its CONTRIBUTING file (search snippet)
- S2: [mad-turmoil](https://s2.dev/blog/dst), overriding libc time and randomness; exact source: "they were not completely deterministic"
- Polar Signals: [state machine style](https://blog.polarsignals.com/blog/posts/2025/07/08/dst-rust); exact source: "Forcing the system to be written as a set of state machines imposes considerable cognitive overhead on developers"
- Neon: a simulator with virtual time and network failure injection (search snippet; not opened)
- agent inference: every Rust shop that takes testing seriously converged on deterministic simulation, and each hit the same two walls: non-Rust dependencies and determinism leaks

closest industrial research
- [Bornholt et al., Using Lightweight Formal Methods to Validate a Key-Value Storage Node in Amazon S3, SOSP 2021](https://www.amazon.science/publications/using-lightweight-formal-methods-to-validate-a-key-value-storage-node-in-amazon-s3)
  - opened publication page and abstract
  - exact source: “decomposes correctness into independent properties, each checked by the most appropriate tool”
  - executable reference models specify ShardStore behavior
  - reports preventing 16 issues from reaching production
    - includes crash consistency and concurrency problems
  - agent inference: merely combining tools is insufficient novelty
    - this paper already demonstrates that overall strategy

research proposals: agent hypotheses
- measure simulator and thread-checker coverage differences
  - question: which bugs require message ordering, thread ordering, or both
  - closest work: Loom, Shuttle, MadSim, ShardStore
  - experiment
    - reproduce historical fixes in a replicated Rust component with concurrent storage
    - compare protocol simulation with separate storage concurrency tests
    - add combined checking for bugs requiring both layers
    - report bugs found, harness effort, and unsupported code
  - contribution needs a real boundary failure
- test adapters against proof assumptions
  - closest work: ShardStore executable models and ModelFuzz event mapping
  - experiment
    - extract documented assumptions from an executable verified component
    - test ordering, persistence, retries, and response identity independently
    - simulate network and disk obligations
    - check shared-memory obligations with Loom or Shuttle
  - distinguish invalid assumptions, incorrect adapters, and failures inside actual proof scope
    - deliberately breaking assumptions does not disprove a proof
- build a Rust distributed bug corpus
  - question: which real defects remain after memory safety checking
  - closest work: existing Rust memory and concurrency studies
    - full-text review is needed before choosing taxonomy
  - experiment
    - collect reproducible historical bugs from TiKV and RisingWave
    - retain fixing commit, smallest reproducer, and required environment behavior
    - classify independently twice and retain disagreements
    - label tools as capable only after running a reproducer or establishing a supported check
  - report inaccessible dependencies and unreproducible issues
    - issue labels alone do not establish causes

evidence scope
- primary repository documentation checked on 2026-10-07
  - Loom, Shuttle, Miri, Stateright, fail-rs, Bolero, Kani
  - moving branches describe that observation date
    - pin versions for benchmarks
- ShardStore abstract checked
  - full paper was not reread
- removed numerical claims previously taken only from search snippets
  - Tree Borrows rejection rates, Kani benchmark counts, Rust bug-study percentages
  - unverified here does not mean disproved
- proof systems and automated proof synthesis belong to the separate verification study
  - focus here is executable bug finding and the boundary with proofs
