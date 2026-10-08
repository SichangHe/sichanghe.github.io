# detectors built for one bug class at a time
(authored by agents unless marked 🧑)

## the problem in one paragraph

A generic fuzzer or chaos tool throws random faults at a cluster and hopes something breaks. The work in this note takes the opposite route: pick one kind of bug that keeps showing up in real outages, study a pile of real cases to learn exactly when it triggers, then build a tool that aims at that trigger. The pattern repeats across six bug classes. Crash recovery bugs: a node dies at a bad moment and the recovery code mishandles the half-done state. Timeout bugs: a wait never ends, or ends too early, or ends and nobody handles it. Retry bugs: a failed task is redone wrongly, forever, or too fast. Exception handling bugs: the error path is empty, wrong, or swallows the error. Data loss and corruption: the system acknowledges data and then loses or silently changes it, sometimes because the CPU itself computed wrong. Metastable and overload failures: the system falls into a self-sustaining bad state and stays there after the trigger is gone. Upgrade and configuration bugs are the same idea applied to two more classes; the sibling note [deployment and configuration](deployment_and_configuration.md) covers them, so I only link there.

## how it works

Every entry below follows the same three steps, so I state them once.

- study: collect 50 to 200 real bug reports of one class from open source systems such as ZooKeeper, HDFS, HBase, Cassandra, and classify the trigger, root cause, and fix
- aim: turn the dominant trigger into a cheap rule
  - "crash while a node holds a reference to another node's state", "a loop whose exit depends on data read from disk", "a catch block that only logs"
- tool: use the rule to pick where to inject a fault, which code to flag statically, or which test to rerun with an error injected, then add a checker that knows the class's symptoms
  - example symptoms: infinite retry, retry with no delay, a hang, a lost acknowledged write

The payoff the authors keep reporting is the same: a targeted tool finds tens of new confirmed bugs in mature systems in hours, where random injection drowns in combinations. The cost is also the same: each tool covers one class and its rule can miss bugs outside the studied pattern.

## the main papers and systems

### crash recovery bugs

A crash recovery bug: a node crashes, a recovery mechanism such as a write ahead log or a hinted handoff runs, and the system ends up wrong anyway, usually because the crash hit at a specific moment.

