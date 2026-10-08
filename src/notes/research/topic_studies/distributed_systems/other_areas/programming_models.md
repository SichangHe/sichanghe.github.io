programming models and languages for distributed systems
(authored by agents unless marked 🧑)

start here

- the question this file answers: which ways of writing a distributed program actually remove bugs, and where they stop
  - every family below writes one program for the whole system, then a tool splits it up or replays it
  - the families differ in what the tool promises after the split
- my overall read (inference, not a measured result)
  - the strongest promises today come from the narrowest tools
    - choreographies promise no deadlocks and no mismatched messages, but assume cooperating, non-crashing nodes
    - durable execution promises crash recovery, but only if your code is deterministic and your side effects are idempotent
    - Hydro promises deterministic outputs tracked in types, but is young and run by one group
  - the gap every family shares: what happens at the boundary with the real world
    - crashes, retries, external services, and code upgrades
    - that boundary is exactly where the Rust cancellation study in [Rust distributed systems](rust_distributed_systems.md) also lands
- recommended studies, each built on existing work and each with a way to fail
  - 1. measure whether Hydro's type-level nondeterminism tracking catches real bugs from Rust distributed systems
  - 2. bring choreographies and durable execution together: project a choreography into durable steps and check which recovery bugs disappear
  - 3. test whether LLM coding agents write correct code faster against typed protocols (session types or Hydro types) than against plain async Rust
  - 4. extend trace validation (TraceLink, PObserve) to durable execution logs, which are already a trace
  - details and falsifiers under "research we could do"
- scope and siblings
  - this file: Hydro, choreographic programming, session types, actors, durable execution, Unison, P, Quint, spec-to-code links, and LLM agents
  - verified frameworks IronFleet, Verdi, Anvil, Aneris: [formal verification review B](../../../distributed_verification_review_b/review_b_systems_20261007.md)
  - trace validation, PGo, MongoDB conformance, P for bug finding: [model checking and code conformance](../finding_bugs/model_checking.md)
  - durable execution for LLM agents (LogAct, Restate blog, SagaLLM): [agent systems](agent_systems.md)
  - Rust runtimes, cancellation, Timely and differential dataflow: [Rust distributed systems](rust_distributed_systems.md)

terms

- projection: a compiler step that turns one global program into one local program per node
  - choreographic programming calls it endpoint projection, EPP
- deterministic: the same inputs always give the same output, whatever the message order or timing
- durable execution: a runtime records each step a workflow takes, so after a crash it replays the record instead of redoing the steps
- idempotent: doing an operation twice has the same effect as doing it once
- session type: a type that spells out the order and shape of messages on a channel, checked by the compiler
- multiparty session type, MPST: a session type for more than two participants
- actor: an object with its own state that handles one message at a time and talks to others only by messages
- virtual actor: an actor that always exists by name; the runtime creates it on first use and may move it between machines
- trace validation: record what the running code did, then ask a model checker whether the model allows that run
- staged programming: a program that writes another program, here a high-level Rust program that emits per-node Rust binaries

the six families and what each promises

- 1. dataflow with semantic types: Hydro
  - promise: outputs are deterministic unless you explicitly mark the nondeterministic spots
- 2. choreographies: Choral, HasChor, ChoRus, MultiChor, Klor, Chorex, Pirouette, Kalas, Mech
  - promise: projected programs cannot deadlock or receive a message of the wrong shape
- 3. typed protocols on channels: session types, MPST, Rumpsteak, MultiCrusty, Maty, NEST
  - promise: each participant's code is checked against its slice of the protocol
- 4. actors and durable objects: Erlang, Akka, Orleans, Cloudflare Durable Objects
  - promise: no shared memory, one message at a time, supervision on crash; protocol errors stay unchecked
- 5. durable execution: Azure Durable Functions, Temporal, Restate, DBOS, Beldi, Boki, Styx, libDSE
  - promise: a workflow finishes despite crashes, if your code obeys the determinism rule
- 6. spec first, code checked against spec: TLA+, P, Quint, PGo, TraceLink, PObserve, Quint Connect
  - promise: the design is checked exhaustively, and the code is checked against the design on observed runs only

Hydro: a Rust compiler stack for distributed programs

