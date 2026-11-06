# 🤖 Distributed systems: takeaways

(authored by agents unless marked 🧑)

All numbers are author claims on their own workloads, not reproduced. No novelty is established for any idea below.

## Crash consensus and recovery

- recovery state is part of the protocol
  - Paxos needs promises persisted across restart ([Paxos Made Simple §2.1](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf))
  - Raft membership change needs majorities of old and new configs ([Raft §6](https://raft.github.io/raft.pdf))
  - Paxos Made Live: snapshot and log must be mutually consistent; a replica with damaged disk rejoins as non-voting ([paper](https://static.googleusercontent.com/media/research.google.com/en//archive/paxos_made_live.pdf))
  - FLP: no bounded recovery claim without a timing assumption ([FLP](https://groups.csail.mit.edu/tds/papers/Lynch/jacm85.pdf))
- quorum and reconfiguration variants
  - Flexible Paxos: quorum intersection is needed only across phases, so small write quorums imply large recovery quorums ([arXiv](https://arxiv.org/abs/1608.06696))
  - Matchmaker Paxos: configuration registry is a separate failure case ([paper](https://mwhittaker.github.io/publications/matchmaker_paxos.pdf))
- published protocols still break in implementations
  - Raft single-server membership change in the dissertation was wrong until July 2015
  - etcd 3.5: consistent index not saved atomically with applied data, so a crash skipped committed writes
  - NATS JetStream (Jepsen 2025): acknowledged writes lost with 2-minute flush interval
  - LeaseGuard (SIGMOD 2026) claims most Raft systems implement lease reads incorrectly or not at all
  - "exactly once" needs client sessions plus state machine; Raft alone gives at-least-once
- cross-group communication: Picsou (OSDI 2025)
  - cross-cluster consistent broadcast covers one message, no ordering across messages ([paper](https://www.usenix.org/system/files/osdi25-frank.pdf))
  - open question: sender discards a message only after the receiver has durable evidence; received, durable, applied are different events

## Byzantine consensus

- common model: n = 3f+1, quorums of 2f+1 overlap in an honest node
  - counting machines is insufficient for weighted committees
- leader protocols
  - HotStuff: linear communication with a correct leader, partial synchrony ([arXiv](https://arxiv.org/abs/1803.05069))
  - Jolteon: shorter chain, costlier leader change; Ditto adds asynchronous fallback ([arXiv](https://arxiv.org/abs/2106.10362))
  - two correct protocols do not prove a correct combination; switching has prior art
- DAG protocols separate dissemination from ordering
  - Narwhal/Tusk: spread data first, order small references with randomness ([arXiv](https://arxiv.org/abs/2105.11827)); old-round deletion must be agreed or nodes order different histories
  - Bullshark: deterministic DAG ordering ([arXiv](https://arxiv.org/abs/2209.05633)); the arXiv version covers only partial synchrony
  - Shoal: leader reputation and pipelining ([arXiv](https://arxiv.org/abs/2306.03058)); Shoal++: 4.5 message delays average ([NSDI 2025](https://www.usenix.org/conference/nsdi25/presentation/arun))
  - Mysticeti: no per-block certificates ([arXiv](https://arxiv.org/abs/2310.14821)); its authors say evaluating BFT under Byzantine faults "is an open research question"
  - Lemonshark: early irreversible outcomes by constraining which proposer writes a key range
  - cutting message rounds alone is a crowded direction
- DispersedLedger (NSDI 2022): agreement before every node downloads every block ([PDF](https://www.usenix.org/system/files/nsdi22-paper-yang_lei.pdf))
  - already has stop-proposing-when-behind backlog control and invalid-transaction handling
  - open: what a replica may delete and still restart and change membership
- Twins (Bano et al.): generates attack schedules by running two nodes with one identity ([arXiv](https://arxiv.org/pdf/2004.10617))
  - §6.1 restart scenario and §8 voter-change testing overlap the obvious "restart plus voter change" proposal
- Angelfish: fewer data proposals via lightweight votes ([arXiv](https://arxiv.org/pdf/2509.15847))
  - evaluated with crashes only; TLC specification excludes Byzantine behavior
- Pipes: bandwidth ceiling for Bracha broadcast ([tutorial](https://decentralizedthoughts.github.io/2026-02-13-pipes/))
  - assumes all parties non-faulty, ignores computation cost
  - fewer rounds alone does not predict latency

## Blockchain validators

- Casper FFG: plausible liveness means a legal next vote exists, not that clients will cast it ([arXiv](https://arxiv.org/abs/1710.09437))
- composed protocols can fail while parts are fine
  - Ebb-and-Flow: bouncing attack from fork choice and justification feedback ([arXiv](https://arxiv.org/abs/2009.04987))
  - Three Attacks on PoS Ethereum: vote-processing congestion destabilizes consensus ([arXiv](https://arxiv.org/abs/2110.10086))
- vote retention under fluctuating participation: Goldfish expires votes ([arXiv](https://arxiv.org/abs/2209.03255)); RLMD-GHOST retains recent ones ([arXiv](https://arxiv.org/abs/2302.11326))
- incidents are ordinary software bugs
  - crash every client: Solana Feb 2024 and Jan 2026 (gossip buffer bounds panic), Reth Sep 2025, Nethermind Jan 2024
  - divergent results: Sui Jan 2026, Aptos Oct 2023 (deterministic map swapped for non-deterministic), Geth Nov 2020
  - slow client misses duties: Prysm May 2023, Dec 2025
  - Nethermind: code decoding a revert message for JSON-RPC changed the block hash
  - Ethereum spec treats any exception as invalid block, so a crash can look like rejection; SpecTrum (Aug 2026) found 27 cross-client divergences
  - Solana is switching from Tower BFT to Alpenglow; testnet 24 Sep 2026; no machine-checked proof found
- candidate: after crash, do consensus and execution agree on the committed prefix at a matched height

## Verification and testing of replicated code

- IronFleet proves Paxos RSM and sharded store ([MSR](https://www.microsoft.com/en-us/research/publication/ironfleet-proving-practical-distributed-systems-correct/)); Perennial proves crash-safe systems ([paper](https://pdos.csail.mit.edu/papers/perennial:sosp19.pdf))
- Grove: leases, reconfiguration, recovery together; cannot verify liveness; about 12x proof-to-code ([paper](https://pdos.csail.mit.edu/papers/grove:sosp23.pdf))
- CCF (NSDI 2025): TLA+ model checking plus trace validation in CI; 6 bugs ([paper](https://www.usenix.org/system/files/nsdi25-howard.pdf))
  - about 2 engineer-months for consensus trace spec
  - MongoDB's earlier attempt "failed" because its spec was abstract and written late
- Ellsberg: checks message traces against protocol; misses storage corruption, deadlock, performance ([paper](https://www.usenix.org/system/files/nsdi25-ding.pdf))
- IronSpec: 10 specification bugs across 6 verified systems ([paper](https://www.usenix.org/system/files/osdi24-goldweber.pdf))
- Fonseca 2017: 16 bugs in verified systems, none in the protocol; all in spec, shim, tooling
- Raft in Coq: 90 invariants, about 45000 proof lines
- bug finding in unverified Raft code
  - Antithesis (Jul 2026): bugs in every Raft implementation tried, including OpenRaft
  - Mallory: 22 zero-days; model-guided fuzzing: 13 bugs in etcd-raft and RedisRaft; SandTable: 23 bugs in 8 systems; Agora: 15 bugs
  - LLM specs: SysMoBench found only Claude Sonnet wrote a valid etcd Raft spec, under 8% conformance

## Convergent replication

- convergence without a total order needs an application rule
  - Dynamo: deleted items can resurface ([paper](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf))
  - CRDTs need all replicas to receive all updates; metadata removal needs care ([report](https://inria.hal.science/inria-00555588/document))
  - COPS: causal dependencies checked before exposing writes ([paper](https://www.cs.princeton.edu/~mfreed/docs/cops-sosp11.pdf))
  - invariant confluence is necessary and sufficient for coordination-free safety ([paper](https://www.vldb.org/pvldb/vol8/p185-bailis.pdf))
  - CALM: confluence says nothing about recency ([paper](https://arxiv.org/pdf/1901.01930))

## Finding bugs: empirical studies

- Yuan et al. OSDI 2014 ([paper](https://www.usenix.org/system/files/conference/osdi14/osdi14-paper-yuan.pdf))
  - 198 failures; almost all need 3 or fewer nodes
  - simple error-handling tests could prevent over 30% of catastrophic failures (authors' estimate)
- network partitions (OSDI 2018): 136 failures; most triggered by isolating one node; 21% persisted after healing ([paper](https://www.usenix.org/system/files/osdi18-alquraan.pdf))
- cloud outages (SoCC 2016): 597 outages; only 40% reveal root causes ([paper](https://ucare.cs.uchicago.edu/pdf/socc16-cos.pdf))
- upgrade failures (SOSP 2021): 123 failures; DUPTester found 20 new, DUPChecker over 800 incompatibilities ([paper](https://yonglezh-purdue.github.io/files/sosp21-upgrade.pdf))
  - UpFuzz (NSDI 2026): 15 new failures in Cassandra, HBase, HDFS ([paper](https://yonglezh-purdue.github.io/files/nsdi26-upfuzz.pdf))
- metastable failures: system stays broken after trigger is gone ([HotOS 2021](https://sigops.org/s/conferences/hotos/2021/papers/hotos21-s11-bronson.pdf))
  - CSnake stitches fault injections to find self-sustaining loops ([arXiv](https://arxiv.org/abs/2509.26529))
- partial and gray failures
  - gray failure: monitor sees healthy, apps see broken
  - Panorama (OSDI 2018): detected all 15 gray failures within 7 s, versus one within 300 s for existing detectors
  - OmegaGen generates watchdogs; detected 20 of 22 reproduced cases
- bug-class detectors: study 50-200 real bugs, turn the dominant trigger into a rule
  - CrashTuner crashes nodes when they touch meta-info variables; 21 new bugs ([paper](https://lujie.ac.cn/files/papers/CrashTuner.pdf))
  - DCatch: 32 reported, 20 harmful
  - each tool covers one class

## Finding bugs: tools

- deterministic simulation: FoundationDB runs the whole cluster in one thread ([docs](https://apple.github.io/foundationdb/testing.html#simulation))
  - a seed reproduces only with same code, config, and controlled randomness
  - MadSim ([README](https://github.com/madsim-rs/madsim#deterministic-simulation-testing)): all I/O must be mocked; dependency patching is real work
  - Turmoil ([README](https://github.com/tokio-rs/turmoil)): current main simulates network, filesystem, io_uring, torn writes
  - S2 found 17 issues with Turmoil plus MadSim-derived overrides ([blog](https://s2.dev/blog/dst))
- fuzzing: feedback signal matters because branch coverage saturates
  - Mallory: Lamport timeline summaries plus Q-learning; user annotates 103-157 events per system ([arXiv](https://arxiv.org/abs/2305.02601))
  - DistFuzz: blackbox, 52 bugs in 10 systems, 4 CVEs ([NDSS 2025](https://www.ndss-symposium.org/wp-content/uploads/2025-1912-paper.pdf))
  - ModelFuzz: TLA+ coverage as feedback; 12 or 13 bugs depending on paper version; model abstraction level strongly affects results ([arXiv](https://arxiv.org/abs/2410.02307))
- history checking: a test needs a bad execution and an oracle
  - linearizability respects real-time order; serializability does not ([Jepsen](https://jepsen.io/consistency/models/linearizable))
  - Jepsen: "we cannot prove correctness, only find errors"
  - timed-out operations are unknown, not failed; Knossos reports "unknown" separately
  - Porcupine partitions by key, unsafe for multi-key operations
  - Elle infers dependency graphs, except for predicates ([arXiv](https://arxiv.org/abs/2003.10554))
- model checking: MongoDB found trace checking impractical for an abstract spec but test generation worked ([paper](https://arxiv.org/abs/2006.00915)); Rust tools Loom, Shuttle, Miri, Kani each cover only configured or sampled executions
- LLM agents
  - Specula: 249 reproduced bugs in 48 systems, 68 confirmed, 24 fixed; six false reports reached "reproduction" by injecting illegal states ([arXiv](https://arxiv.org/abs/2607.25333))
  - trace validation alone permits overly permissive models; SysMoBench scores models in four stages ([arXiv](https://arxiv.org/abs/2509.23130))
- candidate: find a real crash state that a simulator's storage model excludes
  - Turmoil already models torn writes; ALICE, CrashMonkey, PACE already study persistence models
  - needs a client-visible violated promise before building an adapter

## Storage and databases

- strong multi-region data has converged on two full copies plus a witness; a write waits for two of three
  - Spanner, DynamoDB multi-region strong consistency, Aurora DSQL
  - outages came from shared dependencies (DNS record, global policy table, config file, deletion tool), not replicas
  - residency leaks per key: CockroachDB and Spanner index keys leave the pinned region
- transactions: most papers pay for two of ordering, atomic commit, replication, storage with one round trip
  - Mako: speculative 2PC before replication ([paper](https://www.usenix.org/system/files/osdi25-shen-weihai.pdf))
  - Spanner: bounded clock uncertainty; Calvin: replicate inputs, not effects; TAPIR: strong consistency only in the transaction protocol
  - HAT: snapshot isolation and repeatable read are not highly available
  - assumptions to check: synchronized clocks, known read/write sets, fail-stop
  - quiet area: proven sharded replicated transactions in Rust
- consistency checkers
  - three 2025-2026 papers found wrong proofs or specs inside existing checkers
  - most Jepsen anomalies appear in healthy clusters with default settings
  - no machine-checked soundness proof for an executable isolation checker found
- verified storage
  - vMVCC: first machine-checked MVCC library ([OSDI 2023](https://www.usenix.org/conference/osdi23/presentation/chang)); no durability
  - DaisyNFS: about 2x proof lines per code line; GoJournal assumes atomic 4KB block writes
  - VeruSAGE: agents finish 78% of leaf proof tasks in storage code
  - no system combines durability, serializability, replication, and Rust
- key-value stores
  - SlateDB's issue asking for a formal proof of its manifest design open since June 2024
  - object store conditional writes make a simple proof target
  - no published crash or durability bug study of Rust engines found
- object-backed tables
  - S3: strong read-after-write per key; "no way to make atomic updates across keys" ([docs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html#ConsistencyModel))
  - replication time control covers objects (99.9% in 15 minutes), not whole table snapshots
  - Delta log and Iceberg metadata pointer define table versions; Iceberg ties file deletion to snapshot expiry
  - Delta shallow clone is not a recovery copy
- recovery vs foreground work: repair can slow requests enough to trigger retries
- LLM and storage
  - Neon: agents made 20x branches and 50x rollbacks versus humans
  - BranchBench: deeper branches slow reads 5-4000x in fast-branch systems ([arXiv](https://arxiv.org/abs/2604.17180))
  - LLM-written file system and database ship with no crash-consistency guarantee
  - DBA-Bench: best automated baseline 17.9% Safe Pass, human 93.4%

## Agents and LLM systems

- multi-agent failures: MAST 1,642 traces, 41%-86.7% failure across frameworks; mostly LLM-annotated ([arXiv](https://arxiv.org/abs/2503.13657))
  - whether more agents help depends on task dependency structure ([arXiv](https://arxiv.org/abs/2512.08296))
  - shared files need conflict rules; two Claude Code instances both created migration 267
- agents operating systems
  - agents score well only with a cheap trustworthy check
  - scores fall as benchmarks get realistic: ITBench 11.4% SRE; SREGym 15-28% on new failure kinds; ORCA-bench 25.3% best
  - 8 of 18 ITBench mitigations pass by restarting pods (STRATUS authors)
  - STRATUS: undo plus retry gives 69.2% versus 15.4% without retry; undo covers Kubernetes objects, not databases ([arXiv](https://arxiv.org/abs/2506.02009))
  - no benchmark found for agents writing fault-tolerant distributed code
- network configuration repair: repairs add regressions
  - Cornetto: 231 problems; models regress and degrade at scale ([arXiv](https://arxiv.org/html/2604.22513v1))
  - feedback lowered regression rate but also repair rate for GPT-5 mini
  - report repaired faults together with newly broken properties
- LLM serving
  - over 60 papers on speed; few on whether the right tokens reach the right user
  - worker-failure recovery with saved KV cache is no longer open
  - authors disagree on splitting prefill and decode; no shared-workload comparison
  - audits: shared prompt caches at 7 providers, changed models at 11 of 31 endpoints
  - TraceLab already replays tool waits and prefix lengths

## Programming models, cloud, hardware, networking

- programming models: strongest guarantees come from the narrowest tools
  - choreographies: no deadlock, assume non-crashing nodes
  - durable execution: needs determinism and idempotent side effects
  - Hydro: deterministic outputs tracked in types
  - all leave crashes, retries, external services, upgrades open
- Rust async
  - Tokio is cooperatively scheduled with no fairness guarantee ([docs](https://docs.rs/tokio/latest/tokio/runtime/index.html#detailed-runtime-behavior))
  - cancellation: local stop, remote completion, and undo are separate; a timed-out caller may not know if its update happened
- serverless: startup, workflow placement, and scheduler delay are separate costs; retried functions need idempotence when a payment succeeds but the ack is lost
- hardware
  - CXL spec "does not consider processor failures" (DIKTAMO authors)
  - GPU silent corruption: vendor tests miss over 60% of defective devices (ByteDance, OSDI 2026)
  - confidential VM disks can be rolled back to an old copy at restart
- networking
  - FRCC: first congestion control provably bounding unfairness under jitter; BBR, Copa, Reno starve flows ([NSDI 2026](https://www.usenix.org/conference/nsdi26/presentation/agarwal-anup))
  - eBPF verifier keeps failing: 13 bugs (SpecCheck), 15+ in DPDK's copy
- peer-to-peer: protocols let anyone run a part, a few operators run most
  - IPFS: almost 80% of DHT servers in cloud
  - Bluesky: one AppView, operated by Bluesky PBC
  - Ethereum: 46% of blocks by censoring actors
  - The Eternal Tussle: IPFS uses indexers and gateways; no failed retrieval without special routing peers ([NSDI 2024](https://www.usenix.org/conference/nsdi24/presentation/wei))

## Garbage

- BumbleBee
- PoliceCar
- Sailfish
- MAS-BENCH
- Silo-Bench
- MAS-FIRE
- FCatch
- Dinv
- Legolas
- CAFault
- FATE and DESTINI
- Synoptic and CSight
- Dijkstra self-stabilization
- Chaos Engineering (IEEE Software)
- Principles of Chaos Engineering
- Kubernetes version-skew policy
- Spex
- ConfValley
- Apache Iceberg branching and tagging
- Databricks table cloning
- vector search
- consensus handoff state
- ChatGPT consultation status
- ChatGPT consultation assessment
- coverage and review record
- remaining work pages
- research shortlist pages
- all index pages
