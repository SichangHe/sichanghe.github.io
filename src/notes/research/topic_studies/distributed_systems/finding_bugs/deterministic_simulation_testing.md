deterministic simulation testing
(authored by agents unless marked 🧑)

takeaway
- run production logic in a controlled world
  - choose message delivery, task scheduling, clocks, randomness, storage responses, and failures
  - record choices so a failing execution can be repeated
- agent inference: the strongest research question concerns the boundary of that world
  - which production behaviors does the simulator omit
  - which checks notice an omitted behavior
- a seed identifies an execution only with the same code, configuration, initial state, and controlled randomness
  - preserve a build identity and event trace with every failing seed
  - changing code can change the sequence of random choices

FoundationDB: the reference implementation
- [FoundationDB testing documentation, “Simulation”](https://apple.github.io/foundationdb/testing.html#simulation)
  - exact source: “deterministic simulation of an entire FoundationDB cluster within a single-threaded process”
  - Flow supports production and simulated execution
  - models machines, drive capacity, networking, reboots, and delays
  - cycle workloads rearrange a ring of key-value pairs
    - a broken ring exposes a transactional isolation violation
  - reports tens of thousands of simulations each night
    - trillion CPU-hour equivalence is an estimate based on increased fault intensity
    - do not interpret it as measured CPU consumption
  - “swizzle-clogging” stops selected connections and restores them in random order
    - deliberately biases fault generation
- [FoundationDB: A Distributed Unbundled Transactional Key Value Store, SIGMOD 2021](https://doi.org/10.1145/3448016.3457559)
  - full paper was not reread in this revision
  - opened documentation supports the implementation details above

Rust implementations and adoption costs
- [MadSim README, “Deterministic Simulation Testing” and “Usage”](https://github.com/madsim-rs/madsim#deterministic-simulation-testing)
  - exact source: “All I/O-related interfaces must be mocked during the simulation, and all uncertainties should be eliminated”
  - replaces supported Tokio and service-client dependencies with simulation variants
  - lists patches for dependencies including getrandom and quanta
  - uses `RUSTFLAGS="--cfg madsim" cargo test`
  - exposes process killing, network disconnection, and fault injection
  - lists RisingWave as a user
  - agent inference: “drop-in runtime” understates dependency auditing and replacement work
- [Turmoil README, introduction and “Crates”](https://github.com/tokio-rs/turmoil)
  - exact source: “latency, drops, partitions, crashes, torn writes”
  - current source includes simulated network, filesystem, and io_uring crates
  - hosts execute within one thread
  - manual control and a seeded generator drive faults
  - capability verified on repository main on 2026-10-07
    - older published crates may lack these capabilities
- [S2, “Deterministic simulation testing for async Rust”](https://s2.dev/blog/dst)
  - exact source: “reruns the same seed, and compares TRACE-level logs”
  - used Turmoil and in-memory emulators for external services
  - encountered HTTP timestamps and dependency calls to time and randomness
  - added MadSim-derived libc overrides in mad-turmoil
  - reports 17 notable issues found
    - team report, not a controlled comparison
  - agent inference: repeatability must itself be tested
    - same-machine replay does not establish cross-platform replay

guided schedule search: closest academic work
- [Gulcan, Ozkan, Majumdar, Nagendra, Model-Guided Fuzzing of Distributed Systems, OOPSLA 2025](https://arxiv.org/html/2410.02307v3)
  - checked full text sections 4, 5, and 6
  - exact source, section 6: “The abstraction level of the model heavily affects the performance of model guidance”
  - controls message delivery and maps implementation events to TLA+ actions
  - collects abstract states through controlled TLC execution
  - mutates schedules that visit new abstract states
  - compares random schedules, alternative coverage signals, Mallory, and BonusMaxRL
  - HTML paper abstract and conclusion report 12 new bugs
    - arXiv landing-page abstract reports 13
    - source disagreement unresolved
    - cite a specific version and passage when using a count
  - coarse models can omit crashes and restarts
  - detailed models can waste search on equivalent behavior
  - novelty warning
    - TLA+ coverage guiding schedule search is already demonstrated
    - a new contribution needs a narrower question
- [Meng, Pîrlea, Roychoudhury, Sergey, Greybox Fuzzing of Distributed Systems, CCS 2023](https://arxiv.org/html/2305.02601v3)
  - checked overview, methodology, evaluation summary, and related work
  - exact source: “Mallory dynamically constructs Lamport timelines of the system behaviour”
  - timelines summarize which events can affect later events
  - Q-learning chooses later fault actions from observed behavior
  - reports 22 previously unknown bugs
    - 18 confirmed by developers
  - compares against a Jepsen baseline on evaluated systems
  - agent inference: result does not establish superiority over every Jepsen workload
  - ModelFuzz learns across short tests
    - Mallory learns during a longer test

minimize a failure after reproducing it
- [Scott et al., Minimizing Faulty Executions of Distributed Systems, NSDI 2016](https://www.usenix.org/system/files/conference/nsdi16/nsdi16-paper-scott.pdf)
  - inspected abstract and introduction
  - DEMi reduces external inputs, internal event schedules, and message contents
  - controls Akka events to make replay reliable
  - evaluated on Raft and Spark
  - quote: "between 1X and 4.6X the size of optimal executions"
    - ten evaluated bugs; authors' result, not a general optimality guarantee
  - inference: saving a failing seed is only the first debugging step
    - removing irrelevant events can lower diagnosis and regression-test costs
    - minimization must preserve both a legal execution and the same intended violation

limits
- sampled schedules do not establish correctness for every schedule
- one-thread simulation checks asynchronous ordering
  - it does not reproduce every hardware memory ordering
  - use [Rust concurrency tools](rust_tools.md) for that layer
- simulated persistence must match the intended storage contract
  - distinguish completed writes from durable writes
  - state which writes a crash can lose or tear
- progress checks require a recovery policy
  - agent proposal: stop injecting faults, restore communication, then bound recovery time
  - perpetual partitions cannot refute a promise assuming eventual communication
- internal assertions and client-visible checks answer different questions
  - replica agreement alone does not establish correct client results

research proposals: agent hypotheses, not established gaps
- audit simulated persistence contracts
  - question: which real crash bugs disappear under overly strong storage models
  - closest work: FoundationDB simulation and Turmoil filesystem faults
    - [BOB, ALICE, CrashMonkey, and Ace](history_checking.md) already analyze application persistence and enumerate crash tests
    - [candidate 1](research_directions.md) gives the shared feasibility and evaluation plan
  - experiment
    - reproduce historical bugs in one persistent Rust replicated service
    - compare immediate durability, explicit-sync durability, and loss or tearing of unsynced writes
    - keep operation and crash traces, checks, and CPU budget equal
      - equal seeds alone do not guarantee equal traces after adapter changes
    - measure recovered-state errors and acknowledged data loss
  - possible contribution: an evaluated contract and evidence about model strength
- choose model granularity for guided simulation
  - closest work: ModelFuzz section 6 identifies this limitation
  - experiment
    - compare message-level, persistence-aware, and detailed timer-and-buffer models
    - compare random and guided schedules at equal wall time
    - include model execution overhead
    - report discovery probability across independent campaigns
  - avoid measuring success only with the coverage signal used to guide search
- locate lost determinism after dependency upgrades
  - closest work: S2 already compares repeated-seed logs and overrides libc
  - experiment
    - upgrade dependencies in two existing harnesses
    - replay seeds on Linux and macOS
    - compare raw log diff with instrumented clock and entropy call traces
    - measure localization of the first uncontrolled call
  - automatic localization could contribute
    - adding run-twice checking alone repeats existing practice
- test assumptions surrounding verified code
  - closest work: ModelFuzz and [ShardStore](rust_tools.md)
  - experiment
    - choose an executable verified component with documented I/O assumptions
    - distinguish permitted faults from deliberate assumption violations
    - classify failures in specification, environment, adapters, and proved code
  - an expected failure outside proof assumptions is not a proof counterexample

evidence and reading queue
- opened primary sources on 2026-10-07
  - FoundationDB documentation, MadSim and Turmoil READMEs, S2 account
  - ModelFuzz and Mallory full-text HTML
- retained leads whose publisher pages returned access errors
  - [P# storage testing, FAST 2016](https://www.usenix.org/conference/fast16/technical-sessions/presentation/deligiannis)
    - controlled scheduling of executable storage code
- DEMi PDF abstract and introduction were read through a direct conference-PDF URL
- proposals need broader novelty search and artifact inspection before commitment

Turmoil persistence follow-up: inspect the configured model first
- source inspected on 8 Oct 2026
  - pinned revision: `4f269b38317d63b35c0dc6819eafcbc344b92553`
  - read configuration, crash, torn-write, file-sync, and directory-sync code
  - no service was ported and no runtime experiment was run
- default writes are atomic in the simulator
  - configuration documentation: “writes are atomic, no torn writes”
  - [Turmoil maintainers, FsConfig defaults](https://github.com/tokio-rs/turmoil/blob/4f269b38317d63b35c0dc6819eafcbc344b92553/crates/turmoil-fs/src/lib.rs#L353)
  - enabling block_size already permits partial writes on crash
    - adding a generic torn-write switch would duplicate existing functionality
- file data and directory entries have separate durability rules
  - documentation: “Makes directory entries durable”
  - [same source, FsState sync rules](https://github.com/tokio-rs/turmoil/blob/4f269b38317d63b35c0dc6819eafcbc344b92553/crates/turmoil-fs/src/lib.rs#L870)
  - crash removes entries whose parent-directory persistence was not established
  - inference: a proposed missing-directory-sync detector must compare against these rules
- the inspected torn-write implementation preserves a prefix of each pending write
  - source operation: `data[..surviving_bytes].to_vec()`
  - [same source, apply_torn_writes](https://github.com/tokio-rs/turmoil/blob/4f269b38317d63b35c0dc6819eafcbc344b92553/crates/turmoil-fs/src/lib.rs#L1136)
  - surviving length uses configured block size and data length
  - agent assessment: this mechanism alone does not enumerate arbitrary subsets of a write's blocks
    - whether another path generates the relevant state needs separate inspection
    - whether the real target permits that state needs filesystem and device evidence
- refined candidate 1
  - compare a service's actual storage contract with the enabled simulator configuration
  - separate a disabled supported behavior from a genuinely unrepresentable behavior
  - inspect non-prefix persistence and unaligned writes as candidates, not established defects
  - reject a new adapter proposal if existing configuration already reproduces the target bug
