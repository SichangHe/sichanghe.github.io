crash consensus and recovery: source ledger
(authored by agents unless marked 🧑)

reading scope
- checked on 2026-10-07 UTC
- full text inspected for the first eleven entries and Pineapple and XLL
- Picsou uses its official conference abstract
  - performance numbers are authors' claims under their evaluations
  - no independent reproduction
- each quotation is a short exact excerpt
  - source location supplies its surrounding argument
- publication dates describe the cited version
  - author-hosted drafts can precede final proceedings

foundations
- Fischer, Lynch, Paterson, 1985, [Impossibility of Distributed Consensus with One Faulty Process](https://groups.csail.mit.edu/tds/papers/Lynch/jacm85.pdf)
  - abstract: “the possibility of nontermination, even with only one faulty process”
  - scope: deterministic consensus with fully asynchronous communication
  - takeaway: never promise bounded recovery without saying what timing assumptions permit progress
- Lamport, 2001, [Paxos Made Simple](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf)
  - §2.1: “Only a single value is chosen”
  - scope: processes may stop and restart; messages may be delayed, lost or duplicated
  - takeaway: agreement relies on preserving voting history across restarts
- Ongaro and Ousterhout, 2014, [In Search of an Understandable Consensus Algorithm](https://raft.github.io/raft.pdf)
  - §7: “the latest configuration in the log”
  - scope: joint membership transition and recovery from compacted logs
  - takeaway: membership information belongs in the recovery state
- Chandra, Griesemer, Redstone, 2007, [Paxos Made Live: An Engineering Perspective](https://static.googleusercontent.com/media/research.google.com/en//archive/paxos_made_live.pdf)
  - §5.5: “The snapshot and log need to be mutually consistent”
  - scope: Google's Chubby implementation, including damaged disks and application-owned snapshots
  - takeaway: a process with lost or corrupted voting state cannot immediately resume its old voting role

quorums and alternative ordering
- Howard, Malkhi, Spiegelman, 2016 preprint, [Flexible Paxos: Quorum Intersection Revisited](https://arxiv.org/abs/1608.06696)
  - abstract: “Majority quorums are not necessary as intersection is required only across phases”
  - scope: ordinary Paxos phases with more flexible sets of voters
  - takeaway: smaller normal-operation vote sets can require larger leader-recovery vote sets
- Moraru, Andersen, Kaminsky, SOSP 2013, [There Is More Consensus in Egalitarian Parliaments](https://www.cs.cmu.edu/~dga/papers/epaxos-sosp2013.pdf)
  - abstract: “graceful performance degradation when replicas are slow or crash”
  - scope: EPaxos orders commands through their dependencies rather than a permanent leader
  - takeaway: assess command completion after dependencies become unavailable
- Enes, Baquero, Gotsman, Sutra, EuroSys 2021, [Efficient Replication via Timestamp Stability](https://arxiv.org/abs/2104.01142)
  - abstract: “timestamp becomes stable”
  - §2: “the network is eventually synchronous”
  - scope: Tempo, including partial replication
  - takeaway: distinguish choosing an operation from knowing it is ready to execute
- Whittaker, Giridharan, Szekeres, Hellerstein, Stoica, 2021 draft, [SoK: A Generalized Multi-Leader State Machine Replication Tutorial](https://mwhittaker.github.io/publications/bipartisan_paxos.pdf)
  - introduction: “EPaxos, for example, had several bugs go undiscovered for years”
  - introduction: “the replicas are free to execute commuting commands in any order”
  - scope: comparison of dependency-based protocols and their recovery invariants
  - takeaway: the original EPaxos paper is historical evidence, not a complete implementation correctness certificate

scaling and membership
- Whittaker et al, 2020 draft, [Scaling Replicated State Machines with Compartmentalization](https://mwhittaker.github.io/publications/compartmentalized_paxos.pdf)
  - abstract: “decoupling individual bottlenecks into distinct components and scaling these components independently”
  - scope: separate sequencing, broadcasting, voting and execution roles in MultiPaxos
  - takeaway: failure and recovery workloads must exercise every role
- Whittaker et al, 2021 author-hosted version, [Matchmaker Paxos: A Reconfigurable Consensus Protocol](https://mwhittaker.github.io/publications/matchmaker_paxos.pdf)
  - introduction: “decouple reconfiguration from the standard processing path”
  - introduction: “reconfigure across rounds”
  - scope: a configuration registry outside normal command processing, with its own replacement and cleanup protocols
  - takeaway: replacing voters and replacing configuration metadata are separate failure cases
- Whittaker, Charapko, Hellerstein, Howard, Stoica, PaPoC 2021, [Read-Write Quorum Systems Made Practical](https://mwhittaker.github.io/publications/quoracle.pdf)
  - abstract: “machine heterogeneity and workload skew”
  - abstract: “precisely quantifies the available trade-offs between quorum systems”
  - scope: Quoracle models throughput, latency and network load under practical workload assumptions
  - takeaway: availability and performance depend on which machines are slow, not just how many

recent primary sources
- Bantikyan, Zarnstorff, Chou, Tseng, Palmieri, NSDI 2025, [Pineapple: Unifying Multi-Paxos and Atomic Shared Registers](https://www.usenix.org/conference/nsdi25/presentation/bantikyan)
  - abstract: “unify Multi-Paxos and atomic shared registers”
  - scope: offloads operations from consensus; authors report integration with etcd
  - §2.1: reads and writes use asynchronous shared registers
    - one-shot transactions need a stable leader under partial synchrony
  - §4.1: microbenchmarks keep data in memory
    - etcd experiments persist state
  - appendix A.2: leader changes require ballot-aware reads
    - readers retry when they discover a competing leader
  - takeaway: compare durability and operation classes separately
- Frank et al, OSDI 2025, [Picsou: Enabling Replicated State Machines to Communicate Efficiently](https://www.usenix.org/conference/osdi25/presentation/frank)
  - abstract: “allows both crash fault tolerant and Byzantine fault tolerant protocols to communicate”
  - abstract: “Quacks (quorum acknowledgments)”
  - scope: reliable communication between replicated groups, including disaster recovery and reconciliation applications
  - takeaway: recovery between groups differs from replacing members inside one group
- Shawger, Jhingran, A. Arpaci-Dusseau, R. Arpaci-Dusseau, NSDI 2026, [XLL: Cross-Layer Logging for Data Deduplication in Consensus-Based Storage](https://www.usenix.org/conference/nsdi26/presentation/shawger)
  - §3.4.3: “two-phase recovery”
  - §4.2.3: “last persisted applied index”
  - scope: shared logging in TiKV with a crash recovery protocol
  - authors report 5.5× higher write throughput and 73% lower write amplification
  - §3.4.3: first restore the Raft log, then replay unapplied service operations
    - the applied index flushes atomically with service data
    - the file system must retain a valid prefix of log entries
  - §4.2.3: cleanup flushes service state before checking the durable applied index
    - live value references must survive relocation
  - §5.4: six injected failure points, ten runs per point
    - tests read back pre-existing and recoverable new keys
    - they do not establish exhaustive coverage of membership and snapshot interactions
  - takeaway: shared logging, cleanup and crash testing are already implemented
    - a new project needs a different mechanism or a stronger composition result

remaining reading before a novelty claim
- inspect current EPaxos fixes and implementation recovery semantics
- retrieve Viewstamped Replication Revisited and Vertical Paxos
  - retrieval failed during this pass
  - no detailed claims about these papers made here
- inspect Pineapple and XLL artifacts and reproduce recovery
- read Picsou beyond its abstract
- search 2024–2026 membership, disk-loss and snapshot testing literature
  - search service unavailable during this pass
  - direct retrieval covered known papers and parent-supplied official programs
- reproduce at least one recovery result before ranking measured performance
