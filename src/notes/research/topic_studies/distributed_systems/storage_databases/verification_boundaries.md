storage correctness across client, server, and disk
(authored by agents unless marked 🧑)

reading date: 2026-10-06 Los Angeles

main takeaway

- recommendation: study what happens where a storage proof meets its caller or physical device
  - a proof guarantees a stated contract under stated assumptions
  - our experiment should check those assumptions and the integration code
  - existing work already proves retries, leases, recovery, and concurrent storage
  - adding those words to a proposal does not establish novelty
- candidate: a small Rust retry layer whose duplicate records survive the same failures as the data
  - first compare against RIFL and Grove
  - proceed only if the intended failure model or integration substantially differs
- candidate: tests generated from a verified storage component's assumptions
  - measure whether integration mistakes are caught before deployment
  - distinguish a violated device assumption from an error in the proved implementation

what the client needs

- linearizability means all operations fit one legal sequential execution
  - each operation appears to take effect instantly between its call and return
  - the unit is the interface operation
  - several individually linearizable operations do not make an atomic transaction
- durability means acknowledged data survives the failures promised by the system
  - a process crash, machine power loss, and regional loss are different promises
- retry correctness concerns a call whose reply disappears
  - an increment may have committed even though the caller timed out
  - replaying it under a new identifier can increment twice
  - preserving data while losing duplicate records can cause the same error
- leases permit an operation while a promise remains valid for a bounded time
  - the relevant assumptions include clock bounds and what reconfiguration waits for
- proof scope must state the operation, failure model, device rules, and trusted code
  - a successful proof and a successful deployment check answer different questions

prior work we must build on

