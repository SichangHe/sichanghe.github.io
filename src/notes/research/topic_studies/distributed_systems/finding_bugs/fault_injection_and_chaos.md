breaking real systems on purpose: fault injection and chaos engineering
(authored by agents unless marked 🧑)

the problem

- fault injection deliberately causes bad events and checks the running system's promises
    - examples: crashes, lost messages, slow disks, and network partitions
- chaos engineering tests resilience through controlled experiments
    - often in staging or production
- research question: which fault, at which place and time, exposes a contract violation cheaply?

how it works

- run the real system plus a client workload
- inject faults
    - process kill or pause, node reboot
    - network partition, packet drop, delay
    - disk errors, bitflips, truncated files, lost fsync
    - clock skew, slow components (fail-slow)
    - error returns at chosen code points ("failpoints")
- record what clients saw (a history)
- check the history against a spec
    - linearizability or isolation checkers like Elle
    - invariants, crash or hang detection
- the research is mostly about steering: which faults, at which moment
    - random (Jepsen, Chaos Monkey)
    - systematic or model checking (SAMC)
    - feedback driven, fuzzing style (Mallory, CrashFuzz, CAFault)
    - code analysis to find risky points (CrashTuner, Legolas, Anduril)
    - reasoning backwards from good outcomes (Molly, FastFI)

papers and systems

classics, 2011 to 2021

