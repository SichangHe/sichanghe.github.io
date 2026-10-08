verified file systems and storage
(authored by agents unless marked 🧑)

short version

- fact: crash correctness concerns every place execution can stop
  - rebooting must recover a state permitted by the specification
- claim: FSCQ established this for a simple implementation; DFSCQ added useful durability rules; DaisyNFS combined concurrency with mostly sequential operation proofs
- inference: the most useful lesson is how to divide the proof
  - prove the difficult transaction layer once
  - prove each operation against its simpler interface
- inference: the remaining danger often sits in device assumptions and unverified glue
  - a proof can remain valid while the running server violates an assumption
- recommended research: automatically test the assumptions at the transaction, runtime, and device boundaries
  - novelty requires more than the existing refinement-testing idea in [the human's notes](../../../static_analysis.md)

what is being verified

- functional correctness: operations implement the stated file-system behavior
- crash correctness: recovery produces an allowed durable state
- concurrent correctness: overlapping operations behave consistently with the specified ordering
- scope distinction: correct recovery under a disk model does not establish that a particular SSD obeys that model

what existing work shows

- [Using Crash Hoare Logic for Certifying the FSCQ File System](https://pdos.csail.mit.edu/papers/fscq:sosp15.pdf), SOSP 2015, peer reviewed
  - claim: Coq proofs establish implementation correctness including arbitrary crashes and recovery
    - abstract: “under any sequence of crashes followed by reboots”
  - fact: its crash logic gives operations both normal and crash conditions
    - the recovery procedure connects intermediate disk states to a legal recovered state
  - fact: section 8 reports about 30,000 lines including implementation, proof, and reusable infrastructure
    - this is not 30,000 lines of executable file-system code
  - fact: the prototype lacks multithreading
  - fact: extraction to Haskell, GHC, runtime, FUSE glue, and the disk model remain outside the implementation theorem
    - section 7: “adds the Haskell compiler and runtime into FSCQ’s trusted computing base”
  - inference: proof reuse deserves separate measurement from initial infrastructure cost

- [Verifying a high-performance crash-safe file system using a tree specification](https://pdos.csail.mit.edu/papers/dfscq.pdf), SOSP 2017, peer reviewed
  - fact: DFSCQ specifies fsync and fdatasync using sequences of possible file-system trees
    - abstract: “a precise specification for fsync and fdatasync”
  - claim: its implementation satisfies that specification despite write reordering and writes that bypass the journal
  - fact: reported SSD large-write throughput is 103 MB/s versus ext4's 295 MB/s
    - durable small-file creation is 1,618 versus 4,977 files/s
    - these numbers describe its evaluation configuration
  - fact: five people contributed over two years, part time
    - section 6: “much less than 10 person-years”
  - fact: no concurrency, extended attributes, or permissions
    - section 6: “DFSCQ has no support for concurrency”
  - fact: specification, execution semantics, Coq, extraction, Haskell runtime, FUSE, and Linux disk driver are trusted
    - section 6: “assumes that trusted components are correct”
  - fact: the evaluation exposed a FUSE-binding bug outside the proof
    - section 7 describes an unexpected error code triggering a Haskell panic
  - inference: application crash safety needs a usable durability contract, not merely a crash-safe file system

- [Verifying concurrent, crash-safe systems with Perennial](https://pdos.csail.mit.edu/papers/perennial:sosp19.pdf), SOSP 2019, peer reviewed
  - fact: extends Iris separation logic in Coq to combine shared-memory concurrency and crash recovery
    - abstract: “a framework for verifying concurrent, crash-safe systems”
  - fact: Goose translates a restricted Go program into the modeled language
  - claim: verifies Mailboat, a concurrent crash-safe mail server
  - fact: reported framework development took two people five months; Mailboat verification took one person two weeks
    - section 10: “one person 2 weeks to verify”
    - the latter excludes creating the framework
  - fact: the 2019 result trusts Goose translation, Go compiler, and primitive/device correspondence
    - section 9.2: “we trust the Go compiler to produce correct code”
  - fact: that version assumes no integer overflow
    - section 9.2 explicitly excludes overflow from the model
    - do not generalize this historical limitation to every later Goose release

- [Verifying the DaisyNFS concurrent and crash-safe file system with sequential reasoning](https://www.usenix.org/conference/osdi22/presentation/chajed), OSDI 2022, peer reviewed
  - fact: GoTxn combines journaling, two-phase locking, and allocation
  - fact: Coq proves a transaction theorem; Dafny verifies file-system operations using sequential reasoning
    - abstract: “only 2× as many lines of proof as code”
  - claim: throughput reaches at least 60% of Linux NFS exporting ext4 across the evaluated workloads
    - abstract: “at least 60% the throughput”
  - fact: the operation-proof ratio excludes substantial transaction infrastructure
    - section 8 separately reports 558 trusted Dafny lines for primitive interfaces and roughly 1,000 Go lines completing the NFS server
  - fact: the combined guarantee requires the cross-tool translation and caller discipline to be correct
    - section 9.3: “Testing the trusted code and spec”
    - assumptions include safe transaction use, correctly encoded refinement, correct primitive contracts, and correct calling Go code
  - inference: the interface between provers is a concrete research target
    - each local proof can pass despite a wrong shared contract

- [Storage Systems are Distributed Systems (So Verify Them That Way!)](https://www.usenix.org/system/files/osdi20-hance.pdf), OSDI 2020, peer reviewed
  - fact: VeriBetrKV models asynchronous storage interactions using methods adapted from verified distributed systems
    - abstract: “requires neither domain-specific logic nor tooling”
  - fact: linear ownership and dynamic frames reduce heap-proof obligations
  - claim: similar query performance to unverified databases
    - evaluated insertions are 24× faster than BerkeleyDB and 8× slower than RocksDB
  - fact: the proof reasons through a trusted disk interface and a modified Dafny compilation path
    - section 4: “we reason only about interactions via the trusted” interface
  - inference: a good proof architecture can be shared across storage and distributed systems
    - the modeled disk remains distinct from the real device

- [GoJournal: a verified, concurrent, crash-safe journaling system](https://www.usenix.org/system/files/osdi21-chajed.pdf), OSDI 2021, peer reviewed
  - fact: Perennial 2.0 supports atomic crash specifications and modular recovery reasoning
  - fact: the paper reports one serious concurrency bug found despite unit tests
    - abstract: “one serious concurrency bug”
  - fact: GoJournal uses 25,797 proof lines for 1,345 Go lines
    - SimpleNFS uses 3,749 proof lines for 462 Go lines
  - claim: GoNFS reaches at least 90% of Linux NFS/ext4 throughput across the reported NVMe workloads
  - fact: the benchmarked GoNFS server is unverified; the separately verified server is SimpleNFS
    - section 3: “GoNFS is unverified”
  - inference: benchmarked system and proved system must be named separately
    - a fast consumer of a proved journal does not inherit whole-server correctness automatically

- [PoWER Never Corrupts: Tool-Agnostic Verification of Crash Consistency and Corruption Detection](https://www.usenix.org/conference/osdi25/presentation/leblanc), OSDI 2025, peer reviewed
  - fact: PoWER puts recoverability requirements in storage-write preconditions
  - fact: adds a model for detecting media corruption
    - detection guarantees depend on its corruption assumptions and checksum construction
    - corruption detection does not mean correcting arbitrary corruption
  - fact: demonstrates CapybaraKV in Verus and CapybaraNS in Dafny
    - abstract: “Both systems verify in under a minute”
  - fact: reported proof-to-code ratios are 2.6 and 2.4
    - section 6.1 distinguishes trusted code, executable code, and specifications/proofs
  - claim: CapybaraKV is competitive with evaluated unverified persistent-memory stores
  - fact: Rocq correspondence with crash Hoare logic depends on translating PoWER semantics
    - section 3.2: “depends on a trusted translation”
  - fact: trusted code includes persistent-memory backends and pmcopy for the Rust system, and a C# wrapper for the Dafny system
  - inference: easier crash specifications do not eliminate representation and runtime assumptions
  - inference: this is close prior work for cross-tool storage-boundary research
    - a proposal should use PoWER as a baseline rather than claim ordinary Hoare-style crash verification is new

- [Mohan et al., Finding Crash-Consistency Bugs with Bounded Black-Box Crash Testing, OSDI 2018](https://www.usenix.org/conference/osdi18/presentation/mohan)
  - primary-source depth: official abstract checked; full paper and artifact not inspected in this follow-up
  - method: generate short sequences of file-system operations, simulate power loss, and check recovered contents
    - workload length and included operations bound the search
    - abstract: “exhaustively generates workloads within this bounded space”
  - implementations: CrashMonkey and Ace
  - authors report finding 24 of 26 historical crash-consistency bugs and ten new bugs in Linux file systems
    - these are reported discoveries in the studied file systems
    - results were not reproduced here
  - limit: finite operation sequences and simulated crashes do not prove that every physical storage device obeys a durability model
  - implication: generating crash workloads and checking recovered states already has a direct baseline
    - the proposed contribution must show what deriving workloads from a verified durability specification adds at equal cost

what remains uncertain

- inference: these papers do not establish universal compatibility with commodity device behavior
- inference: these examples do not establish that their proof effort transfers to a production file system with all ext4 features
- research gap candidate: systematic, versioned tests of assumptions connecting two provers and a deployed runtime
  - DaisyNFS already tests trusted code; a paper must improve coverage or reduce effort beyond that baseline
  - no exhaustive novelty claim; the current verified xv6 file system is covered in [operating systems](os_kernels.md)

research we can do

- executable contracts for verified storage boundaries
  - question: can a proof interface generate tests that catch violations in the real adapters and device behavior?
  - builds on [DaisyNFS](https://www.usenix.org/conference/osdi22/presentation/chajed) and the [existing refinement-testing notes](../../../static_analysis.md)
  - proposed new contribution: connect each trusted assumption to a runnable test, fault model, affected theorem, and software version
    - ordinary lists of trusted assumptions are already covered by the human's assumption-carrying verification idea
  - why it may matter: an adapter change could silently invalidate an otherwise unchanged proof
  - first experiment: replay DaisyNFS's published trusted-code bugs and add controlled adapter mutations
    - include malformed requests, wrong lengths, unexpected errors, and crash schedules
  - convincing result: more distinct assumption violations found per test minute than unit tests and unconstrained fuzzing
    - preserve the same workload and mutation set across baselines
  - cost estimate: one researcher, six weeks for a pilot
    - agent estimate, not a published measurement
  - closest work: DaisyNFS's own trusted-code tests and Cogent refinement-based property testing
    - reject the idea if generated tests simply reproduce manually written assertions

- durability-contract conformance across devices
  - question: which modeled write/flush guarantees actually hold across selected storage stacks?
  - builds on [DFSCQ](https://pdos.csail.mit.edu/papers/dfscq.pdf)
  - proposed new contribution: generate distinguishing workloads directly from allowed recovered states
  - why it may matter: narrows the gap between the theorem's disk and the installed disk
  - first experiment: virtual block-device fault injection before physical power-cut experiments
  - convincing result: a reproducible discrepancy absent from ordinary crash testing, or explicit coverage gains at equal cost
  - cost estimate: two months for software experiments; physical rigs add equipment and measurement work
  - closest work: CrashMonkey/Ace bounded crash testing, and refinement testing
    - novelty and device fault coverage remain unconfirmed

ChatGPT's opinion

- consultation submitted with Extra High effort
  - local helper attempt failed with a redacted diagnostic
  - see [consolidated research directions](research_directions.md) for the group consultation

what was searched

- opened primary PDFs: FSCQ, DFSCQ, Perennial, DaisyNFS, VeriBetrKV, GoJournal, PoWER Never Corrupts
- inspected existing notes on refinement testing and assumption-carrying verification
- checked the local paper collection before downloading
- search tool unavailable: its endpoint returned HTTP 404
  - fetched known primary sources directly instead
- not covered deeply: Yggdrasil, Cogent/BilbyFS, VeriSafeKV, current Goose releases, replicated databases
  - these omissions prevent an exhaustive novelty claim
- overlap: [distributed protocols](distributed_protocols.md) covers replicated services; [testing with proofs](testing_with_proofs.md) covers general testing methods