- [RIFL, Lee et al., SOSP 2015](https://web.stanford.edu/~ouster/cgi-bin/papers/rifl.pdf)
  - evidence, abstract: “migrating metadata with the corresponding objects”
    - context: duplicate-request metadata belongs with its underlying data
  - reading: duplicate records move with data rather than remaining on a failed owner
  - mechanism: persistent completed-call results, request identifiers, and leases for record reclamation
  - closest prior work for retry records during shard movement
  - a generic proposal for exactly-once retries would repeat this work
- [IronFleet, Hawblitzel et al., SOSP 2015](https://www.microsoft.com/en-us/research/publication/ironfleet-proving-practical-distributed-systems-correct/)
  - evidence, author abstract: “a lease-based sharded key-value store”
  - evidence: “safety specification, as well as desirable liveness requirements”
  - reading: implementation verification for distributed storage has existed for over a decade
  - liveness means the system eventually makes progress under its stated conditions
- [Perennial, Chajed et al., SOSP 2019](https://pdos.csail.mit.edu/papers/perennial:sosp19.pdf)
  - evidence, abstract: “a framework for verifying concurrent, crash-safe systems”
  - evidence, introduction: “recovery must not revert or corrupt completed writes”
  - reading: recovery must account for completed operations and concurrent execution together
  - demonstrated on a concurrent mail server and replicated disk example
- [GoJournal, Chajed et al., OSDI 2021](https://pdos.csail.mit.edu/papers/gojournal:osdi21.pdf)
  - evidence, section 5: “We assume that the disk writes 4KB blocks atomically, even on crash”
  - evidence, section 4: “a functional (but unverified) NFSv3 server”
  - reading: the journal's proof does not automatically prove its performance demonstration server
  - distinction: SimpleNFS is verified; GoNFS is the larger unverified server
  - an atomic block write leaves either the old or new block after a crash
- [DaisyNFS, Chajed et al., OSDI 2022](https://www.usenix.org/conference/osdi22/presentation/chajed)
  - evidence, abstract: “all the NFS operations on top of GoTxn”
  - evidence: “only 2× as many lines of proof as code”
  - reading: verifies the application above a concurrent transactional storage layer
  - directly challenges any claim that application-to-storage proof composition is unexplored
- [Grove, Sharma et al., SOSP 2023](https://pdos.csail.mit.edu/papers/grove:sosp23.pdf)
  - evidence, abstract: “reconfiguration, crash recovery, thread-level concurrency, and unreliable networks”
  - evidence, section 3.1: “node clocks are synchronized to within known bounds”
  - reading: already verifies a Go distributed key-value store with leases and duplicate-operation tracking
  - section 6 identifies trusted network and filesystem libraries
  - the paper verifies safety rather than eventual responses
  - a Rust port needs a demonstrated benefit beyond changing implementation language
- [PoWER Never Corrupts, LeBlanc et al., OSDI 2025](https://www.usenix.org/conference/osdi25/presentation/leblanc)
  - [paper](https://www.usenix.org/system/files/osdi25-leblanc.pdf), [artifact](https://github.com/microsoft/verified-storage/tree/osdi25-artifact/osdi25)
  - evidence, abstract: “only on standard constructs provided by most verification tools”
  - evidence: “C APYBARA KV using Verus”
  - reading: crash consistency and corruption detection already have a practical Verus example
  - contribution: preconditions require every persistent write to leave recoverable states
  - section 5 includes reader-writer locking and sharding
  - corruption detection is conditional on the stated error model and checksum axioms
    - corruption means unintended changes to stored bits
    - the proof does not cover arbitrary malicious data replacement
- [PILOT, Li et al., NSDI 2026](https://www.usenix.org/conference/nsdi26/presentation/li-zhenyu)
  - [paper](https://www.usenix.org/system/files/nsdi26-li-zhenyu.pdf)
  - evidence, abstract: “75 real-world recovery failures”
  - evidence, section 7: “PILOT cannot track consequences of ‘skipped’ actions”
  - reading: recovery interactions already have a substantial study and a production dry-run tool
  - implication: a new recovery checker needs a specific capability PILOT does not provide
  - the authors also propose LLM-generated recovery adjustments
    - that idea alone is not a new research direction

established tests of persistence assumptions

- [ALICE and BOB, Pillai et al., OSDI 2014](https://research.cs.wisc.edu/adsl/Publications/alice-osdi14.pdf)
  - evidence, abstract: “correctness of these protocols is highly dependent on subtle behaviors of the underlying file system”
  - BOB measures persistence behavior; ALICE checks application update protocols against it
  - implication: assumption-driven application crash testing is established work
  - candidate 1 must add a useful connection to formal specifications or a new integration case
- [CrashMonkey and Ace, Mohan et al., OSDI 2018](https://www.cs.utexas.edu/~vijay/papers/osdi18-crashmonkey.pdf)
  - evidence, abstract: “workloads of three or fewer file-system operations”
  - context: a finding about the authors' historical bug corpus
  - implication: a small bounded workload can reveal real persistence bugs
  - compare generated adapter tests against established bounded crash testing
- [the sibling history-checking study](../finding_bugs/history_checking.md) records the verified FSCQ adapter example
  - follow its primary fix before using the example as evidence

candidate 1: derive deployment tests from proof assumptions

- research question: can explicit proof assumptions guide useful integration tests with less manual oracle work?
- proposed scope: one verified component and two concrete adapters
  - start from CapybaraKV's storage interface or GoJournal's disk interface
  - preserve the paper's distinction between promised device behavior and arbitrary faults
- first experiment, estimated two weeks
  - reproduce verification with the pinned artifact toolchain
  - list assumptions from the specification and trusted adapters
  - build mutations that acknowledge a flush early, lose a duplicate record, or tear a write
    - only apply mutations relevant to the selected component's contract
  - produce an executable test for each selected assumption
  - compare against hand-written crash tests and invariant checks
- success measure
  - reports identify the violated assumption and a reproducible execution
  - tests catch adapter mutations missed by the existing regression suite
  - record false alarms, test cost, and assumptions that cannot be observed externally
- closest prior work
  - PoWER and GoJournal for the storage contracts
  - ALICE/BOB for persistence assumptions and CrashMonkey for bounded crash tests
  - MongoDB's storage-contract testing in [transactions and regions](transactions_regions.md)
  - PILOT for recovery preview
  - consult [distributed bug finding](../finding_bugs/index.md) before claiming a new testing method
- falsification criteria
  - existing contract tests already derive and check the same assumptions
  - generated tests add no detection beyond the baseline at equal cost
  - all observed failures require behavior the real adapter expressly excludes
- uncertainty
  - the concept is plausible, but novelty has not been established
  - no toolchain reproduction or mutation experiment has been run

candidate 2: verify retry records across data movement

- research question: what small reusable contract makes retry correctness survive migration and recovery in a Rust storage stack?
- proposed contract
  - a request identifier has one effect and one stable result
  - data and the record of that effect survive or move together
  - a reclaimed identifier cannot become a valid fresh request unexpectedly
- first experiment, estimated two weeks
  - select a released stack with a documented retry contract
  - record request identifiers and replies at the client boundary
  - lose a reply after commit and migrate ownership before retry
  - restart the client only with its original request identity preserved
  - separately test loss of client request state against an explicit application-level promise
  - [RIFL, section 9](https://web.stanford.edu/~ouster/cgi-bin/papers/rifl.pdf): “if its client is reliable”
    - context: the condition for its exactly-once guarantee
    - keep client lease expiration and rejected old requests within the modeled contract
  - test non-idempotent operations such as increment or conditional update
  - use RIFL-style correct behavior as a baseline
- proposed implementation step
  - verify the smallest record update and reclamation core in Verus
  - state precisely what the transport, database transaction, and clock must guarantee
  - use PoWER if the core writes durable state
- success measure
  - either find a reproducible contract violation or reduce proof/integration effort for an equivalent contract
  - measure retained metadata, retry latency, and time until progress after failover
- falsification criteria
  - RIFL or Grove already supplies the required integration with comparable effort
  - failures arise only because the application assigns a fresh identifier to a new logical request
  - the selected public stack promises only at-least-once behavior
    - duplicates then demonstrate the documented contract rather than a product bug
- uncertainty
  - this is currently weaker than the assumption-test candidate
  - choose a target before spending time on a new verified library

how this connects to the human's work

- recommendation: start with a failed integration trace, then prove the small component that would prevent it
  - the human's verified agent-code evaluation work supplies a natural comparison
  - ask coding agents to implement the same explicit contract
  - evaluate executable behavior and proof completion separately
- a valid result may be negative
  - existing contracts may already suffice
  - explain why a proposed new storage abstraction adds no protection

reading and search limits

- read primary abstracts for IronFleet and DaisyNFS
- read introductions and selected mechanism, assumptions, limitations, and artifact sections of eight primary PDFs
  - RIFL, Perennial, GoJournal, Grove, PoWER, PILOT, ALICE, CrashMonkey
- scanned OSDI 2020, 2023–2025, FAST 2025–2026, and NSDI 2026 program pages
  - a program scan does not substitute for reading each accepted paper
- primary PDFs were retrieved directly with HTTP
  - both available web-search tools failed
  - Google requests returned a JavaScript interstitial rather than search results
- the ChatGPT Extra High consultation was attempted
  - its first run failed before submission because the helper could not verify the final model/effort selection
  - retry submitted at Extra High but returned account_ui_retry_required without an answer
  - no consultation result was available
  - details are recorded in [the study overview](index.md)
- no experiments or proofs were run

Ferrite comparison, primary paper recovered
- [Bornholt et al., ASPLOS 2016](https://sandcat.cs.washington.edu/ferrite/ferrite-asplos16.pdf), sections 4–5
  - evidence: “formalizations (dis)allow representative behaviors encoded in litmus tests”
  - context: the model checker compared with execution against a real file system
  - the toolkit records disk commands from a QEMU guest
  - it enumerates reorderings and crash prefixes allowed by its disk model
  - it remounts the resulting disk images and checks the test's final predicate
  - its default model constrains flushes, same-block changes, and externally visible marks
- limitation
  - evidence: “It cannot prove that two system calls must always be ordered”
  - context: observing no contrary execution is insufficient
  - disk corruption and unsupported hardware behaviors are outside the described scope
- implication for the proposed proof/simulator study
  - model-to-execution crash comparison is established prior work
  - a new project needs a specific verified-storage contract, storage adapter, or fault-model discrepancy
  - matching fault names is insufficient
- read depth
  - inspected axiomatic/operational models, implementation execution, disk model, and stated limits
  - no experiment or tool build
- access
  - author-hosted PDF returned HTTP 403
  - the project-hosted primary PDF above worked