- [FATE and DESTINI](https://usenix.org/conference/nsdi11/fate-and-destini-framework-cloud-recovery-testing), NSDI 2011
    - systematic multi-failure exploration plus declarative specs for recovery behavior, on HDFS, ZooKeeper, Cassandra
    - result counts omitted because this pass could not read the primary source
- [SAMC](https://www.usenix.org/conference/osdi14/technical-sessions/presentation/leesatapornwongsa), OSDI 2014
    - model checks real implementations with crashes and reboots, using small hand rules to prune redundant orderings
    - "SAMC is powerful; it can find deep bugs one to two orders of magnitude faster compared to state-of-the-art techniques"
- [Lineage-driven fault injection (Molly)](https://people.ucsc.edu/~palvaro/molly.pdf), SIGMOD 2015
    - starts from a correct outcome and asks which faults could have prevented it
    - a Boolean constraint solver chooses the next fault combination
    - abstract: "reasons backwards from correct system outcomes"
    - authors report up to an order-of-magnitude reduction in executions for some configurations
- [Chaos Engineering](https://arxiv.org/abs/1702.05843), IEEE Software 2016 (Netflix authors)
    - the founding article; defines the practice as experiments on production
    - "We use the term "Chaos Engineering" to refer to this approach, and discuss the underlying principles and how to use it to run experiments"
- [Principles of Chaos Engineering](https://principlesofchaos.org/), web manifesto, last updated 2019
    - "Chaos Engineering is the discipline of experimenting on a system in order to build confidence in the system's capability to withstand turbulent conditions in production"
- [CrashTuner](https://sigops.org/s/conferences/sosp/2019/program.html), SOSP 2019
    - finds "meta-info" variables (node ids, task ids) by static analysis and crashes nodes right when those are read or written
    - I only saw the program listing and summaries, not the abstract, so no quote
- [CoFI](https://conf.researchr.org/details/ase-2020/ase-2020-papers/16/CoFI-Consistency-Guided-Fault-Injection-for-Cloud-Systems), ASE 2020
    - learns cross-node invariants, then partitions the network exactly when they are violated so the system cannot heal
    - "CoFI injects network partitions to prevent the cloud system from recovering back to consistent states"
    - evaluated on Cassandra, HDFS, and YARN according to the inherited source notes
- [Elle](https://arxiv.org/abs/2003.10554), March 2020 preprint (Kingsbury, Alvaro)
    - the checker inside Jepsen for transactional isolation; designs workloads so reads reveal version order, then finds dependency cycles
    - [history checking](history_checking.md) contains the source evidence, workload assumptions, and predicate limitation
- [Filibuster](https://rohan.padhye.org/files/filibuster-socc21.pdf), SoCC 2021
    - turns existing microservice tests into fault tests
        - fails calls between services and skips redundant combinations
    - abstract names "service-level fault injection testing"
    - authors claim the bugs from 4 public industrial chaos experiments "could have been run during development instead"

2023 to 2024

- [CrashFuzz](https://conf.researchr.org/details/icse-2023/icse-2023-technical-track/173/Coverage-Guided-Fault-Injection-for-Cloud-Systems), ICSE 2023
    - coverage guided fuzzing over crash and reboot sequences
    - "CrashFuzz works by mutating combinations of possible node crashes and reboots according to runtime feedbacks"
    - evaluated on ZooKeeper, HDFS, and HBase according to the inherited source notes
- [Mallory](https://arxiv.org/abs/2305.02601), CCS 2023
    - greybox fuzzing for distributed systems; learns which fault sequences produce new behavior with Q-learning
    - abstract: "Mallory is adaptive"
    - current abstract reports 22 newly discovered bugs, 18 confirmed by developers
    - quote: "of which 18 were confirmed by developers"
- [Legolas](https://www.usenix.org/conference/nsdi24/presentation/wu-haoze), NSDI 2024
    - infers coarse "abstract states" from code and avoids injecting the same fault in the same state twice
    - author-reported new-bug count omitted pending independent source access
- [Anduril](https://web.eecs.umich.edu/~ryanph/paper/anduril-sosp24-preprint.pdf), SOSP 2024
    - fault injection for reproducing a known production failure, not hunting new ones
    - abstract: "in a median of 8 minutes"
    - authors report reproducing all 22 evaluated failures across five systems
- [Filibuster database extension](https://arxiv.org/abs/2404.01886), 2024 tool paper
    - injects faults into database clients (Redis, Cassandra, CockroachDB, PostgreSQL, DynamoDB) with an IDE plugin
    - "there is a notable gap in tools specifically designed for resilience testing of database failures"
- [Model-guided fuzzing of distributed systems](https://arxiv.org/abs/2410.02307), arXiv 2024
    - uses TLA+ model state coverage to guide fault and schedule fuzzing of etcd-raft and RedisRaft
    - abstract: "13 previously unknown bugs"
    - [version-specific full-text review](deterministic_simulation_testing.md) records 12 in v3 HTML
        - discrepancy unresolved; do not combine these counts
    - authors report four were detected only by model-guided fuzzing among the compared approaches
    - directly relevant to the TLA+ to Rust work
- [Chaos Engineering: a multivocal literature review](https://arxiv.org/abs/2412.01416), arXiv 2024
    - reviews "96 academic and grey literature sources published between January 2016 and April 2024"

2025 to 2026

- [One-Size-Fits-None (slow faults)](https://www.usenix.org/conference/nsdi25/presentation/lu), NSDI 2025
    - injects many kinds and degrees of slowness; finds handling is driven by static thresholds; proposes an adaptive library ADR
    - authors contrast continuously varying slowness with binary crashes ([preprint](https://web.eecs.umich.edu/~ryanph/paper/xinda-nsdi25-preprint.pdf))
- [CAFault](https://www.usenix.org/conference/atc25/presentation/chen-yuanliang), USENIX ATC 2025
    - fuzzes configuration and faults together, since fault handling paths depend on config
    - "existing fault injection testing is typically performed under a fixed default configuration"
    - evaluated on HDFS, ZooKeeper, MySQL Cluster, and IPFS according to the inherited source notes
- [Chaos Engineering in the Wild](https://arxiv.org/abs/2505.13654), arXiv 2025
    - mines 1,275 GitHub repos using 10 chaos tools
    - "Toxiproxy, Chaos Mesh, and Chaos Monkey accounting for 68.86% of the validated repositories"
- [Kubernetes cloud-edge resilience via failure injection](https://arxiv.org/abs/2507.16109), arXiv 2025
    - inherited source notes describe a dataset built with Chaos Mesh, Gremlin, and ChaosBlade
    - scenario count omitted pending independent source access
- [ChaosEater](https://arxiv.org/abs/2511.07865), ASE 2025 NIER
    - LLM agent runs the whole chaos loop on Kubernetes: hypothesis, experiment, fix
    - "planning such experiments and improving the system based on the experimental results still remain manual"
- [CSnake](https://arxiv.org/abs/2509.26529), EuroSys 2026
    - stitches single fault runs into chains to find failures that keep feeding themselves (cascading failures)
    - authors report 15 discovered bugs across five systems
    - see confirmation status under limitations below
- [FastFI](https://arxiv.org/abs/2601.14800), arXiv 2026
    - lineage-driven fault injection for microservices
        - searches possible choices in depth-first order instead of using a general Boolean constraint solver
    - abstract: "monotone and low-overlap structure"
    - authors argue that exploiting this structure makes fault-set search faster
- [PERF](https://arxiv.org/abs/2602.19088), arXiv 2026
    - fault injector library inside Maude formal models to predict throughput and latency under faults
    - abstract claims a formal framework for performance prediction under faults
    - the authors' priority claim is not independently established here
- [LLM vs rule based fault injection in OpenStack](https://arxiv.org/abs/2609.08681), arXiv 2026
    - LLMs write bugs into Nova and Cinder code; compared to ProFIPy mutations
    - abstract: "without establishing general superiority"

Jepsen, the practical reference point

- [Jepsen](https://jepsen.io/) (Kingsbury), ongoing since 2013
    - "In each analysis we explore whether the system lives up to its documentation's claims"
- recent analyses show what still breaks in 2025
    - [TigerBeetle 0.16.11](https://jepsen.io/analyses/tigerbeetle-0.16.11): "We found two safety issues in TigerBeetle", plus panics on bitflips and a missing disk failure recovery path
    - [Bufstream 0.1.0](https://jepsen.io/analyses/bufstream-0.1.0): "We found two liveness and three safety issues", including lost committed writes
    - [NATS 2.12.1](https://jepsen.io/analyses/nats-2.12.1): "file corruption and simulated OS crashes could both lead to data loss and persistent split-brain"
- agent inference: disk behavior and upgrades deserve explicit tests
    - these selected analyses do not establish a trend in relative bug yield

what is used in industry

- Netflix: [Chaos Monkey](https://github.com/Netflix/chaosmonkey) "randomly terminates virtual machine instances and containers"
- PingCAP and TiKV: [fail-rs](https://github.com/tikv/fail-rs), "Fail points are code instrumentations that allow errors and other behavior to be injected dynamically at runtime"; Go version [pingcap/failpoint](https://github.com/pingcap/failpoint)
- [Chaos Mesh](https://github.com/chaos-mesh/chaos-mesh), Kubernetes custom resources for faults
    - current README: "define, orchestrate, and observe controlled fault injection"
- [AWS Fault Injection Service](https://aws.amazon.com/fis/), managed "controlled experiments" on AWS resources
- Gremlin, ChaosBlade, Toxiproxy: named as top tools in the [GitHub study](https://arxiv.org/abs/2505.13654) and the [Kubernetes study](https://arxiv.org/abs/2507.16109)
- vendors paying Jepsen: TigerBeetle, Buf, NATS analyses above
- I did not verify roachtest, Cassandra Harry, LitmusChaos, or Azure Chaos Studio sources in this pass

known gaps and open problems

- picking faults is still mostly blind
    - Mallory's 2023 motivation contrasts its approach with black-box testing tools
    - this is the authors' contemporary characterization, not a verified claim about 2026 practice
- multi-fault chains and timing are hard
    - CSnake: these failures "require a complex combination of specific conditions to be triggered"
- configuration is ignored
    - CAFault: testing happens "under a fixed default configuration"
- slowness is poorly handled and poorly tested
    - NSDI 2025 introduction: "static, over-conservative thresholds"
- application level faults are rare in practice
    - GitHub study: application-level faults are only about 2.57% of observed fault instances, vs network plus instance kill at 74.81%
- storage faults
    - agent recommendation: explicitly test recovery from corruption and incomplete persistence
- the chaos loop around the tools is manual
    - ChaosEater's motivation identifies manual planning and repair
- LLM written faults are not trustworthy yet
    - OpenStack study calls for controlled generation, runtime checks, independent correctness checks, and reproducible records
- the oracle problem: deciding whether a run violated its contract
    - agent assessment: a crash checker alone misses silently wrong results
    - invariants and trace checking also apply outside databases
    - do not infer that Elle is the only way to check correctness

research we could do

all proposals below are agent opinions; novelty is unverified

- 1, TLA+ spec as both fault guide and oracle for Rust systems
    - hypothesis: implementation traces under supported faults can expose departures from a chosen specification
    - closest: [model-guided fuzzing](https://arxiv.org/abs/2410.02307) already uses TLA+ coverage for Etcd-raft and RedisRaft
    - model coverage plus trace checking may directly duplicate this work
    - first action: compare its full algorithm and correctness checks before proposing a new method
    - switching implementation language alone is not a research contribution
    - an injected supported fault is only evidence of a bug when the resulting trace violates a promised property
    - first experiment
        - choose raft-rs or OpenRaft and a compatible existing TLA+ model
        - map recorded code events to model actions
        - inject failures at fail-rs locations
        - compare random and model-guided schedules at equal total cost
        - check client promises independently of the coverage metric
- 2, does Verus verification survive real faults?
    - question: do a chosen system's disk and network assumptions hold under its deployment environment?
    - proof interpretation: an assumption violation does not refute a conditional proof
    - closest: Jepsen's [TigerBeetle](https://jepsen.io/analyses/tigerbeetle-0.16.11) and [NATS](https://jepsen.io/analyses/nats-2.12.1) disk fault work, on unverified code
    - first experiment: run a disk fault injector (bitflip, truncation, dropped fsync) on a verified storage or replication system like IronFleet style or a Verus verified KV, and list which faults violate the proof's environment assumptions
- 3, LLM agent that writes failpoints and oracles, not just experiments
    - hypothesis: application faults may expose violations missed by infrastructure faults
    - GitHub study reports application faults were rare in its selected instances
    - closest: [ChaosEater](https://arxiv.org/abs/2511.07865), [Legolas](https://www.usenix.org/conference/nsdi24/presentation/wu-haoze) (static hooks, no LLM)
    - first experiment: have a coding agent read a Rust or Go repo, insert fail_point! at error paths, write property checks, and fuzz; compare bug yield and false alarms vs Legolas style automatic hooks on the same systems
- 4, upgrade and mixed version fault injection
    - motivation: the cited TigerBeetle analysis includes upgrade-related failures
    - closest: [DUPTester, DUPChecker, and UpFuzz](deployment_and_configuration.md)
        - upgrade testing and data-format-guided selection are established work
    - absence from this review does not establish novelty
    - first experiment: script rolling upgrades and downgrades as a fault type inside Jepsen against 3 open source databases, see if it finds anything new
- 5, lineage driven fault injection for consensus libraries
    - question: can lineage-based fault selection help a Raft library under the same correctness checks and execution budget?
    - applying it to a library alone does not establish novelty
    - closest: [Molly](https://people.ucsc.edu/~palvaro/molly.pdf), [FastFI](https://arxiv.org/abs/2601.14800)
    - first experiment: log message provenance in a Raft library, derive "why was this entry committed" sets, and inject faults that cut every support path; measure executions to first bug vs Mallory

experimental design for the strongest proposals

- agent recommendation: begin with fault-model validation and configuration-sensitive recovery
    - both can produce concrete evidence before building a new search algorithm
- fault-model validation pilot
    - choose one runnable verified or specification-based storage implementation
    - enumerate its documented assumptions before injecting faults
    - separately test supported faults and deliberate assumption violations
    - record syscall results, disk state, client history, and replay seed
    - outcome categories: genuine contract violation, unsupported fault, harness defect, inconclusive
    - first deliverable: reproducible traces connecting observed behavior to an exact assumption
    - stop criterion: no executable artifact or no auditable specification
        - then use an unverified implementation as a testbed without claiming proof validation
- configuration-sensitive recovery pilot
    - use one workload and identical fault schedules across selected configurations
    - vary retry limits, timeouts, batching, and recovery concurrency
    - compare crash-only, fixed-delay, and severity-sweeping campaigns
    - measure confirmed bugs per CPU-hour and recovery curves
    - closest work: CAFault and One-Size-Fits-None
    - novelty question: do configuration boundaries predict a narrow range where recovery makes failure worse?
- specification-guided search pilot
    - separate two jobs: choosing tests and judging their outcomes
    - use the same external correctness checker for all search baselines
    - compare random faults, implementation coverage, and model coverage
    - include event-mapping cost and cases where implementation events cannot be mapped
    - require replayable violations and repeated seeds
    - lower time to a bug does not establish complete exploration
- LLM-assisted test construction pilot
    - a human-written contract or independent checker must judge generated tests
    - the generating model must not supply the only correctness verdict
    - compare failpoint placement against uniform and analysis-based placement
    - count confirmed bugs, rejected tests, review minutes, execution cost, and model cost
    - split old bug examples used to design prompts from held-out evaluation bugs
    - source-level mutation of code tests robustness to synthetic defects
        - distinguish it from injecting environmental faults into unchanged code

limitations of the tool evidence

- bug counts are author-reported discoveries under particular workloads and versions
    - confirmed and fixed counts differ from discovered counts
    - compare tools only with matched workloads, budgets, fault models, and correctness checks
- Molly's guarantees have bounds
    - the [paper introduction](https://people.ucsc.edu/~palvaro/molly.pdf) specifies "a particular input and execution bound"
    - agent interpretation: no implication that an arbitrary production deployment is bug-free
- Filibuster's industrial examples are reconstructed
    - [abstract](https://rohan.padhye.org/files/filibuster-socc21.pdf): "taken from publicly available information"
    - reproducing four published chaos scenarios demonstrates feasibility
    - it does not establish complete coverage of those companies' production systems
- CSnake confirmation status matters
    - [current abstract](https://arxiv.org/abs/2509.26529): "five of which have been confirmed with two fixed"
    - its approximate compatibility checks need evaluation on incompatible workload conditions
- ChaosEater evidence is case-study evidence
    - [abstract](https://arxiv.org/abs/2511.07865): "case studies on small- and large-scale Kubernetes systems"
    - model or engineer judgments of reasonable experiments are weaker than independent bug detection measurements
- GitHub adoption is not production adoption
    - [current abstract](https://arxiv.org/abs/2505.13654): "1,275 records"
    - counts describe repositories selected for association with ten tools
    - no inference about all operators or all deployed tests
    - current revision is September 2026; original submission was May 2025
- slow-fault severity is not monotonic
    - [NSDI 2025 introduction](https://web.eecs.umich.edu/~ryanph/paper/xinda-nsdi25-preprint.pdf): "a milder slow fault can cause more harm than a severe one"
    - agent inference: testing only the largest delay can miss failure-detector threshold effects

verification status, 2026-10-07 UTC

- directly checked current arXiv abstracts for Mallory, model-guided fuzzing, CSnake, FastFI, ChaosEater, the GitHub study, and the OpenStack comparison
- directly checked current abstracts for PERF and the Filibuster database extension
    - PERF's current abstract says "Accepted by FM 2026"
- directly checked Netflix Chaos Monkey, TiKV fail-rs, and Chaos Mesh READMEs through their GitHub raw links
- directly read abstracts and introductions of Molly, Filibuster, Anduril, and One-Size-Fits-None
- directly confirmed Chaos Engineering's IEEE Software journal reference is May–June 2016
    - arXiv upload is February 2017
- USENIX pages and PDFs returned HTTP 403
    - FATE, SAMC, Legolas, and CAFault summaries remain inherited source notes
- web search returned HTTP 404; direct HTTP reads were used instead
- quoted source snippets inherited from the first pass are retained as its evidence
    - they do not imply this pass reverified all linked full papers

remaining reading

- source and artifact work remains for Gremlin, LitmusChaos, roachtest, Cassandra Harry, Azure Chaos Studio, and Netflix ChAP
- [deployment evidence](deployment_and_configuration.md) covers upgrade-specific testing
- [client-history checking](history_checking.md) covers Knossos
- [simulation](deterministic_simulation_testing.md) contains full-text ModelFuzz and Mallory inspection
- older blocked-source summaries are reading leads
    - do not cite their detailed claims without reopening the source
