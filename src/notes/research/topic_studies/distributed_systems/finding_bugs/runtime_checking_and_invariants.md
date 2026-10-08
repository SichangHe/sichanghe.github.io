catching distributed system bugs while the system runs
(authored by agents unless marked 🧑)

the problem in one paragraph

- tests cover a finite set of executions
  - generated tests can include cases their authors did not anticipate
  - real executions can still exceed that coverage
- so we watch the live system (or its logs and traces) and check that rules still hold
- three questions come up
- what are the rules? Can a machine find them for us? And how do we catch a node that is "up" but useless (a partial or gray failure)?

how it works

- a checker sits beside the system and reads events, states, or traces
- the rule comes from one of three places
  - a human writes it (assertions, TLA+ spec, Jepsen checker)
  - a tool infers it (from runs, tests, or past bugs)
  - a tool derives it from a model (trace validation against TLA+)
- a violation raises an alarm, ideally with a small counterexample
- partial failure detectors work differently
  - they probe the same code paths real requests use, or watch what callers see
  - a heartbeat alone misses these failures

the main papers and systems

- quotes are from the abstract or page I opened unless I say "search snippet", which means I only saw the text in a search result and did not open the paper

partial and gray failures

- [Gray Failure: The Achilles' Heel of Cloud-Scale Systems](https://www.microsoft.com/en-us/research/publication/gray-failure-achilles-heel-cloud-scale-systems/), HotOS 2017
  - names the problem: a component looks healthy to the monitor but is broken for apps
  - quote: "the system's failure detectors may not notice problems even when applications are afflicted by them"
- [Panorama](https://www.usenix.org/conference/osdi18/presentation/huang), OSDI 2018
  - makes components report what they see from the components they call
  - authors report it detected all 15 reproduced gray failures in under 7 s, existing detectors got one within 300 s
  - quote: "detecting what the requesters of a failing component see"
- [OmegaGen, "Understanding, Detecting and Localizing Partial Failures in Large System Software"](https://www.usenix.org/conference/nsdi20/presentation/lou), NSDI 2020
  - studies 100 partial failures, then generates watchdogs by shrinking the program to its risky operations
    - a watchdog periodically checks whether those operations still work
  - quote: "detect 20 cases"
    - among 22 reproduced cases, with a reported median detection time of 4.2 seconds
    - authors also localize 18 cases
- [IASO](https://www.usenix.org/conference/atc19/presentation/panda), ATC 2019
  - peers vote on who is slow, using timeouts they already have
  - authors report 39,000 nodes for 1.5 years in production (Nutanix)
  - quote: "a hardware or software component can still function (does not fail-stop) but in much lower performance than expected"
- [Fail-Slow at Scale](https://ucare.cs.uchicago.edu/pdf/tos18-failSlowHw.pdf), FAST 2018 (the link is the journal version)
  - 101 reports of slow-but-alive hardware
  - search snippet: "hardware that is still running and functional but in a degraded mode, slower than its expected performance"

concurrency bug finders

- [TaxDC](https://www.academia.edu/95755734/TaxDC), ASPLOS 2016 (link is an academia.edu copy)
  - classifies 104 timing bugs from Cassandra, Hadoop MapReduce, HBase, ZooKeeper
  - search snippet: "the largest and most comprehensive taxonomy of non-deterministic concurrency bugs in distributed systems"
- [MicroRacer](https://arxiv.org/abs/2512.05716), arXiv Dec 2025
  - finds concurrency bugs in microservices from traces, no code change
  - quote: "dynamic instrumentation of widely-used libraries at runtime"
- [DCatch: Automatically Detecting Distributed Concurrency Bugs in Cloud Systems](https://people.cs.uchicago.edu/~shanlu/paper/asplos17-preprint.pdf), Liu et al., ASPLOS 2017
  - infers possible timing bugs from correct runs using cross-machine causality and conflicting accesses
  - then prunes candidates and tries to trigger bugs
  - author quote, abstract: "DCatch reports 32 DCbugs, with 20 of them being truly harmful"
    - population: seven workloads on Cassandra, Hadoop MapReduce, HBase and ZooKeeper
  - predictive trace analysis differs from an alarm for an already observed invariant violation
- FCatch, ASPLOS 2018
  - primary paper not inspected in this update

inferring invariants

- [Dinv, "Inferring and Asserting Distributed System Invariants"](https://dl.acm.org/doi/10.1145/3180155.3180199), ICSE 2018
  - infers candidate relations among distributed states and turns them into assertions
    - disagreement about a leader can be legal during transitions
    - every inferred rule needs protocol-specific validation
  - authors report it ran on etcd Raft, Serf and Taipei-Torrent (1.7K to 144K lines)
  - inherited snippet about leader equality needs its missing protocol and observation assumptions
  - I could not open the abstract page (403)
- [DistAI](https://www.usenix.org/conference/osdi21/presentation/yao), OSDI 2021
  - simulates small protocol instances and enumerates candidate invariants
    - a logical constraint solver checks them
  - this is for proofs, not live checking, but the same inferred rules could be monitors
  - quote: "DistAI successfully verifies 13 common distributed protocols automatically"
- [DuoAI](https://www.usenix.org/conference/osdi22/presentation/yao), OSDI 2022
  - same idea, faster solver use
  - quote: "solving Paxos more than two orders of magnitude faster than previous methods"
- [Compositional Inductive Invariant Inference via Assume-Guarantee Reasoning](https://arxiv.org/abs/2509.06250), arXiv Sep 2025
  - infers per component, not whole system
  - quote: "The local invariant need only be closed under the transition relation for the component, which is simpler than the transition relation for the entire system."
- [IC3Syn](https://arxiv.org/abs/2605.24619), arXiv May 2026
  - LLM plus IC3 loop over TLA+ states
  - authors report it finds candidates for all 29 protocols, including a MongoDB Raft reconfiguration protocol that SWISS, DistAI, Endive and IC3PO fail on
  - quote: "inferring such invariants remains a major bottleneck"
- I4 (SOSP 2019) and SWISS: I did not get a paper page for either, see unverified section

rules from past bugs and tests

- [Oathkeeper, "Demystifying and Checking Silent Semantic Violations in Large Distributed Systems"](https://www.usenix.org/conference/osdi22/presentation/lou-demystifying), OSDI 2022
  - 109 silent failures from nine systems, mine rules from them, enforce at runtime
  - quote: "semantics that existed since the system's first stable release"
    - authors attribute the majority of their studied silent failures to these rules
  - quote: "Oathkeeper only incurs 1.27% overhead"
- [T2C, "Deriving Semantic Checkers from Tests to Detect Silent Failures"](https://www.usenix.org/conference/osdi25/presentation/lou), OSDI 2025
  - turns existing tests into runtime checkers by static and dynamic analysis
  - quote: "detect 15 out of 20 real-world silent failures"
    - authors reproduced those cases and report small overhead
- [FlyCatcher](https://arxiv.org/abs/2604.22028), arXiv Apr 2026
  - same goal as T2C, with an LLM in the loop
  - quote: "infers 2.6x more correct checkers, which enables it to detect 5.2x more errors"
  - the abstract says 334 checkers inferred, 300 correct

traces and monitoring

- [Pivot Tracing](https://cs.brown.edu/~jcmace/papers/mace15pivot.pdf), SOSP 2015
  - ask questions of a running system, joining events across machines by causality
  - the abstract names "the happened-before join"
- [Canopy](https://research.fb.com/publications/canopy-end-to-end-performance-tracing-at-scale), SOSP 2017
  - Facebook tracing pipeline
  - search snippet: "Canopy currently records and processes over 1 billion traces per day."
- [Asynchronous Fault-Tolerant Language Decidability for Runtime Verification of Distributed Systems](https://arxiv.org/abs/2502.00191), arXiv Feb 2025
  - theory: what a set of monitors can decide when they are asynchronous and can crash
  - quote: "only properties with no real-time order constraints can be decided in asynchronous fault-tolerant settings"
- [Elle](https://arxiv.org/abs/2003.10554), March 2020 preprint
  - distinguish the preprint date from a conference or proceedings year
  - checks transaction-isolation anomalies from supported client histories, used by Jepsen
    - cost and guarantees depend on workload and available dependency information
  - [history checking](history_checking.md) explains the observation assumptions and predicate limitation

checking the code against a TLA+ spec

- [Validating Traces of Distributed Programs Against TLA+ Specifications](https://arxiv.org/abs/2404.16075), SEFM 2024
  - record only the spec variables from a Java run, let TLC say whether the spec allows that trace
  - quote: "detecting discrepancies between the specifications and the implementations in all cases"
- [eXtreme Modelling in Practice](https://arxiv.org/abs/2006.00915), VLDB 2020 (MongoDB)
  - trace checking failed for the server, test generation worked for Realm Sync
  - quote: "We found MBTC to be impractical for testing that the Server conformed to a highly abstract specification."
- [Smart Casual Verification of the Confidential Consortium Framework](https://arxiv.org/abs/2406.17455), NSDI 2025
  - TLA+ bound to C++ through trace validation, run in CI
  - quote: "find six subtle bugs in the design and implementation before they could impact production"
- [Multi-Grained Specifications for Distributed System Model Checking and Verification](https://arxiv.org/abs/2409.14301), EuroSys 2025
  - ZooKeeper, several spec detail levels mixed per module
  - quote: "fine-grained specifications lead to state-space explosion, while coarse-grained specifications introduce model-code gaps"
- [OmniLink](https://arxiv.org/abs/2601.11836), arXiv Jan 2026
  - trace validation for multithreaded code, treats each event as a black box with a time window
  - authors report two new bugs, one in BAT and one in ConcurrentQueue, confirmed by their authors
  - quote: "subtle bugs may only manifest under rare thread interleavings"
- [Specula](https://arxiv.org/abs/2607.25333), arXiv Jul 2026
  - agents write TLA+ specs for system code, check them against traces, fix spec or instrumentation until they match
  - [LLM study](llm_agents_for_distributed_bugs.md) explains its results and reproduction safeguards
- [Using Lightweight Formal Methods to Validate a Key-Value Storage Node in Amazon S3](https://www.cs.utexas.edu/%7Ebornholt/papers/shardstore-sosp21.pdf), SOSP 2021
  - executable reference models checked against ShardStore
  - search snippet: "prevented 16 issues from reaching production"

kubernetes controllers and operators

- [Sieve](https://www.usenix.org/conference/osdi22/presentation/sun), OSDI 2022
  - perturbs what a controller sees, compares the cluster's end state with and without
  - author quote: "46 serious safety and liveness bugs (35 confirmed and 22 fixed)"
- [Acto](https://cs.cornell.edu/~legunsen/pubs/GuETAlActoSOSP23.pdf), SOSP 2023
  - [USENIX ;login: article](https://www.usenix.org/node/299979) says it found more than 80 new bugs with under 0.19% false alarms
  - the ;login: page lists three checked properties: reconcile to desired state, recover from error states, resist bad operations
- [Who Watches the Watchers?](https://www.usenix.org/conference/nsdi26/presentation/gu), NSDI 2026
  - 412 operator failures across 13 operators
  - quote: "their own reliability has unprecedented impact on managed applications"
  - the abstract says 86 new bugs in six operators found by their tool
- [Kivi](https://arxiv.org/abs/2311.02800), ATC 2024
  - model checks Kubernetes controllers and configs, in small topologies
  - quote: "the first system for verifying controllers and their configurations in cluster management systems"
- [Anvil](https://www.usenix.org/conference/osdi24/presentation/sun-xudong), OSDI 2024
  - controllers written in Rust, proven to meet "eventually stable reconciliation"
  - [code](https://github.com/vmware-research/verifiable-controllers)
  - author quote, abstract: "We use Anvil to verify three Kubernetes controllers for managing ZooKeeper, RabbitMQ, and FluentBit"
  - primary conference abstract confirms these three verified controllers

what is used in industry

- jepsen style checking in nightly runs
  - [CockroachDB](https://www.cockroachlabs.com/blog/jepsen-tests-lessons/): search snippet says tests rerun every night
  - [TiDB TiPocket](https://github.com/pingcap/tipocket): search snippet says it uses go-elle, a Go port of Elle
- trace validation in CI
  - CCF (Microsoft, Azure Confidential Ledger), see the NSDI 2025 paper above
  - MongoDB tried it, see eXtreme Modelling
- Amazon S3 ShardStore reference models, see above
- Facebook Canopy tracing, see above
- Nutanix IASO, see above
- Microsoft Research co-authored T2C, FlyCatcher and Panorama, but I did not find a source saying they run in production
- Acto is open source and maintained, per the ;login: article
- I did not find a source for runtime assertion frameworks in TiKV or CockroachDB code, so I make no claim on those

known gaps and open problems

- trace checking is expensive to set up
  - MongoDB conformance limits are described above
  - ZooKeeper model detail tradeoff is described above
- monitors that are distributed have hard limits
  - the distributed-monitoring result depends on the assumptions discussed below
- inference tools produce wrong rules
  - FlyCatcher: authors report 300 of 334 checkers judged correct by cross-validation
    - cross-validation is empirical evidence, not a proof of correctness
    - avoid treating the remaining 34 as a formally established exhaustive error count
  - T2C catches 15 of 20 failures, OmegaGen 20 of 22
- inductive invariant inference is for proofs on models, and "remains a major bottleneck" (IC3Syn)
- operators fail mostly at the edge with the app
  - "are often ad hoc and lack well-defined interfaces" (Who Watches the Watchers)
- partial failure tools I read are mostly Java based (OmegaGen, Panorama, Dinv is Go)
  - follow-up question: which existing Rust tools cover equivalent request-path failures?

research we could do

- these are agent proposals

- model fidelity and instrumentation experiments are consolidated in [research directions, candidate 2](research_directions.md)
  - Anvil uses a Verus model
    - TLC replay requires an explicit TLA+ translation or a different checker
- runtime monitor for "eventually stable reconciliation"
  - question: can a monitor detect concrete reconciliation failures with stated environmental assumptions?
  - absence of a reviewed live monitor does not establish that none exists
  - closest work: Anvil spec, Acto oracles
  - first experiment
    - run a separate monitor alongside the operator
      - read the Kubernetes event stream
    - run it on two or three operators from Acto's bug list and see how many bugs it catches
    - distinguish deadline violations from violations of eventual reconciliation
      - a finite delay alone does not refute an unbounded eventual property
    - account for missed events, API consistency and unstable desired state
- agent-written partial failure watchdogs
  - gap: OmegaGen needs static analysis built per language
  - closest work: OmegaGen, FlyCatcher
  - first experiment
    - give an agent the ZooKeeper source and a description of a failure from the OmegaGen study
    - compare with OmegaGen on the same reproduced cases and collection setup
    - a one-case pilot cannot be compared with its aggregate 20-of-22 result
- invariants inferred from Jepsen histories and logs
  - question: can rules mined from successful chaos tests generalize to unseen workloads and faults?
  - novelty requires comparison with distributed invariant inference and test-derived checkers
  - closest work: Dinv, T2C
  - first experiment
    - run Jepsen on etcd or a small Raft clone
    - run a Dinv-style miner on the logs
    - inject a bug and see which mined rules break

monitor correctness and experimental design
- an inferred rule is a hypothesis until validated beyond the runs that produced it
  - training traces can omit legal behavior and make a rule too strict
  - missing observations can make a rule too weak
- monitoring a distributed execution requires explicit observation assumptions
  - event order, clock uncertainty, loss, duplicate events and crash recovery
  - inconsistent snapshots can resemble actual protocol violations
- asynchronous monitoring limits depend on the paper's specific model
  - the language-decidability result assumes distributed monitors with partial information and faults
  - it does not imply that offline checking of a complete centrally collected history cannot use real-time order
- candidate research experiment: preserve runtime checks across software changes
  - closest work: Oathkeeper, T2C and FlyCatcher
  - derive checks from tests before a historical patch
  - update them after the patch and evaluate on unseen workloads and known failures
  - compare reuse, full regeneration and local repair
  - measure false alarms, missed failures, runtime cost and human corrections
  - keep separate evaluation sets for legal behavior and faulty behavior
  - useful outcome: detect weakening that increases pass rates by losing bug detection
- partial-observation model fidelity experiments are consolidated in [research directions, candidate 2](research_directions.md)

primary-source verification update, 7 Oct 2026 UTC
- opened DCatch PDF and Panorama, OmegaGen and T2C conference abstracts
- OmegaGen abstract confirms 20 detections among 22 reproduced cases
  - author quote: "pinpoint the failure scope for 18 cases"
- opened MongoDB, Cirstea et al., CCF, Multi-Grained, Specula, FlyCatcher and asynchronous-monitoring abstracts
- corrected Oathkeeper link using the OSDI 2022 proceedings page
- the existing snippet-only entries below retain that limitation

could not verify

- FCatch (ASPLOS 2018) primary paper still uninspected
- I4 (SOSP 2019) and SWISS: only seen as a name in another paper's abstract
- AWS runtime monitoring, CockroachDB/TiKV runtime assertions: no source found
- Dinv, Canopy, Fail-Slow, ShardStore, TaxDC quotes come from search snippets
- Dinv abstract page returned 403

remaining reading gaps
- inspect primary papers for FCatch, I4, SWISS and Dinv
- verify snippet-only deployment claims before reusing them as industry evidence
- distinguish invariant inference for model proofs from inference of live-system assertions
