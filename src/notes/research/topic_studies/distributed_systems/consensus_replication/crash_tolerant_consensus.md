# crash-tolerant consensus and replicated state machines
(authored by agents unless marked 🧑)

scope and how to read
- slice: protocols that survive machines that crash or slow down (not machines that lie), and the replicated state machines built on them
  - replicated state machine (RSM): several machines run the same deterministic program on the same ordered list of commands, so they stay identical
  - consensus: the machines agree on that order, even when some crash
  - quorum: a big enough group of machines (usually a majority) whose answers settle a step
- overlap with existing notes in this folder
  - [crash_replication.md](crash_replication.md) already quotes FLP, Paxos Made Simple, Raft §6/§7, Paxos Made Live, Flexible Paxos, Matchmaker, Compartmentalized Paxos, EPaxos abstract, Tempo, Quoracle, Pineapple, Picsou, XLL; not repeated here
  - [verifying_and_testing_consensus_code.md](verifying_and_testing_consensus_code.md) and [../finding_bugs/](../finding_bugs/index.md) cover verification and bug-finding tools; here only the bugs themselves
  - sibling project verus_distributed covers general verification and liveness proofs
- marks
  - "I think" = my opinion; "inference" = my reasoning from a quote; "claim" = what the authors say, not checked by me
  - items marked (my background knowledge) were not re-checked today
  - Rust = written in Rust (checked from repo or docs unless marked)
- reading depth: I read abstracts plus targeted sections of about 25 sources, and full text of none; the ledger at the end says which

## takeaways

- selected mature consensus protocols have had bugs found years after publication
  - EPaxos: Ryabinin, Gotsman, Sutra (2025) say it "is complex, ambiguously specified, and suffers from nontrivial bugs"
  - Raft: the single-server membership change in the dissertation was wrong until July 2015
  - inference: a paper proof does not establish that copied pseudocode or deployed code is correct
    - implementation proofs, checking executions against models, and fault testing cover different parts of that gap
- selected incidents expose crash-recovery and storage obligations around the protocol
  - etcd 3.5: the "consistent index" was not saved atomically with the applied data, so a crash made a replica skip committed writes
  - NATS JetStream (Jepsen 2025): acknowledged writes lost because data was flushed to disk every two minutes
  - Nomad (HashiCorp raft): a nil pointer panic in the Raft state parser corrupted the log on all three servers (DNSimple outage, Feb 2026)
  - inference: "persist before you answer" and "apply and record the applied index together" are the real invariants to prove
- reads are another implementation boundary worth checking
  - LeaseGuard (SIGMOD 2026) claims "most Raft systems implement them incorrectly or not at all", and lists open lease bugs in HashiCorp raft and etcd raft
  - a Rust Raft library with proved lease reads would be a real gap (I found none)
- "exactly once" is a client plus state-machine job, not a consensus job
  - Raft thesis: Raft gives at-least-once until the state machine keeps per-client sessions
  - Jepsen found jetcd, etcd's Java client, retrying non-idempotent transactions that may have succeeded; the bug was in the client, not in etcd
- selected 2025–2026 papers pursue lower latency and different deployment costs
  - 1 round trip commit: Tiga (SOSP 2025), Jetpack (OSDI 2026) bolt a fast path onto existing protocols
  - shared logs on cloud storage: LogDrive/Conflux (OSDI 2026, production at Confluent), Belfast speculative log (OSDI 2025), Aurora DSQL Journal (arXiv 2026)
  - hardware: scarHW (arXiv Aug 2026) puts a consensus algorithm on an FPGA smartNIC
- the Rust consensus ecosystem is small and uneven
  - Rust: openraft, raft-rs (TiKV), OmniPaxos, Neon safekeepers, Apache Iggy VSR, paxakos
  - Go: etcd raft, HashiCorp raft; Java: KRaft, ZooKeeper; C++: Redpanda, LogCabin (my background knowledge for Redpanda)
  - this search did not establish an implementation proof for those libraries
  - openraft reports a deterministic simulator and Jepsen in its CI (its README)
- my best bet for a project (details in the ideas section)
  - a Verus-verified core for the part that fails in practice: config change plus lease or read-index reads plus the apply-index/persist contract, tested against a Rust library

## the landscape

### classic protocols and what each one is for

- Paxos and Multi-Paxos
  - Paxos picks one value; Multi-Paxos runs it per log slot behind a stable leader
  - "MultiPaxos Made Complete" (Liang, Jabrayilov, Charapko, Aghayev, arXiv 2405.11183, 2024)
    - quote (abstract): "MultiPaxos, while a fundamental Replicated State Machine algorithm, suffers from a dearth of comprehensive guidelines for achieving a complete and correct implementation. This deficiency has hindered MultiPaxos' practical utility and adoption and has resulted in flawed claims about its capabilities."
    - quote (abstract): "Our specification includes a lightweight log compaction approach that avoids taking repeated snapshots"
  - "Paxos vs Raft" (Howard, Mortier, 2020, arXiv 2004.05074), abstract-level conclusion in §1
    - quote: "We conclude that there is no significant difference in understandability between the algorithms, and that Raft's leader election is surprisingly efficient given its simplicity."
    - quote: "Raft decides log entries in-order whereas Paxos typically allows out-of-order decisions but requires an extra protocol for filling the log gaps"
