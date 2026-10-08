consistency guarantees: what storage promises and how we check it
(authored by agents unless marked 🧑)

written 7 Oct 2026 UTC; sources inspected that day unless noted

scope and neighbours
- this note covers what a database or store promises about reads and writes, and how people define, check, and prove those promises
  - isolation levels, linearizability and weaker models
  - checkers that take a recorded history and say yes or no
  - bugs those checkers found, 2022 to 2026
  - data types that merge without coordination (CRDTs) and local-first software
- read these sibling notes first; I do not repeat them
  - [history checking](../finding_bugs/history_checking.md): Jepsen's method, Knossos, Porcupine, Elle's soundness and completeness, retries, crash testing below the service
  - [convergent replication](../consensus_replication/convergent_replication.md): Dynamo, the 2011 CRDT report, COPS, invariant confluence, CALM, metadata deletion with retired replicas
  - [transactions and regions](transactions_regions.md): Spanner, Calvin, HAT, TAPIR, Elle's scope, Caerus, PolyBase, K2, Bonspiel, TxnSails, the MongoDB storage contract
  - [verification boundaries](verification_boundaries.md): what a proof covers and where its adapters are
- what this note adds
  - the definitions themselves and where they disagree
  - the 2023 to 2026 generation of checkers, their complexity results, and what each can and cannot check
  - the 2022 to 2026 Jepsen findings as a bug catalogue
  - proofs that implementations meet an isolation level, not just histories
  - CRDTs after 2022: text editing, access control, Byzantine peers, verified construction
  - research we could do, judged against this prior work

my takeaway first
- existing checkers cover several common models under distinct operation and recording assumptions
  - trust in checker implementations and uncertainty handling still require separate checks
  - 2024 to 2026 checkers cover read committed up to serializability with near-optimal algorithms and handle uncertainty (see "checkers")
  - but three separate 2025 and 2026 papers found wrong proofs or wrong specifications inside existing checkers (see "where definitions disagree")
  - this review identified no machine-checked soundness proof for an executable isolation checker
    - Viper and Plume proof bodies remain unread
    - a Verus checker is a candidate, with novelty unestablished
- the 2022 to 2026 Jepsen reports show that most anomalies appear in healthy clusters with default settings; fault injection is not the hard part (see "bug catalogue")
  - this makes cheap measurement of hosted databases plausible without a Jepsen-style cluster
- proofs of isolation for executable implementations began in 2025 to 2026 (Rocq/Iris, Isabelle/HOL); none target a production Rust engine
- CRDT work has moved from "does it converge" to text interleaving, access control, and Byzantine peers; verified construction (Lean 4, OOPSLA 2026) exists but not in Rust
- my recommended first project: a Verus-verified isolation checker evaluated on the public Jepsen and IsoVista history collections (see "research we could do", candidate 1)

definitions: what the promises mean
- a history is the record of what clients asked and what they got back; a model is a rule that says which histories are allowed
- linearizability: every operation appears to take effect at one instant between its call and its return
  - defined by Herlihy and Wing, TOPLAS 1990; the paper is in the human's collection
  - sibling note [history checking](../finding_bugs/history_checking.md) holds Jepsen's wording
- serializability: transactions appear to run one at a time in some order, not necessarily the real-time order
- strict serializability: serializable and the order respects real time for transactions that do not overlap
- snapshot isolation (SI): each transaction reads from one consistent snapshot, and two transactions that write the same item cannot both commit
  - allows write skew: two transactions each read what the other writes, and both commit
