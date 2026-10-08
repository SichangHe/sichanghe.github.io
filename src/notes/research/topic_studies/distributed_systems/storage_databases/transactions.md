distributed transactions
(authored by agents unless marked 🧑)

what this file is
- a deeper pass on how databases spread over many machines run transactions, 2022 to 2026
- it adds to [transactions and data across regions](transactions_regions.md)
  - that file already covers Spanner, Calvin, SLOG, Caerus, D2PC, PolyBase, K2, Bonspiel, TxnSails, and MongoDB's modular verification
  - I do not repeat those; I link to them
- this file covers what that one misses
  - commit protocols that merge commit with replication
  - concurrency control on one machine or one cluster
  - deterministic databases
  - transactions over RDMA, disaggregated memory, and CXL
  - transactions across services, serverless functions, and several databases
  - tools that check or prove transaction systems correct
- reading date: 7 Oct 2026 UTC
- ChatGPT Extra High: no opinion was obtained
  - the shared browser was not signed in to ChatGPT; the coordinator told me to stop trying
  - the prompt I would send is at /tmp/claude-30033/-ssd1-sichanghe-github-io/85361e00-9330-4e62-a177-9736b46ce5e5/scratchpad/txn_chatgpt_prompt_v2.md
  - run it later with pb-chatgpt-prompt-file and paste the answer under a 🤖-free heading of its own

takeaway, my opinion
- the field is split into one crowded lane and several quiet ones
  - crowded: shaving the last wide-area round trip off geo-replicated commit (Tiga, Mako, Caerus, Detock, Bonspiel, Minerva, SunStorm, Chablis)
  - crowded: one-sided RDMA transaction protocols for disaggregated memory (FORD, Motor, HDTX, Lotus, and a 2026 paper arguing the whole one-sided premise was wrong)
  - quiet: proving a sharded, replicated transaction system correct in Rust; nothing published that I found
  - quiet: transactions across services and functions have strong systems but no accepted correctness contract or checker
  - quiet: checkers for isolation now exist at every level, but this review did not find a protocol-proof-to-implementation-checker comparison
- what I would do first, in order
  1. a verified transactional key-value core in Verus with sharding and 2PC, aimed at the TAPIR/Tulip family, and compare proof effort with Tulip's 42,000 lines of Rocq
  2. an isolation checker for cross-service workflows (Styx, Sonata, Epoxy, DBOS), because the vendors each claim serializability and this review did not find an independent test
  3. a measurement of which of the 2025 to 2026 "one round trip" geo-commit designs survive clock trouble and failover, using their released code
- these are hypotheses; this review establishes prior work, not novelty, and no experiment was run

what the problem is, in plain words
- a transaction is several reads and writes that must look like one step
- when the data lives on several machines, four separate costs appear
  - ordering: deciding who goes first when two transactions touch the same rows
  - atomic commit: making every machine agree that the transaction happened, usually two-phase commit (2PC)
  - replication: copying the decision to backup machines so a crash loses nothing
  - storage: making the result survive on disk or persistent memory
- almost every 2022 to 2026 paper is an attempt to pay two of these costs with one network round trip, or to move one of them off the critical path
- the honest question for each paper is: what did it assume to get there?
  - synchronized clocks, non-interactive transactions, read/write sets known up front, fail-stop machines, or a storage layer that is already replicated

1. commit protocols and merging commit with replication

- why this lane exists
  - classic Spanner-style systems pay 2PC and then Paxos, so a cross-region write costs about two wide-area round trips
  - the 2023 to 2026 designs try to get to one
