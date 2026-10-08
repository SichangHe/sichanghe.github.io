# fuzzing distributed systems: letting feedback pick the next fault

(authored by agents unless marked 🧑)

## the problem in one paragraph

Jepsen and chaos tools throw random faults at a running cluster and see what breaks. Random works, but it keeps hitting the same easy states. Fuzzing adds a feedback loop: run the system, measure something about what happened, keep the runs that reached somewhere new, and mutate those runs to go further. For ordinary programs the "something" is which code branches ran. For distributed systems that signal saturates fast, because every node runs the same code for every request. So the research here is mostly about what to measure instead: message orderings, happens-before shapes, states of a formal model, or client-visible results. Fuzzers also need an oracle, a rule that says a run was wrong. Crashes and hangs are easy oracles. "Lost a committed write" needs a checker like Elle, Knossos, or an isolation checker, which is why the database checker work sits in this note too.

## how it works

- inputs a distributed fuzzer can mutate
    - which faults to inject and when: crashes, restarts, partitions, delays
    - the order in which nodes receive messages
    - the client requests, and their relative timing
- feedback signals used in the papers below
    - code branch coverage (CrashFuzz)
    - happens-before summaries of the run (Mallory)
    - sequences of network message types, deduplicated by symmetry (DistFuzz)
    - states of a TLA+ model reached by replaying the run's messages (ModelFuzz)
    - reward from reinforcement learning, with developer-given waypoints (WaypointRL)
- oracles
    - crash, hang, assertion, sanitizer report
    - a consistency checker over the client history: linearizability (Knossos, Porcupine), isolation (Elle, Cobra, IsoVista, Plume, Boomslang), see [history checking](history_checking.md)
    - differential: run several implementations of the same spec and compare (Fluffy)
    - state-centric: did the controller reach the declared state (Acto, Sieve)

## the main papers and systems

### fuzzing the cluster: faults, schedules, timing

