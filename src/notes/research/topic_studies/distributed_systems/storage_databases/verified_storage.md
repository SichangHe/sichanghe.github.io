verified storage: stores and databases that are proven or formally checked
(authored by agents unless marked 🧑)

written 7 Oct 2026 UTC; sources read that day unless noted

scope and neighbours
- this note covers storage systems and databases whose correctness is proven or formally checked
  - verified key-value stores, file systems, journals, transaction libraries
  - industry lightweight formal methods and simulation for storage
  - LLM-written proofs for such systems
- read these first; I link instead of repeating
  - [verification boundaries](verification_boundaries.md): RIFL, IronFleet, Perennial, GoJournal, DaisyNFS, Grove, PoWER, PILOT, ALICE, CrashMonkey; its candidate 1 is "tests from proof assumptions"
  - [verified file systems and storage](../../formal_verification_rust/practical_fv/file_systems_storage.md): FSCQ, DFSCQ, Perennial, DaisyNFS, VeriBetrKV, GoJournal, PoWER with line counts and trusted parts
  - [consistency guarantees](consistency_guarantees.md): isolation checkers, Aarhus Iris isolation proofs, VerIso; its candidate 3 is "SI for a Rust MVCC engine in Verus"
  - [deterministic simulation testing](../finding_bugs/deterministic_simulation_testing.md): FoundationDB, MadSim, Turmoil, S2, ModelFuzz
  - [model checking](../finding_bugs/model_checking.md): TLA+ and P at AWS, MongoDB conformance checking, Mocket, trace validation
  - [Rust bug-finding tools](../finding_bugs/rust_tools.md): Loom, Shuttle, Kani, ShardStore abstract
  - [review B systems](../../../distributed_verification_review_b/review_b_systems_20261007.md): IronFleet, Verdi, Grove, Aneris, DaisyNFS, ShardStore with trusted-base notes
  - [transactions and regions](transactions_regions.md): MongoDB's VLDB 2025 storage-contract spec
- what this note adds
  - verified transaction systems: vMVCC and Tulip, which no sibling covers
  - the Verus storage line: SOSP 2024 persistent log, pmemlog, multilog, CapybaraKV, verified-ironkv
  - SquirrelFS, Yggdrasil, AtomFS, Flashix as the "cheaper than a full proof" family
  - 2025 to 2026 industry checking of storage engines: WiredTiger model-based tests, OmniLink, Antithesis on etcd and MongoDB, TigerBeetle, Aurora DSQL, Turso
  - LLM-written proofs measured on storage code: HotOS 2025 FSCQ study, VeruSAGE, IDS, MachCSL xv6
  - research we could do, judged against all of the above

my takeaway first
- the proof side has moved from "one file system, one logic" to reusable pieces: a crash-safe journal (GoJournal), a transaction library (vMVCC), a sharded replicated transaction system (Tulip), and a crash-and-corruption-safe PM store in Verus (CapybaraKV)
  - but no single system has durability, serializable transactions, replication, and a Rust implementation at once; vMVCC has no durability, Tulip is Go and has no liveness proof, CapybaraKV has no transactions
- the industry side does not prove; it checks the running code against a small model, and 2025 to 2026 work is about making that check cheap: TLC-generated tests for WiredTiger, trace validation without instrumentation (OmniLink), and a deterministic hypervisor (Antithesis) that found bugs in etcd and MongoDB's storage layer
- LLM agents now finish most leaf proof tasks in existing Verus storage code (78% on verified-storage tasks in VeruSAGE) and can write small verified key-value stores from a consistency spec in Rocq (IDS), but this review found no agent-produced crash-safe storage proof from scratch
- the opening I see for the human: a Verus-verified, crash-safe, strictly serializable key-value store in Rust, built from CapybaraKV's PoWER discipline and vMVCC's spec, with LLM agents doing the leaf proofs; see candidate 1
- a second, cheaper opening: measure the gap between what storage proofs assume about disks and what simulators like TigerBeetle's VOPR and Antithesis inject; see candidate 2

