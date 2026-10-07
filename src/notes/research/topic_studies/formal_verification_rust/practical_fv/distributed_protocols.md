distributed protocols: what the proof says about running code
(authored by agents unless marked 🧑)

short version

- fact: IronFleet, Verdi, Chapar, and Grove connect proofs to executable implementations
  - their boundaries differ substantially
  - none establishes correctness of an entire deployment without assumptions
- fact: Grove handles crashes, threads, reconfiguration, and leases together
  - it proves safety, not eventual response
- fact: PGo generates code from a model
  - its compiler, runtime resources, and handwritten glue remain trusted
- fact: trace validation and Remix find implementation/model mismatches
  - passing these checks is evidence about tested executions
- proposal: measure failures caused by unproved deployment assumptions
  - extend the human's existing assumption-carrying verification idea
- proposal: check whether observation code can hide real mismatches
  - ordinary trace validation assumes its observations represent the program

what we are trying to establish

- a protocol proof describes all behaviors admitted by a mathematical model
- an implementation proof connects program behavior to that model
  - refinement means every admitted program execution corresponds to an allowed model execution
- a deployment also needs message encoding, clocks, storage, startup, libraries, and the runtime to satisfy the proof's assumptions
- safety means a bad result never occurs
- liveness means some desired progress eventually occurs
  - its scheduling and network assumptions are part of the theorem
- scope: verification of distributed implementations
  - industry adoption is in [industry_use.md](industry_use.md)
  - ordinary distributed research and the ongoing TLA+-to-Rust experiments belong to other groups

proofs connected to implementations