- [An Empirical Study on Crash Recovery Bugs in Large-Scale Distributed Systems](https://dl.acm.org/doi/10.1145/3236024.3236030) (CREB), Gao, Dou, Qin, Gao, Wang, Wei, Huang, Zhou, Wu, ESEC/FSE 2018
  - the characterizing study: 103 crash recovery bugs in ZooKeeper, Hadoop MapReduce, Cassandra, HBase, classified by root cause, trigger, impact, and fix
  - abstract: "faults in crash recovery mechanisms and their implementations can introduce intricate crash recovery bugs, and lead to severe consequences"
  - I only got the abstract (ACM pages are blocked here, the abstract came through the Semantic Scholar API); the body's percentage findings are not quoted here
- [CrashTuner: Detecting Crash-Recovery Bugs in Cloud Systems via Meta-Info Analysis](https://lujie.ac.cn/files/papers/CrashTuner.pdf), Lu, Liu, Li, Feng, Tan, Yang, You (ICT CAS and Alibaba), SOSP 2019
  - the tool: crash a node exactly while it touches a "meta-info variable", a variable that refers to high level state such as a node or task object; those variables are found automatically from log statements
  - abstract: "We observe that if a node crashes while accessing meta-info variables, i.e., variables referencing high-level system state information (e.g., an instance of node or task), it often triggers crash-recovery bugs"
  - authors report: "CrashTuner can finish testing each system in 17.39 hours, and reports 21 new bugs that have never been found before. All new bugs are confirmed by the original developers and 16 of them have already been fixed"
  - [repository](https://github.com/lujiefsi/CrashTuner) lists the bugs with their tracker status
- [FaultFuzz: A Coverage Guided Fault Injection Tool for Distributed Systems](https://conf.researchr.org/details/icse-2024/icse-2024-demonstrations/15/FaultFuzz-A-Coverage-Guided-Fault-Injection-Tool-for-Distributed-Systems), Feng, Pei, Gao, Wang, Dou, Wei, Liang, Long, ICSE 2024 demo
  - the same group's tool line after CrashFuzz: picks fault combinations by coverage and I/O feedback
  - abstract: "faults that occur under special timing can trigger fault recovery bugs caused by incorrect fault recovery protocols and implementations"
  - authors report 5 bugs in ZooKeeper, HDFS, HBase; the fuller CrashFuzz and Mallory results are in [fault injection](fault_injection_and_chaos.md)
- [CAFault: Enhance Fault Injection Technique in Practical Distributed Systems via Abundant Fault-Dependent Configurations](https://www.usenix.org/conference/atc25/presentation/chen-yuanliang), Chen, Ma, Zhou, Yan, Jiang (Tsinghua), USENIX ATC 2025
  - the point: fault injection under one default configuration misses recovery paths that other settings enable
  - abstract: "existing fault injection testing is typically performed under a fixed default configuration, overlooking the impact of varying configurations"
  - authors report: "Compared with the state-of-the-art fault injection tools CrashFuzz, Mallory, and Chronos, CAFault covers 31.5%, 29.3%, and 81.5% more fault tolerance logic. Furthermore, CAFault has detected 16 serious previously unknown bugs"
- [Correlated Crash Vulnerabilities](https://www.usenix.org/conference/osdi16/technical-sessions/presentation/alagappan) (PACE), Alagappan, Ganesan, Patel, Pillai, Arpaci-Dusseau, Arpaci-Dusseau, OSDI 2016
  - crash consistency checking (ALICE style, see [history checking](history_checking.md)) extended to whole clusters: what persistent states can exist when several nodes crash together, and does recovery handle each
  - authors report: "a total of 26 vulnerabilities across eight systems", with outcomes of "data loss, corrupted data, or unavailable clusters"
- [Finding Crash-Consistency Bugs with Bounded Black-Box Crash Testing](https://www.usenix.org/conference/osdi18/presentation/mohan) (CrashMonkey and Ace), Mohan, Martinez, Ponnapalli, Raju, Chidambaram, OSDI 2018
  - single node file systems, but the method (enumerate small workloads, simulate power loss after each, check recovery) is the local half of PACE
  - authors report 24 of 26 known crash consistency bugs reproduced and 10 new bugs, "Seven of the newly found bugs existed in the kernel since 2014", including "broken rename atomicity and loss of persisted files"
- [When Amnesia Strikes: Understanding and Reproducing Data Loss Bugs with Fault Injection](https://repositorio.inesctec.pt/handle/123456789/15274) (LazyFS), Pereira, Araújo, Paulo, Macedo (INESC TEC), VLDB 2024 (DOI 10.14778/3681954.3681980 per Crossref)
  - a file system shim that drops or tears writes the way a real crash would, applied to etcd, ZooKeeper, PostgreSQL, Redis, LevelDB, PebblesDB, Lightning Network
  - abstract: "LazyFS is used to find eight new bugs, which lead to data loss, corruption, and unavailability", after reproducing "five known bug reports containing manual and complex reproducibility steps"
- [Finding bugs in Raft implementations](https://antithesis.com/blog/2026/finding-bugs-in-raft-implementations/), Antithesis blog, July 2026
  - industry data point: HashiCorp Raft, Aeron Cluster, OpenRaft, MicroRaft under simulated faults; HashiCorp Raft had a safety violation from asynchronous heartbeat handling, a deadlock after leadership transfer, and a livelock in snapshot installation
  - the post claims "we've found bugs in every Raft implementation we've tested"
  - this is vendor marketing for a simulation product, so I read it as a plausible claim, not a measured study; see [deterministic simulation](deterministic_simulation_testing.md)

### timeout bugs

A timeout bug: a wait on another node or thread either has no deadline (hang), a wrong deadline (false failure or long stall), or a deadline whose expiry is handled badly.

- [Understanding Real-World Timeout Problems in Cloud Server Systems](http://dance.csc.ncsu.edu/papers/IC2E18.pdf), Dai, He, Gu, Lu, IEEE IC2E 2018
  - the characterizing study: 156 timeout bugs in 11 systems
  - abstract: "root causes of timeout problems include misused timeout, missing timeout, improper timeout handling, unnecessary timeout, and clock drifting"
  - abstract: "60% of the bugs do not produce any error messages and 12% bugs produce misleading error messages"
  - the talk slides add "81% timeout bugs are caused by either misused timeout values or missing timeout checking" and that missing timeouts split into 26 network waits and 16 synchronization waits
- [TScope: Automatic Timeout Bug Identification for Server Systems](http://dance.csc.ncsu.edu/papers/ICAC18.pdf), He, Dai, Gu, IEEE ICAC 2018
  - the detector: watch system calls from the kernel, learn what a hung or slow process looks like, and say whether a running anomaly is a timeout bug
  - abstract: "conducted extensive experiments using 19 real-world server performance bugs, including 12 timeout bugs and 7 non-timeout performance bugs ... TScope correctly classifies 18 out of 19 bugs"
  - abstract: "reduces the average false positive rate from 47.24% to 0.8%"
  - this is production side classification of a bug you already hit, not a way to find a new one
- [TFix+: Self-configuring Hybrid Timeout Bug Fixing for Cloud Systems](https://arxiv.org/abs/2110.04101), He, Dai, Gu, arXiv 2021 (TFix was ICDCS 2019)
  - the fixer: predict a timeout value from runtime traces and patch missing or misused timeouts
  - abstract: "TFix+ can effectively fix 15 out of tested 16 timeout bugs"
- [DScope: Detecting Real-World Data Corruption Hang Bugs in Cloud Server Systems](http://dance.csc.ncsu.edu/papers/SOCC18.pdf), Dai, He, Gu, Lu, Wang, SoCC 2018
  - sits between the timeout and corruption classes: a corrupted file makes a loop never exit because the loop's exit condition depends on what was read
  - abstract: "identifies loops whose exit conditions can be affected by I/O operations through returned data, returned error code, or I/O exception handling"
  - authors report: "DScope can detect 42 real software hang bugs including 29 newly discovered software hang bugs" across 9 systems
- [Chronos: Finding Timeout Bugs in Practical Distributed Systems by Deep-Priority Fuzzing with Transient Delay](https://hit.globalimpact.cn/en/publications/chronos-finding-timeout-bugs-in-practical-distributed-systems-by-/), Chen, Ma, Zhou, Gu, Liao, Jiang (Tsinghua and HIT), IEEE S&P 2024
  - the modern detector: inject short delays at chosen points at run time and let a fuzzer pick delay sequences that reach deeper timeout logic; "transient" delays avoid actually waiting the full time
  - authors report, per the HIT publication page: "covers 26.40%, 21.69%, and 15.14% more timeout mechanism logic" than random, brute force, and coverage guided injection, and 27 bugs in ZooKeeper, MySQL Cluster, HDFS, Go-Ethereum that maintainers repaired
  - [code](https://github.com/SecTechTool/Chronos)
- [Understanding and Detecting Fail-Slow Hardware Failure Bugs in Cloud Systems](https://www.usenix.org/conference/atc25/presentation/dong) (Sieve), Dong, Hua, Zhang, Chen, Chen, USENIX ATC 2025
  - slow disks and NICs are the natural trigger for timeout code, so this is the fail-slow side of the same class
  - authors report a study of "48 real-world fail-slow hardware failures from typical cloud systems", and that "Sieve has detected six unknown bugs, two of which have been confirmed" in ZooKeeper, Kafka, HDFS
  - the fault injection point is a synchronized or timeout protected I/O found statically
- a seed name I could not verify: a paper called "TimeBugs" or "hidden timeout bugs"; nothing by those names turned up, so I left it out

### retry bugs

A retry bug: a failed task is retried when it should not be (IF), with the wrong count or delay (WHEN), or without cleaning up state from the failed attempt (HOW).

- [If At First You Don't Succeed, Try, Try, Again...? Insights and LLM-informed Tooling for Detecting Retry Bugs in Software Systems](https://www.microsoft.com/en-us/research/wp-content/uploads/2024/08/SOSP_2024__Detecting_Retry_Bugs_in_Software_Systems-1.pdf) (Wasabi), Stoica, Sethi, Su, Zhou, Lu, Mace, Musuvathi, Nath (UChicago and Microsoft Research), SOSP 2024
  - the characterizing study, full text read: "studying 70 retry-related incident reports from 8 popular open-source applications in Java, we find that the root causes of retry-related incidents are about equally common regarding (1) IF to retry a task upon an error (36%), (2) WHEN and how many times a task is retried (33%), and (3) HOW to properly retry without leaking resources or corrupting application states (31%)"
  - why static analysis alone fails: "There is no dedicated retry API in any of the cases we studied. In about 55% of the cases, the retry functionality is implemented as a simple loop, while in 45% of cases it is implemented as a non-loop structure"
  - why tests miss it: "About 0.1%–0.5% of unit tests in these applications contain a mechanism to deterministically inject transient errors"
  - the tool: an LLM (GPT-4) and CodeQL find retry sites from comments, log strings, and names; existing unit tests are rerun with exceptions injected at those sites; oracles look for infinite retry, retry with no delay, and state leaks
  - authors report: "Wasabi identifies more than 100 distinct, previously unknown retry bugs in eight Java applications ... 42 retry bugs by re-purposing existing unit testing, and 87 through static analysis, with 20 bugs detected by both"
  - precision, authors' words: "Wasabi reports 191 distinct retry problems ... identified 109 of them as true bugs — Wasabi unit testing has a false positive rate of 2 true bugs vs. 1 false positive, and Wasabi static analysis has a rate of 1.4 true bugs vs 1 false positive"
  - [Wasabi toolkit](https://github.com/bastoica/wasabi), reference 63 of the paper
- [RetryGuard: Preventing Self-Inflicted and Attack-Driven Retry Storms in Cloud Applications](https://arxiv.org/abs/2511.23278), Tavori, Bremler-Barr, Levy, Lavi, arXiv Nov 2025 (v2 Aug 2026)
  - prevention rather than detection: a per service controller turns retries off when a model of retries, rejections, and delays says they have become counterproductive
  - abstract: "Default retry patterns can trigger 'retry storms' during service miscoordination or adversarial overload, amplifying load, latency, and resource billing"
  - authors report "98% reduction in storm size" against AWS style policies and, on Kubernetes with Istio, "reduces the peak number of replicas by 3× and cumulative memory usage by 55%"
- [Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/), Google SRE book, 2016
  - the operations view of the same bug class: "The most common cause of cascading failures is overload", and "a single request at the highest layer may produce a number of attempts as large as the product of the number of attempts at each layer"
  - prescribes a "server-wide retry budget. For example, only allow 60 retries per minute in a process"

### exception handling bugs

An exception handling bug: the code that runs when something goes wrong is missing, empty, catches too much, or does the wrong recovery. These bugs are cheap to find and cause a large share of outages.

- [Simple Testing Can Prevent Most Critical Failures](https://www.usenix.org/conference/osdi14/technical-sessions/presentation/yuan) (Aspirator), Yuan, Luo, Zhuang, Rodrigues, Zhao, Zhang, Jain, Stumm, OSDI 2014
  - the study: 198 user reported failures in Cassandra, HBase, HDFS, MapReduce, Redis
  - abstract: "the majority of catastrophic failures could easily have been prevented by performing simple testing on error handling code"
  - the tool: three static rules on error handlers, from my memory of the paper: handler is empty, handler only aborts or over reacts, handler holds a "TODO" or "FIXME" comment
  - authors report: "Running Aspirator on the code of 9 distributed systems located 143 bugs and bad practices that have been fixed or confirmed by the developers", and "Over 30% of the catastrophic failures would have been prevented"
  - data and analysis are on the [Toronto failure analysis page](https://www.eecg.utoronto.ca/failureAnalysis/); the [failure studies note](failure_and_outage_studies.md) discusses the paper's wider findings
- [Understanding Exception-Related Bugs in Large-Scale Cloud Systems](https://www.se.cs.uni-saarland.de/conferences/ASE/ase2019/details/ase-2019-papers/25/Understanding-Exception-Related-Bugs-in-Large-Scale-Cloud-Systems.html) (DIET), Chen, Dou, Jiang, Qin, ASE 2019
  - the follow up study: "210 eBugs from six widely-deployed cloud systems, including Cassandra, HBase, HDFS, Hadoop MapReduce, YARN, and ZooKeeper"
  - abstract: "74% eBugs affect system availability or integrity", "54% eBugs are triggered by non-semantic conditions such as network errors", "40% eBugs can be triggered by simulating the conditions at simple system states"
  - authors report DIET "reports 31 bugs and bad practices from the latest versions of the studied systems. So far developers have confirmed that 23 of them are 'previously-unknown' bugs or bad practices"
- [ExChain: Exception Dependency Analysis for Root Cause Diagnosis](https://www.usenix.org/conference/nsdi24/presentation/li-ao), Li, Lu, Nath, Padhye, Sekar (CMU, Microsoft Research, UChicago), NSDI 2024
  - diagnosis rather than detection: when an exception is swallowed and the failure shows up far later, link the two through the state the first exception changed
  - abstract names the hard features: "implicit dependencies across multiple exceptions due to state changes; silent code handling without logging; and separation (in code and in time) between the root cause exception and the failure manifestation"
  - authors report the root cause found for 8 of 11 reported failures across 10 applications
- Rust: the class changes shape, it does not disappear
  - [Understanding and Detecting Real-World Safety Issues in Rust](https://songlh.github.io/paper/rust-tse.pdf), Qin, Chen, Liu, Zhang, Wen, Song, Zhang, IEEE TSE (I think this is the journal version of the group's PLDI 2020 Rust study, not verified)
    - abstract: "110 programming errors leading to unexpected execution panics", and the body: "a lot of unexpected panics occur due to unwrapping Result or Option objects directly"
    - the study's five static detectors "pinpoint 96 previously unknown bugs" across memory, concurrency, and panic classes together
  - [PanicFI: An Infrastructure for Fixing Panic Bugs in Real-World Rust Programs](https://arxiv.org/abs/2408.03262), Ni, Feng, Liu, Chen, Xu, arXiv 2024
    - abstract: "Panic4R, comprising 102 real panic bugs and their fixes from the top 500 most-downloaded open-source crates", and "PanicKiller ... has already contributed to the resolution of 28 panic bugs"
  - [Cloudflare outage of 18 November 2025](https://blog.cloudflare.com/18-november-2025-outage/): the postmortem quotes the panic message "thread fl2_worker_thread panicked: called Result::unwrap() on an Err value" when a feature file exceeded a 200 entry limit; service was mostly back about three hours after it started
    - my reading: in Java the bug is a catch block that swallows; in Rust the bug is an `unwrap` that turns a recoverable error into a crash. Aspirator's rules would need a Rust version aimed at `unwrap`, `expect`, and `?` into a wrong error type. I found no distributed systems study that does this
  - the [failure studies note](failure_and_outage_studies.md) covers the outage itself

### data loss and corruption

Two different problems share this heading. Software data loss: the system says "written" and the data later is gone or wrong. Silent data corruption (SDC): a CPU core computes a wrong answer with no error signal, so every software layer above trusts garbage.

- [Redundancy Does Not Imply Fault Tolerance: Analysis of Distributed Storage Reactions to Single Errors and Corruptions](https://www.usenix.org/conference/fast17/technical-sessions/presentation/ganesan) (CORDS), Ganesan, Alagappan, Arpaci-Dusseau, Arpaci-Dusseau, FAST 2017
  - inject one corrupted block or one read or write error on one replica of Redis, ZooKeeper, Cassandra, Kafka, RethinkDB, MongoDB, LogCabin, CockroachDB
  - abstract: "a single file-system fault can cause catastrophic outcomes such as data loss, corruption, and unavailability" despite replication
- [Protocol-Aware Recovery for Consensus-Based Storage](https://www.usenix.org/conference/fast18/presentation/alagappan) (CTRL), Alagappan, Ganesan, Lee, Albarghouthi, Chidambaram, Arpaci-Dusseau, Arpaci-Dusseau, FAST 2018, best paper
  - the fix side: a Raft or ZAB log that is corrupted on one node can be repaired from the others if recovery knows the protocol
  - page text: "the CTRL versions of two systems, LogCabin and ZooKeeper, safely recover from storage faults and provide high availability, while the unmodified versions can lose data or become unavailable"
- LazyFS (VLDB 2024) and PACE (OSDI 2016) above are the crash side of data loss
- [Jepsen: MongoDB 4.2.6](https://jepsen.io/analyses/mongodb-4.2.6), Kingsbury, May 2020
  - a history checking example of acknowledged data loss: "with network partitions, transactions appeared to lose acknowledged writes", and "updates to eight documents were successfully acknowledged, then disappeared"
  - the report also notes the default: "MongoDB's default level of write concern was (and remains) acknowledgement by a single node, which means MongoDB may lose data by default"
  - [history checking](history_checking.md) covers Elle and the method
- [Silent Data Corruptions at Scale](https://arxiv.org/abs/2102.11245), Dixit et al. (Meta), arXiv Feb 2021
  - abstract: "SDCs are not captured by error reporting mechanisms within a Central Processing Unit (CPU) and hence are not traceable at the hardware level. However, the data corruptions propagate across the stack and manifest as application-level problems"
  - abstract: "we have run a vast library of silent error test scenarios across hundreds of thousands of machines in our fleet. This has resulted in hundreds of CPUs detected for these errors"
- [Cores that don't count](https://sigops.org/s/conferences/hotos/2021/papers/hotos21-s01-hochschild.pdf), Hochschild, Turner, Mogul, Govindaraju, Ranganathan, Culler, Vahdat (Google), HotOS 2021
  - full text read; the rate: "we observe on the order of a few mercurial cores per several thousand machines – similar to the rate reported by Facebook"
  - the symptom list includes "Wrong answers that are never detected", and the warning that "bad metadata can cause the loss of an entire file system, and a corrupted encryption key can render large amounts of data permanently inaccessible"
  - the paper is "a call-to-action", not a detector; it asks for software methods to detect, isolate, and tolerate mercurial cores
- [Detecting silent errors in the wild](https://engineering.fb.com/2022/03/17/production-engineering/silent-errors/), Meta engineering blog, March 2022
  - the two detectors in production: Fleetscanner runs long tests during maintenance windows (about once per 180 days per machine) and Ripple runs millisecond tests under live workloads
  - the blog reports Fleetscanner gave "23 percent" unique SDC coverage but took "~6 months" to reach 70% of the fleet's corruptions, while Ripple gave "7 percent" unique coverage and reached 70% in "~15 days"; Meta's conclusion is "both approaches are equally important to detecting SDCs"
- [How Meta keeps its AI hardware reliable](https://engineering.fb.com/2025/07/22/data-infrastructure/how-meta-keeps-its-ai-hardware-reliable/), Meta engineering blog, July 2025
  - the rate claim: "silent data corruptions now occur at about one fault per thousand devices"
  - a third detector, Hardware Sentinel, infers bad cores from application exceptions and "outperforms testing-based methods by 41% across architectures, applications, and data centers"
- [Understanding Silent Data Corruptions in a Large Production CPU Population](https://dl.acm.org/doi/10.1145/3600006.3613149) (Farron), Wang, Zhang, Wei, Wang, Wu, Luo (Tsinghua and Alibaba Cloud), SOSP 2023
  - the ACM page and Semantic Scholar page were blocked here; search snippets say over one million processors in 28 data centers were measured, with a faulty rate of 3.61 per ten thousand, and a mitigation (Farron) that prioritizes tests for reproducible SDCs and uses temperature control for the rest
  - treat those numbers as unverified until the paper is opened
- scrubbing as the everyday defense: [Ceph OSD configuration](https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/) says "Ceph scrubbing is analogous to fsck on the object storage layer", with light scrubs "usually done daily" and deep scrubs that "uses checksums to ensure data integrity" "usually done weekly"
- surveys: [Testing Storage-System Correctness: Challenges, Fuzzing Limitations, and AI-Augmented Opportunities](https://arxiv.org/abs/2602.02614), Wang, Chen, Jiang, arXiv Feb 2026, and [On Fault Tolerance of Data Storage Systems: A Holistic Perspective](https://arxiv.org/abs/2507.03849), Zheng, Zhang, Dajani, arXiv July 2025
  - the 2026 survey blames "nondeterministic interleavings, long-horizon state evolution, and correctness semantics that span multiple layers and execution phases" for why storage bugs stay hidden from fuzzers

### metastable and overload failures

A metastable failure: a trigger such as a load spike or a short outage pushes the system into a bad state, something inside the system (usually retries or cache misses) keeps feeding the bad state, and removing the trigger does not help. Only reducing load below normal recovers it.

- [Metastable Failures in Distributed Systems](https://sigops.org/s/conferences/hotos/2021/papers/hotos21-s11-bronson.pdf), Bronson, Aghayev, Charapko, Zhu, HotOS 2021
  - full text read; the definition: "Metastable failures occur in open systems with an uncontrolled source of load where a trigger causes the system to enter a bad state that persists even when the trigger is removed"
  - abstract admits: "A systematic approach for building systems that are robust against unknown metastable failures remains an open problem"
- [Metastable Failures in the Wild](https://www.usenix.org/conference/osdi22/presentation/huang-lexiang), Huang et al. (Penn State and others), OSDI 2022
  - the characterizing study: "an in-depth study of 22 metastable failures from 11 different organizations", and "at least 4 out of 15 major outages in the last decade at Amazon Web Services were caused by metastable failures"
  - extends the model with two trigger types and two amplification types and reproduces them in small test applications
- [Metastable failures](https://brooker.co.za/blog/2021/05/24/metastable.html), Marc Brooker (AWS), May 2021
  - the practitioner warning on retries: adding retries "can make systems more vulnerable, by converting small outages into sudden (and metastable) periods of internal retry storms"
- [MSF-Model: Queuing-Based Analysis and Prediction of Metastable Failures in Replicated Storage Systems](https://arxiv.org/abs/2309.16181), Habibi, Lorido-Botran, Showail, Sturman, Nawab, SRDS 2024
  - a queueing model of a replicated store that predicts when a load pattern tips it into the bad state; authors claim high accuracy against real runs
- [Formal Analysis of Metastable Failures in Software Systems](https://arxiv.org/abs/2510.03551), Alvaro, Isaacs, Majumdar, Muniswamy-Reddy, Salamati, Soudjani, arXiv Oct 2025
  - models a request response server as a continuous time Markov chain and defines metastability through escape probabilities; claims the visual analysis can "predict many instances of metastability that were observed in the field in a matter of milliseconds"
- [CSnake: Detecting Self-Sustaining Cascading Failure via Causal Stitching of Fault Propagations](https://arxiv.org/abs/2509.26529), Qian, Tan, Zhang (Purdue), EuroSys 2026
  - the first detector that looks for the cycle itself: inject one fault per test, record which further faults it causes, stitch those cause effect edges across tests, and search for cycles
  - abstract: "causal stitching, which causally links multiple single-fault injections in different tests to simulate complex fault propagation chains"
  - authors report 15 self-sustaining cascading failure bugs in 5 systems, 5 confirmed, 2 fixed
  - the [fault injection note](fault_injection_and_chaos.md) has more on its budget allocation
- [Characterizing Metastable Faults and Failures](https://arxiv.org/abs/2606.00942) (Nyx), Farahbakhsh, Lu, Alvisi, Haeberlen, van Renesse (Cornell and UPenn), arXiv June 2026, submitted to SOSP 2026
  - renames the cause: a "metastable fault" is a "structural destabilizing cycle of interaction among systems components that, in isolation, are stabilizing"
  - Nyx is a small language of agents, queues, and resources; its toolkit draws vector fields of system dynamics so a designer can see a destabilizing cycle before deployment
  - case studies: a retry storm, an oscillating cluster membership in a gaming platform, and a look aside cache
  - the authors admit: "Metastable faults span the entire stack, and the vast scale of production systems makes locating them even more challenging"
- fail-slow detection in production, the hardware trigger for overload
  - [Perseus: A Fail-Slow Detection Framework for Cloud Storage Systems](https://www.usenix.org/conference/fast23/presentation/lu), Lu, Xu, Zhang et al. (SJTU and Alibaba), FAST 2023, best paper
    - abstract: "fail-slow" failures are those "where the victim components are still functioning yet with degraded performance"
    - a regression over latency versus throughput per drive; authors report 304 fail-slow cases found in 10 months over 248K drives and a 48% cut in node level 99.99th percentile latency
  - Sieve (ATC 2025) above is the testing side; [runtime checking](runtime_checking_and_invariants.md) covers Panorama, IASO, and OmegaGen

### distributed concurrency bugs, kept short

The sibling [runtime checking note](runtime_checking_and_invariants.md) covers TaxDC and DCatch in depth. Here I only place them in the bug class picture.

- [TaxDC](https://www.academia.edu/95755734/TaxDC), Leesatapornwongsa, Lukman, Lu, Gunawi, ASPLOS 2016: 104 message timing bugs in the same four systems; the study that the crash recovery and timeout studies above imitate
- [DCatch](https://people.cs.uchicago.edu/~shanlu/paper/asplos17-preprint.pdf), Liu et al., ASPLOS 2017: happens before analysis across nodes to predict message races from one correct run
- [FCatch: Automatically Detecting Time-of-fault Bugs in Cloud Systems](https://dl.acm.org/doi/10.1145/3173162.3177161), Liu, Wang, Li, Lu, Ye, Tian, ASPLOS 2018
  - treats "crash at a bad moment" as a concurrency bug between the crashing node and the recovery code, so it predicts crash recovery bugs from a correct run instead of injecting crashes
  - the ACM abstract is blocked here; the [patent](https://patents.google.com/patent/US10860411) describes the same method: find "a vulnerable operation" where "a first shared resource ... is in a flawed state after a node that caused the first shared resource to be in the flawed state crashed", then check whether a fault tolerance mechanism covers it
  - my reading: FCatch and CrashTuner attack the same class from two directions, prediction versus targeted injection; nobody has compared them on one bug set that I could find
- flaky tests: the only distributed systems scale study I found is on a database, [Do Test and Environmental Complexity Increase Flakiness? An Empirical Study of SAP HANA](https://arxiv.org/abs/2409.10062), ESEM 2024; its summary reports test execution time as the strongest correlate of flakiness and, surprisingly, that distributed tests were less flaky than non-distributed ones. I did not read the body

## what is used in industry

- Meta runs Fleetscanner, Ripple, and Hardware Sentinel across its fleet for SDC ([2022 blog](https://engineering.fb.com/2022/03/17/production-engineering/silent-errors/), [2025 blog](https://engineering.fb.com/2025/07/22/data-infrastructure/how-meta-keeps-its-ai-hardware-reliable/)); Google reports the same problem class and rate ([HotOS 2021](https://sigops.org/s/conferences/hotos/2021/papers/hotos21-s01-hochschild.pdf)); Alibaba Cloud reports fleet wide measurement and Farron ([SOSP 2023](https://dl.acm.org/doi/10.1145/3600006.3613149))
- Alibaba Cloud deployed Perseus for fail-slow drives ([FAST 2023](https://www.usenix.org/conference/fast23/presentation/lu))
- Google's SRE book prescribes retry budgets and warns about layered retry amplification ([Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)); Marc Brooker says AWS has worked on metastability "for the past decade" under other names ([blog](https://brooker.co.za/blog/2021/05/24/metastable.html))
- Ceph scrubs daily and deep scrubs weekly by default ([docs](https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/))
- CrashTuner was built with Alibaba authors and its repository lists Kubernetes issues as well as Hadoop family bugs ([repo](https://github.com/lujiefsi/CrashTuner)); Wasabi was built with Microsoft Research ([repo](https://github.com/bastoica/wasabi))
- Jepsen reports are commissioned by vendors and routinely find data loss ([MongoDB 4.2.6](https://jepsen.io/analyses/mongodb-4.2.6)); Antithesis sells simulation that found Raft bugs ([blog](https://antithesis.com/blog/2026/finding-bugs-in-raft-implementations/))
- I found no evidence that the academic class specific detectors (CrashTuner, Chronos, Wasabi, DIET, CSnake) run in anyone's continuous integration; confirmed bug counts come from one time campaigns by the authors

## known gaps and open problems

- the rules only cover the studied pattern
  - Wasabi: "There is no dedicated retry API in any of the cases we studied", and its static side "can incur more false positives than unit testing and miss bugs that are related to system run-time states"
  - CrashTuner only crashes at meta-info access points; FCatch only predicts from one correct run; neither covers crashes during I/O that PACE and LazyFS target
- precision is modest and triage is manual
  - Wasabi: 191 reports, 109 true bugs; CSnake: 15 reported, 5 confirmed, 2 fixed; Sieve: 6 found, 2 confirmed
- metastability is still mostly explanation after the fact
  - Bronson et al.: "A systematic approach for building systems that are robust against unknown metastable failures remains an open problem"
  - Farahbakhsh et al. (2026): "Metastable faults span the entire stack, and the vast scale of production systems makes locating them even more challenging"
  - CSnake finds cycles in open source code under test; MSF-Model and the Markov chain work predict from models; nobody has shown a tool that finds a metastable fault in a real production incident before it happened
- SDC detection is fleet statistics, not software design
  - Hochschild et al. ask for "methods for tolerating the silent data corruption they cause"; Dixit et al. say reducing SDC "requires not only hardware resiliency and production detection mechanisms, but also robust fault-tolerant software architectures"; I found no distributed system that checks its own computation against SDC beyond checksums on stored bytes
- timeouts are set by hand
  - the IC2E study shows 60% of timeout bugs are silent; TFix+ predicts values from traces, but no study checks whether a protocol's timeout choices are consistent with its liveness assumptions
- Rust error handling has panic studies but no distributed systems study
  - the TSE study and PanicFI cover crates and compilers; nothing like CREB, DIET, or the retry study exists for Rust distributed systems such as TiKV, Databend, or the Raft crates
- the same four Java systems dominate every study
  - CREB, TaxDC, DIET, CrashTuner, Chronos, CAFault all test ZooKeeper, HDFS, HBase, Cassandra, with MySQL Cluster, Kafka, IPFS, Go-Ethereum as the only newcomers; whether the triggers transfer to Rust or Go codebases is untested

## research we could do

These are agent opinions. Each one names the closest existing work so you can check novelty yourself.

- a Rust version of Aspirator and DIET, run on Rust distributed systems
  - gap: no exception handling bug study or detector targets Rust distributed systems; the Cloudflare outage shows the class exists
  - closest work: Aspirator (OSDI 2014), DIET (ASE 2019), the TSE Rust safety study, PanicFI
  - first experiment: pull every `unwrap`, `expect`, `panic!`, and `?` that changes error type from TiKV, openraft, and Databend; classify 100 of them by hand as recoverable error turned fatal or not; then write three rules as clippy lints and count confirmed reports in two weeks
- compare prediction (FCatch) and targeted injection (CrashTuner) on one crash recovery bug set, then port the winner to a Rust Raft
  - gap: the two methods were never run on the same bugs; neither has a Rust port
  - closest work: FCatch, CrashTuner, CREB, Antithesis's Raft bug post
  - first experiment: reproduce 10 CREB bugs on current ZooKeeper and HBase, run both tools, record found and missed; in parallel, implement the meta-info rule for openraft using its tracing spans as the log source
- timeouts checked against a model's liveness assumptions
  - gap: timeout bugs are 60% silent and the values are guesses; a TLA+ model of Raft states which waits must end, but no tool connects the code's timeout values to those assumptions
  - closest work: Chronos, TFix+, the IC2E study, and the trace validation work in [runtime checking](runtime_checking_and_invariants.md)
  - first experiment: list every timeout in openraft or etcd raft, map each to a model action, and inject Chronos style transient delays at just those sites; the question is whether model guided delay placement finds the 27 Chronos style bugs faster than deep priority fuzzing. This connects directly to the TLA+ to verified Rust line
- retry bug detection with an LLM for a Rust codebase
  - gap: Wasabi's finding that comments and names identify retry better than structure should transfer across languages, but Rust retry idioms (tokio retry crates, backoff, loop with `?`) are untested
  - closest work: Wasabi, RetryGuard
  - first experiment: run the Wasabi prompts on 8 Rust services, hand check precision on 50 flagged sites, and rerun existing tests with injected `Err` at those sites; two to three weeks
- a metastable fault finder that stitches real traces instead of injected faults
  - gap: CSnake needs tests and injection; production has traces of the actual fault propagation but nobody mines them for cycles
  - closest work: CSnake, Nyx, MSF-Model
  - first experiment: take the OSDI 2022 reproductions (the authors released example applications), record OpenTelemetry traces during a triggered failure, and check whether a cycle detector over the trace's cause effect edges flags the loop before latency explodes
- SDC tolerant replication at the software level
  - gap: all three hyperscalers detect bad cores by fleet statistics; replicated state machines could instead compare outputs of replicas, but nobody has measured the cost or the catch rate against injected instruction faults
  - closest work: Cores that don't count, Meta's Ripple, CTRL (FAST 2018) for storage corruption
  - first experiment: inject wrong results into one replica of a 3 node Raft key value store at the application layer and measure how long before a client observes a divergence with and without a cheap output digest exchanged with heartbeats

## search log

- searches run on 2026-10-07 UTC with WebSearch (standard and extended modes) for: CREB FSE 2018; CrashTuner SOSP 2019; timeout bugs Dai TScope; retry bugs SOSP 2024 Wasabi; Simple Testing OSDI 2014; metastable failures HotOS 2021 and OSDI 2022; CSnake EuroSys 2026; Perseus FAST 2023; Silent Data Corruptions at Scale and Cores that don't count; TaxDC DCatch FCatch; exception handling bug studies 2023 to 2025; Rust error handling studies; data loss bug studies 2024 to 2025; crash recovery detection 2024 to 2026; timeout detection 2023 to 2025; retry storm 2025 to 2026; metastable detection 2024 to 2026; SDC detection 2023 to 2025; Chronos S&P 2024; fail-slow ATC 2025; flaky tests in distributed systems; Raft crash recovery and etcd data loss; LLM based detection of these classes; Alibaba SDC SOSP 2023
- full text read with pdftotext: Cores that don't count, Metastable Failures in Distributed Systems, the retry bug paper, CrashTuner (abstract and introduction), the IC2E timeout study (abstract and slides), TScope, the TSE Rust safety study (abstract and panic section)
- abstracts or official pages read with WebFetch: Aspirator, DIET, ExChain, Chronos (HIT page), CAFault, Sieve, FaultFuzz, PACE, CORDS, CTRL, CrashMonkey, LazyFS, MSF-Model, the Markov chain metastability paper, CSnake, Characterizing Metastable Faults (body sections on Nyx), RetryGuard, PanicFI, Perseus, Silent Data Corruptions at Scale, Meta 2022 and 2025 blogs, Google SRE cascading failures chapter, Brooker's blog, Ceph docs, Jepsen MongoDB 4.2.6, Antithesis Raft blog, Cloudflare outage postmortem, the CrashTuner repository, two storage surveys
- blocked: ACM Digital Library pages (CREB, FCatch, Alibaba SDC), the UChicago knowledge repository copy of the retry paper, the SOSP 2019 slide mirror, the CACM "Revisiting CPU Silent Data Corruptions" page, the Semantic Scholar web page; the CREB abstract came through the Semantic Scholar API instead
- not found: anything called TimeBugs or "hidden timeout bugs"; a Rust distributed systems error handling study; a comparison of FCatch against CrashTuner