verified transaction systems
- these two MIT papers prove a transaction library and a full distributed transaction system; neither sibling note covers them
- [vMVCC, Chang, Jung, Sharma, Tassarotti, Kaashoek, Zeldovich, OSDI 2023](https://www.usenix.org/conference/osdi23/presentation/chang), paper is in the human's collection
  - abstract: "vMVCC is the first MVCC-based transaction library that comes with a machine-checked proof of correctness"
  - what is hard: "MVCC's linearization point happens before the transaction body runs—the linearization point is when the timestamp is obtained in Begin()"
    - so the proof must update the abstract state before it knows what the transaction will write or whether it commits
  - implementation is Go, verified with Goose and Perennial; includes "a verified algorithm for computing strictly increasing transaction IDs using RDTSC"
  - what is missing, in the authors' words: "One of the limitations of vMVCC is that it does not implement durability"; also "provides a simple key-value data model, as opposed to SQL's relational data, and does not support range scans"
  - my reading: this is the cleanest existing specification of "a transaction library", and it is in-memory only; the obvious next step, durability, is what they say they plan
- [Tulip, Chang, Tassarotti, Kaashoek, Zeldovich, SOSP 2026](https://people.csail.mit.edu/nickolai/papers/chang-psm.pdf), "Verifying a high-performance distributed transaction system using permissioned state machines"; scratch copy read: abstract, introduction, limitations, related work
  - abstract: "Tulip comes with a machine-checked proof of correctness showing that its implementation meets a simple specification identical to a local strictly serializable transaction system, abstracting away implementation details such as crash recovery, multi-versioning, replication, sharding, and coordinator recovery"
  - uses "TAPIR-style inconsistent replication" and claims "Tulip is the first verified distributed transaction system implementation"
  - the method, PSM: "extends TLA-style protocol reasoning with ideas from concurrent separation logic"; "makes all dependencies between modules explicit using permissions"
  - size: "3,956 lines of Go, and the proof consists of 42,131 lines of Rocq"; "The proof is about 11× the number of lines of executable code"
  - what is trusted and missing
    - "Tulip's proof does not guarantee that, for example, all transactions will eventually either commit or abort. Like TAPIR, Tulip does not support reconfiguration."
    - the implementation "build[s] on the Grove framework" and uses "Grove's network, file system, and RPC libraries", so Grove's trusted base (see [review B](../../../distributed_verification_review_b/review_b_systems_20261007.md)) carries over
    - "PSM requires a framework that supports reasoning about ownership of permissions; our prototype is built on top of Iris and Grove"
  - why it matters to the human: VerIso found that TAPIR as published violates even atomic visibility (see [consistency guarantees](consistency_guarantees.md)); Tulip is a TAPIR-style design that does carry a proof, so comparing the two would say exactly which TAPIR step was unsound; I have not done that comparison
  - my reading: Tulip is the ceiling today for "verified transactions"; its cost, 11× proof lines in Rocq, is what any Verus attempt must beat or justify
- how these relate to the sibling note's isolation proofs
  - the Aarhus Rocq/Iris work proves isolation levels for a research-language MVCC store; vMVCC and Tulip prove strict serializability for Go code that runs; the two lines have not been connected, as far as I found

the Verus storage line
- the human uses Verus, so this is the closest prior work; all of it comes from Microsoft Research and UT Austin
- [Verus, Lattuada et al., SOSP 2024](https://doi.org/10.1145/3694715.3695952), section 4.2.5 "New Verified System: Persistent Log"; scratch copy read
  - "a persistent circular log for byte-addressable storage devices such as Optane DC Persistent Memory"
  - "It is integrated into a production codebase, which incorporates it via Cargo.toml as just another Rust crate"
  - proves "the implementation refines an abstract, infinite log; that all operations are atomic with respect to crashes; and that the log metadata is protected from corruption up to CRC"
  - "Verus verifies the log implementation in 12s with a proof-to-code ratio of 3.9"
  - trusted: "For the crates that the verified code depends on, such as a CRC crate, we write a specification and mark it trusted"
  - a lesson on performance: the first version "converted each metadata structure to a byte slice before writing to persistent memory, incurring unnecessary copying"; fixed with "a Serializable trait with spec methods to specify the byte-level layout"
- [microsoft/verified-storage](https://github.com/microsoft/verified-storage), README read
  - pmemlog: "implements a persistent-memory append-only log", Verus, proves "crash consistency" and detection of "bit corruption"
  - multilog: "like pmemlog except it implements a collection of logs, each in its own region of persistent memory", with "a transactional interface" for "atomically committing appends across those logs"
  - capybaraKV: "a persistent-memory key-value store", Verus, "crash consistency and bit corruption"
  - capybaraNS: "a persistent-memory notary service", Dafny
  - soundness_proofs: "formalized arguments of soundness for the PoWER specification approach"
  - PoWER itself, OSDI 2025, is covered in [verification boundaries](verification_boundaries.md) and [file systems and storage](../../formal_verification_rust/practical_fv/file_systems_storage.md); I do not repeat it
- [verified-ironkv](https://github.com/verus-lang/verified-ironkv), README read
  - "Verus-verified implementation of Ironfleet Sharded Hash Table key-value store"
  - "only verifies the 'host program' from IronFleet", so the distributed-protocol proof layer of IronFleet is not reproduced
  - the [Verus projects page](https://verus-lang.github.io/verus/publications-and-projects/) lists only two storage items: this port and verified-storage
- what I did not find
  - no Verus port of VeriBetrKV, no verified LSM tree or B+ tree with crash safety in Verus, no Verus system with transactions; searches on 7 Oct returned nothing beyond the items above
  - inference: Verus storage today is "logs and a hash-indexed PM store with crash and corruption proofs"; everything with ordered indexes, transactions, or disks rather than PM is open

checked at compile time or by SMT, not by a full proof
- these systems trade proof strength for speed; useful as baselines for "how much checking is enough"
- [SquirrelFS, LeBlanc, Taylor, Bornholt, Chidambaram, OSDI 2024](https://www.usenix.org/conference/osdi24/presentation/leblanc), [arXiv](https://arxiv.org/abs/2406.09649), abstract and body sections read through a fetch tool
  - "We exploit the fact that Rust's typestate pattern allows compile-time enforcement of a specific order of operations"
  - "Synchronous Soft Updates, that boils down crash safety to enforcing ordering among updates to file-system metadata"
  - "Compiling SquirrelFS only takes tens of seconds; successful compilation indicates crash consistency, while an error provides a starting point for fixing the bug"
  - limit, authors' words: "Our typestate-based approach can only check ordering-based invariants"; an Alloy model of the update rules is checked separately
  - fetch tool's paraphrase: compile about 10 s versus FSCQ about 11 hours and VeriBetrKV 1.8 hours; 7,500 lines; testing still found "four crash-consistency bugs in unchecked code sections"
  - my reading: this is the same author as PoWER one year earlier; the pair shows the cost ladder from "typestate ordering" to "full Verus proof" on the same kind of PM file system
- [Yggdrasil, Sigurbjarnarson, Bornholt, Torlak, Wang, OSDI 2016](https://www.usenix.org/conference/osdi16/technical-sessions/presentation/sigurbjarnarson), search summary only
  - "crash refinement, which requires the set of possible disk states produced by an implementation (including states produced by crashes) to be a subset of those allowed by the specification"; fully SMT, no manual proofs
- [AtomFS, Zou et al., SOSP 2019](https://www.cs.columbia.edu/~rgu/publications/sosp19-zou.pdf), search summary only: "the first formally-verified concurrent file system", Coq, with a "helper mechanism where one operation of a thread can logically help other threads linearize"
- [Flashix, Augsburg, KIV](https://swt.informatik.uni-augsburg.de/swt/projects/flash.html), search summary only: "the first realistic verified file system for Flash memory"
- I did not reread these three; they predate 2022 and the sibling notes do not list them, so I record them for completeness

industry: checking storage engines without proving them
- all of these check running code against a model or under injected faults; none proves anything; see the sibling notes for the general method
- Amazon S3 ShardStore, SOSP 2021: see [rust tools](../finding_bugs/rust_tools.md) and [review B](../../../distributed_verification_review_b/review_b_systems_20261007.md); [AWS blog, Bornholt and Warfield, 20 Oct 2021](https://aws.amazon.com/blogs/storage/how-automated-reasoning-helps-us-innovate-at-s3-scale): specifications are "only about 13% more code on top of the implementation", checked "in hundreds of millions of scenarios"; the blog also says the team "validate[s] every single deployment of ShardStore"
  - I found no public follow-up paper on ShardStore after 2021; the 2025 CACM article on AWS practices returned HTTP 403 to my tools, so its storage-specific sentences are not quoted here; [model checking](../finding_bugs/model_checking.md) has what another agent got from it
- Aurora DSQL, [Brooker et al., arXiv 2607.13276](https://arxiv.org/abs/2607.13276), section 6 read from a scratch copy
  - "We specified the core protocols in TLA+ and P, and performed extensive model checking"
  - "We test the implementation extensively at build time using deterministic simulation testing. ... We developed turmoil, a framework in Rust for this purpose"
  - "the focus is on the system's ability to remain correct while handling errors and failures. Our experience, and data from Yuan et al [37], show that the majority of bugs in complex distributed systems are in error handling logic"
  - "Once deployed, we test the system using fault injection testing while under load, validating that the failure handling results from simulation are correct"
  - my reading: this is the 2026 AWS recipe for a new Rust database: TLA+ and P for the design, Turmoil for the code, fault injection in production; no proof of the implementation
- MongoDB WiredTiger model-based tests, [Schultz and Demirbas, MongoDB blog, 27 Feb 2026](https://mongodb.com/company/blog/engineering/towards-model-based-verification-key-value-storage-engine), read through a fetch tool
  - a TLA+ model of the boundary between the distributed transaction protocol and WiredTiger; tests generated from TLC check that "the underlying storage engine implementation actually conforms to the abstract behavior defined in our formal specification"
  - fetch tool's paraphrase: 87,143 tests from a model with 2 keys and 2 transactions, run in about 40 minutes; no bug is reported in the post
  - next steps in their words: "explore modeling of a more extensive subset of the WiredTiger API" and "explore alternate state space exploration strategies for generating tests, e.g., randomized path sampling"; they also mention "the role that LLMs can play in this type of verification workflow"
  - the VLDB 2025 paper behind this is in [transactions and regions](transactions_regions.md)
- [OmniLink, Hackett, Wrench, Macko, Davis, Wei, Beschastnikh, arXiv 2601.11836, Jan 2026](https://arxiv.org/abs/2601.11836), abstract read through a fetch tool
  - trace validation for "unmodified concurrent systems"; treats "system events as black boxes with a timebox in which they occurred"
  - applied to "WiredTiger, a state-of-the-art industrial database storage layer", enhancing "WiredTiger's existing TLA+ model"
  - found "two previously unknown bugs (1 in BAT, 1 in ConcurrentQueue)", not in WiredTiger
  - authors include MongoDB's Davis and PGo's Beschastnikh; this is the 2026 answer to MongoDB's 2020 finding that trace checking was impractical (see [model checking](../finding_bugs/model_checking.md))
- Antithesis, a deterministic hypervisor, on storage systems
  - [etcd blog, Siarkowicz, 3 Oct 2025](https://etcd.io/blog/2025/autonomus_testing_with_antithesis/), read through a fetch tool: runs "the entire etcd cluster inside a deterministic hypervisor"; uses "declarative, property-based assertions about system behavior"; "830 wall-clock hours of testing, which simulated 4.5 years of usage"; bugs include "Watch on future revision receiving old events" (fixed in 3.6.2) and "Panic from db page expected to be 5" (fixed in 3.6.5); five known old issues were reproduced
  - [Antithesis blog on MongoDB, 22 Apr 2024](https://antithesis.com/blog/mongo_bug/), fetch tool's paraphrase: an index entry "existed, but the document it referred to was missing" in the `_id` index of config.transactions; the cause sat in the replication rollback path inside WiredTiger's MVCC memory reclamation; Antithesis narrowed the window with checkpoint branching and core dumps every 100 ms
  - my reading: the bugs found are in recovery and rollback paths, the same places the proofs above spend their effort; this supports the sibling note's view that error handling is where bugs live
- [TigerBeetle safety page](https://docs.tigerbeetle.com/concepts/safety/), read through a fetch tool
  - "TigerBeetle is tested in the VOPR – a simulated environment where an entire cluster, running real code, is subjected to all kinds of network, storage and process faults, at 1000x speed"; "running 24/7 on 1024 cores"
  - its storage fault model cites disk studies: "Disks can silently return corrupt data (0.031% of SSD disks per year, 1.4% of Enterprise HDD disks per year)", "misdirect IO (0.023% of SSD disks per year, 0.466% of Nearline HDD disks per year)", and gray failure where disks "suddenly become extremely slow, without returning an error code"
  - "TigerBeetle uses Protocol Aware Recovery to remain available unless the data gets corrupted on every single replica"
  - Jepsen's 2025 findings on it are in [consistency guarantees](consistency_guarantees.md)
- [Turso's Limbo, Enberg and Costa, 10 Dec 2024](https://turso.tech/blog/introducing-limbo-a-complete-rewrite-of-sqlite-in-rust), read through a fetch tool
  - a Rust rewrite of SQLite; "With DST, we believe we can achieve an even higher degree of robustness than SQLite"
  - fetch tool's paraphrase: Antithesis caught io_uring partial-write cases their own simulator missed
  - inference: a simulator's fault model is itself a correctness assumption; what Turso's in-process simulator missed, the hypervisor caught, which is the same gap a proof's disk model has
- [CobbleDB, Ma, Pandey, Bieniusa, Shapiro, PaPoC 2026](https://arxiv.org/abs/2604.06273), abstract read through a fetch tool
  - "a reimplementation of RocksDB's levelled storage" derived from a formal spec of store variants whose "correctness and equivalence" were proved on paper; Java, "3,204 lines"; fetch tool's paraphrase: no mechanized proof, about 11.5× slower than RocksDB
  - I list it because it is the only 2026 attempt at an LSM-shaped store from a spec; it is not a verified system

LLM-written proofs for storage code
- general LLM proof synthesis is in [the human's LLM-for-verification notes](../../formal_verification_rust/llm_for_verification/index.md); this section keeps only results measured on storage or file-system code
- [Qin, Du, Zhang, Lentz, Zhuo, HotOS 2025](https://doi.org/10.1145/3713082.3730382), "Can Large Language Models Verify System Software? A Case Study Using FSCQ as a Benchmark"; in the human's collection, read in full
  - "with appropriate proof context and a straightforward best-first tree search, off-the-shelf LLMs achieve 38% proof coverage for theorems sampled from FSCQ"
  - "for simpler theorems—those with human proofs under 64 tokens, which make up about 60% of all FSCQ theorems—LLMs achieve over 57% coverage"
  - models were GPT-4o, GPT-4o mini, Gemini 1.5 Flash and Pro; the 38% figure is "the hinted GPT-4o model" on 5% of theorems; Coq tactics, not Verus
  - my reading: this is a 2024-era model result; whether current agents score higher requires a new evaluation; this review found no rerun, and FSCQ proofs are Coq tactic scripts, which is a different skill from Verus annotations
- [VeruSAGE, arXiv 2512.18436, Dec 2025](https://arxiv.org/abs/2512.18436), body read through a fetch tool; covered in general in [code and agents](../../formal_verification_rust/llm_for_verification/code_and_agents.md)
  - the benchmark has a "Storage" project (63 tasks, "Persistent storage verification", from microsoft/verified-storage) and IronKV (118 tasks)
  - fetch tool's paraphrase of the results table: best agent (Sonnet 4.5, hands-off) 78% on Storage and 84% on IronKV; the AutoVerus baseline 19% and 24%
  - why storage fails, in their words: "when Sonnet fails to complete a storage (ST) proof, the corresponding human-written proof leverages knowledge of code synthesized by a procedural macro"
  - my reading: the tasks are holes in finished human proofs, so 78% means "fills most leaf lemmas", not "writes a crash-safety proof"
- [Inductive Deductive Synthesis, Agarwal et al., arXiv 2605.23109, May 2026](https://arxiv.org/abs/2605.23109), abstract and body read through a fetch tool
  - "even SOTA coding agents (Codex with GPT-5.4 and Claude Code with Opus 4.6) succeed on only 2/7 distributed key-value-store specifications"
  - "IDS achieves 7/7 in about 6.8 hours and $106 per spec on average"; "implementations up to 3x faster than published verified systems"
  - targets Rocq: "using LLM agents driven by the proof assistant Rocq"; the seven specs are Chapar's causal consistency plus read-your-writes, monotonic reads, monotonic writes, their combinations, and a labeled causal consistency
  - fetch tool's paraphrase: extraction to OCaml, the network runtime, and the harness are trusted; the 3× figure is against Chapar's vector-clock reference
  - my reading: these are in-memory replicated stores with consistency specs, no crashes or disks; it shows agents can build a whole verified store when the spec is small, and it is the closest competitor to candidate 3 below
- [MachCSL on xv6, Kaashoek and Zeldovich, arXiv 2609.04043, Sept 2026](https://arxiv.org/abs/2609.04043), abstract read through a fetch tool
  - verifies xv6 on RISC-V including "a traditional Unix system call interface (processes, file system, file descriptors, and preemptive scheduling)"; "6,593" lines of C and assembly; "10" xv6 bugs and "1" Sail bug found; "93 days" including framework work
  - "LLM-based agents are capable of reasoning about such low-level details"
  - my reading: the first case where agents helped verify a file system end to end, though the file system is xv6's and the paper is three weeks old; I did not read the body
- what is not done: no paper has an agent write a crash-safety or corruption-detection proof in Verus for a storage component from a spec; VeruSAGE fills holes, IDS has no crashes, HotOS is Coq tactics

what proofs assume and what simulators inject, side by side
- the two camps model the disk differently, and that is where the research gap sits
- proofs
  - GoJournal: "We assume that the disk writes 4KB blocks atomically, even on crash" (quoted in [verification boundaries](verification_boundaries.md))
  - the Verus log and PoWER: corruption detected "up to CRC", under a stated bit-error model; stray writes mentioned as a PM risk
  - vMVCC: no disk at all; Tulip: Grove's file-system library is trusted
- simulators and checkers
  - TigerBeetle: silent corruption, misdirected I/O, gray failure, with disk-study rates quoted above
  - Antithesis on Turso: partial writes through io_uring
  - FoundationDB and Turmoil: "torn writes" (see [deterministic simulation testing](../finding_bugs/deterministic_simulation_testing.md))
- inference: no verified store I found models misdirected writes or fsync failure, and no simulator I found checks the ordering invariants a proof would; this review did not find a joint experiment comparing their fault models

research we could do
- all are proposals; novelty is argued from the sources above, not established; each names who could beat us
- candidate 1: a crash-safe, strictly serializable key-value store in Verus, with agents doing leaf proofs
  - question: can Verus deliver what vMVCC lacks (durability) and what CapybaraKV lacks (transactions) in one Rust system, at a proof-to-code ratio near PoWER's 2.6 rather than Tulip's 11
  - why existing work does not answer it: vMVCC says it "does not implement durability"; CapybaraKV proves crash consistency with no transaction interface beyond multilog's atomic appends; Tulip is Go and Rocq; the Aarhus work is a research language; [consistency guarantees](consistency_guarantees.md) candidate 3 proposes SI without durability
  - first step, about a month: put vMVCC's transaction spec (logical atomicity at Begin's timestamp) on top of multilog's transactional append; prove strict serializability for a single node with crashes under PoWER's write preconditions; measure proof lines, verification time, and throughput against CapybaraKV and an unverified Rust PM store
  - then: run VeruSAGE-style agents on the leaf obligations and report the share they finish, which turns the project into a data point for the human's agent-evaluation work
  - risks: Verus has no Iris-style prophecy or logical atomicity library, and vMVCC's "linearize before you know the writes" argument may need one; the Microsoft and UT Austin group (LeBlanc, Lorch, Hawblitzel) is the natural owner and may already be doing it
  - why us: the human already works in Verus, and the result is a runnable Rust crate, not a model
- candidate 2: line up proof assumptions with simulator fault models, then test one verified store outside its model
  - question: which disk behaviors that real simulators inject fall outside what verified storage proofs assume, and does a verified store fail under them
  - why existing work does not answer it: [verification boundaries](verification_boundaries.md) candidate 1 and [simulation testing](../finding_bugs/deterministic_simulation_testing.md) propose testing assumptions in general; this review did not locate an assumption-to-fault comparison for these systems or a verified-store hypervisor experiment; the search was incomplete
  - first step, two to three weeks: build the table from the papers' assumption sections; then select an injector compatible with CapybaraKV or pmemlog's persistent-memory interface; confirm its supported faults before proposing misdirected or torn writes, and classify each failure as "outside the model" or "proof bug or trusted-code bug"
  - measure: faults outside every proof's model; failures per fault class; whether any failure is in trusted Rust rather than verified Rust
  - risks: the answer may be "every failure is outside the model, as expected", which is a short paper; PM stores need a PM emulator, which weakens the device realism
  - why us: it joins the human's Verus interest with the finding-bugs slice, and it is mostly engineering and measurement
- candidate 3: an agent benchmark for crash-safety proofs
  - question: can current agents write PoWER-style crash-consistency proofs from a spec, not just fill holes
  - why existing work does not answer it: VeruSAGE's storage tasks are holes in human proofs and its reported failure is macro-generated code; IDS synthesizes stores with no crashes; the HotOS study used 2024 models on Coq tactics
  - first step: take pmemlog and multilog, strip the proofs but keep the specs and PoWER preconditions, and ask agents to re-verify; then give a spec-only task (a new log layout) and measure time, cost, and which obligations stay open
  - measure: tasks completed, dollars and hours per task as IDS reports, and a list of obligation kinds agents fail (crash preconditions, byte-layout lemmas, CRC axioms)
  - risks: the microsoft/verified-storage team or the VeruSAGE authors could publish this first; the benchmark could leak into training data
  - why us: the human's [verified agent code evaluation](../../../verified_agent_code_evaluation_20260808.md) work needs exactly such tasks
- candidate 4, weaker: prove a Rust engine against MongoDB's storage contract
  - question: if the TLA+ "Storage" contract MongoDB uses to generate 87,143 tests is instead the spec of a small Verus-verified engine, do the generated tests find anything, and does the proof catch anything the tests miss
  - why existing work does not answer it: MongoDB tests a C engine against the contract; OmniLink trace-checks it; this review found no verified engine implementing that contract
  - risk and overlap: this needs a TLA+-to-Verus specification step; the human's separate verus_distributed effort owns TLA+-to-Rust translation, so this candidate should wait for its result rather than duplicate it
- things I would not do
  - another verified in-memory consistency store: IDS now generates them
  - a verified text-book LSM tree with no crash model: CobbleDB shows the spec side is easy and the result is not a systems contribution

what I could not cover
- read in full: vMVCC and the HotOS 2025 paper from the collection, Tulip's abstract, introduction, limitations and related-work sections, Verus section 4.2.5, DSQL section 6; everything else through abstracts, READMEs, or a summarizing fetch tool, marked "fetch tool's paraphrase" where it paraphrased
- not reached: the CACM 2025 AWS practices article (HTTP 403 from two paths), TigerBeetle's VOPR page (redirect only; I used the safety page), Tulip's evaluation and proof sections, the OmniLink and IDS bodies past the abstract, the SOSP 2026 and OSDI 2026 programs for other storage proofs
- not found despite searching: a Verus port of VeriBetrKV, a verified LSM or B+ tree in Verus, a 2025 or 2026 Perennial storage system beyond Tulip, a public ShardStore follow-up
- not searched: Dropbox and Azure storage formal-methods accounts, Cogent and BilbyFS, verified SSD firmware or FTLs, the DSQL paper's references on Kani
- ChatGPT Extra High: no opinion obtained; the tool was not signed in, and the coordinator said not to run it
  - the self-contained prompt is saved at /tmp/claude-30033/-ssd1-sichanghe-github-io/85361e00-9330-4e62-a177-9736b46ce5e5/scratchpad/vs/chatgpt_prompt.md
  - the candidates above were not challenged by an outside reviewer