- what it is, in the project's own words
  - README: "A high-level distributed programming framework for Rust. Hydro can help you quickly write scalable distributed services that are correct by construction."
  - README on the lower layer: "The Dataflow Intermediate Representation (DFIR), a compiler and low-level runtime for stream processing. DFIR enables automatic vectorization and efficient scheduling without restricting your application logic."
  - three layers: `hydro_lang` on top, DFIR below, Hydro Deploy to launch
  - [source: hydro-project/hydro README](https://github.com/hydro-project/hydro)
  - `hydro_lang` docs name `Process` and `Cluster` locations, `Stream`, `Singleton`, `Optional` live collections, and a `NonDet` type with a `nondet!` macro "for tracking non-determinism"
  - [source: docs.rs hydro_lang](https://docs.rs/hydro_lang/)
- what the types promise, from the reference docs in the repository (hydro.run pages returned 404; read from the source tree on 7 Oct 2026)
  - the pitch: "Much like Rust's type system helps ensure memory safety, Hydro helps ensure **distributed safety**."
  - bugs the docs say the types catch: "Non-determinism due to message delays (which affect arrival order), interleaving across streams (which affect order of handling) or retries (which result in duplicates)"; "Observing a collection that is still asynchronously changing as if it were a final result"; mismatched serialization; misused node identifiers across clusters; "Relying on non-deterministic clocks for batching events"
  - [source: docs/hydro/reference/correctness/index.md](https://github.com/hydro-project/hydro/blob/main/docs/docs/hydro/reference/correctness/index.md)
  - the guarantee is eventual determinism: "given a set of specific live collections as inputs, the outputs of the program will **eventually** have the same _final_ value. All safe APIs in Hydro preserve this property, and the operations that cannot are explicitly marked."
  - the docs also say this is not a replication consistency model: "Hydro does not use such a consistency model internally, instead focusing on the values local to each distributed location _over time_."
  - [source: correctness/determinism.md](https://github.com/hydro-project/hydro/blob/main/docs/docs/hydro/reference/correctness/determinism.md)
  - every escape hatch needs a written reason: "all non-determinism in a Hydro program originates at a `nondet!` invocation", and "The doc comment is **mandatory**; `nondet!` will not compile without one."
  - the four marked sources: batches "whose boundaries depend on arrival timing", wall-clock sampling, "assuming an order for messages that arrive from concurrent senders", and "tolerating **retries** that may deliver the same message more than once"
  - the retry example types a stream as `Stream<u64, Process<'a, L>, Unbounded, TotalOrder, AtLeastOnce>` and calls `.assume_retries::<ExactlyOnce>(nondet!(...))` with the reason that duplicates are removed by `first()`
  - [source: correctness/nondet.md](https://github.com/hydro-project/hydro/blob/main/docs/docs/hydro/reference/correctness/nondet.md)
  - `Bounded` means "no further asynchronous changes can arrive"; APIs that look at a whole collection "are only available when the collection is `Bounded`"; cutting an unbounded stream into a bounded batch needs a `sliced!` block and a `nondet!` guard
  - [source: correctness/bounded-unbounded.md](https://github.com/hydro-project/hydro/blob/main/docs/docs/hydro/reference/correctness/bounded-unbounded.md)
  - streams carry an `Order` parameter, `TotalOrder` or `NoOrder`; sending from a cluster to a process and flattening gives `NoOrder`, and then "`fold` is not available on `NoOrder` streams", so the program does not compile
  - network sends name their failure model in the call, e.g. `TCP.fail_stop().bincode()`
  - [source: streaming-data/streams.md](https://github.com/hydro-project/hydro/blob/main/docs/docs/hydro/reference/streaming-data/streams.md)
- it ships its own deterministic simulator
  - "In many cases, the Hydro simulator can perform **exhaustive** checks, which ensure that your application will behave correctly in _all_ possible distributed executions." Otherwise it uses "coverage-guided fuzzing"
  - "The simulator uses the exact same Hydro code you will run in production, and requires no changes."
  - stated limit: "`assume_ordering::<TotalOrder>` is supported, `assume_retries::<ExactlyOnce>` is not supported"
  - [source: simulation/index.mdx](https://github.com/hydro-project/hydro/blob/main/docs/docs/hydro/reference/simulation/index.mdx)
  - inference: the simulator does not yet explore duplicate delivery, which is the retry class its own type system singles out; that is a concrete gap
  - the sibling [deterministic simulation testing](../finding_bugs/deterministic_simulation_testing.md) note covers MadSim, Turmoil, and FoundationDB-style simulators this should be compared with
- the idea behind it, from the dissertation
  - Laddad's abstract: distributed systems are hard because of "message reordering, retries, and failures"
  - the thesis proposes asynchronous streams "that embed distributed semantics into types", implemented in Rust as Hydro, so developers "write distributed protocols as single functions"
  - staged programming lets the high-level program compile to "bare-metal binaries"
  - [source: Shadaj Laddad, PhD dissertation, UC Berkeley EECS-2025-85, 16 May 2025](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2025/EECS-2025-85.html)
  - inference: the claim "performance matching handwritten systems" is the author's; I did not find an independent benchmark
- the semantics paper: Flo, POPL 2025
  - abstract: "we identify two general yet precise semantic properties: streaming progress and eager execution. Together, they ensure that streaming outputs are deterministic and kept fresh with respect to streaming inputs."
  - a type system separates "bounded streams, which allow operators to block on termination, from unbounded ones"
  - the paper models Flink, LVars, and DBSP inside Flo
  - [source: Laddad, Cheung, Hellerstein, Milano, arXiv 2411.08274](https://arxiv.org/abs/2411.08274)
- the placement paper: Suki, CP 2024
  - abstract: "an embedded Rust DSL that lets developers implement streaming dataflow with explicit placement of computation"
  - calls its own approach "choreographic", and uses staging to compile "local compute units into individual binaries with zero-overhead"
  - [source: Laddad, Cheung, Hellerstein, arXiv 2406.14733](https://arxiv.org/abs/2406.14733)
  - this is the bridge between families 1 and 2 above: Hydro is a choreography whose local programs are dataflows
- the optimization paper: query rewrites on protocols, SIGMOD 2024
  - abstract: "Manual rule-driven applications of decoupling and partitioning improve the throughput of 2PC by 5× and Paxos by 3×, and match state-of-the-art throughput in recent work."
  - the rewrites rest on "order-insensitivity and data dependency analysis"
  - [source: Chu et al., arXiv 2404.01593](https://arxiv.org/abs/2404.01593)
  - author claim: the results "point the way toward automated optimizers for distributed protocols"
  - limit: the paper says these applications were manual
- the staging substrate: Stageleft, GPCE 2026
  - "Stageleft: Multi-stage Programming in Standard Rust", Laddad, Samuel, Hellerstein, GPCE 2026, pages 94–106
  - [source: researchr GPCE 2026 listing](https://researchr.org/publication/gpce-2026)
  - not read beyond the listing
- older roots: CALM and lattices
  - the CALM theorem says a program can be computed consistently without coordination exactly when it is a monotone function of its inputs
  - [source: Hellerstein and Alvaro, Keeping CALM, arXiv 1901.01930](https://arxiv.org/pdf/1901.01930)
  - Hydro's Paxos rewrites and its determinism tracking both come from this line
- status in Sept 2026
  - podcast page: "He is now at AWS, where he works to bring his research into production through Hydro"
  - [source: Software Engineering Daily, 10 Sep 2026](https://softwareengineeringdaily.com/podcasts/a-rust-framework-to-simplify-distributed-systems/)
  - an Amazon job listing titled "Software Development Engineer, Hydro" also appeared in search results
  - [source: AnitaB job board](https://jobs.anitab.org/companies/amazon-3-60ad394d-c673-4474-9694-344b0cae748f/jobs/84172517-software-development-engineer-hydro)
  - inference: AWS is investing engineers, which makes Hydro a more credible target for Rust systems research than a one-student prototype
  - I found no public AWS production use case; treat "used in production" as unverified
- what Hydro does not promise
  - inference from the sources: Flo's determinism is about outputs given inputs; it says nothing about crashes, durable state, or exactly-once effects on the outside world
  - the publication list has no paper on failure recovery or on verified Hydro programs
  - [source: hydro.run research page](https://hydro.run/research/)

choreographic programming: one global program, projected per node

- the paradigm and its guarantee
  - Mech abstract: "programmers write the intended overall behaviour of a system from a global perspective in a choreography, which is then automatically compiled into communicating endpoint programs by a procedure known as endpoint projection (EPP). The central promise is that the projected endpoint programs, when executed together, are behaviourally equivalent to the source choreography."
  - [source: Qin, Peressotti, Montesi, Mech, arXiv 2607.15174, July 2026](https://arxiv.org/abs/2607.15174)
- where the theory stands in 2026
  - Mech, Lean 4: handles "general branching in knowledge of choice, general recursion, and nondeterministic choice", which earlier mechanisations left out
  - same abstract: "the sketched semantics from the literature does not correctly capture how nondeterministic choice interacts with concurrency"
  - the authors prove "completeness and soundness of EPP and derive communication safety and deadlock-freedom for projected networks"
  - a companion paper reproves EPP from the local view of processes
  - [source: Acclavio, Manara, Montesi, Qin, arXiv 2607.23793, July 2026](https://arxiv.org/abs/2607.23793)
  - earlier mechanisations: Pirouette in Coq, Kalas in HOL4 compiling to verified CakeML
  - [Pirouette, arXiv 2111.03484](https://arxiv.org/pdf/2111.03484), [Kalas thesis listing, ANU](https://dspace-prod.anu.edu.au/items/68fd63cb-9aee-4dc5-861e-1ccf53cddf43/full)
  - inference: the core theorem is solid; the open theory problems are failure and asynchrony, not projection itself
- implementations you can use from a mainstream language
  - MultiChor, PLDI 2025, Haskell, Rust, and TypeScript
    - abstract: library-level choreographies like HasChor had three limits: "Their conditionals require extra communication; they require specific host-language features (e.g., monads); and they lack support for programming patterns that are essential for implementing realistic distributed applications"
    - fixes: "conclaves and multiply-located values", "end-point projection as dependency injection", and "census polymorphism" to abstract over the number of participants
    - [source: Bates, Kashiwa, Jafri, Shen, Kuper, Near, arXiv 2412.02107](https://arxiv.org/abs/2412.02107)
  - ChoRus, Rust: the first choreographic library for Rust, from the same group
    - [source: Kashiwa et al., arXiv 2311.11472](https://arxiv.org/pdf/2311.11472)
  - Choral, Java: an IRC server written as a choreography and tested against real IRC clients
    - the paper names "higher-order choreographies and user-defined communication semantics" as the features that made a real protocol possible
    - [source: Lugović and Montesi, Programming 2024, arXiv 2303.03983](https://arxiv.org/abs/2303.03983)
  - Choret, Racket: built from macros because "there are more applications than implementations of choreographies"
    - [source: Bohosian and Hirsch, PLACES 2025, arXiv 2505.20845](https://arxiv.org/abs/2505.20845)
- what the community is working on, CP 2026 at PLDI, 16 June 2026
  - talks: MPI as choreography, quantum choreographies, Pact for agents, choreographic consensus protocols (Zhang and Gancher, Northeastern), performance of asynchronous dataflow choreographies, event-driven Chorex, parametric choreographies
  - keynote by Lindsey Kuper: "Interpreters everywhere!"
  - [source: CP 2026 program](https://wal.sh/events/pldi-2026/cp-2026/)
  - Pact abstract: choreographic programming "assumes cooperative participants — it has no notion of agent self-interest"; Pact adds game-theoretic choices and "Every Pact protocol maps to a formal game"
  - [source: Gopinathan, Feser, Naim, Tavares, Bingham, CP 2026](https://pldi26.sigplan.org/details/cp-2026-papers/7/Pact-A-Choreographic-Language-for-Agentic-Ecosystems)
  - I did not find abstracts for the consensus or MPI talks
- the limits that matter for systems work (inference unless marked)
  - no mainstream choreography paper above handles node crashes, retries, or reconnecting participants as part of the guarantee
  - projections usually assume reliable, ordered channels; Suki's stream types are one attempt to say otherwise
  - a consensus protocol in a choreography is still an open talk topic, not a published system

session types and typed protocols

- the idea: the compiler checks that each participant's sends and receives follow the protocol
  - Jongmans: "The idea is to use type checking to automatically detect safety and liveness violations of implementations relative to specifications."
  - the usual way to get this in a mainstream language is an external protocol language such as Scribble plus generated code; Jongmans embeds it in Scala match types instead to avoid "programming friction and leaky abstractions"
  - [source: Jongmans, Multiparty Session Typing, Embedded, arXiv 2501.17741, Jan 2025](https://arxiv.org/abs/2501.17741)
- Rust implementations
  - MultiCrusty: multiparty types encoded as binary ones on top of an existing Rust library, protocols from Scribble
  - [source: Lagaillardie, Neykova, Yoshida, COORDINATION 2020](https://mrg.cs.ox.ac.uk/publications/implementing-multiparty-session-types-in-rust-coordination/)
  - Rumpsteak: async Rust, lets you reorder sends and receives while keeping deadlock freedom
  - [source: Cutner, Yoshida, Vasconcelos, arXiv 2112.12693](https://arxiv.org/pdf/2112.12693)
  - inference: both target channels inside one process or over a simple transport; neither covers crash recovery of a participant
- new in 2026: bringing session types to actors and to the network
  - Maty, OOPSLA 2026: "the first actor language design supporting both static multiparty session typing and the full power of actors taking part in multiple sessions"
    - motivation: in Erlang and Elixir "the informally-specified nature of actor communication patterns leaves systems vulnerable to costly errors such as communication mismatches and deadlocks"
    - the design includes Erlang-style supervision; implementation is Scala with generated APIs, evaluated on Savina benchmarks, a factory scenario, and a chat server
    - [source: Fowler and Hu, arXiv 2602.24054](https://arxiv.org/abs/2602.24054)
  - NEST, ECOOP 2026: "a runtime verification framework that moves application-level protocol monitoring into the network fabric", monitors written in P4 and generated from session types, "extend them to handle packet loss and reordering"
    - [source: Larsen, Scalas, Amir, Jacobs, Wagemaker, Foster, arXiv 2604.21795](https://arxiv.org/abs/2604.21795)
  - inference: NEST is the first of these to treat the network as unreliable in the guarantee itself, which is why it is a runtime monitor rather than a static type

actors and durable objects

- the classic model: Erlang, Akka, Orleans
  - Orleans introduced virtual actors; the paper's starting point is that "the traditional stateless 3-tier architecture" fails high-scale interactive services
  - [source: Bernstein, Bykov, Geller, Kliot, Thelin, MSR-TR-2014-41](https://www.microsoft.com/en-us/research/publication/orleans-distributed-virtual-actors-for-programmability-and-scalability/)
  - a 2024 comparison on Kubernetes reports Proto.Actor "at least two times faster than Orleans, but is more complex to learn"
  - [source: Inderscience listing](https://inderscience.com/offers.php?id=138217), not read in full
- the serverless descendant: Cloudflare Durable Objects
  - Cloudflare docs: each object "responds to a globally unique name", its storage is co-located, and it "executes only one thing at a time"
  - [source: Cloudflare Durable Objects docs](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/index.md)
  - inference: this is a virtual actor with storage attached, so the actor and durable execution families are merging in products
- where actors fit in the taxonomy
  - Vanlightly places actors as the third "durable function form": "An actor is a long-lived stateful object with a persistent identity that identifies it as a 'thing'", with "Unbounded lifetime" and serial processing
  - Restate's "Virtual Objects" and Temporal's signal-driven workflows are his examples
  - [source: Jack Vanlightly, 10 Dec 2025](https://jack-vanlightly.com/blog/2025/12/10/the-three-durable-function-forms)
- research state (inference)
  - I found no 2025 or 2026 systems paper on actor runtimes at OSDI, SOSP, or EuroSys; the live research threads are typing them (Maty) and making them durable (below)

durable execution: replay a log instead of restarting

- the formal model: Azure Durable Functions, OOPSLA 2021
  - abstract: DF "enhances FaaS with actors, workflows, and critical sections"; the paper defines "two progressively more complex execution models, which contain the compute-storage separation and the record-replay, and prove that they are equivalent to the high-level model"
  - the runtime can "persist execution progress without requiring checkpointing support by the language runtime"
  - [source: Burckhardt, Gillum, Justo, Kallas, McMahon, Meiklejohn](https://www.microsoft.com/en-us/research/publication/durable-functions-semantics-for-stateful-serverless/)
  - the only formal semantics of a durable execution system I found; later systems argue informally
- the rule every product imposes: your workflow code must be deterministic
  - Temporal docs: "Workflow code must be deterministic to support replay."
  - "you must take care to ensure that any time your Workflow code is executed it makes the same Workflow API calls in the same sequence, given the same input"
  - "When the Workflow's code replays, the Commands that are emitted are compared with the existing Event History." A mismatch gives "a non-deterministic error"
  - "The Workflow Definition can change in very limited ways once there is a Workflow Execution depending on it."
  - [source: Temporal workflow definition docs](https://docs.temporal.io/workflow-definition)
  - inference: this is the same determinism requirement Hydro enforces in types and Temporal enforces at replay time; nobody has connected the two
- the vendor argument about what counts as durable
  - Restate: "persist every step the code executes (each LLM call, tool call, sleep, RPC)" so "completed steps return their journaled results instead of executing again"
  - the failure case: a tool makes three calls and dies after the second, so restarting from a checkpoint "re-runs all three"
  - [source: Giselle van Dongen, Restate blog, 15 Jun 2026](https://www.restate.dev/blog/why-checkpointing-is-not-production-grade-durable-execution)
  - vendor source; the point about partial side effects is correct but not new, see Beldi and LogAct in [agent systems](agent_systems.md)
- the database view: DBOS and AC/DC, CIDR 2026
  - slides title: "Consistency and Correctness in Workflow Systems", Stonebraker, Zhou, Kraft, Li
  - slide 13: "Durability Is Not Enough!"
  - slide 14: workflows need to be "Atomic (all or nothing)", "Consistent (for compensation within a workflow)", "Durable (to avoid redoing work)", "Correct (for compensation across concurrent workflows)", "ACID → AC/DC"
  - slide 19: "Compensation is tricky when someone else may have changed the state"
  - slide 21, future work: "Tighten up the AC/DC definitions, formalize correctness", "Similar to ANSI SQL isolation levels, but for workflows"
  - [source: CIDR 2026 slides](https://www.cidrdb.org/cidr2026/slides/Li-34.pdf)
  - inference: the authors admit the correctness notion is not yet formal; that is an open problem stated by the people who built DBOS
  - background: "DBOS: three years later", VLDB Journal 34(3), 2025, not read
- the academic runtimes for exactly-once functions
  - Beldi, OSDI 2020, logs function steps for transactional serverless functions
  - Boki, SOSP 2021, a shared log API; the paper reports BokiFlow runs workflows "4.3–4.7× faster than Beldi"
  - Halfmoon, SOSP 2023, two logging protocols with "log-free reads and writes"
  - Styx, SIGMOD 2025: "executes serializable transactions consisting of stateful functions that form arbitrary call-graphs with exactly-once guarantees" and claims "at least one order of magnitude higher throughput" over prior systems on YCSB-T, TPC-C, and DeathStar
  - [source: Psarakis, Christodoulou, Siachamis, Fragkoulis, Katsifodimos, arXiv 2312.06893](https://arxiv.org/abs/2312.06893)
  - the Boki and Halfmoon numbers come from search snippets, not from reading the papers
- the newest idea: speculate instead of persisting, OSDI 2026
  - abstract: durable execution "usually forces frequent and synchronous persistence, resulting in significant latency overheads"
  - libDSE: "developers write code assuming synchronous persistence, and a DSE runtime is responsible for transparently eliding persistence and reactively repairing application state on failure"
  - the programming model is "message-passing, atomic code blocks, and lightweight threads"; the runtime buffers "outputs to external systems (e.g., the user, legacy databases) until the underlying state is durable"
  - result: "reduces end-to-end latency by up to an order of magnitude for persistence-bound applications"
  - [source: Li, Chandramouli, Bernstein, Madden, OSDI 2026](https://www.usenix.org/system/files/osdi26-li-tianyu.pdf)
  - author-stated trade: "more complex failure recovery", worthwhile "as long as the unit of speculation (e.g., an RPC request) is more likely to succeed than to be interrupted by a failure"
  - inference: this is a new programming model (actions, sthreads, speculation barriers), and the correctness argument is informal; a model-checked or typed version is open
- Unison Cloud as a durable programming language
  - Unison 1.0 shipped 25 Nov 2025; the announcement promises "fully deployed distributed applications using a simple, familiar API—no YAML files, inter-node protocols, or deployment scripts required"
  - [source: Unison, Announcing Unison 1.0](https://www.unison-lang.org/unison-1-0/)
  - the big idea: "Each Unison definition is identified by a hash of its syntax tree", so to run code elsewhere "the sender ships the bytecode tree to the recipient, who inspects the bytecode for any hashes it's missing"
  - [source: Unison docs, the big idea](https://www.unison-lang.org/docs/the-big-idea/)
  - Volturno, a streaming engine built on Unison Cloud: channels "are built off the Remote.Ref and Remote.Promise primitives", state "is kept in cloud.Storage, so it survives crashes and can be modified transactionally", and the design "doesn't require an external coordination layer like Zookeeper"
  - the same post: "the cloud programming model does not pretend you can ignore these concerns. Instead, it gives you the tools to address them."
  - [source: Fabio Labella, Unison blog, 3 Nov 2025](https://www.unison-lang.org/blog/volturno-design/)
  - inference: Unison solves code shipping and gives durable storage as a language effect; it does not check protocols or determinism, so it belongs with actors and durable execution, not with Hydro or choreographies

connecting specifications to running code

- the three ways, as the sibling note already frames them
  - compile the spec to code, check the code's traces against the spec, or generate tests from the spec
  - [model checking and code conformance](../finding_bugs/model_checking.md) covers MongoDB, etcd, PGo, Stateright, SysMoBench
- compiled code can still disagree with its verified design: TraceLink, OOPSLA 2025
  - abstract: "The runtime behavior of this compiled implementation, however, may deviate from its design. For example, the compiler may contain bugs, the design may make incorrect assumptions about the deployment environment, or the implementation might be misconfigured."
  - "Unlike previous work on trace validation, our approach is completely automated."
  - result: "9 previously undetected and diverse bugs in PGo's TCB, including a bug in the PGo compiler itself"
  - [source: Hackett and Beschastnikh, OOPSLA 2025](https://www.cs.ubc.ca/~bestchai/papers/oopsla25-trace-link.pdf)
  - inference: this is the strongest evidence that "compile from the spec" alone is not enough, and the same argument applies to choreography projection and to Hydro's staging
- Hackett's 2026 summary of the whole line
  - talk abstract: "We go from specification to code via compilation, and code to specification by optimizing linearizability checking for TLA+. We join compile and runtime to enable push-button runtime validation via compiler instrumentation, and use our techniques to evaluate the validity of LLM-generated TLA+ models."
  - [source: TU Delft SERG seminar, 3 Jun 2026](https://se.ewi.tudelft.nl/events/2026/06/03/serg-meeting/)
- P at AWS: spec, checker, now runtime monitor and LLM front end
  - README: PObserve: "Validate that production systems conform to their formal P specifications."
  - README: PeasyAI: "Generate P state machines, specifications, and test drivers directly from design documents.", with Cursor and Claude Code integration through MCP, "27 specialized tools", and "1,200+ RAG examples"
  - users listed: S3, EBS, DynamoDB, MemoryDB, Aurora, EC2, IoT
  - [source: p-org/P README](https://github.com/p-org/P)
  - inference: AWS now ships all three legs in one tool: LLM writes the model, checker explores it, monitor checks production logs against it; no paper evaluates PeasyAI's output quality that I could find
- Quint: TLA+ semantics with a programmer's syntax, and model-based testing in Rust
  - docs: "Produce a bunch of traces (executions) from your model, which should be valid traces in your system."
  - "In December 2025, we launched Quint Connect, a library for Model-Based Testing in Rust."
  - docs caveat: MBT "won't give you a proof that your code is correct"
  - trace validation, the reverse direction, is listed as planned documentation
  - [source: Quint model-based testing docs](https://quint.sh/docs/model-based-testing)
  - inference: for a Rust systems project, Quint Connect is the cheapest spec-to-test path today; Verus is the expensive one

how LLM coding agents change which of these are practical

- the measured facts about LLMs writing TLA+
  - from natural language: 30 models, 205 specs, "LLMs achieve up to 26.6% syntactic correctness but only 8.6% semantic correctness"
  - [source: Bisharat et al., ICSOFT 2026, arXiv 2606.05792](https://arxiv.org/abs/2606.05792)
  - from real code, SysMoBench: "even the latest leading LLMs average around 46% on conformance and 41% on invariant, compared to near-perfect scores on syntax"
  - the authors' remaining manual steps: expanding traces to cover code paths, relaxing state abstractions "by hand inside Transition Validation modules, without a systematic policy", and per-system harnesses
  - [source: Cheng, Tang, Ma, Hackett, He, Su, Beschastnikh, Huang, Ma, Xu, SIGOPS blog, 8 May 2026](https://sigops.org/2026/can-llms-model-real-world-systems-in-tla)
- the practitioner view
  - Hillel Wayne, 5 Jun 2025: "Azure successfully used LLMs to examine an existing codebase, derive a TLA+ spec, and find a production bug in that spec."
  - his split: AI is good at "tedious and routine parts" and "worse at the strategic and abstraction parts"
  - [source: Computer Things newsletter](https://buttondown.com/hillelwayne/archive/ai-is-a-gamechanger-for-tla-users)
  - the TLA+ Foundation challenge, Aug 2025: a third-place entry "explored using TLA+ as a blueprint for generating idiomatic, multithreaded Rust code" by "applying TLA+'s refinement process in stages"
  - [source: Markus Kuppe, TLA+ mailing list, 12 Aug 2025](https://discuss.tlapl.us/msg06474.html), [entry repo](https://github.com/gterzian/_refinement)
- LLM agents as the participants, not the authors
  - ZipperGen: "a domain-specific language for specifying agent coordination based on message sequence charts (MSCs)", with "syntax-directed projection" to "deadlock-free local agent programs", guarantees "independent of LLM nondeterminism"
  - [source: Bollig, Függer, Nowak, arXiv 2604.17612, Apr 2026](https://arxiv.org/abs/2604.17612)
  - Pact, above, adds self-interest to choreographies for the same setting
  - ETAS, Jul 2026: an effect-typed language that "separates deterministic computation from agentic nondeterminism and externally visible actions"
  - [source: Tan, Wang, Zhang, Li, Shen, arXiv 2607.17780](https://arxiv.org/pdf/2607.17780)
  - inference: three independent groups in 2026 rediscovered projection and effect typing for agent coordination; none measured whether it reduces bugs in a real agent deployment
- what this means for the families above (my inference)
  - spec-first (family 6) gets cheaper: agents write the boilerplate, checkers reject the wrong half, humans keep the abstraction decisions
  - typed protocols and choreographies (families 2 and 3) become more attractive as agent targets because a type error is a signal the agent can iterate on; nobody has measured this
  - durable execution (family 5) is now mostly sold for agents, see [agent systems](agent_systems.md), and the determinism rule is exactly the thing an agent writing workflow code will break
  - the claim that agents make Verus-style verified distributed code practical is studied in [verus frontier](../../../verus_frontier_20261006.md) and [formal verification review B agents](../../../distributed_verification_review_b/review_b_agents_20261007.md); VeruSAGE reports over 80% of 849 tasks including Anvil, but those are proof tasks, not writing new systems
  - [source: VeruSAGE, Microsoft Research](https://www.microsoft.com/en-us/research/?p=1159305), read from a snippet only
  - Shan Lu's PAgE 2026 keynote draws the same line: "the demonstrated capability is proof synthesis against fixed, human-authored specifications", and the claim "is refuted as an end-to-end correctness result if the spec is also agent-authored and unvalidated"
  - [source: PAgE 2026 keynote page, 15 Jun 2026](https://wal.sh/events/pldi-2026/page-2026/keynote-shan-lu/)
  - inference: for programming models this means the spec, whether a TLA+ model, a choreography, or a Hydro type signature, is the part a human must still own

research we could do

- study 1: does type-level nondeterminism tracking catch real bugs
  - question: take bugs from Rust distributed systems (RisingWave, Materialize, TiKV, Databend, from the sibling bug studies) and ask whether a Hydro-style stream type would have rejected the buggy code
  - method: classify each bug as order dependence, retry or duplicate, missing termination, or external effect; write the smallest Hydro program with the same structure; record whether `NonDet` or bounded/unbounded typing flags it
  - why it is new: Flo proves properties of the language; no paper measures the language against a bug corpus
  - falsifier: most production bugs are in the external-effect and crash classes that Hydro does not type
  - a second part with its own result: run the same programs in Hydro's simulator and check whether its exhaustive mode finds the bugs that its types let through, especially duplicates, which the simulator says it does not explore
- study 2: choreographies projected onto durable execution
  - question: if each projected endpoint runs as a durable workflow (Temporal, Restate, or DBOS), which recovery bugs vanish and which appear
  - method: write three protocols (two-phase commit, a saga checkout like the DBOS slides, leader election) in MultiChor or ChoRus, project, and run each endpoint under a durable runtime with crash injection
  - the interesting collision: choreography projection assumes a participant never restarts mid-protocol; durable replay guarantees it resumes exactly where it was; the question is whether replay restores the knowledge-of-choice the projection depends on
  - why it is new: the choreography papers assume no crashes; the durable execution papers have no protocol-level guarantee; AC/DC is admittedly unformalised
  - falsifier: the combination reduces to "idempotent steps plus a log", already in Beldi and LogAct
- study 3: do coding agents write correct distributed code faster against typed protocols
  - question: give the same protocol task to an agent in four forms: plain Tokio, Rumpsteak or Maty-style session types, ChoRus choreography, Hydro
  - measure: attempts to pass a fixed differential test under Turmoil or MadSim, bugs that escape the tests, tokens spent
  - why it is new: every 2026 agent-coordination paper claims types help agents; nothing measures it for distributed code
  - the human's existing [verified agent code evaluation](../../../verified_agent_code_evaluation_20260808.md) has the evaluation scaffolding this would reuse
  - falsifier: the agent spends its budget fighting the type system and plain Tokio wins on both speed and escaped bugs
- study 4: trace validation over durable execution histories
  - observation: a Temporal or Restate event history is already a complete trace of workflow decisions
  - question: can TraceLink-style automated trace validation check those histories against a TLA+ or Quint model without instrumenting the application
  - what it would find: the replay-determinism violations that Temporal reports as "non-deterministic error" today, plus saga compensation bugs that AC/DC names but cannot yet check
  - why it is new: TraceLink works on PGo output; PObserve on AWS service logs; nobody has used the durable log as the trace
  - falsifier: event histories are too coarse (activity boundaries only) to decide the invariants that matter
- study 5: verify libDSE-style speculation
  - the OSDI 2026 paper gives a new model (actions, sthreads, speculation barriers) with an informal argument
  - a P or TLA+ model of distributed prefix recovery under rollback races would either confirm it or find a counterexample; this is the kind of model checkers routinely break
  - falsifier: the model is small and passes, which is still a publishable negative for the agent-plus-checker workflow
- which to start with (opinion)
  - study 1 is cheapest and sits exactly at the human's Rust and verification interests
  - study 3 is the one that connects coding agents, the topic the human cares most about, and no one owns it yet
  - study 2 is the most novel but needs both toolchains to cooperate

sources read and reading depth

- read in full or abstract plus key sections: Suki, Flo abstract, Laddad dissertation abstract, query rewrites abstract, Mech, semantic approach to CP, MultiChor abstract, Choral IRC abstract, Choret abstract, Pact abstract, CP 2026 program, Jongmans MPST embedded, Maty abstract, NEST abstract, Durable Functions semantics abstract, Temporal determinism docs, Restate blog, CIDR 2026 AC/DC slides (full text), libDSE introduction (pages 1–2), Styx abstract, Unison big idea, Unison 1.0 post, Volturno post, Quint MBT docs, P README, TraceLink abstract and introduction, Hackett seminar abstract, LLM-to-TLA+ abstract, SysMoBench SIGOPS post, Hillel Wayne post, TLA+ challenge announcement, ZipperGen abstract, Vanlightly post, Orleans abstract, Cloudflare docs, Hydro README, docs.rs, and five Hydro reference doc pages in full, Shan Lu keynote page, SE Daily page
- from search snippets only: Stageleft, Boki, Halfmoon, Beldi, Proto.Actor comparison, ETAS, VeruSAGE, GLP, DBOS three years later, Rumpsteak, MultiCrusty, Pirouette, Kalas, CALM
- about 65 sources touched, about 45 read at abstract depth or deeper
- all 2026 dates are as printed by the sources; I did not cross-check venues against proceedings

not covered

- Erlang and Akka internals, Ray actors, and Pekko; no 2025 or 2026 research surfaced
- Legion, Regent, Ray, and ML compilers that place one program across accelerators; that is the [mlsys](../../../mlsys.md) area
- Dedalus, Bloom, and BloomL beyond the CALM citation
- Scribble, Effpi, Teatrino, and the Go session type tools
- GLP, Shapiro's grassroots logic programming for phones, found but not read
- Azure Durable Functions' Netherite engine, Inngest, Cloudflare Workflows, Resonate
- ChatGPT consultation: left to the parent per the brief