- read committed, read atomic, causal consistency: weaker; each forbids a specific list of bad patterns
- the models are not a single ladder
  - [Jepsen's model map](https://jepsen.io/consistency/models): "Not all consistency models are directly comparable. Often, two models allow different behavior, but neither contains the other."
  - implication: "is X stronger than Y" is often the wrong question; ask which patterns each forbids
- three families of formal definitions exist, and tools pick one
  - dependency graphs: Adya's 1999 thesis; Elle and Plume use these
  - state-based or client-centric: Crooks et al., PODC 2017, "Seeing is Believing"; [paper](https://www.cs.cornell.edu/~youerpu/papers/2017-podc-seeing.pdf)
    - a store is a black box moving through states; isolation says which states a transaction may observe
    - Troubadour (OOPSLA 2025, below) checks against this model
  - program logic: separation logic specifications from which the isolation level follows (Aarhus, 2025 to 2026, below)
  - [Mathiasen, Timany, Birkedal 2026](https://arxiv.org/abs/2607.15877), introduction: "These models often fall into one of three categories [56]: operational semantics [11, 16, 32, 56], abstract executions [10, 20, 25, 33], or dependency graphs [1, 2]."
  - same paper: "dependency graph models are neither amenable to formal proofs that a concrete implementation of a database is correct with respect to such models, nor are they suitable for formal reasoning about correctness of clients of a database"
- regular sequential serializability (RSS), Helt et al., SOSP 2021
  - [paper](https://www.cs.princeton.edu/~wlloyd/papers/rss-sosp21.pdf); my search tool's summary: any application invariant that holds under strict serializability also holds under RSS, yet RSS allows cheaper designs
  - I did not read the paper's body; treat the summary as a lead
- robustness: a workload is robust against an isolation level if every execution the level allows is still serializable
  - Hasselt University line of work: PODS 2020 "Deciding Robustness for Lower SQL Isolation Levels", PODS 2022 "Robustness Against Read Committed: A Free Transactional Lunch", ICDT 2022 [templates with functional constraints](https://arxiv.org/pdf/2201.05021), [predicate reads](https://arxiv.org/pdf/2302.08789), [view vs conflict robustness](https://arxiv.org/pdf/2403.17665)
  - I confirmed titles and venues through search only
  - why it matters: a proof that an application needs no serializability is cheaper than a serializable database

where definitions disagree, or tools got them wrong
- "repeatable read" means different things
  - [Jepsen, MySQL 8.0.34, Dec 2023](https://jepsen.io/analyses/mysql-8.0.34): "We revisit Kleppmann's 2014 Hermitage and confirm that MySQL's Repeatable Read still allows G2-item, G-single, and lost update. Using our transaction consistency checker Elle, we show that MySQL Repeatable Read also violates internal consistency."
  - same report (my fetch tool's paraphrase): MySQL RR is "somewhat stronger than Read Committed" and incomparable to Adya's PL-2.99 and to snapshot isolation
  - [Aurora DSQL](https://arxiv.org/abs/2607.13276) calls its only level "strong snapshot isolation"; AWS material found by search says it is equivalent to PostgreSQL's REPEATABLE READ
    - I did not confirm that sentence in the DSQL paper's body; the abstract only says "strong consistency, ACID transactions"
- vendor names and defaults do not match the formal model
  - [Jepsen, RavenDB 6.0.2, Jan 2024](https://jepsen.io/analyses/ravendb-6.0.2): "RavenDB 6.0.2's default settings allowed lost updates. Even cluster-wide transactions exhibited fractured reads: a serious anomaly prohibited under Snapshot Isolation, as well as several weaker models."
  - [Jepsen, MariaDB Galera 12.1.2, Mar 2026](https://jepsen.io/analyses/mariadb-galera-cluster-12.1.2): claimed level "Between Serializable and Repeatable Read"; found lost update and stale read "even in healthy clusters, without faults"
- replica reads quietly weaken the level
  - [Jepsen, Amazon RDS for PostgreSQL 17.4, Apr 2025](https://jepsen.io/analyses/amazon-rds-for-postgresql-17.4): "Amazon RDS for PostgreSQL multi-AZ clusters violate Snapshot Isolation, the strongest consistency model supported across all endpoints."
    - Long Fork: "each fork updates a different row, but neither fork observes the other's effects"
    - the report says the service "might provide Parallel Snapshot Isolation"
    - cause per AWS (fetch tool's paraphrase): primaries order visibility by an in-memory lock order, secondaries by write-ahead log order, so they disagree on transaction order
  - inference: anyone measuring a hosted database must test every endpoint type separately
- transaction semantics inside one transaction can also surprise
  - [Jepsen, Datomic Pro 1.0.7075, May 2024](https://jepsen.io/analyses/datomic-pro-1.0.7075): "Every history Serializable, but sessions bound to a single peer appear Strong Session Serializable, and histories restricted to write transactions and reads using `d/sync` appear Strong Serializable."
    - no inter-transaction bug; but transaction functions inside one transaction all see the state at transaction start, so two individually safe functions can together break an invariant (fetch tool's paraphrase of the report's "pseudo write skew")
- checker specifications and proofs have had bugs
  - [Isolde, Barros, Cunha, Pereira, Kang, arXiv Apr 2026](https://arxiv.org/abs/2604.00159): a tool that "can automatically generate examples that are allowed by an isolation level but disallowed by another"; it let them "discover a previously unknown bug in the alternative specification of a standard isolation level used in a state-of-the-art isolation checker"
    - the abstract does not name the checker; I did not read the body
  - [Abdulla, Grahn, Jonsson, Krishna, Mishra, PLDI 2025](https://arxiv.org/abs/2509.17795), linearizability monitors: "Past works to solve the same problems have cubic time complexity and (more seriously) have correctness issues: they either (i) lack correctness proofs or (ii) the suggested correctness proofs are erroneous (we present counter-examples), or (iii) have incorrect algorithms." They name Violin as a tool "whose correctness proofs we have found errors in"
  - [VerIso, Ghasemirad et al., PVLDB 2025](https://arxiv.org/abs/2503.06284): "We derive new counterexamples for the TAPIR protocol from failed attempts to prove its claimed strict serializability. In particular, we show that it violates a much weaker isolation level, namely, atomic visibility."
    - TAPIR is the SOSP 2015 protocol in [transactions and regions](transactions_regions.md); a published, peer-reviewed protocol had a design-level isolation bug for ten years
- my conclusion: the weakest link today is the checker and the specification, not the search algorithm

checkers: deciding whether a history fits a model
- the sibling note covers Elle, Knossos, Porcupine; this section is what came after
- transactional, weak levels (read committed, read atomic, causal)
  - [Plume, Liu, Gu, Wei, Basin, OOPSLA 2024](https://2024.splashcon.org/details/splash-2024-oopsla/85/Plume-Efficient-and-Complete-Black-box-Checking-of-Weak-Isolation-Levels): "the first efficient, complete, black-box checker for weak isolation levels"; built on "modular, fine-grained, transactional anomalous patterns"; used "vectors and tree clocks"; claims to "detect new isolation bugs in three production databases"
    - I read the abstract through a conference page, not the paper
  - [AWDIT, Møldrup and Pavlogiannis, PLDI 2025](https://arxiv.org/abs/2504.06975), distinguished paper: "AWDIT tests whether H satisfies the most common weak isolation levels of Read Committed (RC), Read Atomic (RA), and Causal Consistency (CC) in time O(n^{3/2}), O(n^{3/2}), and O(n·k), respectively"; "an average speedup of 245×, 193×, and 62× for RC, RA, and CC, respectively, over the best baseline"
    - the abstract claims a conditional lower bound of n^{3/2}, so weak-level checking is close to done algorithmically
- transactional, strong levels (SI, serializability)
  - [PolySI, Huang et al., PVLDB 2023](https://www.vldb.org/pvldb/vol16/p1264-wei.pdf): SI checker; titles confirmed by search only
  - [IsoVista, Gu, Liu, Xing, Wei, Chen, Basin, PVLDB 2024](https://doi.org/10.14778/3685800.3685866): claims no false positives and no missed bugs on collected histories, plus visualization and checker benchmarking (fetch tool's paraphrase of the abstract)
  - [Chronos and Aion, Li, Wei et al., ICDE 2025](https://arxiv.org/abs/2504.01477): timestamp-based, so white-box; "CHRONOS processes offline histories with up to one million transactions in seconds"; the online checker "AION and AION-SER sustain a throughput of approximately 12K transactions per second"
    - needs the database to expose timestamps; black-box checkers do not
  - [VeriStrong, Cai, Liu, Wei, Chen, Pan, PVLDB 2026](https://arxiv.org/abs/2511.14067): "hyper-polygraphs, which compactly captures both certain and uncertain transactional dependencies"; "sound and complete encodings for verifying both serializability and snapshot isolation"; SMT solving tuned to database workloads
  - [Boomslang, Zhang, Mu, Tan, arXiv Apr 2026](https://arxiv.org/abs/2604.20587): "the first general-purpose checking framework capable of verifying configurations that were previously uncheckable"; "superpositions" capture uncertainty from arbitrary operation types; found a new TiDB bug and audited JuiceFS's metadata layer (fetch tool's paraphrase)
    - why it matters to us: it handles arbitrary operations, not only Elle's list-append; it is the closest competitor to any "checker for real workloads" proposal
- beyond isolation: is the result itself right?
  - [Troubadour, Pick, Xu, Desai, Seshia, Albarghouthi, OOPSLA 2025](https://2025.splashcon.org/details/OOPSLA/96/Checking-Observational-Correctness-of-Database-Systems): "Clients rely on database systems to be correct, which requires the system not only to implement transactions' semantics correctly but also to provide isolation guarantees for the transactions."; SMT-based; found two unknown bugs in PostgreSQL and an unreleased system (fetch tool's paraphrase)
  - [TxCheck, Jiang, Liu, Rigger, Su, OSDI 2023](https://www.usenix.org/conference/osdi23/presentation/jiang): found 56 bugs in TiDB, MySQL, MariaDB by building semantically equivalent transaction test cases (search summary)
  - [IsoPredict, Geng, Blanas, Bond, Wang, PLDI 2024](https://arxiv.org/abs/2404.04621): "Given an observed serializable execution of a data store application, Isopredict generates and solves SMT constraints to find an unserializable execution that is a feasible execution of the application."; "99% of which are feasible"
    - this is the application side: given a weak level, will my program break?
  - [Ad Hoc Transactions in Web Applications, Tang et al., SIGMOD 2022](https://ipads.se.sjtu.edu.cn/_media/publications/concerto-sigmod22.pdf): 91 ad hoc transactions in 8 web apps; 53 had correctness issues, 33 confirmed (search summary)
- linearizability monitors, non-transactional
  - [Lee and Mathur, OOPSLA 2025, decrease-and-conquer](https://arxiv.org/abs/2410.04581): "a polynomial time algorithm for the problem of identifying linearizability-preserving values, yields a polynomial time algorithm for linearizability monitoring"; log-linear for sets, stacks, queues, priority queues "with the unambiguity restriction, where each insertion to the underlying data structure adds a distinct value"
  - [Lee and Mathur, PLDI 2026, fixed-parameter tractable](https://arxiv.org/abs/2509.05586): runtime "O(c^k · poly(n))" with k the number of processes, for stacks, queues, priority queues, maps (fetch tool's paraphrase)
  - [Abdulla et al., PLDI 2025, LiMo](https://arxiv.org/abs/2509.17795): O(n²) stacks, O(n log n) queues, O(n) sets, under data independence; see the erroneous-proof quote above
  - [RELINCHE, Golovin, Kokologiannakis, Vafeiadis, POPL 2025](https://popl25.sigplan.org/track/POPL-2025-popl-research-papers): linearizability under relaxed memory; title from search
  - inference: the general problem stays NP-hard; practical monitors restrict the data type, values, or process count, and each restriction is a chance for a wrong proof
- what none of these do
  - the initial pass found paper proofs rather than mechanized executable-checker proofs
    - the 8 Oct consultation follow-up below adds Rocq characterization theorems for Plume
    - executable implementation verification remains a separate question
  - none is written for a verifier like Verus; Elle is Clojure, Plume and AWDIT are Java/Rust-ish per search but I did not confirm languages
  - this is the opening for candidate 1 below

bug catalogue: what Jepsen found 2022 to 2026
- all reports are version-specific; later releases fixed some issues; read the sibling note's caution
- [Radix DLT 1.0-beta.35.1, Feb 2022](https://jepsen.io/analyses/radix-dlt-1.0-beta.35.1): "We found 11 safety errors, ranging from stale reads which violated per-server monotonicity, to aborted and intermediate reads, as well as the partial or total loss of committed transactions."
  - one cause: "Radix had chosen `COMMIT_NO_SYNC` when configuring the ledger's underlying BerkeleyDB storage system"
- [Redpanda 21.10.1, Apr 2022](https://jepsen.io/analyses/redpanda-21.10.1): "We found three liveness and seven safety issues, ranging from crashes and aborted reads to inconsistent offsets, circular information flow, and lost/stale messages."
  - includes Kafka protocol issues shared by all Kafka implementations: write cycles allowed by the protocol, ambiguous error codes (KAFKA-13574)
- [RavenDB 6.0.2, Jan 2024](https://jepsen.io/analyses/ravendb-6.0.2): lost updates by default, fractured reads even cluster-wide; quote above
- [Datomic Pro 1.0.7075, May 2024](https://jepsen.io/analyses/datomic-pro-1.0.7075): no isolation bug; intra-transaction semantics surprise; quote above
- [jetcd 0.8.2, Aug 2024](https://jepsen.io/analyses/jetcd-0.8.2): "jetcd contains an improper retry mechanism which allows transactions to execute multiple times, or to appear to fail but actually succeed."
  - the bug is in the client library, not etcd
- [Bufstream 0.1.0, Nov 2024](https://jepsen.io/analyses/bufstream-0.1.0): "Three safety and two liveness issues in Bufstream, including stuck consumers and producers, spurious zero offsets, and the loss of acknowledged writes in healthy clusters."
  - plus KAFKA-17754: write loss and torn transactions from missing sequence numbers in Kafka's transaction protocol (fetch tool's paraphrase)
- [Amazon RDS for PostgreSQL 17.4, Apr 2025](https://jepsen.io/analyses/amazon-rds-for-postgresql-17.4): Long Fork on replica reads; quote above
- [TigerBeetle 0.16.11, Jun 2025](https://jepsen.io/analyses/tigerbeetle-0.16.11): "We discovered seven client and server crashes, including a segfault on client close and several panics during server upgrades."
  - two safety issues before 0.16.17: missing query results with several predicates, and wrong timestamps from the Java client; by 0.16.30 strong serializability held (fetch tool's paraphrase)
  - storage faults were tolerated far better than in most systems; corruption of the write-ahead log head on a majority could still disable a cluster
- [Capela dda5892, Aug 2025](https://jepsen.io/analyses/capela-dda5892): "fourteen crashes or non-fatal panics, including double-borrow errors and corrupting allocator memory"; "three safety issues, including partitions ignoring their initial values, sporadically vanishing, and losing committed writes"
  - a Rust system; "double-borrow" panics are RefCell misuse, "corrupting allocator memory" implies unsafe code; relevant to the human's Rust interest
- [NATS 2.12.1, Dec 2025](https://jepsen.io/analyses/nats-2.12.1): "We tested NATS JetStream, version 2.12.1, and found that it lost writes if data files were truncated or corrupted on a minority of nodes."
  - "NATS calls `fsync` to flush data to disk only once every two minutes, but acknowledges messages immediately"
- [MariaDB Galera Cluster 12.1.2, Mar 2026](https://jepsen.io/analyses/mariadb-galera-cluster-12.1.2): "While MariaDB claims Galera ensures 'no lost transactions', it loses transactions in at least two scenarios"; lost update and stale read without faults; four issues unresolved at publication
- recurring classes, my grouping
  - 1 client retry without idempotence: jetcd, Redpanda, TigerBeetle's indefinite retries; the sibling note's "retries change the unit being checked" is the right frame
  - 2 acknowledging before durable: NATS fsync every two minutes, Radix COMMIT_NO_SYNC
  - 3 replica or secondary reads ordering differently from the primary: RDS PostgreSQL, RDS MySQL (`replica_preserve_commit_order=OFF`)
  - 4 defaults weaker than the documented level: RavenDB, MariaDB Galera, MySQL RR
  - 5 corruption handling: NATS data loss, TigerBeetle and Capela panics
  - 6 protocol-level ambiguity: Kafka error codes and missing sequence numbers, shared by every implementation of the protocol
  - most of 3, 4, and part of 1 appear with no faults injected; that supports cheap measurement (candidate 2)

proving implementations, not histories
- black-box checking cannot show absence of bugs; 2025 and 2026 work proves implementations
- [Mathiasen, Gondelman, Ducruet, Timany, Birkedal, ICFP 2025](https://cs.au.dk/~timany/publications/pub_pages/2025-icfp-snap-iso/): "we formalize three weak isolation levels in separation logic, namely read uncommitted, read committed, and snapshot isolation"; "we formally verify that an executable implementation of a key-value database running the multi-version concurrency control algorithm from the original snapshot isolation paper satisfies our specification of snapshot isolation"; "All results are mechanized in the Rocq proof assistant on top of the Iris separation logic framework"
  - paper is in the human's collection
- [Mathiasen, Timany, Birkedal, arXiv Jul 2026](https://arxiv.org/abs/2607.15877): "we derive isolation levels directly, as formalized in transactional consistency models by the database community, from the structure of separation logic specifications"; "a so-called free theorem meaning that any database implementation, whose operations are verified against a specific set of separation logic specifications, actually implements its isolation level"
  - also in the collection
  - limitation I infer: the implementation language is the Iris-supported research language, not Rust or C; the "free theorem" is about the spec shape, so porting it to Verus would need Verus to express those specs
- [VerIso, PVLDB 2025](https://arxiv.org/abs/2503.06284): Isabelle/HOL; "we model the strict two-phase locking concurrency control protocol and verify that it provides strict serializability"; found the TAPIR counterexample quoted above
  - protocol models, not executable code
- [Reduce Once, Verify Many, Ghasemirad, Sprenger, Liu, Basin, SCCP 2026 at VLDB](https://arxiv.org/abs/2608.07793): "supports a spectrum of seven isolation levels"; "a hierarchy of abstract models that substantially simplifies proofs by factoring out their most labor-intensive parts"; Isabelle/HOL
- [Verified Detection and Prevention of Concurrency Anomalies in Multi-Agent LLM Systems, Khan, arXiv Jun 2026](https://arxiv.org/abs/2606.17182): uses Verus for the detector: "A development of 274 Verus obligations (zero assume, zero admit; trust base: two structural axioms and a mutex correspondence) proves the detectors sound and complete against the specifications"; reproduces "a silent lost update in ByteDance's deer-flow"
  - single independent author; in the collection; the phenomena are, by the author's own words, "classical"
  - relevant because it is the only Verus-based consistency artifact I found; worth auditing before building on
- gap: no proof of an isolation level for a production storage engine in Rust; CapybaraKV (PoWER, OSDI 2025, see [verification boundaries](verification_boundaries.md)) proves crash safety, not isolation

CRDTs and local-first software after 2022
- what changed: the question moved from convergence to user-visible quality, trust, and permissions
- text editing
  - [Fugue, Weidner and Kleppmann, IEEE TPDS Nov 2025](https://arxiv.org/abs/2305.00583): "when two users concurrently insert text at the same position in the document, the merged outcome may interleave the inserted text passages, resulting in corrupted and potentially unreadable text"; defines maximal non-interleaving and proves FugueMax satisfies it (fetch tool's paraphrase)
  - [Eg-walker, Gentle and Kleppmann, EuroSys 2025](https://arxiv.org/abs/2409.14252): replays an event graph instead of keeping CRDT metadata in the document; "Eg-walker can be used everywhere CRDTs are used, including peer-to-peer systems without a central server"
  - [Automerge 3.0, Jul 2025](https://automerge.org/blog/automerge-3/): "we've cut that down memory usage by over 10x, sometimes dramatically more" by using "the compressed representation at runtime"
  - Loro (Rust) combines Eg-walker and Fugue per search; its "CRDTs are not enough" post was not fetchable (HTTP 403)
  - inference: the production libraries (Automerge, Loro, Yjs) are Rust or JavaScript and unverified; correctness rests on paper proofs and tests
- access control and Byzantine peers
  - [Kleppmann, PaPoC 2022](https://martin.kleppmann.com/papers/bft-crdt-papoc22.pdf): "most existing CRDT algorithms cannot guarantee consistency in the presence of such faults"; "The proposed scheme can tolerate any number of Byzantine nodes (making it immune to Sybil attacks), guarantees Strong Eventual Consistency, and requires only modest changes to existing CRDT algorithms."
  - [Keyhive, Ink and Switch](https://www.inkandswitch.com/keyhive/notebook/): "Keyhive is a project exploring local-first access control."; "All Automerge documents get identified by a public key, and delegate control over themselves to other public keys."; pre-alpha March 2025, "DO NOT use this release in production applications", no security audit at time of writing
  - [Jacob, Stuber, Hartenstein, KIT, arXiv Apr 2026](https://arxiv.org/abs/2604.23560): "As of today, Matrix and Keyhive pair an informal specification with an unverified reference implementation"; argues for system-oriented formal verification of local-first access control; in the collection
  - [ERA, Dougal, PaPoC 2026](https://arxiv.org/abs/2601.22963): the "Duelling Admins problem" where two admins concurrently revoke each other; "arbitrates asynchronously in batches via optional 'epoch events', preserving availability"
    - the author works on Matrix; this is a real deployed problem
- verified and typed construction
  - [Composing CRDTs Convergent by Construction, Städing Dominguez, Zakhour, Weisenburger, Salvaneschi, OOPSLA 2026](https://2026.splashcon.org/details/oopsla-2026/104/Composing-CRDTs-Convergent-by-Construction): five combinators, "formalized entirely in Lean 4", executable library Crdtlib, JSON tree CRDT comparable to Automerge (fetch tool's paraphrase)
  - Propel, PLDI 2023, "Type-Checking CRDT Convergence": a type system deduces the algebraic properties a CRDT needs (search summary)
  - Nieto et al., OOPSLA 2022, "Modular Verification of Op-Based CRDTs in Separation Logic": in the collection, not reread
  - [PRDTs, 2025](https://arxiv.org/abs/2504.05173): "Protocol Replicated Data Types", consensus protocols written as replicated data types that accumulate knowledge until agreement (search summary)
- what the sibling note already proposes: safe metadata deletion with retired replicas; I do not duplicate it
- gap I see: no verified list or text CRDT with production performance exists in Rust; Lean's Crdtlib is the closest and it is not Rust

research we could do
- all candidates are proposals; novelty is argued, not established; each lists the group most likely to beat us
- candidate 1: a Verus-verified isolation checker, run on public history collections
  - question: can we have a checker that is both machine-checked sound and fast enough for real histories?
  - why existing work does not answer it: Isolde found a spec bug in a state-of-the-art checker, Abdulla et al. found wrong proofs in linearizability monitors, and the new Rocq characterization proof must be compared with any proposed executable Verus checker
  - first step: implement Plume-style anomaly patterns for read committed, read atomic, and causal in Rust; prove in Verus that "reports a cycle" implies the Adya definition is violated (soundness); completeness can come later
    - start with the sibling note's list-append workload, where write identity is known, so the proof avoids Elle's inference problem
  - evaluate on the histories released with IsoVista and Jepsen's reports, compare time with AWDIT and Plume
  - risks: Verus proofs over graph algorithms are slow to write; the Basin/Liu group (Plume, IsoVista, VerIso) or the Pavlogiannis group (AWDIT) could do it with Isabelle or Rocq first
  - why us: Verus produces executable Rust, so the verified checker is the production tool, not a model of it
- candidate 2: measure what hosted databases actually deliver, through their public endpoints
  - question: for the managed databases developers reach for in 2026, which isolation level does each endpoint actually provide, under no faults, and does the documentation say so?
  - why existing work does not answer it: Jepsen tests one system at a time with a cluster; nobody I found has done a cross-vendor measurement through ordinary client connections
  - evidence that it will find things: RavenDB, MariaDB Galera, MySQL RR, RDS PostgreSQL replica reads, all without faults
  - first step: run Elle's list-append and AWDIT's workloads against the writer and reader endpoints of five to eight hosted services (Aurora DSQL, RDS, Neon, PlanetScale, CockroachDB Cloud, Turso, Supabase, Cloudflare D1), each at every offered isolation setting; compare with the documented level
  - measure: anomalies per endpoint and setting, time to first anomaly, cost in dollars per test hour
  - risks: terms of service; the vendor fixes it and the result becomes a footnote; Kingsbury could publish the same for one vendor sooner
  - why us: this is web measurement applied to databases, and the human already does measurement
- candidate 3: prove snapshot isolation for a small Rust MVCC engine in Verus
  - question: can the Aarhus "isolation from the spec shape" idea be expressed in Verus's ghost-state style, on a Rust engine that is also fast?
  - why existing work does not answer it: both Aarhus papers use Rocq/Iris on a research language; VerIso and Reduce Once use Isabelle protocol models; PoWER proves crash safety not isolation
  - first step: take the ICFP 2025 MVCC key-value example, port the algorithm to Rust, state read committed and SI as Verus specs on the client-visible API, prove SI
  - then connect to candidate 1: a sound checker must not report a violation on histories covered by both proofs
    - align isolation definitions, operation models, and history encodings
    - an inconclusive result is allowed
    - a violation report requires checking proofs, assumptions, and instrumentation
  - risks: Verus lacks Iris's higher-order ghost state; the "free theorem" may need logical relations Verus cannot express; this could become a Verus feature project
  - competing groups: Aarhus (Birkedal, Timany), ETH (Basin, Liu)
- candidate 4: a verified text CRDT in Rust with production speed
  - question: can Fugue or Eg-walker be implemented in Verus with proofs of convergence and maximal non-interleaving while matching Loro or Diamond Types on benchmarks?
  - why existing work does not answer it: Crdtlib (Lean 4) proves convergence but is Lean; Propel is a type system for simpler CRDTs; Loro and Automerge are unverified
  - first step: verify a plain list CRDT (RGA or Fugue) in Verus for convergence only; measure against Loro on the Eg-walker paper's traces
  - risks: text CRDT proofs are long; Kleppmann's group has the Isabelle expertise and the benchmark traces
  - I rate this below candidates 1 to 3 because the payoff is a verified library, not a new result about systems
- candidate 5: history-check local-first access control
  - question: do Keyhive and Matrix's room-state resolution keep their stated consistency under concurrent admin changes and Byzantine peers?
  - why existing work does not answer it: the KIT paper calls both "an informal specification with an unverified reference implementation"; ERA describes the duelling-admins problem but tests one fix
  - first step: write a Jepsen-style test harness for Keyhive's group membership with concurrent grants and revocations, plus one lying peer; check that all honest replicas converge and that no revoked key's writes become visible after the revocation is known everywhere
  - risks: Keyhive is pre-alpha and may change under us; the "right" property is unclear and needs a definition before a test
  - fits the human's interest in distributed systems and measurement; less so Verus
- candidate 6, weaker: audit and extend the Verus multi-agent-memory paper
  - the Khan 2026 artifact is the one existing Verus consistency development; reproducing its 274 obligations and checking its trust base would tell us how far Verus already goes
  - a research result would need a real agent trace showing an anomaly; the author admits the motivating scenario is "constructed"
  - I suggest this as a two-day reconnaissance, not a project

what I could not cover
- read in full: none of the papers; I read abstracts, introductions, and conference pages, plus the Jepsen reports through a summarizing fetch tool
  - where the tool paraphrased instead of quoting, I say "fetch tool's paraphrase"
- not reached: the Plume paper body (ACM page returned HTTP 403), Loro's blog (403), the Jepsen 2026 "Lessons" talk slides, the Hasselt robustness papers' bodies, RELINCHE, PolySI body, the SOSP and OSDI 2026 programs
- not searched: PODC and DISC 2024 to 2026 theory on consistency models, OT-based collaborative editing, geo-replicated causal stores after 2022
- ChatGPT Extra High, original worker: no opinion obtained
  - one attempt on 7 Oct failed with transport_prepare_deadline, a second stayed stuck at pending_prepare because the browser was not signed in; the coordinator then said to stop
  - the self-contained prompt is saved for a later run: /tmp/claude-30033/-ssd1-sichanghe-github-io/85361e00-9330-4e62-a177-9736b46ce5e5/scratchpad/consistency/chatgpt_prompt_to_send.md
  - the candidates above were therefore not challenged by an outside reviewer

checker proof comparison follow-up

scope and reading depth
- checked 8 Oct 2026 through direct primary-source retrieval
- read selected definitions, theorem statements, proof passages, implementation descriptions and limitations
  - [VeriStrong full text](https://arxiv.org/html/2511.14067v1)
  - [Isolde full text](https://arxiv.org/html/2604.00159v1)
  - did not audit every proof or run either artifact
- Viper and Plume bodies remain unread
  - ACM PDF access returned HTTP 403
  - author-copy guesses returned HTTP 404
  - Plume's ETH repository returned HTTP 429
  - this is a limited retrieval failure, not evidence that their proofs are absent

three claims that must stay separate
- a mathematical soundness argument connects an algorithm to a definition
- machine-checked soundness requires a proof accepted by a proof assistant or verifier
- an executable checker implements an algorithm
  - connecting its actual implementation to the theorem is an additional obligation
- inference: the retrieved papers establish the first and describe the third
  - no machine-checked proof was identified in those two inspected papers
  - the later consultation follow-up below identifies a Rocq characterization proof
  - this search does not establish that no such checker exists

VeriStrong handles uncertainty about which write supplied a read
- authors Cai, Liu, Wei, Chen and Pan describe duplicate values explicitly
  - section 9: “our work lifts the strong UniqueValue assumption made by prior verifiers”
  - implementation section: “approximately 5k lines of C++ code”
- section 3 builds alternative dependency choices into hyper-polygraphs
  - sections 3 and appendix B give equivalences between allowed histories and compatible acyclic graphs
  - inference: duplicate values do not force one guessed read-from relation
  - the checker searches for a dependency assignment consistent with the observations
- important boundary
  - multiple writes of the same value are covered
  - missing operations, unresolved transaction outcomes and incomplete recording are different uncertainties
  - do not claim they are covered without checking their history model
- [public artifact linked by the paper](https://github.com/CzxingcHen/VeriStrong)
  - artifact not executed or audited in this follow-up

Isolde identifies Plume's read-atomic specification mistake
- Barros, Cunha, Pereira and Kang, section 3.1.1
  - “This problem has been confirmed to us by the authors of Plume”
- their counterexample uses one object and two transactions in session order
  - first transaction reads x=0 and writes x=1
  - second transaction reads x=0
  - their axiomatic read-atomic definition rejects this history
  - Plume's alternative anomaly definition admits it
  - its ordering anomalies require at least two objects
- distinguish the demonstrated specification mismatch from implementation behavior
  - this text does not establish that Plume's shipped checker accepts this history
  - no artifact execution was performed here
- section 4 and appendix A provide an algorithm and mathematical soundness argument
  - search for counterexamples is bounded by chosen numbers of transactions, objects and values
  - failing to find a counterexample within those bounds is not an unbounded equivalence proof
- implementation section describes a Java library
  - this is a specification-comparison and history-synthesis tool
  - it is not the same task as checking one large production history

changes needed in the existing research claim
- replace “nobody has yet” with a scoped search result
  - no machine-checked soundness proof for an executable isolation checker was identified in the inspected sources
  - Viper and Plume proof bodies still need inspection
- remove the claim that the checking problem is largely solved
  - VeriStrong exposes a material prior limitation: duplicate write values
  - paper arguments, implementation correctness and recording correctness remain separate
- preserve the proposed Verus checker as a research question
  - first compare its exact operation model and uncertainty handling with VeriStrong
  - verify both the isolation definition and its translation into executable code
  - investigate novelty before calling this an unfilled gap

consultation correction: weak-isolation theory has mechanized proofs
- [Gu, Liu, and Wei, 6 Oct 2026 preprint](https://arxiv.org/html/2610.07665v1)
  - evidence: “machine-checked proofs of the corresponding TAP-based characterization theorems”
  - context: transactional anomalous patterns for four weak isolation levels
  - the development formalizes history definitions and pattern equivalence in Rocq
    - levels: cut isolation, read committed, read atomicity, transactional causal consistency
    - the paper refines history assumptions and two read-atomic patterns
  - [authors' mechanization](https://github.com/dracoooooo/Plume/tree/main/Mechanization)
    - README describes one Rocq source file and four characterization theorems
    - inspected README and source inventory
      - not compiled or independently proof-audited here
  - interpretation: mechanizing weak-isolation characterizations is existing work
    - the inspected contribution is a characterization theorem
    - it does not by itself prove the executable checker or its recording/parser pipeline
  - revised first comparison
    - map one executable decision rule to the corrected history definition and Rocq theorem
    - inspect whether the existing development already yields a certified checker
    - only then propose an additional executable-proof boundary
  - read depth: introduction, history definitions, proof-equivalence discussion, related work, and conclusion
- known write identities do not determine every version order
  - two concurrent blind writes can leave their order undecided
  - checking one arbitrarily chosen dependency graph can misclassify a history
  - proposed first test: enumerate serial executions of small histories and replay all reads
    - compare results with the proposed dependency construction
    - proving graph traversal alone is insufficient
  - this is a reasoning obligation raised by the consultation
    - no checker was executed here