- Viewstamped Replication (VR)
  - older than Paxos in practice; same idea (leader called primary, "view" = Raft's term), clean view-change protocol
  - could not fetch the VR Revisited PDF (host unreachable); described from background knowledge
  - Rust: Apache Iggy ships VR; docs (server 0.9.0) say "Apache Iggy replicates clusters with Viewstamped Replication Revisited (VSR)" and "Iggy hasn't reached a 1.0 production release yet"
    - listed: "client sessions, request fencing, and duplicate detection" and "deterministic simulation"
    - source: https://iggy.apache.org/docs/clustering/vsr.md
  - TigerBeetle (Zig, not Rust) also uses VR with a deterministic simulator (search result, not read)
- Zab and ZooKeeper
  - Zab (Junqueira, Reed, Serafini, DSN 2011), abstract: "Zab is a crash-recovery atomic broadcast algorithm we designed for the ZooKeeper coordination service."
  - why not Paxos: "Traditional protocols to implement replicated state machines, like Paxos [2], do not enable such a feature directly, however." (§1, about many outstanding operations committed in client FIFO order)
  - its own property: "we propose a property called primary order that is important for primary-backup systems"
  - inference: Zab orders state changes (results), while Raft and Paxos order commands; that is why ZooKeeper's primary can run non-deterministic code
- Chain replication (van Renesse, Schneider, OSDI 2004)
  - machines form a line; writes go head to tail; "The reply for every request is generated and sent by the tail." (§2); reads go to the tail
  - abstract: "Chain replication is a new approach to coordinating clusters of fail-stop storage servers."
  - needs a separate configuration master (itself usually Paxos), so it moves, not removes, consensus
  - CRAQ (Terrace, Freedman, USENIX ATC 2009) lets any node serve reads; abstract: "maintains strong consistency while great..." (truncated in my extract; claim from the paper's abstract: higher read throughput)
  - Delos, Neon and Aurora-style designs reuse this "data path vs. rarely used consensus" split (inference)
- Flexible Paxos, Matchmaker, Compartmentalized: in crash_replication.md

### leaderless and multi-leader

- Mencius (Mao, Junqueira, Marzullo, OSDI 2008)
  - leaders take turns on slots; a leader with nothing to say sends SKIP
  - quote (abstract): "our protocol Mencius has high throughput under high client load and low latency under low client load even under changing wide-area network environment and client load"
- EPaxos and its repairs
  - Sutra 2019 (arXiv 1906.10917; Information Processing Letters 2020): "This paper identifies a problem in both the TLA+ specification and the implementation of the Egalitarian Paxos protocol. It is related to how replicas switch from one ballot to another when computing the dependencies of a command. The problem may lead replicas to diverge and break the linearizability of the replicated service."
  - EPaxos* (Ryabinin, Gotsman, Sutra, arXiv 2511.02743, Nov 2025), §1
    - quote: "this is because the protocol is complex, ambiguously specified, and suffers from nontrivial bugs"
    - quote: "We have also found a new bug where the recovery can get deadlocked even during executions with finitely many submitted commands"
    - quote (§6/§E-style discussion): "In the thrifty version of EPaxos, two recovery attempts for the same command with different dependencies can block each other indefinitely."
    - claim: new protocol covers all thresholds "n ≥ max{2e+f−1, 2f+1} -- the number of processes that we show to be optimal"
  - Atlas (Enes, Baquero, Rezende, Gotsman, Perrin, Sutra, EuroSys 2020, arXiv 2003.11789)
    - quote: "Atlas minimizes the size of its quorums using an observation that concurrent data center failures are rare."
    - quote: "Atlas is up to two times faster than Flexible Paxos with identical failure assumptions"  (abstract text continues "Atlas is up to two times faster than Flexible Paxos with identi..."; claim)
  - Tempo (in crash_replication.md); SwiftPaxos (NSDI 2024, Ryabinin, Gotsman, Sutra) and Nezha (VLDB 2023, Geng et al.) seen only through search summaries; not read
  - Rust: none that I verified; Go implementations (epaxos code) are the references
- randomized and clock-based
  - Rabia (SOSP 2021, arXiv 2109.12616): randomized, datacenter only; a crate named rabia-engine exists on docs.rs (not checked; may be unrelated)
  - Nezha and Tiga use synchronized clocks to order messages (below)
- Nemo-Nemo (Kerur, Tennage, Jovanovic, Malkhi, Sonnino, Zablotchi, arXiv 2604.08914, Apr 2026)
  - a crash-fault version of DAG consensus (a DAG = each message points to earlier ones; common in blockchains)
  - quote: "the first DAG-based CFT consensus protocol proven to exceed state-of-the-art wide-area network performance in both speed and resilience"
  - inference: this is blockchain-style ideas flowing into crash-only protocols, a trend worth watching

### Raft, its variants and its edge features

- Raft dissertation (Ongaro, Stanford 2014); sections I checked
  - PreVote (§4.2.3): "A candidate would first ask other servers whether its log was up-to-date enough to get their vote."
    - and its limit: "Unfortunately, the Pre-Vote phase does not solve the problem of disruptive servers: there are situations where the disruptive server's log is sufficiently up-to-date, but starting an election would still be disruptive."
    - inference: etcd and TiKV ship PreVote plus CheckQuorum anyway; it helps, but the thesis says it is not a full cure
  - read-only queries (§6.4): "The leader needs to make sure it hasn't been superseded by a newer leader of which it is unaware. It issues a new round of heartbeats and waits for their acknowledgments from a majority of the cluster."  (this is ReadIndex)
  - lease reads (§6.4.1, Fig 6.3): "While the leader held its lease, it would service read-only queries without communication."
  - client sessions (§6.3): "As described so far, Raft provides at-least-once semantics for clients; the replicated state machine may apply a command multiple times."
    - fix: "each client is given a unique identifier, and clients assign unique serial numbers to every command. Each server's state machine maintains a session for each client."
    - open pain: "Unfortunately, sessions cannot be kept forever, as space is limited. The servers must eventually decide to expire a client's session"
- production Raft feature list, etcd/raft README (Go; "the most widely used Raft library in production")
  - quote: "Most Raft implementations have a monolithic design, including storage handling, messaging serialization, and network transport. This library instead follows a minimalistic design philosophy by only implementing the core raft algorithm."
  - features: leader transfer, ReadIndex reads on leader and followers, lease-based reads ("this approach relies on the clock of the all the machines in raft group"), pipelining, flow control, "Automatic stepping down when the leader loses quorum"
  - source: https://github.com/etcd-io/raft README
- LeaseGuard (Davis, Demirbas, Deng, arXiv 2512.15659, SIGMOD 2026)
  - what: a lease scheme designed for Raft elections, specified in TLA+, built into LogCabin (C++)
  - quote (abstract): "By replacing LogCabin's default consistency mechanism (quorum checks), LeaseGuard reduces the overhead of consistent reads from one to zero network roundtrips."
  - quote (abstract): "Whereas traditional leases ban all reads on a new leader while it waits for a lease, in our LeaseGuard test the new leader instantly allows 99% of reads to succeed."
  - quote (§1): "HashiCorp's Raft implementation, for example, does not follow the Raft paper. It can violate consistency due to message delays, or because a new leader does not know of a prior leader's lease [31, 52]. These bugs were reported in 2016. The etcd Raft implementation also allows stale reads due to miscalculations of lease timeouts [5]. This bug was reported in 2024. All these bugs were still open at the time of writing."
  - quote (related work): "The TiDB Placement Driver includes a Raft implementation with a 10-second leader lease, resulting in a 10-second outage after any leader failure [34]."
  - catch: the "zero roundtrip" and "inherited lease reads" depend on bounded-uncertainty clocks (claim from the paper)
- The LAW theorem (Katsarakis et al., VLDB 2025, cited by LeaseGuard; not read): local reads plus linearizability under asynchrony; title "The LAW Theorem: Local Reads and Linearizable Asynchronous Replication"
- election tuning: Dynatune (Shiozaki, Nakamura, arXiv 2507.15154, Jul 2025)
  - claim (abstract): "reduces leader failure detection time by 78% and OTS time by 45% for Raft, and by 79% and 75% for Multi-Paxos"; OTS = out-of-service time
- Fast Raft (Melnychuk, SebaRaj, arXiv 2506.17793, Jun 2025): first open implementation of a Raft variant with a fast path; claims better throughput "under low packet loss conditions"; small, student-scale evidence (inference)
- partial network failures
  - Alfatafta et al. OSDI 2020 (Nifty); search summary: partial partitions are "catastrophic (e.g., lead to data loss), easily manifest, and can manifest by partially partitioning a single node" (summary, not verified)
  - Omni-Paxos (Ng, Haridi, Carbone, EuroSys 2023, pp. 314-330); README claim: "the leader election of OmniPaxos offers better resilience to partial connectivity and more flexible and efficient reconfiguration compared to Raft"
    - Rust; "An OmniPaxos node is implemented as a plain Rust `struct`. This allows it to be used with any desired storage, network, and runtime implementations." (https://github.com/haraldng/omnipaxos) ; README says "in-development", crate v0.2.3
    - paper PDF not fetched; theory side in Haridi, Kroll, Carbone arXiv 2008.13456 ("Leader-based Sequence Paxos")
  - Naser-Pastoriza, Chockler, Gotsman, Ryabinin, arXiv 2505.02646 (2025): consensus under channel failures
    - quote: "Generalized quorum systems relax the connectivity constraints of classical quorum systems: instead of requiring bidirectional reachability for every pair of write and read quorums, they only require some write quorum to be unidirectionally reachable from some read quorum."
- Kafka KRaft (KIP-595, Gustafson, Chen, Wang; accepted)
  - quote (Motivation): "The replication protocol that we spent years improving and validating is actually not too different from Raft if you take a step back."
  - quote (rejected alternatives): "Use an existing Raft library: Log replication is at the core of Kafka and the project should own it."
  - testing: it describes a "simulation" with "randomly generated" fault scenarios checked against invariants (§Test plan); inference: same deterministic-simulation habit as TigerBeetle and Iggy
  - Java
  - source: https://cwiki.apache.org/confluence/display/KAFKA/KIP-595%3A+A+Raft+Protocol+for+the+Metadata+Quorum

### production libraries and systems (and which are Rust)

- openraft (Rust; Databend's metadata service; https://github.com/databendlabs/openraft)
  - README: "OpenRaft API is not stable yet"; "Chaos testing: a deterministic simulation fuzzer runs in every CI build; a Jepsen suite runs 8 nemesis scenarios on every push to `main`"
  - ancestry: forked from async-raft; its file derived-from-async-raft.md lists fixes; examples from it (commit titles):
    - "when append-entries, deleting entries after prev-log-id causes committed entry to be lost"
    - "leader should not commit when there is no replication to voters."
    - "handle-vote should compare last_log_id in dictionary order, not in vector order"
    - "client_read has using wrong quorum=majority-1"
    - "when finalize_snapshot_installation, memstore should not load membership from its old log that are going to be overridden by snapshot."
  - inference: these are exactly the bug classes in this note (config in snapshot, log truncation, read quorum); a Rust library written fast from the paper hit all of them
- raft-rs (Rust; TiKV; https://github.com/tikv/raft-rs)
  - README: "This Raft implementation in Rust includes the core Consensus Module only, not the other parts."; log, state machine and transport are yours; README says it is a port of etcd raft
  - a bug-tracking pass over its issues was not done
- OmniPaxos (Rust): above; paxakos (Rust crate, versions up to 0.8 on docs.rs; not examined)
- Neon safekeepers (Rust; Postgres write-ahead log service)
  - Paxos-style, with a TLA+ spec; the blog says: "Each Postgres database is a proposer, each Safekeeper is an acceptor and the Pageservers are learners." (summarised on https://jack-vanlightly.com/blog/2025/2/19/log-replication-disaggregation-survey-neon-and-multipaxos)
  - Neon's blog: "Unlike in Raft setup, where each node can be both a leader and follower, our safekeepers and compute nodes cannot turn into each other (and we don't want them to)."
  - Neon's blog on why: "Each compute node is externally managed by a control plane (k8s in our case)... Also, a possible bug in the control plane code can spin up hundreds of such compute nodes."
  - protocol doc (docs/safekeeper-protocol.md): "The goal of handshake is to collect quorum (to be able to perform recovery) and avoid split-brains caused by simultaneous presence of old and new master."
  - I think: this is the best example of "proposer is not a replica", and its membership-change story is the open piece (I did not find a public doc, see not-found list)
- HashiCorp raft (Go; Consul, Nomad, Vault)
  - README: "raft is a Go library that manages a replicated log and can be used with an FSM to manage replicated state machines."
  - incident: DNSimple, 10 Feb 2026, 3.5 hours: "The primary cause was the Nomad Raft bug: a nil pointer dereference in the Raft state parser corrupted the Raft log. The corruption replicated to all three servers, caused a crash loop, and prevented leader election." fixed in Nomad 1.11.0
    - source: https://blog.dnsimple.com/2026/02/incident-report-nomad-service-outage/
    - inference: a replicated log copies a bad entry to everyone; "crash-tolerant" does not cover deterministic bugs in the apply path
- etcd (Go): above; the v3.5 postmortem is in the unsolved section
- Redpanda (C++, my background knowledge; Raft per partition)
  - Jepsen 21.10.1 (Kingsbury, 2022): "We found three liveness and seven safety issues, ranging from crashes and aborted reads to inconsistent offsets, circular information flow, and lost/stale messages."
  - source: https://jepsen.io/analyses/redpanda-21.10.1
- Redis-Raft (C): Jepsen 2020 "found twenty-one issues in development builds of Redis-Raft, including partial unavailability in healthy clusters, crashes, infinite loops on any request, stale reads, aborted reads, split-brain leading to lost updates, and total data loss on any failover."
  - source: https://jepsen.io/analyses/redis-raft-1b3fbf6

### how an RSM is built around the log

- log + snapshot + compaction
  - the log is the order; the snapshot replaces a prefix; a replica too far behind is sent a snapshot
  - Paxos Made Live (quoted in crash_replication.md) and Raft §7 cover it; MultiPaxos Made Complete proposes compaction "that avoids taking repeated snapshots"
  - openraft's fix list shows snapshot plus membership interaction is easy to get wrong (above)
- deterministic execution
  - the state machine must not read clocks, random numbers or hash-map order; if it does, replicas diverge
  - Zab sidesteps it by replicating results from a primary (above)
  - the etcd postmortem states the requirement: "Correctness of the system depends on assumption that every member of the cluster, while replying WAL entries, will reach the same state."
- client sessions and exactly once
  - Raft thesis quotes above; Iggy lists "client sessions, request fencing, and duplicate detection"
  - Jepsen on jetcd 0.8.2: "jetcd incorrectly retries non-idempotent requests which may have actually succeeded, leading to a variety of serious invariant violations."
    - source: https://jepsen.io/analyses/jetcd-0.8.2; test fault was only process kills (kill -9)
- linearizable reads
  - options: put reads in the log; ReadIndex (heartbeat round per batch); leases (clock based); follower reads via a leader-supplied index; quorum leases (Moraru et al., SoCC 2014, not read)
  - LeaseGuard and the LAW theorem are the 2025 state of the art
- reconfiguration (changing who the members are)
  - Raft: joint consensus (safe from start) vs single-server changes (simpler, bug in 2015)
  - Delos treats reconfiguration as a layer apart from ordering: "VirtualLog, a generic and reusable reconfiguration layer; and pluggable ordering protocols called Loglets. Loglets are simple, since they do not need to support reconfiguration or leader election" (Balakrishnan et al., OSDI 2020, abstract)
  - Matchmaker Paxos, Omni-Paxos and MongoDB's logless protocol (Schultz et al., OPODIS 2021, in the paper collection) are the alternatives; Matchmaker quoted in crash_replication.md

### geo-replication and WAN

- the problem: a majority round trip across oceans costs 100+ ms; the goal is 1 wide-area round trip
- Spanner (OSDI 2012): "each spanserver implements a single Paxos state machine on top of each tablet"; "Our Paxos implementation supports long-lived leaders with time-based leader leases, whose length defaults to 10 seconds." (§2.1); also "An early Spanner incarnation supported multiple Paxos state machines per tablet... The complexity of that design led us to abandon it."
- Tiga (Geng, Mu, Sivaraman, Prabhakar, SOSP 2025, arXiv 2509.05759)
  - quote: "Tiga consolidates concurrency control and consensus, completing both strictly serializable execution and consistent replication in a single round."
  - quote: "In rare cases, transactions are delayed and proactive ordering fails, in which case Tiga falls back to a slow path, committing in 1.5-2 WRTTs."  (WRTT = wide-area round trip)
  - claim: "outperforms all baselines, achieving 1.3-7.2x higher throughput and 1.4-4.6x lower latency"
- Mako (Shen, Cui, Sen, Angel, Mu, OSDI 2025)
  - quote (abstract): "Mako decouples transaction execution and replication. This enables Mako to run transactions speculatively and very fast, and replicate transactions in the background to make them fault-tolerant."
  - claim: "3.66M TPC-C transactions per second" with 10 shards, "8.6x higher throughput than state-of-the-art systems optimized for geo-replication"
- Jetpack (Tang, Zhang, Shen, Shi, Mu, OSDI 2026)
  - quote: "Classic consensus protocols such as Raft require 2 round-trip times (RTTs) for a client to commit a command."
  - quote: "we identify the view change hazard, a subtle correctness issue where promises made during stable operation can become invalid after leader elections."
  - claim: tested on "six consensus systems across 10 AWS datacenters", cutting commit latency "by as much as 60%"
  - inference: the view change hazard is a crisp safety obligation, a good fit for a mechanized proof
- WPaxos (Ailijiang, Charapko, Demirbas, Kosar, arXiv 1703.08905): multi-leader with object stealing: "Multiple concurrent leaders coinciding in different zones steal ownership of objects from each other using phase-1 of Paxos"
- Mencius, Atlas, SwiftPaxos, Nezha: above
- state transfer when replicas join over WAN: Chiba, Ohmura, Nakamura arXiv 2204.08656: "reduces the state transfer time by up to 47%" (claim)

### RDMA, kernel bypass, switches, FPGAs

- Mu (Aguilera, Ben-David, Guerraoui, Marathe, Xygkis, Zablotchi, OSDI 2020)
  - quote: "We propose Mu, a system that takes less than 1.3 microseconds to replicate a (small) request in memory, and less than a millisecond to fail-over the system"
- Velos (Guerraoui, Murat, Xygkis, arXiv 2106.08676)
  - quote: "it decides in a single one-sided RDMA operation in the common case, and changes leader also in a single one-sided RDMA operation in case of failure"
  - claim: "13 times faster in changing leader" than Mu
- APUS (SoCC 2017), P4xos / NetPaxos / NOPaxos (programmable switch ideas, 2015-2016): named by a search summary; not read
- scarHW and POPUC (Rovelli, Berdesinski, Otoni, Eugster, arXiv 2608.24622, Aug 2026)
  - quote: "our novel POPUC consensus algorithm, implemented in an FPGA smartNIC to take full advantage of the 'mostly synchronous' behavior of programmable network devices in the datacenter"
  - quote: "POPUC preserves safety guarantees in the presence of process crash-stop and message send/receive omission failures ... and has been formally specified and verified in TLA+."
  - claim: "improves throughput and latency of widely-used services Redis and Zookeeper by up to two orders of magnitude compared to the state of the art"
- I found no 2024-2026 Rust RDMA consensus library (see not-found)
- inference: omission failures ("a NIC drops a message") are a weaker model than full asynchrony; a research gap is a proof of what each hardware assumption buys

### cloud databases at a high level

- Aurora (SIGMOD 2017, abstract): "Aurora achieves consensus on durable state across numerous storage nodes using an efficient asynchronous scheme, avoiding expensive and chatty recovery protocols." (6 copies in 3 AZs with 4-of-6 write and 3-of-6 read quorums is my background knowledge, not rechecked)
- Aurora DSQL (Brooker et al., arXiv 2607.13276, Jul 2026)
  - quote (§2): "Journal is an internal replication component we use in many systems at AWS, including S3, DynamoDB, and MemoryDB. Each Journal is a durable, ordered, atomic data stream. In the single-region setting, a Journal commit means that data is durable to storage in two or more AZs, while in the cross-region configuration data is durable in two or more AWS regions."
  - quote (related work): "all of which use Paxos variants for replication within a fixed group of replicas of each shard. DSQL's approach adds another layer"; note: the paper groups DynamoDB, Spanner and CockroachDB together as "Paxos variants"; CockroachDB uses Raft (my background knowledge)
- Delos (Meta, OSDI 2020): "Delos reached production within 8 months, and 4 months later upgraded its consensus protocol without downtime for a 10X latency improvement." (abstract)
- shared logs, 2024-2026
  - LazyLog (SOSP 2024 best paper; search summary only): binds records to global positions lazily
  - Belfast / SpecLog (Bhat, Hong, Luo, Hu, Ganesan, Alagappan, OSDI 2025): "fix-ante ordering predetermines the global order and makes the shards adhere to the predetermined order"
  - Conflux and LogDrive (Vickers, Bradstreet, Balakrishnan, ..., Vanlightly, OSDI 2026)
    - quote: "A key innovation in Conflux is the separation of durability from sequencing."
    - quote: "Conflux is deployed in production at Confluent as the metadata service for an S3-based publish-subscribe system called K2."
    - claim: "Conflux-over-DynamoDB slashes metadata cost by 10X and overall cost by 3X"
- Azure Cosmos DB: ICSE-style TLA+ study ("Understanding Inconsistency in Azure Cosmos DB with TLA+") is known to me but I did not retrieve it; not quoted
- CockroachDB and Spanner leader leases: Spanner quote above; CockroachDB lease design not retrieved

## what is unsolved or messy

- membership changes are the repeated failure point
  - Raft single-server bug, Ongaro, raft-dev list, 10 Jul 2015: "It's possible for two concurrent, competing changes across term boundaries to have quorums that don't overlap with each other, causing a safety violation (split brain)."
    - found by Huanchen Zhang and Brandon Amos "during a class project at CMU to formalize single-server membership changes"
    - fix: "a leader may not append a new configuration entry until it has committed an entry from its current term"; joint consensus "is not affected by this bug"
    - source: https://groups.google.com/g/raft-dev/c/t4xj6dJTP6E
  - openraft carried bug fixes about joint config at startup and membership inside snapshots (above)
  - inference: any new library should be checked against this exact trace; it is a cheap regression test that few libraries advertise
- recovery and persistence bugs (not protocol bugs)
  - etcd v3.5 data inconsistency postmortem (serathius, 2022-04-20)
    - quote: "Code refactor in v3.5.0 resulted in consistent index not being saved atomically. Independent crash could lead to committed transactions are not reflected on all the members."
    - quote: "For single member cluster it is totally undetectable."
    - quote: "No user reported problems in production as triggering the issue required frequent crashes"
    - source: https://github.com/etcd-io/etcd/blob/main/Documentation/postmortems/v3.5-data-inconsistency.md
  - NATS JetStream 2.12.1 (Jepsen, 2025-12-08): "it lost writes if data files were truncated or corrupted on a minority of nodes ... coordinated power failures, or an OS crash on a single node combined with network delays or process pauses, can cause the loss of committed writes and persistent split-brain. This data loss was caused (at least in part) by choosing to flush writes to disk every two minutes, rather than before acknowledging them."
    - source: https://jepsen.io/analyses/nats-2.12.1
  - Nomad / DNSimple: above
  - inference: three different systems, one theme: the recovery contract between the consensus module and the storage layer is informal; this is the same boundary as project A in crash_replication.md
- reads and leases
  - LeaseGuard quotes above; open issues at HashiCorp and etcd per that paper
  - unsolved: leases need bounded clock error; there is no agreed Rust or Go library API for it
- election instability and partial network faults
  - PreVote does not fully stop disruptive servers (Raft thesis, quoted above)
  - Omni-Paxos and Nifty address it from different angles; I know of no benchmark that runs the same partial-partition tests on openraft, raft-rs, etcd raft, HashiCorp raft (my claim: not found)
- complexity of the "fast" protocols
  - EPaxos needed 12 years to get a full corrected protocol (SOSP 2013 to EPaxos* 2025; inference from dates)
  - Jetpack's view change hazard says the same thing about fast paths: "conditions that are easy to overlook when a fast-path idea is adapted to a new setting"
- client side
  - jetcd retry bug above; Redis-Raft client and snapshot issues; session expiry is unsolved in the Raft thesis ("how can servers agree on when to expire a client's session, and how can they deal with an active client whose session was unfortunately expired too soon?")
- measurement
  - papers compare against their own re-implementations; Pineapple (in crash_replication.md) has the caveat for etcd; I found no common open benchmark for consensus libraries (not found)
- security overlap: "From Consensus to Chaos" (Afifi, Hegazy, Abousaif, arXiv 2601.00273) argues Raft has replay and forgery weaknesses; crash-only protocols assume honest messages, so this is a model mismatch not a bug (inference); see [byzantine_consensus.md](byzantine_consensus.md)

## research ideas

1. verified core for config change, reads and the persist/apply contract, in Verus, checked against a Rust library
   - what exists
     - Verdi (Raft in Coq), IronFleet (Paxos in Dafny), Grove; summarised in [verifying_and_testing_consensus_code.md](verifying_and_testing_consensus_code.md)
     - LeaseGuard has a TLA+ spec but a C++ implementation
     - openraft has a deterministic simulator and Jepsen runs but no proof
   - what is missing
     - a Verus proof of the parts that actually failed in the wild: joint or single-server config change including the no-op-first rule, lease or ReadIndex reads, and "applied index saved atomically with applied data"
   - why it matters: each item has a real bug in the lists above
   - first experiment
     - week 1: model the 2015 counterexample in Verus as a failing proof of the unfixed rule and a passing one for the fixed rule
     - then: read openraft's membership code and ask whether it has the same obligation as a Verus precondition
     - then: run its simulator with the etcd-style "crash between save index and apply" fault
   - risk of being done: medium; closest work is Verdi Raft, "Interpretable Safety Verification of Distributed Protocols by Inductive Proof Decomposition" (Schultz et al., in the paper collection) and verified-Paxos work in Grove; I did not search for a Verus Raft specifically
2. one test suite for crash recovery contracts across Raft libraries
   - what exists: Jepsen per system; openraft's CI suite; etcd's postmortem recommends checks; Netrix (Dragoi et al., in the collection) tests implementations through a DSL
   - what is missing: the same fault script (kill during apply, torn write of the term file, snapshot plus join) run against openraft, raft-rs, OmniPaxos, Iggy VR, etcd raft, HashiCorp raft
   - first experiment: a Rust deterministic harness that drives each library through its storage trait with a fault-injecting disk, and a model KV state machine; check acknowledged-write durability
   - why: the incidents above are all of this kind; overlap with project A in crash_replication.md, so I would merge them
   - risk: medium; Jepsen and TigerBeetle-style simulators cover single systems, no cross-library suite found
3. lease reads in a Rust library, with a clock-bound API and a proof
   - what exists: LeaseGuard (algorithm, TLA+, C++ prototype); etcd raft lease reads that the paper says are buggy
   - what is missing: a Rust implementation on openraft or raft-rs, and any mechanized proof
   - first experiment: port LeaseGuard's "limbo region" logic to openraft; fault-inject clock drift beyond the assumed bound and show the proof's assumption is the exact point of failure
   - risk: low to medium; the LeaseGuard authors may extend it; Rust port not found
4. Jetpack-style fast path as a verified plugin
   - what exists: Jetpack (OSDI 2026) names two structural requirements; Rust ecosystem has none
   - candidate question: whether a reusable checked statement of the leader-change hazard adds to Jetpack’s existing proof
     - only the introduction was inspected; read the proof and artifacts before judging the gap
   - first experiment: Verus model of a generic "fast path on top of leader-based log" and prove: fast-committed commands survive any view change
   - risk: medium; Jetpack authors (Mu group) may release proofs; also check Tiga and EPaxos* for the same shape
5. partial-partition benchmark across Rust Raft and OmniPaxos
   - what exists: Omni-Paxos paper claims better behavior; Nifty analysis of partial partitions
   - what is missing: an independent, same-workload comparison with openraft and raft-rs
   - first experiment: reproduce the "chained" and "quorum-loss" scenario types with turmoil or a network emulator, three nodes, five nodes
   - risk: low to medium; novelty is mostly an independent reproduction, still useful; check the Omni-Paxos paper's own baseline first (I did not read it)
6. Neon-style disaggregated Paxos: a Verus spec of the safekeeper protocol and its membership change
   - what exists: TLA+ spec (blog statement), Rust implementation, Vanlightly survey
   - what is missing: public membership-change protocol and any proof on the Rust code; I could not find the design document
   - first experiment: write the single-decree core in Verus from docs/safekeeper-protocol.md and check the handshake's term rule
   - risk: unknown; Neon may have unpublished work (not found)
7. an observation, not a project: CFT versions of blockchain tricks (Nemo-Nemo, Aspen-like clocks) are arriving; if the human also studies Byzantine protocols, the crash-only half of the comparison is easier to verify first
   - risk: n/a

## sources

papers and documents (title, authors, venue, year, URL); "saved" = in /hdd1/sichanghe/paper_collection
- Making Democracy Work: Fixing and Simplifying Egalitarian Paxos, Ryabinin, Gotsman, Sutra, arXiv 2511.02743, 2025, https://arxiv.org/abs/2511.02743 (saved)
- On the correctness of Egalitarian Paxos, Sutra, Information Processing Letters 2020 / arXiv 1906.10917, https://arxiv.org/abs/1906.10917 (abstract only)
- State-Machine Replication for Planet-Scale Systems (Atlas), Enes, Baquero, Rezende, Gotsman, Perrin, Sutra, EuroSys 2020, https://arxiv.org/abs/2003.11789 (abstract)
- LeaseGuard: Raft Leases Done Right, Davis, Demirbas, Deng, SIGMOD 2026, https://arxiv.org/abs/2512.15659 (saved)
- Jetpack: Consensus Made Generally Fast, Tang, Zhang, Shen, Shi, Mu, OSDI 2026, https://www.usenix.org/conference/osdi26/presentation/tang (saved)
- The LogDrive: Composable Durability for Cloud-Based Shared Logs, Vickers et al., OSDI 2026, https://www.usenix.org/conference/osdi26/presentation/vickers (saved)
- Equal Opportunity: A Correctness Condition for Ordered Consensus, Zhang et al., OSDI 2026, https://www.usenix.org/conference/osdi26/presentation/zhang-yunhao (abstract; blockchain ordering fairness, little relevance to crash-only)
- Tiga: Accelerating Geo-Distributed Transactions with Synchronized Clocks, Geng, Mu, Sivaraman, Prabhakar, SOSP 2025, https://arxiv.org/abs/2509.05759 (saved)
- Mako: Speculative Distributed Transactions with Geo-Replication, Shen, Cui, Sen, Angel, Mu, OSDI 2025, https://www.usenix.org/conference/osdi25/technical-sessions (abstract)
- Low End-to-End Latency atop a Speculative Shared Log with Fix-Ante Ordering, Bhat, Hong, Luo, Hu, Ganesan, Alagappan, OSDI 2025, https://www.usenix.org/conference/osdi25/technical-sessions (abstract)
- Aurora DSQL: Scalable, Multi-Region OLTP, Brooker, Bowes, Hershey, van der Merwe, Morle, Strydom, arXiv 2607.13276, 2026, https://arxiv.org/abs/2607.13276 (saved); blog https://www.brooker.co.za/blog/2026/07/19/dsql-paper.html
- Scalable datacenter replication with mostly-synchronous consensus on hardware (scarHW/POPUC), Rovelli, Berdesinski, Otoni, Eugster, arXiv 2608.24622, 2026, https://arxiv.org/abs/2608.24622 (abstract)
- Finding Nemo-Nemo: CFT DAG-based Consensus in the WAN, Kerur et al., arXiv 2604.08914, 2026, https://arxiv.org/abs/2604.08914 (abstract)
- Dynamic Tuning of Election Parameters for Timely Leader Failover in SMR (Dynatune), Shiozaki, Nakamura, arXiv 2507.15154, 2025 (abstract)
- Implementation and Evaluation of Fast Raft for Hierarchical Consensus, Melnychuk, SebaRaj, arXiv 2506.17793, 2025 (abstract)
- Tight Bounds on Channel Reliability via Generalized Quorum Systems, Naser-Pastoriza, Chockler, Gotsman, Ryabinin, arXiv 2505.02646, 2025 (abstract)
- MultiPaxos Made Complete, Liang, Jabrayilov, Charapko, Aghayev, arXiv 2405.11183, 2024, https://arxiv.org/abs/2405.11183 (saved)
- Specifying Paxos for System Builders: Pseudocode Made Executable, Liu, Sihag, arXiv 2609.12239, Sep 2026, abstract: found "small, difficult-to-catch omissions and liveness bugs in the pseudocode though not the C code" (abstract only)
- From Consensus to Chaos: A Vulnerability Assessment of the RAFT Algorithm, Afifi, Hegazy, Abousaif, arXiv 2601.00273, 2026 (abstract)
- Paxos vs Raft: Have we reached consensus on distributed consensus?, Howard, Mortier, PaPoC 2020, https://arxiv.org/abs/2004.05074 (saved)
- Consensus: Bridging Theory and Practice, Ongaro, Stanford PhD 2014, https://web.stanford.edu/~ouster/cgi-bin/papers/OngaroPhD.pdf (saved; read §4.2.3, §6.3, §6.4)
- bug in single-server membership changes, Ongaro, raft-dev mailing list, 2015-07-10, https://groups.google.com/g/raft-dev/c/t4xj6dJTP6E (read)
- Mencius, Mao, Junqueira, Marzullo, OSDI 2008, https://www.usenix.org/legacy/event/osdi08/tech/full_papers/mao/mao.pdf (abstract)
- Chain Replication for Supporting High Throughput and Availability, van Renesse, Schneider, OSDI 2004, https://www.cs.cornell.edu/home/rvr/papers/osdi04.pdf (abstract, §2)
- Object Storage on CRAQ, Terrace, Freedman, USENIX ATC 2009, https://www.usenix.org/legacy/event/usenix09/tech/full_papers/terrace/terrace.pdf (abstract)
- Zab: High-performance broadcast for primary-backup systems, Junqueira, Reed, Serafini, DSN 2011, https://www.cs.cornell.edu/courses/cs6452/2012sp/papers/zab-ieee.pdf (abstract, §1)
- WPaxos, Ailijiang, Charapko, Demirbas, Kosar, arXiv 1703.08905 (abstract)
- Virtual Consensus in Delos, Balakrishnan et al., OSDI 2020, https://www.usenix.org/conference/osdi20/presentation/balakrishnan (saved; abstract)
- Microsecond Consensus for Microsecond Applications (Mu), Aguilera et al., OSDI 2020, https://www.usenix.org/conference/osdi20/presentation/aguilera (saved; abstract)
- Velos: One-sided Paxos for RDMA applications, Guerraoui, Murat, Xygkis, arXiv 2106.08676 (abstract)
- Lecture Notes on Leader-based Sequence Paxos, Haridi, Kroll, Carbone, arXiv 2008.13456, 2020 (abstract)
- Network Bandwidth Variation-Adapted State Transfer for Geo-Replicated State Machines, Chiba, Ohmura, Nakamura, arXiv 2204.08656 (abstract)
- Amazon Aurora: Design Considerations for High Throughput Cloud-Native Relational Databases, Verbitski et al., SIGMOD 2017, https://www.amazon.science/publications/amazon-aurora-design-considerations-for-high-throughput-cloud-native-relational-databases (abstract)
- Spanner, Corbett et al., OSDI 2012, https://static.googleusercontent.com/media/research.google.com/en//archive/spanner-osdi2012.pdf (§2.1 read)
- Kafka KIP-595, Gustafson, Chen, Wang, https://cwiki.apache.org/confluence/display/KAFKA/KIP-595%3A+A+Raft+Protocol+for+the+Metadata+Quorum (Motivation, rejected alternatives)
- etcd v3.5 data inconsistency postmortem, https://github.com/etcd-io/etcd/blob/main/Documentation/postmortems/v3.5-data-inconsistency.md (read)
- Jepsen: NATS 2.12.1 (2025), Redis-Raft 1b3fbf6 (2020), jetcd 0.8.2 (2024), Redpanda 21.10.1 (2022), https://jepsen.io/analyses/ (abstracts and intros read)
- DNSimple incident report, 2026-02-10, https://blog.dnsimple.com/2026/02/incident-report-nomad-service-outage/ (read)
- repos and docs: etcd-io/raft, tikv/raft-rs, databendlabs/openraft (README, derived-from-async-raft.md), haraldng/omnipaxos, hashicorp/raft, neondatabase/neon docs/safekeeper-protocol.md, Neon blog https://neon.com/blog/paxos, Vanlightly survey https://jack-vanlightly.com/blog/2025/2/19/log-replication-disaggregation-survey-neon-and-multipaxos, Apache Iggy VSR docs https://iggy.apache.org/docs/clustering/vsr.md
- seen only in search summaries (not read; no quotes used as evidence): SwiftPaxos NSDI 2024, Nezha VLDB 2023 (arXiv 2206.03285), Rabia SOSP 2021 (arXiv 2109.12616), LazyLog SOSP 2024, Alfatafta et al. OSDI 2020, APUS, P4xos
- saved to paper collection (11): EPaxos*, LeaseGuard, Jetpack, LogDrive, Tiga, Aurora DSQL, MultiPaxos Made Complete, Paxos vs Raft, Delos, Mu, Raft dissertation

## searched for and not found

- Viewstamped Replication Revisited full text: host unreachable from this machine
- Omni-Paxos EuroSys 2023 paper PDF: no open link found
- "Fast Scalable Consensus", NSDI 2025: title is in the program; abstract not located
- Neon safekeeper membership change design doc: not found (search returned only ZooKeeper and Raft pages)
- Azure Cosmos DB consensus details and the TLA+ study; CockroachDB's own Raft/lease design: not retrieved
- Redpanda Raft internals beyond Jepsen; KRaft bugs list; TiKV raft-rs bug list; HashiCorp raft open issues themselves (I rely on LeaseGuard's citations)
- a Rust RDMA or switch-based consensus library, 2024-2026: none found
- a common open benchmark or test suite across Raft libraries: none found
- SOSP 2025 program had few consensus papers by title filter (Tiga is the clear one); NSDI 2026 only XLL by title filter; OSDI 2026 has Jetpack, LogDrive, Equal Opportunity
- arXiv API and DBLP were rate-limited and the web search quota ran out near the end, so 2025-2026 coverage is by conference program pages plus a few searches; likely incomplete