- [IronFleet: Proving Practical Distributed Systems Correct](https://www.microsoft.com/en-us/research/wp-content/uploads/2015/10/ironfleet.pdf)
  - fact: peer-reviewed SOSP 2015
  - fact: combines protocol refinement with Dafny proofs of imperative code
  - fact: demonstrates Paxos replication through IronRSL and a sharded store through IronKV
  - claim: proves safety and liveness against compact centralized specifications
  - fact: Figure 12 reports 5,114 executable lines and 39,253 proof lines across the project
    - the implementation-layer annotation ratio is 3.6:1
    - the whole effort includes methodology development and two systems
      - approximately 3.7 person-years, §7.1
  - fact: §2.5 trusts the specification, main event loop, verifier, compiler, runtime, OS, and hardware
    - messages can be dropped, duplicated, and delayed
    - packet contents and source addresses are assumed trustworthy
    - IronRSL progress requires eventual synchronous delivery and sufficiently frequent execution by a quorum
  - authors, §2.5: “Our guarantees rely on the following assumptions”
  - inference: the explicit environment assumptions are useful experimental targets
    - a failed assumption does not establish an error in the proved protocol

- [Verdi: A Framework for Implementing and Formally Verifying Distributed Systems](https://doi.org/10.1145/2737924.2737958)
  - fact: peer-reviewed PLDI 2015
  - fact: proves Coq implementations against explicit network fault models
  - fact: verified system transformations add fault tolerance while preserving application properties
  - fact: Table 2 reports 520 Raft implementation lines and 4,144 proof lines
    - includes comments and blank lines
  - claim: Raft state-machine replication is linearizable
    - clients see results consistent with one sequential execution preserving real-time order
  - fact: trusts the specification, physical-network correspondence, shim, Coq checker and extraction, OCaml compiler and runtime
    - the shim connects proved event handlers to network and operating-system operations
  - authors, §8: “Verdi currently supports verifying safety properties, but not liveness properties”
  - inference: verified handlers do not independently certify the glue that invokes them

- [Chapar: Certified Causally Consistent Distributed Key-Value Stores](https://doi.org/10.1145/2837614.2837622)
  - fact: peer-reviewed POPL 2016
  - fact: proves two store implementations and checks client programs separately
  - fact: the interface specifies causal consistency
    - an observed effect must respect dependencies on earlier operations
  - claim: separate store and client results compose into application correctness
  - fact: evaluates extracted OCaml stores on four nodes
  - fact: trusts the mapping to the network and shim, Coq checker/extractor, OCaml compiler/runtime/libraries
  - authors, abstract: “We have developed and checked our framework in Coq”
  - inference: application-facing consistency contracts matter alongside server correctness
    - replication correctness alone does not state what clients may assume

- [Grove: a Separation-Logic Library for Verifying Distributed Systems](https://pdos.csail.mit.edu/papers/grove:sosp23.pdf)
  - fact: peer-reviewed SOSP 2023
  - fact: verifies Go components using Coq, Iris, and Perennial
  - fact: handles thread concurrency, unreliable messages, crashes, reconfiguration, and time-based leases
    - a lease promises some state remains valid for a bounded duration
  - claim: vKV operations are linearizable despite these interactions
  - fact: Figure 10 reports 2,435 verified Go lines and 28,077 specification/proof lines
    - verified components have roughly 12 proof lines per code line
    - 2,605 total Go lines include trusted network and filesystem libraries
  - claim: vKV reaches 67–73% of Redis throughput on one core in the reported benchmark
  - authors, introduction: “Grove cannot verify liveness properties”
  - inference: the execution model and trusted clock/storage interfaces must correspond to the deployed runtime
    - this paper does not supply a complete deployment proof
  - inference: proving advanced practical interactions is possible
    - making availability claims still requires separate work

- [An Empirical Study on the Correctness of Formally Verified Distributed Systems](https://www.cs.purdue.edu/homes/pfonseca/papers/eurosys2017-dsbugs.pdf)
  - fact: peer-reviewed EuroSys 2017; opened revised author version
  - claim: finds sixteen bugs in IronFleet, Verdi, and Chapar
    - no protocol bugs found after eight months of investigation
  - claim: PK automatically detects thirteen of the sixteen bugs
  - authors, abstract: “mostly at the interface of verified and unverified components”
  - inference: PK already demonstrates targeted testing of trusted boundaries
    - proposed work must improve on this precedent rather than rediscover it

code generation and conformance checking

- [Compiling Distributed System Models with PGo](https://doi.org/10.1145/3575693.3575695)
  - fact: peer-reviewed ASPLOS 2023
  - fact: compiles Modular PlusCal to TLA+ for model checking and to runnable Go
  - claim: building the Raft store took under one person-month
    - authors compare with three person-months for Ivy
    - systems and workflows differ, so this is not a controlled productivity study
  - fact: §2.1 trusts model adequacy, compiler correctness, handwritten glue/resources, runtime, and systems software
  - authors, §2.1: “the developer must trust any hand-written glue Go code”
  - fact: §4.3 leaves checking contracts between separately modeled components to the user
  - inference: code generation closes one manual translation gap by introducing a compiler and resource-contract boundary

- [Validating Traces of Distributed Programs Against TLA+ Specifications](https://arxiv.org/abs/2404.16075)
  - fact: iFM 2024 paper; opened author preprint v2 dated 17 September 2024
  - fact: instruments Java programs and checks recorded updates against TLA+ using TLC
  - fact: supports incomplete traces by searching for missing model information
  - claim: found discrepancies in every evaluated program
  - authors, introduction: “does not provide formal correctness guarantees”
  - fact: developers choose where to record transitions and how concrete state maps to model state
  - inference: a missing event can conceal the mismatch one hopes to detect
    - validation of a partial trace is weaker than refinement of all program executions

- [Multi-Grained Specifications for Distributed System Model Checking and Verification](https://doi.org/10.1145/3689031.3696069)
  - fact: peer-reviewed EuroSys 2025
  - fact: Remix combines detailed models of changed ZooKeeper components with abstract models of unchanged components
  - claim: found six severe bugs and checked their merged fixes
  - fact: one incremental specification task took under 40 person-hours for an expert
    - this excludes creating the full reusable specification base
  - fact: experiments bound servers, transactions, crashes, and partitions
  - authors, §3.4: “The conformance checking is unsound”
  - inference: this is a practical precedent for incremental checks
    - it is not an implementation-refinement theorem

what remains uncertain

- inference: the papers above establish specific proof boundaries
  - they do not establish that no later project has closed each boundary
- inference: behavior of deployment-specific clocks, storage, and glue is an empirical verification opportunity
  - novelty must be compared with runtime verification, fault injection, and existing conformance checking
- inference: availability remains separate from safety in Verdi 2015 and Grove 2023
  - a new liveness theorem would need an explicit workload and scheduler model
- [spec_quality_trusted_base.md](spec_quality_trusted_base.md) covers verified systems with faulty trusted components
  - those bugs should guide experiments rather than imply all formal proofs are unreliable

research we can do

- proposal 1: locate the deployment assumption that broke a verified service
  - question: can tests linked to theorem assumptions localize failures faster than trace validation alone
  - builds on IronFleet's explicit environment assumptions, Grove's clock/storage boundaries, and [the human's assumption-carrying verification notes](../../../static_analysis.md#idea-assumption-carrying-verification)
  - possible new part: an evaluated connection from a proof dependency to a concrete deployed operation and its failure evidence
    - extracting an assumption list or hashing a build is insufficient
  - why it may matter: a valid proof need not explain failures outside its modeled environment
  - first experiment: one verified service and its I/O boundary
    - inject message-source corruption, incomplete durable writes, and clock-model violations separately
    - preserve the verified core and record which assumptions each fault violates
  - convincing result: finds extra real boundary failures or reduces diagnosis time relative to PK-style boundary testing plus ordinary logs and trace checking
    - include harmless faults and failures already ruled out by the theorem
  - estimated cost: one researcher for 4–6 weeks to reproduce the system and construct a pilot
    - an estimate, not a measured project cost
  - closest work: PK, trace validation, Remix, IronSpec, and assumption-linked testing
    - novelty remains unconfirmed

- proposal 2: verify the observations used to validate execution traces
  - question: can incorrect observation code make a bad execution appear to satisfy a good model
  - builds on Cirstea et al.'s partial traces and selected transition points
  - possible new part: prove or automatically check a small observation layer's correspondence to real state changes
    - report which events and fields remain unobserved
  - why it may matter: an incorrect log is an unreliable witness
  - first experiment: mutate event placement, value conversion, and omission in one trace-validation case study
    - compare validation results with independent operation histories
  - convincing result: rejects observation mutations that previously hid injected model/code mismatches
    - no claim of full correctness from finite traces
  - estimated cost: 2–4 weeks for the mutation study
    - proving a general observation layer could require much more
  - closest work: refinement mappings, runtime verification, verified instrumentation, and Remix
    - investigate these before claiming novelty

- proposal 3: check component contracts when composing generated distributed code
  - question: can a locally model-checked component violate the environment contract assumed by its peer
  - builds on PGo §4.3's explicit contract-checking gap
  - possible new part: mechanically check the actual resource connection against both components' assumed message/order/failure behaviors
  - first experiment: reproduce PGo-RaftKV-Mod and mutate one connection's loss, ordering, or restart behavior
  - convincing result: identifies a composition failure missed by checking each component separately
  - why it may matter: separately correct components need compatible assumptions
  - estimated cost: 4–8 weeks for a bounded checker prototype
  - closest work: assume-guarantee verification and interface automata
    - the gap is acknowledged in this source, not established globally

ChatGPT's opinion

- pending: first Extra High consultation failed during preparation with a timeout
  - the parent agent has a shared consultation running
  - prompt and eventual answer: `/tmp/practical_fv/distributed_specs/`
  - no opinion is attributed before an answer is received

what was opened and searched

- opened full primary texts: IronFleet, Verdi, Chapar, Grove, PGo, trace validation, multi-grained ZooKeeper verification, and Fonseca et al. 2017
- read existing notes on hybrid verification, TLA+ model/code gaps, assumptions, and Agave scope
- reused existing PDFs and extracted text in the paper collection
- attempted web queries for Grove, verified-system bug studies, IronSpec, and Scope
  - search services returned errors
  - fetched available primary PDFs directly instead
- limits: Ivy, Disel, Velisarios, newer Byzantine implementations, and post-2025 deployment studies need a separate pass
  - no novelty claim rests on their absence from this review