- [Mallory: Greybox Fuzzing of Distributed Systems](https://arxiv.org/abs/2305.02601), Meng, Pîrlea, Roychoudhury, Sergey, CCS 2023
    - builds on Jepsen; records each run as a Lamport timeline, abstracts it into a "happens-before summary", and treats new summaries as new coverage; Q-learning picks faults
    - "the first framework for grey-box fuzz-testing of distributed systems"
    - "Mallory discovered 22 zero-day bugs (of which 18 were confirmed by developers), including 10 new vulnerabilities, in rigorously-tested distributed systems such as Braft, Dqlite, and Redis. 6 new CVEs have been assigned."
    - cost the paper reports in its body: the user annotates "interesting" code events, 103 to 157 annotations per system (section 4.1.3 of the paper PDF)
- [DistFuzz: Blackbox Fuzzing of Distributed Systems with Multi-Dimensional Inputs and Symmetry-Based Feedback Pruning](https://www.ndss-symposium.org/wp-content/uploads/2025-1912-paper.pdf), Bai, Zou, Jiang, Zhao, Zhou, NDSS 2025
    - no instrumentation at all; mutates faults, client requests, and the timing between them; feedback is the sequence of network message types, with symmetric node swaps collapsed
    - "to our knowledge, the first feedback-guided blackbox fuzzing framework for distributed systems"
    - "DistFuzz finds 52 real bugs in ten popular distributed systems in C/C++, Go, and Java. Among these bugs, 28 have been confirmed by the developers, 20 were unknown before, and 4 have been assigned with CVEs."
    - authors' own criticism of prior work, from the paper's introduction: branch coverage "saturates after exploring only a few states" in distributed systems, and Mallory "requires the user to annotate code blocks"
    - authors on their own limits: "the limitations in DistFuzz are fundamentally due to the constraints in blackbox fuzzing"
- [Model-guided Fuzzing of Distributed Systems (ModelFuzz)](https://arxiv.org/abs/2410.02307), Gulcan, Kulahcioglu Ozkan, Majumdar, Nagendra, OOPSLA 2025 ([ACM page](https://dl.acm.org/doi/10.1145/3763060))
    - the signal is coverage of a TLA+ model: replay the run's message sequence into a modified TLC, count the model states reached, keep schedules that reach new ones
    - "Our main innovation is the use of an abstract formal model of the system that is used to define coverage."
    - "we discovered 13 previously unknown bugs in their implementations, four of which could only be detected by model-guided fuzzing" (etcd-raft and RedisRaft)
    - from the authors' [TLA+ community event write-up](https://conf.tlapl.us/2025-etaps/nagendra.pdf): "the abstraction may not cover certain implementation details where bugs may lurk. However, lack of structural coverage after model-guided exploration can indicate where additional testing effort should focus"
    - inference: this is the closest existing work to a "TLA+ spec drives testing of the Rust code" pipeline; the spec is used as a coverage map, not as an oracle
- [Reward Augmentation in Reinforcement Learning for Testing Distributed Systems (WaypointRL)](https://arxiv.org/abs/2409.02137), Borgarelli, Enea, Majumdar, Nagendra, OOPSLA 2024
    - reinforcement learning chooses the next scheduling action; reward is a decaying bonus for new states plus "waypoints", developer-written predicates for interesting scenarios
    - "Waypoints exploit designer insight about the protocol and guide the exploration to ``interesting'' parts of the state space."
    - evaluated on "RedisRaft, Etcd, and RSL"
- [Netrix: A Domain Specific Language for Testing Consensus Implementations](https://arxiv.org/abs/2303.05893), Dragoi, Enea, Nagendra, Srivas, arXiv 2023
    - a language for writing unit tests of consensus implementations as message filters, so a developer can force a specific scenario and rerun it across versions
    - "We were able to identify 4 deviations of the Tendermint implementation from the protocol specification and check their absence on an updated implementation. Additionally, we were able to reproduce 4 previously known bugs in Raft."
- CrashFuzz, ICSE 2023, coverage guided crash and reboot fuzzing; see [fault injection](fault_injection_and_chaos.md), where it and CAFault (configuration plus faults, ATC 2025) are covered
- [A Survey of Protocol Fuzzing](https://arxiv.org/abs/2401.01568), Zhang et al., arXiv 2024
    - background for the single-node side: stateful network protocol fuzzers like AFLNet
    - "there still lacks a systematic overview of protocol fuzzing"
- [LLM-Assisted Model-Based Fuzzing of Protocol Implementations](https://arxiv.org/abs/2508.01750), Huang, Wang, Zhou, arXiv 2025
    - an LLM picks the protocol states that matter and writes a generator program for state sequences; protocol level, not cluster level
    - "We evaluated our approach on three widely used network protocol implementations and successfully identified 12 previously unknown vulnerabilities."
- [Fuzzing with Agents? Generators Are All You Need (Gentoo)](https://arxiv.org/abs/2604.01442), Vikram, Padhye, arXiv 2026
    - not distributed, but relevant: a coding agent writes the input generator, and then coverage guidance stops mattering
    - "the use of coverage guidance and mutation strategies is not statistically significantly beneficial for agent-synthesized generators"
    - inference: the same question is open for distributed fuzzers, where "generator" would mean a fault and schedule generator

### fuzzing blockchain consensus clients

These are distributed consensus implementations with money attached, so they got their own fuzzers.

- [Fluffy: Finding Consensus Bugs in Ethereum via Multi-transaction Differential Fuzzing](https://www.usenix.org/conference/osdi21/presentation/yang), Yang, Kim, Chun, OSDI 2021
    - oracle is differential: several independent Ethereum clients must reach the same state
    - "Fluffy found two new consensus bugs in the most popular Geth Ethereum client which were exploitable on the live Ethereum mainnet. Four months after we reported the bugs to Geth developers, one of the bugs was triggered on the mainnet, and caused nodes using a stale version of Geth to hard fork the Ethereum blockchain."
- [LOKI: State-Aware Fuzzing Framework for the Implementation of Blockchain Consensus Protocols](https://www.ndss-symposium.org/ndss-paper/loki-state-aware-fuzzing-framework-for-the-implementation-of-blockchain-consensus-protocols), Ma et al., NDSS 2023
    - the fuzzer joins the network as a fake node, learns a state model of the real nodes on the fly, and picks messages from that model
    - authors report 20 previously unknown vulnerabilities with 9 CVEs across Go-Ethereum, Diem, Fabric, FISCO-BCOS
- Tyr, IEEE S&P 2023, Chen, Ma, Zhou, Jiang, Chen, Sun: a property based stateful fuzzer for blockchain consensus; I saw it only in citations and search snippets, not the paper
- Phoenix, CCS 2023: chaos for blockchain nodes aimed at "node unrecoverable" and "data unrecoverable" issues; authors report 13 previously unknown issues in 5 systems; seen only via [a citation index](https://citation.thinkst.com/talk/86997)
- [Attacknet](https://blog.trailofbits.com/2024/03/18/releasing-the-attacknet-a-new-tool-for-finding-bugs-in-blockchain-nodes-using-chaos-testing/), Trail of Bits with the Ethereum Foundation, 2024
    - practitioner chaos tool; "Trail of Bits was able to reproduce the Ethereum finality incident using a clock skew fault"

### fuzzing Kubernetes controllers

- [Sieve](https://www.usenix.org/conference/osdi22/presentation/sun), Sun et al., OSDI 2022
    - perturbs what the controller sees of the cluster (stale, reordered, duplicated views), then compares cluster evolution with and without the perturbation
    - authors report 46 bugs in ten controllers, 35 confirmed, false positive rate 3.5%
- [Acto](https://cs.cornell.edu/~legunsen/pubs/GuETAlActoSOSP23.pdf), Gu et al., SOSP 2023
    - mutates the declared desired state and checks the operator reconciles, recovers, and survives misoperation
    - authors report 56 operator bugs, 42 confirmed, plus six in Kubernetes and the Go runtime
- the same group later verified controllers in Verus (Anvil, OSDI 2024); see [runtime checking](runtime_checking_and_invariants.md) and [Rust tools](rust_tools.md)

### fuzzing and checking databases for isolation bugs

The workload generator is the fuzzer; the isolation checker is the oracle. These checkers are where most verified-correct oracle work lives.

- [Elle](https://arxiv.org/abs/2003.10554), Kingsbury, Alvaro, VLDB 2021
    - picks workloads (list append) so reads reveal version order, then finds cycles in the dependency graph; the checker inside Jepsen
    - "Elle can detect every anomaly in Adya et al's formalism (except for predicates)"
- [Cobra](https://www.usenix.org/conference/osdi20/presentation/tan), Tan, Zhao, Mu, Walfish, OSDI 2020
    - checks serializability of a black box key value store with an SMT solver, GPU pruning, and history segmentation
    - "the first system that combines (a) black-box checking, of (b) serializability, while (c) scaling to real-world online transactional processing workloads"
- [IsoVista](https://vldb.org/pvldb/vol17/p4325-liu.pdf), Gu, Liu, Xing, Wei, Chen, Basin, VLDB 2024
    - one system for several isolation levels, built on PolySI (snapshot isolation) and the weak isolation checker Plume; shows counterexamples visually
    - authors' motivation: "numerous isolation bugs have been found in many production DBMSs, including PostgreSQL and MariaDB"
- [Plume](https://2024.splashcon.org/details/splash-2024-oopsla/85/Plume-Efficient-and-Complete-Black-box-Checking-of-Weak-Isolation-Levels), OOPSLA 2024
    - complete checker for read committed, read atomic, and transactional causal consistency
- [Viper](https://arxiv.org/abs/2301.07313), Zhang, Tan et al., EuroSys 2023
    - sound and complete snapshot isolation checker using "BC-polygraphs"
- [Boomslang: Making Transaction Isolation Checking Practical](https://arxiv.org/abs/2604.20587), Zhang, Mu, Tan, arXiv 2026
    - a framework that re-implements earlier checkers as modules and handles arbitrary operation types
    - "we also identify a new bug in TiDB, audit the metadata layer of the JuiceFS file system"
- [TxCheck](https://usenix.org/conference/osdi23/presentation/jiang), Jiang, Liu, Rigger, Su, OSDI 2023
    - finds transactional bugs in single node engines by building semantically equivalent transaction pairs; authors report 56 bugs, 52 confirmed
- [APTrans: Anomaly Pattern-guided Transaction Bug Testing](https://arxiv.org/abs/2511.17377), Xu et al., arXiv 2025
    - generates transactions from known anomaly patterns; "APTrans successfully identified 13 previously unknown transaction-related bugs" in MySQL, MariaDB, OceanBase
- [DistRanger: Distribution-Aware Distributed Database Testing](https://arxiv.org/abs/2609.18501), Zhou, Liu, Wei, Zhang, VLDB 2027 (per arXiv comment)
    - mutates schemas and data distribution strategies so queries hit distributed execution paths
    - "It uncovers 31 previously unknown bugs, including 28 related to distributed query processing and optimization"
- [Testing Storage-System Correctness: Challenges, Fuzzing Limitations, and AI-Augmented Opportunities](https://arxiv.org/abs/2602.02614), Wang, Chen, Jiang, arXiv 2026
    - a survey arguing plain fuzzing mismatches storage semantics and that AI could give semantic guidance; no new tool

## what is used in industry

- Jepsen itself is the baseline every academic fuzzer compares against; it is run by vendors as a paid analysis and inside CI at some, see [fault injection](fault_injection_and_chaos.md)
- Elle ships inside Jepsen and has a Go port; the [IsoVista](https://vldb.org/pvldb/vol17/p4325-liu.pdf) author list includes Tencent
- Fluffy and Attacknet are used by the Ethereum ecosystem; Fluffy's reported bug was triggered on mainnet
- Sieve and Acto are from a UIUC and VMware collaboration; I did not find evidence of ongoing industrial use beyond the reported bug fixes
- I did not find any report of Mallory, DistFuzz, or ModelFuzz adopted by a vendor's CI; I think they remain research artifacts

## known gaps and open problems

- the feedback signal is still the open question; three NDSS, CCS, and OOPSLA papers in three years each propose a different one, and DistFuzz's authors say prior signals "saturate" or need annotation
- annotation cost: Mallory needs about a hundred manual annotations per system; ModelFuzz needs an existing TLA+ model plus a mapping from implementation messages to model messages
- the abstraction gap: ModelFuzz authors say "the abstraction may not cover certain implementation details where bugs may lurk"
- oracles beyond crashes: most cluster fuzzers report crashes, hangs, and assertion failures; only Jepsen style checkers judge client histories, and those cost solver time (Cobra, Boomslang)
- no shared benchmark: each paper picks its own systems (etcd-raft and RedisRaft recur); reported bug counts are not comparable across papers
- blackbox fuzzers cannot see internal state: DistFuzz says its limits "are fundamentally due to the constraints in blackbox fuzzing"
- determinism: none of these reproduce a run exactly; a failing schedule may not replay, which is why [deterministic simulation](deterministic_simulation_testing.md) exists

## research we could do

These are agent opinions.

- 1, the spec as oracle, not just as coverage map
    - gap: ModelFuzz uses the TLA+ model to decide which runs are interesting but still detects bugs by crashes and simple checks
    - closest: ModelFuzz; trace validation in [model checking](model_checking.md)
    - first experiment: take ModelFuzz's etcd-raft harness, add TLC trace validation of each fuzzed run against the Raft spec, and count how many of its 13 bugs show up as spec violations before they show up as crashes, and whether new ones appear
- 2, fuzzing verified Rust from its own spec
    - gap: a Verus proof covers one node's code under assumptions; nobody fuzzes the unverified glue, the network layer, and the assumptions
    - closest: ModelFuzz on Go, Stateright on Rust, see [Rust tools](rust_tools.md)
    - first experiment: pick one verified Rust Raft or KV (IronKV in Verus or a TLA+ to Rust artifact), wrap it in turmoil or madsim, use the TLA+ model states as the coverage signal, and record what fails; I would expect failures only in unverified code, which is itself a result
- 3, an agent-written fault and schedule generator
    - gap: Gentoo shows a coding agent can write input generators good enough to make coverage guidance unnecessary, on Java libraries; nobody has tried this for cluster faults and schedules
    - closest: Gentoo, ChaosEater in [fault injection](fault_injection_and_chaos.md)
    - first experiment: give an agent the Raft spec and the DistFuzz harness, have it write a scenario generator, compare bugs found per CPU hour against DistFuzz random mutation on the same ten systems
- 4, a comparable benchmark of distributed fuzzers
    - gap: Mallory, DistFuzz, ModelFuzz, WaypointRL all report on overlapping but different systems with different budgets
    - closest: the papers' own baselines, which each re-implement Jepsen
    - first experiment: a set of 20 historical etcd-raft, RedisRaft, Dqlite, and Braft bugs with buggy and fixed commits, run each public fuzzer for 24 hours, report time to find; this is cheap and would be cited
- 5, isolation checking as the oracle inside a cluster fuzzer
    - gap: cluster fuzzers use crash oracles; isolation checkers are run offline on Jepsen histories; nobody feeds the checker's verdict back as fuzzing signal
    - closest: Elle, Boomslang, Mallory
    - first experiment: run Boomslang on each DistFuzz run of TiDB or CockroachDB, use "a new anomaly type seen" as feedback, measure whether anomalies appear sooner than with message sequence feedback

## search log

- searches: Mallory CCS 2023; ModelFuzz arXiv 2410.02307 and OOPSLA 2025; "fuzzing distributed systems 2025 2026"; LOKI, Tyr, Fluffy, Phoenix; Cobra OSDI 2020; TxCheck and distributed database testing; IsoVista, Viper, Plume, PolySI; WaypointRL; Netrix; Sieve; Acto; LLM assisted fuzzing of distributed systems; arXiv 2026 fuzzing distributed storage
- opened: arXiv abstracts 2305.02601, 2410.02307, 2409.02137, 2303.05893, 2508.01750, 2604.01442, 2604.20587, 2609.18501, 2511.17377, 2602.02614, 2401.01568; PDFs of DistFuzz (NDSS 2025), IsoVista (VLDB 2024), Mallory, and the ModelFuzz TLA+ event write-up; USENIX pages for Cobra and Fluffy; NDSS page for LOKI; Trail of Bits blog
- not opened: Tyr and Phoenix papers (snippets only), Sieve and Acto PDFs (search summaries only), AWDIT (weak isolation tester, 2025, seen only in search), GRAF graph database fuzzing (not distributed)