- Mako, Shen et al., [OSDI 2025](https://www.usenix.org/system/files/osdi25-shen-weihai.pdf)
  - evidence, abstract: "The key innovation in Mako is the use of two-phase commit (2PC) speculatively to allow distributed transactions to proceed without having to wait for their decisions to be replicated, while also preventing unbounded cascading aborts if shards fail prior to the end of replication."
  - evidence, section 1: "After a close examination, we conclude that a key limitation of current designs of distributed transaction protocols is the tight dependence between the two main building blocks: the transaction coordination and the replication protocols."
    - this is the authors' diagnosis, not a measured fact
  - result in the paper's setup: "Mako processes 3.66M TPC-C transactions per second when data is split across 10 shards"
  - limits the authors state
    - "We leave the complete design and implementation of a dynamic sharding solution for Mako to future work."
    - appendix A: "we assume the correctness of exisiting wellknown protocols (OCC, Paxos) and mainly aim to prove two properties: commit/rollback atomicity and rollback safety."
  - my reading: the proof is a paper proof of two properties on top of assumed building blocks; the speculative commit path with cascading-abort bounds is exactly the kind of thing a machine-checked proof would earn its keep on
- Tiga, Geng, Mu, Sivaraman, Prabhakar, [SOSP 2025](https://arxiv.org/abs/2509.05759), [code](https://github.com/New-Consensus-Concurrency-Control/Tiga)
  - evidence, abstract: "Tiga consolidates concurrency control and consensus, completing both strictly serializable execution and consistent replication in a single round. It uses synchronized clocks to proactively order transactions by assigning each a future timestamp at submission."
  - evidence, abstract: "In rare cases, transactions are delayed and proactive ordering fails, in which case Tiga falls back to a slow path, committing in 1.5--2 WRTTs."
  - my reading: the fast path depends on the future timestamp arriving before the message; the paper's own "rare cases" is a claim about their network, so the slow-path fraction under clock drift, queueing, or a bad region is the number to measure
- Chardonnay, Eldeeb et al., [OSDI 2023](https://www.usenix.org/conference/osdi23/presentation/eldeeb)
  - my summary from the abstract: an on-disk, multi-versioned store for one datacenter; it runs a cheap snapshot read first to learn which keys a transaction will touch, then prefetches them and orders lock requests so deadlocks cannot happen
  - the trick is "learn the read/write set by dry-running"; it reappears in HDCC, ForeSight, and Styx below
- Chablis, Eldeeb, Bernstein, Cidon, Yang, [CIDR 2024](https://vldb.org/cidrdb/2024/chablis-fast-and-general-transactions-in-geo-distributed-systems.html)
  - my summary: the geo-distributed follow-up; local read-write transactions on data homed in one region, plus global strictly serializable snapshot reads through a global epoch, without a clock-skew bound
- Rosé, Zarkadas et al., [CIDR 2026](https://www.vldb.org/cidrdb/papers/2026/p8-zarkadas.pdf)
  - evidence, abstract: "Rosé is a novel replication scheme to address the limitations of asynchronous primary backup replication in partitioned databases, by striking a balance between full synchronicity and asynchronicity."
  - evidence, abstract: "We integrate Rosé with Chablis, a geo-distributed, multi-versioned transactional key-value store to preserve the benefit of fast single datacenter (DC) transactions while ensuring multiDC durability."
  - evidence, limits: "in the event of a prolonged outage or loss of the backup region, we assume that an administrator or an external system monitoring uptime of the respective cloud will disengage the backpressure mechanism to restore availability if needed."
  - my reading: this is the "replicate transactions in the background" idea again, but with a bounded lag and a prefix guarantee at the backup; the manual backpressure release is a liveness hole
- Cornus, Guo et al., [VLDB 2023](https://www.vldb.org/pvldb/vol16/p379-guo.pdf)
  - my summary: when storage is a shared, already replicated service, 2PC can log its votes into that storage and skip one of the two eager log writes; the paper reports up to 1.9× lower commit latency in its setup
- Aurora DSQL, Brooker et al., [arXiv July 2026](https://arxiv.org/abs/2607.13276)
  - evidence, abstract: "The system uses multiversion concurrency control with precision timestamps for coordination-free reads and optimistic concurrency control for writes, deferring coordination to commit time through distributed adjudicators and the Journal replication system."
  - evidence, section 4: "snapshot isolation plus linearizability [9, 11]) as our default (and currently only) supported isolation level."
  - evidence: "commit latency grows with the number of involved adjudicators due to the fan-out of the prepare phase"
  - evidence: "We specified the core protocols in TLA+ and P, and performed extensive model checking." and "We test the implementation extensively at build time using deterministic simulation testing."
  - my reading: the same Cornus idea at production scale; note it gives snapshot isolation, not serializability, and says so
- SunStorm, Nguyen, Nilangekar, Linnakangas, Abadi, [VLDB 2025](https://rmarcus.info/dbscholar/papers/14390)
  - my summary from the index entry: several geographically spread writer nodes over Aurora-style shared storage, each owning a partition, so most writes avoid full distributed commit
  - I did not read the PDF; treat as a lead
- OceanBase tree-structured 2PC, Xu et al., [VLDB 2026](https://www.vldb.org/pvldb/vol19/p4250-xu.pdf)
  - evidence, abstract: "Using the stream—not each partition—as the 2PC participant reduces coordination overhead while aligning transfers with the stream layout."
  - evidence, related work: "classical work assumes static hierarchies at sites, not elastic resharding with mid-commit topology change."
  - my reading: an industrial answer to "what happens to 2PC while a partition is moving"; this is the one place in this lane where the hard case is migration during commit rather than steady state
- Minerva, Mao et al., [arXiv Feb 2026](https://arxiv.org/abs/2602.21566)
  - evidence, abstract: "Minerva employs a novel epoch-based asynchronous replication protocol that decouples data propagation from the commitment process, enabling continuous transaction replication."
  - evidence, abstract: "Instead of aborting transactions when conflicts are detected, Minerva uses deterministic re-execution to resolve conflicts, ensuring serializability without sacrificing performance."
  - venue not stated on arXiv; treat as unreviewed
- WriteGuards, Mao et al., [OSDI 2026](https://www.usenix.org/conference/osdi26/presentation/mao-ziming-writeguards)
  - evidence, abstract: caches that give "linearizable reads entirely from memory without contacting storage"; a storage primitive "prevent[s] a subtle race called the delayed-writes anomaly arising during changes in ownership of key ranges"
  - my reading: not a commit protocol, but the same failure shape as OceanBase's mid-commit migration; a late write from the old owner lands after ownership moved
- older but needed for comparison, all with the same "one round trip" goal
  - Natto, [SIGMOD 2022](https://cs.uwaterloo.ca/~bernard/natto.pdf): uses measured network delay to timestamp a transaction by its arrival at the farthest shard, so high-priority transactions can preempt
  - Nezha, [VLDB 2023](https://www.vldb.org/pvldb/vol16/p629-geng.pdf): a consensus protocol, not a transaction protocol, but the same authors and the same synchronized-clock trick that Tiga builds on
  - GeoTP, [ICDE 2025 / arXiv](https://arxiv.org/abs/2412.01213): decentralized prepare plus a scheduler that delays lock acquisition to shorten the time locks are held, inside a database middleware
  - Dandelion, [EuroSys 2025 poster](https://2025.eurosys.org/posters/eurosys25posters-paper71.pdf): "hundreds of millions of distributed, strongly consistent, and 3-way replicated transactions per second with very few machines"; motivated by CXL memory making 5-machine clusters big enough
- what I take from this lane
  - the mechanism menu is now fixed: speculate and replicate later (Mako, Rosé), order by synchronized clock (Tiga, Natto, Nezha), log votes into shared storage (Cornus, DSQL), re-execute instead of abort (Minerva), or move ownership so commits stay local (SunStorm, PolyBase)
  - every one trades a cleaner failure story for a round trip; the papers' own limitation lines are where the unfinished work is: Mako's dynamic sharding, Rosé's manual backpressure, Tiga's slow-path fraction, DSQL's adjudicator fan-out
  - I would not propose another one-round-trip protocol; I would propose measuring these under the conditions their fast paths assume away

2. concurrency control

- the 2025 to 2026 papers are mostly about hotspots: a few rows that everyone writes
- Brook-2PL, Habibi, Fang, Lorido-Botran, Nawab, [SIGMOD 2026, arXiv](https://arxiv.org/abs/2508.18576)
  - evidence, abstract: "Brook-2PL addresses this limitation by statically analyzing a new graph-based dependency structure called SLW-Graph, enabling deadlock-free two-phase locking through predetermined lock acquisition."
  - evidence, abstract: "Brook-2PL also reduces contention by enabling early lock release using partial transaction chopping and static transaction analysis."
  - result in their setup: "an average speed-up of 2.86x while reducing tail latency (p95) by 48% in the TPC-C benchmark"
  - my reading: it needs the set of transaction programs up front, so it fits stored procedures and the non-interactive world the Abadi workload study (below) says is common
- TXSQL, Wang et al., Tencent, [arXiv 2025](https://arxiv.org/abs/2504.06854)
  - evidence, abstract: "a hotspot-aware approach that enables certain highly conflicting transactions to switch to a group locking method, which groups conflicting transactions at a specific hotspot, allowing them to execute serially in an uncommitted state within a conflict group without the need for locking"
  - my reading: a production system batching conflicting writers on one row; I would like to know what its isolation claim is when a group member aborts
- Focus!, Hwang, Conway, Garcia-Alvarado, Yuan, Ben-David, Johnson, Szekeres, [SIGMOD 2026](https://doi.org/10.1145/3769793)
  - evidence, from [A. Jesse Jiryu Davis's SIGMOD 2026 recap](https://emptysqua.re/blog/sigmod-2026/): "decomposes timestamp-based concurrency control into two parts: a timestamp-storage layer and the concurrency-control protocol itself."
  - search-result summary, unverified by me: a compact sketch approximates timestamps for inactive keys so timestamp-ordering protocols work on disk
  - I did not read the PDF
- NeurCC, Pan et al., [arXiv 2025](https://arxiv.org/abs/2503.10036)
  - evidence, abstract: "The function is implemented as an efficient in-database lookup table that maps database states to concurrency control actions."
  - the successor to Polyjuice, Wang et al., [OSDI 2021](https://www.usenix.org/conference/osdi21/presentation/wang-jiachen), which searched a policy space with an evolutionary algorithm
  - my reading: learned concurrency control is five years old and has not reached a production system that I found; treat as a crowded academic lane
- HDCC, Hong et al., [VLDB 2025](https://www.vldb.org/pvldb/vol18/p1376-lu.pdf), [code](https://github.com/dbiir/HDCC)
  - evidence, abstract: "we propose HDCC, a hybrid approach that adaptively employs Calvin and OCC, which have distinct concurrency control and logging schemes, in the same database system."
  - mechanisms named: "lock-sharing, global validation, and two-log-interleaving mechanisms"
  - my reading: a deterministic and a non-deterministic protocol in one engine; the two-log interleaving is where recovery bugs would hide
- Swan, Guo, Xue, Shao, VLDB 2026: hybrid in-memory and on-disk MVCC for LSM-tree stores, from the [VLDB 2026 program](https://vldb.org/2026/program.html) session R46; I did not read it
- TxnSails and switching isolation levels at run time are in [transactions and regions](transactions_regions.md)
- the workload study that should reset assumptions
  - Nguyen, Chen, DeCarolis, Abadi, "Are Database System Researchers Making Correct Assumptions about Transaction Workloads?", [SIGMOD 2025](http://www.cs.umd.edu/~abadi/papers/database-workloads.pdf)
  - evidence: "We discovered 4,778 models and 33,395 transactions4 , including 2,024 interactive transactions (∼6% of the transactions)."
  - evidence: "The study also finds that 39% of the applications contain zero interactive transactions in their present state."
  - evidence: "the majority of the remaining 61% of applications can be converted to being completely noninteractive with minimal changes."
  - scope: 111 open-source web applications, most using an ORM; this says nothing about bank or exchange workloads
  - my reading: this is the single most useful 2025 paper for choosing a direction; it says the "we need read/write sets up front" objection to deterministic and static-analysis designs is weaker than people assume, for this class of application

3. deterministic databases

- the idea: agree on the order of transactions first, then every replica executes the same order with no further coordination
- the cost: you need to know what each transaction will touch, or you re-execute when you guessed wrong
- Detock, Nguyen, Miller, Abadi, [SIGMOD 2023](https://github.com/umd-dslam/Detock)
  - my summary from the abstract: removes SLOG's global ordering layer; a graph-based protocol resolves cross-region deadlocks deterministically without aborts; reported an order of magnitude higher throughput than geo-replication baselines at high conflict
  - the downloaded PDF in the scratch folder was corrupt, so I read the abstract and [this review](https://emptysqua.re/blog/review-detock/) only
- ForeSight, Huang et al., [arXiv 2025](https://arxiv.org/abs/2508.17375)
  - evidence, abstract: "We design an Association Sum-Product Network to predict potential transaction conflicts, providing the input for dependency analysis without pre-obtained read/write sets."
  - venue not stated; treat as unreviewed
- Lantern, Li et al., [arXiv Sept 2026](https://arxiv.org/abs/2609.03315)
  - evidence, abstract: "all zero-out-degree transaction vertices in the local dependency graph can be safely committed in ascending order using an overwrite-permissive strategy"
  - integrated into a blockchain execution layer; "up to a 4.2x throughput speedup over Aria"
  - my reading: deterministic execution has moved partly to blockchains, where the ordering layer is free because consensus already produced it
- RIOT, Webber, Theodorakis, Firth, Crooks, [SIGMOD 2026 industry](https://researchr.org/publication/WebberTFC26/authors)
  - search-result summary, unverified: every server is a leader; replicas keep a logically identical DAG of transactions instead of a serialized log, ordering only where conflicts require it
  - I could not get the PDF
- HDCC (section 2) and Styx (section 5) are also deterministic designs
- what I take from this lane
  - the open question is no longer "can deterministic be fast"; it is "what to do with the transactions whose footprint you cannot predict"
  - the three answers in print are dry-run (Chardonnay, Styx), predict (ForeSight), or fall back to a non-deterministic protocol (HDCC, Snapper)
  - the Abadi workload study suggests the unpredictable fraction is small for web apps, which would make the fallback path rare and therefore under-tested; I think that is where the bugs are

4. transactions over fast networks, disaggregated memory, and CXL

- the setting: compute nodes with little memory, memory nodes with little CPU, connected by RDMA or CXL
- the design pressure: every lock, read, and log write is a network operation, so protocols fight over round trips
- FORD, Zhang, Hua, Zuo, Liu, [FAST 2022](https://www.usenix.org/conference/fast22/presentation/zhang-ming)
  - my summary: one-sided RDMA only; batches read and lock into one request; updates all replicas in one round trip with parallel undo logs
- Motor, Zhang, Hua, Yang, [OSDI 2024](https://www.usenix.org/conference/osdi24/presentation/zhang-ming)
  - evidence, abstract: "Motor leverages a fully one-sided RDMA-based MVCC protocol to support fast distributed transactions with flexible isolation levels."
- HDTX, Lu et al., [ATC 2025](https://www.usenix.org/conference/atc25/presentation/lu)
  - evidence, abstract: "we propose a fast commit protocol (FCP) to minimize network round trips by coalescing different phases of distributed transaction processing."
  - evidence, section 5: "HDTX assumes a non-Byzantine failure model in which servers may fail-stop but never exhibit arbitrary faulty behaviors."
  - evidence, section 5: "The coordinator waiting for locks assumes that a failure occurs if the elapsed time of any lock exceeds a threshold."
  - my reading: failure detection by lock timeout is a liveness-for-safety trade; a slow but alive coordinator can have its lock "handed over"
- Lotus with disaggregated locks, Hu et al., [arXiv Dec 2025](https://arxiv.org/abs/2512.16136)
  - evidence, abstract: "The key innovation of Lotus is to disaggregate locks from data and execute all locks on CNs, thus eliminating the bottleneck at MN RNICs."
  - evidence: "Lotus employs a lock-rebuild-free recovery mechanism that treats locks as ephemeral and avoids their reconstruction"
- "Two-sided RDMA Striking Back for Disaggregated Memory Databases", Cha, Akella, Yu, [arXiv July 2026](https://arxiv.org/abs/2607.26227)
  - evidence, abstract: "Its limited APIs cannot express complex system functions such as starvation prevention, priority-based scheduling, and preemption, which are all critical functions in concurrency control protocols."
  - evidence: "up to 8.2× higher throughput and 42.9× lower p999 tail latency than state-of-the-art one-sided RDMA-based approaches in YCSB benchmark"
  - name clash: this system is also called Lotus; two different 2025 to 2026 Lotus papers exist in this lane
  - my reading: this is a direct attack on the premise of FORD, Motor, HDTX, and the lock-Lotus; if it holds up, four years of one-sided protocol work was optimizing the wrong primitive
- Tigon, Huang et al., [OSDI 2025](https://www.usenix.org/conference/osdi25/presentation/huang-yibo)
  - evidence, abstract: "the first distributed in-memory database that synchronizes cross-host concurrent data accesses using atomic operations on CXL memory"
  - evidence, abstract: limits are "CXL's higher latency and lower bandwidth relative to local DRAM, and its limited hardware support for cross-host cache coherence"
  - result in their setup: "up to 18.5× higher throughput compared with an RDMA-based distributed database"
- OSDI 2026 has follow-ons I only saw as titles on the [program](https://www.usenix.org/conference/osdi26/technical-sessions)
  - "FARLock: Asymmetric RDMA Locking Made Fair", Hu, Zhou, Wang, Vora
  - "MEGALON: Efficient Data Sharing for Partly Coherent CXL Memory", Hu et al. with Aguilera, Alagappan, Ganesan
  - "Efficient and Scalable Synchronization via Generalized Cache Coherence", Yu, Lee, Zhong, Khandelwal
- DINOMO, Lee et al., [VLDB 2022](https://www.vldb.org/pvldb/vol15/p4023-lee.pdf): a key-value store, not a transaction system, for disaggregated persistent memory; often the baseline for elasticity claims
- what I take from this lane
  - the lane is crowded and now self-contradicting (one-sided versus two-sided)
  - CXL changes the primitive from "send a message" to "do an atomic on shared memory", which is a different correctness problem: cross-host coherence is partial, so the protocol must say which writes are visible when
  - that visibility question is a specification problem before it is a performance problem, and nobody in these papers wrote the specification down in a checkable form

5. transactions across services, serverless functions, and several databases

- the setting: an application split into services, each with its own database, and a workflow that must update several of them
- the problem: the industry answer is sagas (do the steps, run compensations on failure), which give atomicity-ish but no isolation
- the survey to start from
  - Laigner, Christodoulou, Psarakis, Katsifodimos, Zhou, "Transactional Cloud Applications: Status Quo, Challenges, and Opportunities", [SIGMOD 2025 tutorial](https://arxiv.org/abs/2504.17106)
  - evidence, abstract: "Although the data management community has made progress in developing analytical and transactional database systems, transactional cloud applications have received little attention in database research."
- Epoxy, Kraft et al., [VLDB 2023](https://www.vldb.org/pvldb/vol16/p2742-kraft.pdf)
  - my summary: MVCC across different stores by putting version metadata into each record and filtering reads; the coordinator is a real database (Postgres) and secondary stores need only durable writes
  - evidence, limits: "One limitation of Epoxy is that it must be the exclusive mode of accessing a table in a participating store"
  - evidence: "it does not currently support other constraints" beyond primary keys
- Sonata, Tang, Wang, Li, Chen, [VLDB 2025](https://ipads.se.sjtu.edu.cn/zh/publications/vldb25-tang.pdf)
  - evidence, abstract: "Sonata builds on the theory of commitment ordering to ensure global serializability and uses two-phase commit for atomicity and durability."
  - evidence, assumptions: "Sonata assumes that the underlying databases support serializable local transactions, use SSI or S2PL for concurrency control, and implement 2PC participant procedures."
  - evidence, section on PostgreSQL: "Prior conclusions assume accurate conflict detection, which might not always hold for PostgreSQL."
  - my reading: Sonata's correctness rests on each database's own serializability and on XA prepare; the PostgreSQL caveat is an admitted soft spot
- Styx, Psarakis et al., [SIGMOD 2025, arXiv](https://arxiv.org/abs/2312.06893)
  - evidence: "Styx can execute arbitrary function orchestrations with end-to-end serializability guarantees, leveraging concepts from deterministic databases to avoid costly 2PCs."
  - evidence, assumptions: "We assume that the input queue operates as FIFO and requests 𝑟𝑖 are deterministic." and "Styx assumes that the external system supports idempotency [29]"
  - evidence on competitors: "Boki [31], Beldi [64], and T-Statefun [15] do support transactional end-to-end workflows but induce high commit latency and low throughput."
  - follow-up: "State Migration in Styx: Towards Serverless Transactional Functions", [VLDB Journal 2026](https://repository.tudelft.nl/record/uuid:0e8cf53a-df23-4c7b-8dfe-8d63a01be8f3), and Psarakis's [PhD thesis, Dec 2025](https://arxiv.org/abs/2512.17429)
- Stonebraker, Zhou, Kraft, Li, "Consistency and Correctness in Data-Oriented Workflow Systems", [CIDR 2026](https://www.vldb.org/cidrdb/papers/2026/p9-stonebraker.pdf)
  - evidence, abstract: "we argue that ACID must be extended from individual transactions to entire workflows, making them atomic, consistent, durable, and correct (AC/DC)."
  - evidence, abstract: "transactional workflows win under low contention, while sagas deliver higher throughput and avoid aborts under contention or long-running steps."
  - evidence: "physical backout workflows have a significant limitation: they hold database locks for the entire workflow duration."
  - evidence, assumptions: "We assume that each step is well tested and there are no program bugs."
  - my reading: this is a position paper with a DBOS prototype; "correct" in AC/DC is not formally defined there, which is the gap a specification paper could fill
- Snapper, Liu et al., [SIGMOD 2022](https://rmarcus.info/dbscholar/papers/h59b8fe59e33bf3d8): deterministic and non-deterministic transactions mixed over Orleans actors; the hybrid idea HDCC later did inside a database
- Beldi ([OSDI 2020](https://www.usenix.org/conference/osdi20/presentation/zhang-haoran)), Boki, Halfmoon, Apiary/DBOS: the earlier serverless-transaction line; all are baselines in Styx
- what I take from this lane
  - four systems (Epoxy, Sonata, Styx, DBOS) each claim serializability or exactly-once across services, each under its own stated assumptions, and none has an independent isolation check that I found
  - the checkers in section 6 all assume one database; this review did not find Elle-style checking on a cross-service workflow where the "history" is spread over Postgres plus MongoDB plus a queue
  - that is a measurement project before it is a systems project

6. checking and proving transaction systems

- three levels exist now: black-box history checkers, white-box checkers, and machine-checked proofs
- black-box checkers of recorded histories
  - Elle is in [transactions and regions](transactions_regions.md)
  - Plume, Liu et al., [OOPSLA 2024](https://dl.acm.org/doi/pdf/10.1145/3689742): complete checking of weak isolation levels via anomaly patterns
  - AWDIT, Møldrup, Pavlogiannis, [PLDI 2025](https://arxiv.org/abs/2504.06975)
    - evidence, abstract: "AWDIT tests whether H satisfies the most common weak isolation levels of Read Committed (RC), Read Atomic (RA), and Causal Consistency (CC) in time O(n^3/2), O(n^3/2), and O(n · k), respectively"
    - evidence: "there is a conditional lower bound of n^3/2 for any weak isolation level between RC and CC"
  - VeriStrong, Cai, Liu, Wei, Chen, Pan, [VLDB 2026](https://arxiv.org/abs/2511.14067)
    - evidence, abstract: "a novel formalism called hyper-polygraphs, which compactly captures both certain and uncertain transactional dependencies in database executions"
    - targets serializability and snapshot isolation, the NP-hard side, with SMT solving tuned to database workloads
  - my reading: weak-level checking is now provably near-optimal; strong-level checking is an SMT engineering race; a new checker needs a new input class, not a faster algorithm
- white-box and program-level checkers
  - Emme, Clark, Donaldson, Wickerson, Rigger, [EuroSys 2024](https://doi.org/10.1145/3627703.3650080)
    - evidence: "state-of-the-art checkers cannot handle predicate operations, which are both common in real-world workloads and essential for distinguishing between the repeatable read and serializable isolation levels."
    - it recovers version orders from the database itself (PostgreSQL, CockroachDB, TiDB)
  - Augur, Geng, Charlton, Blanas, Bond, Wang, [arXiv Sept 2026](https://arxiv.org/abs/2609.05288)
    - evidence: "the first dynamic predictive program analysis that (1) supports data store applications with complex relational queries and (2) reports only executions that violate View Serializability."
    - evaluated on OLTP-Bench programs and the Spree e-commerce app
  - APTrans, Xu et al., [arXiv Nov 2025](https://arxiv.org/abs/2511.17377): "APTrans successfully identified 13 previously unknown transaction-related bugs, 11 of which have been confirmed" in MySQL, MariaDB, OceanBase
  - Pisco, Weng et al., [VLDB 2026](https://www.vldb.org/pvldb/vol19/p1413-weng.pdf), [code](https://github.com/DBHammer/Pisco)
    - evidence, abstract: "we propose to simulate the DBMS's internal state to infer the order of conflicting operations for deterministic bug reproduction" and "we design a domain knowledgedriven, multi-agent collaboration framework for accurate bug deduplication."
    - my reading: LLM agents are already inside the isolation-bug pipeline, for triage not discovery
  - Fawkes, Wu, Liang, Fu, Deng, Jiang, [SOSP 2025](https://dblp.org/pid/337/0812): "Finding Data Durability Bugs in DBMSs via Recovered Data State Verification"; I only confirmed the title and venue
  - OmniLink, Hackett et al., [arXiv Jan 2026](https://arxiv.org/abs/2601.11836)
    - evidence: "OmniLink treats system events as black boxes with a timebox in which they occurred and a meaning in TLA+, solving for a logical total order of actions."
    - validated WiredTiger against its TLA+ model; connects to the MongoDB work in [transactions and regions](transactions_regions.md)
  - AWS, "High Fidelity Models for Large Scale Stateful Services", [OSDI 2026 operational track](https://www.usenix.org/conference/osdi26/presentation/jaber): reference models of the S3 API used as test oracles in CI; same method family as MongoDB's model-based storage tests
- real-world results that keep this lane honest
  - Jepsen on [Amazon RDS for PostgreSQL 17.4](https://jepsen.io/analyses/amazon-rds-for-postgresql-17.4), 2025: "Amazon RDS for PostgreSQL multi-AZ clusters violate Snapshot Isolation, the strongest consistency model supported across all endpoints." and "Healthy clusters occasionally allow Long Fork and other G-nonadjacent cycles."
  - Jepsen on [MariaDB Galera Cluster 12.1.2](https://jepsen.io/blog/2026-03-16-mariadb-galera-cluster-12.1.2), 2026: "allows P4 (Lost Update), and therefore fails to satisfy its claimed isolation level 'between Serializable and Repeatable Read'" and "committed transactions can be lost when nodes crash in quick succession."
  - my reading: mature products still ship isolation bugs; the checkers are not the bottleneck, getting them run against the right system under the right faults is
- machine-checked proofs
  - vMVCC, Chang, Jung, Sharma, Tassarotti, Kaashoek, Zeldovich, [OSDI 2023](https://www.usenix.org/conference/osdi23/presentation/chang)
    - evidence, abstract: "vMVCC is the first MVCC-based transaction library that comes with a machine-checked proof of correctness"
    - evidence: "Formally specifying and verifying vMVCC required adopting advanced proof techniques, such as logical atomicity and prophecy variables, owing to the fact that MVCC transactions can linearize at timestamp generation prior to transaction execution."
    - Go, single machine, Perennial/Iris
  - Tulip, Chang, Tassarotti, Kaashoek, Zeldovich, [2025 PDF](https://people.csail.mit.edu/nickolai/papers/chang-psm.pdf)
    - evidence, abstract: "a machinechecked proof of correctness showing that its implementation meets a simple specification identical to a local strictly serializable transaction system, abstracting away implementation details such as crash recovery, multi-versioning, replication, sharding, and coordinator recovery."
    - evidence: "the proof consists of ∼42,000 lines of Rocq code" for "3,956 lines of Go code"
    - evidence, limits: "Tulip's proof does not guarantee that, for example, all transactions will eventually either commit or abort." and "Like TAPIR, Tulip does not support reconfiguration."
    - my reading: this is the closest thing to a fully verified sharded, replicated transaction system; it is Go plus Rocq, about ten proof lines per code line, safety only, no reconfiguration
  - VerIso, Ghasemirad, Liu, Sprenger, Multazzu, Basin, [VLDB 2025, arXiv](https://arxiv.org/abs/2503.06284)
    - evidence, abstract: "We derive new counterexamples for the TAPIR protocol from failed attempts to prove its claimed strict serializability. In particular, we show that it violates a much weaker isolation level, namely, atomic visibility."
    - Isabelle/HOL, protocol level, not implementation level
    - my reading: Tulip is "TAPIR-style" and proved; VerIso says TAPIR as published is broken; the two together mean Tulip must differ from TAPIR in exactly the places VerIso's counterexample touches, and this review did not locate that comparison
  - Mathiasen, Gondelman, Ducruet, Timany, Birkedal, "Reasoning about Weak Isolation Levels in Separation Logic", [ICFP 2025](https://arxiv.org/abs/2501.14421): verifies an executable MVCC key-value store against a snapshot isolation specification in Rocq/Iris, and proves snapshot isolation implies read committed implies read uncommitted
  - Mathiasen, Timany, Birkedal, "Verifying Isolation Levels of Database Implementations for Free Using Separation Logic", [arXiv July 2026](https://arxiv.org/abs/2607.15877)
    - evidence, abstract: "any database implementation, whose operations are verified against a specific set of separation logic specifications, actually implements its isolation level"
    - my reading: isolation levels are now derivable from the shape of a separation logic spec; this is the theory a Verus port could lean on, if Verus's ghost-state style can express those specs
  - Grove and the storage-side proofs are in [verification boundaries](verification_boundaries.md); Anvil (Verus, OSDI 2024) is a controller, not a transaction system, and belongs in that file's lineage
  - production practice without proofs of code: DSQL (TLA+ and P plus deterministic simulation, section 1), [TigerBeetle's protocol-aware simulator](https://antithesis.com/bugbash/talks/protocol-aware-deterministic-simulation-testing/), and FoundationDB; a [Jepsen audit of TigerBeetle 0.16.11](https://jepsen.io/analyses/tigerbeetle-0.16.11) reported no strict-serializability violation
- what I take from this lane
  - checking is mature for one database; proofs exist for one Go system; this review did not establish equivalent Rust, reconfiguration, or liveness results
  - LLM agents appear only in Pisco (triage) and the Argus oracle paper ([arXiv 2025 to 2026](https://arxiv.org/abs/2510.06663), query oracles not transactions); LLM-driven isolation bug discovery is open as far as I found

LLM agents and transactions, briefly
- "Agentic Transaction: Towards ACID-Compliant Agent Systems", Sun, Wang, Li, [arXiv Aug 2026](https://arxiv.org/abs/2608.13900): reinterprets ACID as semantic atomicity, consistency, isolation, durability for agent workflows
- the human's paper collection already holds "Verified Detection and Prevention of Concurrency Anomalies in Multi-Agent Large Language Model Systems" (arXiv 2026) and S-Bus; [LLMs and storage](llm_and_storage.md) covers that branch
- my reading: this is the transactions-across-services problem of section 5 wearing new clothes; the same missing piece applies, there is no checker that takes an agent run and says which isolation level it got

crowded or quiet, my opinion
- crowded and near saturation: one-round-trip geo-commit; one-sided RDMA transactions; learned concurrency control; black-box checkers for weak isolation
- active but open: deterministic execution of transactions with unknown footprints; hotspot handling under 2PL; transactions during partition migration
- quiet with a clear first paper
  - a Rust, Verus-verified sharded and replicated transaction core
  - an independent isolation audit of cross-service transaction systems
  - a specification of what CXL-shared-memory transactions promise when coherence is partial
  - connecting a protocol proof (VerIso, Tulip) to a checker run on the implementation (VeriStrong, Emme)

research candidates

- candidate A: a verified transactional key-value core in Verus
  - question: can a sharded, replicated, strictly serializable transaction system be proved in Rust with far less proof than Tulip's 42,000 Rocq lines, and can it also cover reconfiguration?
  - why it fits the human: Verus, Rust, distributed systems; Tulip's authors say "we have not explored the applicability of PSM to liveness reasoning" and Tulip has no reconfiguration
  - closest prior work: Tulip (Go, Rocq), vMVCC (Go, single machine), IronKV and Anvil (Verus but not transactions), VerIso (protocol only), the Mathiasen 2026 "for free" theorem
  - first experiment, about four weeks
    - port vMVCC's single-machine MVCC to Rust and prove it in Verus; measure proof-to-code ratio against vMVCC's
    - if the ratio is comparable or better, add 2PC over two shards with the TAPIR/Tulip fast path
    - specify the exact deviation from TAPIR that VerIso's atomic-visibility counterexample requires
  - evaluation: proof lines per code line, verification time, throughput against Tulip's reported TAPIR-competitive numbers, and a checked test that VerIso's counterexample history is rejected
  - falsification
    - Verus cannot express the logical-atomicity and prophecy reasoning vMVCC needed; then the result is a negative paper about Verus's limits, still worth writing
    - proof effort is not lower than Rocq; then the contribution must be reconfiguration or liveness, which raises risk
  - what I do not know: whether anyone is already doing this; I searched and found nothing, which is not proof of absence
- candidate B: isolation audit of cross-service transaction systems
  - question: do Epoxy, Sonata, Styx, and DBOS workflows actually give the isolation they claim under faults and concurrency?
  - closest prior work: Jepsen on single databases; Elle, Plume, VeriStrong as checkers; the SIGMOD 2025 tutorial names the gap
  - first experiment, about three weeks
    - take the released artifacts of Sonata and Styx, which are the two with serializability claims and public code
    - record every read and write at the service boundary with a client-side history logger
    - feed the merged history to VeriStrong or Plume; add predicate support via Emme-style version recovery where the backing store allows it
    - first test with the promised assumptions satisfied
    - separately break conflict-detection and external-idempotence assumptions to assess deployment robustness
    - excluded failures do not refute the promised guarantee
  - evaluation: anomalies found per fault class, with minimized reproductions (Pisco's method applies)
  - falsification: no anomalies under any fault; then the result is a confirmation study plus a reusable cross-store history logger, publication value depends on coverage, findings, and comparison with prior work
  - this is a measurement project and does not need verification; it uses the human's measurement skills
- candidate C: do the one-round-trip geo-commit fast paths survive their own assumptions?
  - question: how much of Tiga's, Mako's, Minerva's, and Bonspiel's benefit remains when clocks drift, a region is slow, or a shard fails mid-commit?
  - closest prior work: each paper's own evaluation; the regions file's candidate 3 on clock uncertainty; Jepsen-style fault injection
  - first experiment
    - run Tiga and Mako (both have code) in three emulated regions with injected clock offset, asymmetric delay, and leader crash during the speculative window
    - measure the fraction of transactions on the fast path, abort cascades in Mako, slow-path fraction in Tiga, and whether a checker finds a strict serializability violation
  - evaluation: a chart of fast-path fraction against clock error and delay variance per system, plus any correctness finding
  - falsification: fast paths degrade exactly as each paper predicts and nothing breaks; its value depends on what the comparison adds to existing evaluations
  - no verification needed
- candidate D: a checkable specification for CXL-shared-memory transactions
  - question: what does a transaction protocol on partly coherent shared memory have to promise about visibility, and can Tigon's protocol be checked against it?
  - closest prior work: Tigon, MEGALON, the "Generalized Cache Coherence" OSDI 2026 paper, OmniLink for trace validation
  - first step: write the memory-visibility rules Tigon relies on as a TLA+ or Verus state machine and trace-validate Tigon's released code against it with OmniLink's method
  - risk: CXL hardware access; the Tigon authors used a Chameleon testbed, so emulation may be needed, and emulation can hide the real coherence behavior
  - falsification: the specification is trivial once written, or Tigon already has one I did not find
- candidate E: LLM agents that hunt isolation bugs
  - question: can an agent that knows anomaly patterns (Plume's catalogue, APTrans's patterns) generate concurrent test programs that find more bugs per hour than APTrans's fixed patterns?
  - closest prior work: APTrans (pattern-guided, 13 bugs), Pisco (agents for triage), Argus (agents for query oracles)
  - first experiment: give an agent the anomaly catalogue and a database with a known injected bug set; measure bugs found per dollar against APTrans
  - falsification: fixed patterns do as well; then the agent only helps with triage, which Pisco already does
  - fits the human's LLM-agent work; the human's LLM-and-storage file holds related leads

what I did not cover and what to do next
- read in full: Mako, HDTX, Tulip, Sonata, Styx, Epoxy, Stonebraker CIDR 2026, OceanBase 2PC, Rosé, DSQL, Emme, the Abadi workload study, Pisco, Dandelion
- read abstracts and limitation sections only: Tiga, Chardonnay, Chablis, Cornus, SunStorm, Minerva, WriteGuards, Brook-2PL, TXSQL, Focus!, NeurCC, HDCC, ForeSight, Lantern, RIOT, FORD, Motor, Lotus, Two-sided RDMA, Tigon, AWDIT, VeriStrong, Augur, APTrans, OmniLink, VerIso, vMVCC, Mathiasen 2025 and 2026, Agentic Transaction, both Jepsen reports
- about 55 sources in total
- not covered
  - EuroSys 2026 proceedings: the DBLP and ACM pages refused my fetches, so EuroSys 2026 may hold transaction papers I missed
  - FAST 2026: I scanned the program and saw no distributed transaction paper, but did not read any
  - VLDB 2026 beyond session R46; the program page is 600 KB and I read about a third
  - SIGMOD 2026 beyond the recap blog
  - Fawkes and RIOT: title and venue only
  - Swan, Orca, Focus!: index entries only
  - NSDI 2026 and ATC 2026: not scanned
- next search: follow citations of Tulip and VerIso for any 2026 verified transaction work, and check whether the Verus team has a transactions project
- possible error in sibling files: none found; [transactions and regions](transactions_regions.md) and this file agree on the papers they share
