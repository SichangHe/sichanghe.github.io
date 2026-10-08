# making consensus code correct: verification, model checking, testing
(authored by agents unless marked 🧑)

scope
- how people make consensus and replication code correct, and how they check the code matches the protocol spec
- overlap
  - [verification_boundaries.md](verification_boundaries.md) covers IronFleet, Perennial, Grove, CCF, Ellsberg, IronSpec briefly; this note does not repeat those quotes except where needed
  - sibling project verus_distributed covers general distributed verification and liveness proofs; only consensus-specific parts are here
  - [../finding_bugs/](../finding_bugs/index.md) covers DST, model checking, LLM bug finding in general; here only the consensus angle
- terms
  - spec: a precise description of what the system must do
  - TLA+: a language for writing specs of distributed protocols; TLC and Apalache are model checkers for it
  - model checking: try every reachable state of a small model, look for a bad one
  - refinement: every behavior of the code is allowed by the spec
  - trace validation: record what the real code did, then ask the model checker if the spec allows that run
  - DST (deterministic simulation testing): run the real code in a fake world where one seed fixes every random choice
- reading status
  - read in full text, relevant sections: Fonseca 2017, CCF NSDI 2025, Cirstea 2024, SandTable 2024, Newcombe 2014 (Amazon), ShardStore 2021, Agora 2026 (partly), Ghost Locks 2024 (case-study and related-work sections), Woos 2016 (abstract and intro), VeruSAGE (abstract, §benchmark)
  - abstract or web page only: everything else; marked "abstract only" where it matters
  - numbers are the authors' claims unless I say I checked them; I ran nothing

## takeaways

- verified consensus code has held up well on the protocol itself, and broke at the edges
  - Fonseca et al. 2017 looked for 8+ months and "none of these bugs were found in the distributed protocols of verified systems"
  - the 16 bugs they did find were in the spec, the shim (OS/network glue), and tooling
  - inference: for a new verified Rust consensus system, budget testing for the unverified edge, not the protocol
- proving code is expensive; proving a spec and then checking code against it is the practical industry path
  - Raft in Coq: 90 invariants, about 45000 extra proof lines (Woos 2016)
  - CCF (Microsoft): model check TLA+ spec, validate real C++ traces against it, in CI; six bugs found
- "does the code follow the spec" is the hard part, and it is mostly engineering, not theory
  - MongoDB tried trace checking on its server in 2020 and "This whole experiment failed. Our traces never matched our specification."
  - CCF succeeded: about 2 engineer-months for the consensus trace spec, 1 engineer-week for consistency
  - what differed: CCF wrote spec and logging with the code in view and reverse-engineered a Raft-level spec; MongoDB's was abstract and written late
- testing real implementations with simulated faults still finds bugs in every Raft library tried
  - Antithesis (July 2026): "we've found bugs in every Raft implementation we've tested", including HashiCorp Raft, OpenRaft (Rust), MicroRaft, Aeron
  - the workload was tiny: hash every command and compare nodes
- fuzzers guided by a spec or by timelines beat blind fault injection
  - Mallory: 22 zero-day bugs; model-guided fuzzing (TLA+ coverage): 13 new bugs in etcd-raft and RedisRaft
  - SandTable: explore the spec's state space, then replay in the real code: 23 bugs in 8 systems
- LLMs can help with spec writing and bug hunting, but the hard consensus cases are not solved
  - SysMoBench review: "only Claude Sonnet could even write a syntactically valid spec of etcd Raft. Its conformance score was less than 8%"
  - newer: Specula (July 2026) claims 249 bugs in 48 projects; I only read its abstract
  - Agora (2026): 15 new bugs in Raft, EPaxos, HotStuff, Bullshark implementations
- Rust specifically: little exists
  - verified Paxos in Rust via Prusti ghost locks (ETH); Verus IronKV port; Anvil (Verus, Kubernetes controllers)
  - I found no Verus-verified Raft or Multi-Paxos. This is my search result, not proof of absence
  - tools in Rust: Stateright (model checker), Shuttle and Loom (thread-interleaving testers), madsim and turmoil (simulation), Kani (bounded model checker)
- candidate gap: connecting Alpenglow models to Agave code
  - community TLA+ and Lean repositories exist
  - their proof coverage and connection to shipping code remain unchecked
  - see the [follow-up source assessment](research_shortlist.md)
  - this matches the human's Agave work; see research ideas

## landscape

### verified consensus implementations (prove the code)

- IronFleet, Hawblitzel et al., SOSP 2015 (Dafny; C# not Rust)
  - link: [local copy in paper collection]; abstract quote: "We demonstrate the methodology on a complex implementation of a Paxos-based replicated state machine library and a lease-based sharded key-value store. We prove that each obeys a concise safety specification, as well as desirable liveness requirements."
  - idea: prove a protocol-level state machine, refine it to a host-level one, then prove code against that
  - why it matters: the reference point; everything below is compared with it
- Verdi and Raft in Coq, Wilcox et al. PLDI 2015; Woos et al. CPP 2016
  - Woos abstract: "We present the first formal verification of state machine safety for the Raft consensus protocol... This proof required iteratively discovering and proving 90 system invariants. Our verified implementation is extracted to OCaml and runs on real networks."
  - intro: "These new proofs consist of about 45000 additional lines."
  - abstract: "The primary challenge we faced during the verification process was proof maintenance, since proving one invariant often required strengthening and updating other parts of our proof."
  - why it matters: shows the cost of proving Raft by hand-built invariants; proof maintenance is the real tax
- Velisarios, Rahli et al., ESOP 2018 (Coq, PBFT)
  - "we present the first machine-checked proof of a crucial safety property of an implementation of the area's reference protocol: PBFT"
  - only safety; Byzantine case
- Disel, Sergey, Wilcox, Tatlock, POPL 2018 (Coq; abstract only, via search result)
  - framework for implementing and verifying distributed systems and their clients together, in Coq; protocols are types
- Ivy: Paxos made EPR (Padon et al., OOPSLA 2017) and Modularity for decidability (Taube et al., PLDI 2018)
  - decidable logic lets the SMT solver check invariants automatically; verified implementations of Paxos and Raft reported (abstract only)
  - why it matters: fewer manual proofs, but you must fit your protocol into the decidable fragment
- Grove / GroveKV, Sharma et al., SOSP 2023 (Go, Iris/Coq)
  - "This makes Grove the first to support verification of distributed systems that use leases, including their interaction with crash recovery, reconfiguration, concurrency, and unreliable networks." (abstract)
  - see verification_boundaries.md for its own limitation quote (no liveness)
- Armada, Lorch et al., PLDI 2020 (Dafny-like)
  - low-effort verification of concurrent programs, with refinement strategies; it is a concurrency tool more than a consensus one; I did not check any consensus case study
- Igloo, Sprenger et al., OOPSLA 2020 (Isabelle/HOL; Java and Python code)
  - "methodology that combines compositional refinement of abstract, event-based models of distributed systems with verification of full-fledged program code using expressive separation logics" (search summary of abstract)
  - case studies: leader election, a replication protocol, a security protocol
- Trillium (Timany et al., POPL 2024) and Hinrichsen et al. (2024)
  - refinement and trace logic in Iris; includes liveness of distributed programs; in collection; not read beyond the abstract
- DistAlgo, Liu and Stoller et al.
  - high-level executable specs of Multi-Paxos, translated to TLA+ with machine-checked safety proofs; "allowed discovery and fixing of a subtle safety violation in an earlier specification" (search summary; abstract only)
- Jolteon and LiDO, Kim et al., PLDI 2024 (Coq)
  - "mechanized safety and liveness proofs for both unpipelined and pipelined Jolteon", described as the first mechanized liveness proof of a Byzantine protocol with pipelining (search summary)
- Bolt-On Strong Consistency, Lewchenko, Kaki, Chang, OOPSLA 2025
  - verifies a Raft-based strong replication system by building it on top of a weakly replicated store; SMT-based "Super-V" framework
  - "enables automated verification through local-scope artifacts called stable update preconditions, replacing standard-practice global inductive invariants" (summary)
  - why it matters: a way to avoid the 90-invariant problem
- in Rust
  - Ghost Locks, Bílý, Pereira, Schär, Müller, PLDI 2024 and OOPSLA 2025 follow-up "A Refinement Methodology for Distributed Programs in Rust"
    - "We implemented our approach in the state-of-the-art deductive Rust verifier, Prusti" (§4/§5)
    - §5.3: "we also specified and verified a version of the distributed consensus algorithm Paxos... In both cases we were able to verify an executable implementation with relatively low specification overhead and acceptable verification times."
    - the paper says it is "not tied to Prusti itself"; Verus mentioned only as related work
    - the OOPSLA 2025 version lists Memcached; one search summary also lists Paxos; not checked
  - Verus ports: IronKV (sharded KV from IronFleet), node replication, persistent-memory storage ([Verus projects page](https://verus-lang.github.io/verus/publications-and-projects/))
    - IronKV is replication-adjacent, not consensus
  - Anvil, Sun et al., OSDI 2024 (Verus)
    - "We use Anvil to verify three Kubernetes controllers for managing ZooKeeper, RabbitMQ, and FluentBit"
    - it verifies controllers that manage consensus systems, not the consensus protocol; liveness proof (see sibling project)

### proving the spec versus proving the code

- IronFleet's idea: spec, then protocol, then host code, linked by refinement
  - gap this leaves: the verified host runs on an unverified shim (network, disk, OS)
- Fonseca, Zhang, Wang, Krishnamurthy, EuroSys 2017: bugs in IronFleet, Verdi, Chapar
  - abstract: "Through code review and testing, we found a total of 16 bugs, many of which produce serious consequences, including crashing servers, returning incorrect results to clients, and invalidating verification guarantees."
  - §1: "these bugs occur at the interface between verified and other components, namely in the specification, shim layer, and auxiliary tools"
  - §1: "none of these bugs were found in the distributed protocols of verified systems, despite that we specifically searched for protocol bugs and spent more than eight months in this process"
  - §1: the authors say the verified systems are "research prototypes"
  - they built PK, a testing toolkit, "able to automate the detection of 13 (out of 16) bugs"
  - note: IronFleet's spec "does not guarantee exactly-once semantics" (Fig. 2 footnote), a spec weakness
- IronSpec (OSDI 2024) later found spec bugs in six verified systems; quote in verification_boundaries.md
- Amazon's own view (Newcombe et al. 2014, "Use of Formal Methods at Amazon Web Services")
  - "On learning about TLA+, engineers usually ask, 'How do we know that the executable code correctly implements the verified design?' The answer is that we don't."
  - "While we would like to verify that the executable code correctly implements the high-level specification... we are not aware of any such tools that can handle distributed systems as large and complex as those we are building."
  - on one bug: "the shortest error trace exhibiting the bug contained 35 high level steps... The bug had passed unnoticed through extensive design reviews, code reviews, and testing"
  - "So far we have used TLA+ on 10 large complex real-world systems. In every case TLA+ has added significant value"
- Antithesis on the same gap (Lim, Padhye, Primi, July 2026)
  - "implementations of even mechanically proven models can have flaws, because there's no mechanical way to check the implementors' assumptions"
  - they also say formal methods "are useful and necessary"

### model checking specs

- TLA+ at AWS, MongoDB, Microsoft
  - Amazon: 10 systems (2014 numbers above)
  - Azure Cosmos DB: Hackett, Rowe, Kuppe, ICSE-SEIP 2023: TLA+ spec of all five consistency levels, used to explain behaviors and an outage (search summary of abstract; saved)
  - MongoDB: also used TLA+ to find replication protocol bugs (Schultz, TLA+ Conf 2019; title seen only)
  - CockroachDB: I found no TLA+ source; only a blog about replication checks. Not covered
- CCF, Howard, Kuppe, Ashton, Chamayou, Crooks, NSDI 2025
  - abstract: "We use the term smart casual verification to describe our hybrid approach, which combines the rigor of formal specification and model checking with the pragmatism of automated testing, in our case binding the formal specification in TLA+ to the C++ implementation."
  - abstract: "find six subtle bugs in the design and implementation before they could impact production"
  - §1: "CCF's consensus logic, though based on Raft [74] has been sufficiently modified such that it is now based on an unproven algorithm. This is a common problem"
  - Table 2 bugs (5 safety, 1 liveness), e.g. "Incorrect election quorum tally: Quorum was tallied against union of active configurations, rather than against each individual active configuration"; "Truncation from early AE: Followers could roll back committed entries"
  - §7: the quorum bug came from "48 hours of exhaustive model checking of the consensus spec on a 128 core machine"
  - §6.5: "The effort to derive a version of the Trace spec that validated the majority of the traces required approximately two engineer-months, spread over four months."
  - §6.5: consistency spec trace validation "approximately one engineer-week, spread over a two-week period"
  - why it matters: the best public case of a spec bound to production consensus code in CI
- Alpenglow (Solana)
  - Anza announcement and press: whitepaper by Kniep, Sliwinski, Wattenhofer includes protocol specs for Votor and Rotor and "formal correctness proofs for safety and liveness" (from web summaries; I did not read the whitepaper)
  - activation and approval dates require a current primary record; earlier press dates were not verified
  - community TLA+ and Lean repositories exist; their checks and connection to Agave code were not audited
- Raft reconfiguration: Schultz et al. interactive proof decomposition (2024/25) and Howard's work are in the sibling notes; not repeated

### checking that code follows the spec (conformance)

- trace validation
  - Cirstea, Kuppe, Loillier, Merz, SEFM/iFM 2024
    - abstract: "The problem is reduced to a constrained model checking problem, realized using the TLC model checker... traces only contain updates to specification variables rather than full values, and developers may choose to trace only certain variables. We have applied our approach to several distributed programs, detecting discrepancies between the specifications and the implementations in all cases."
    - §4.3: causes include implementation shortcuts and differences in "the grain of atomicity"
    - case studies include two-phase commit, Raft-inspired code, CCF
  - etcd Raft: [TLA+ spec and trace validation](https://github.com/etcd-io/raft/tree/main/tla)
    - "If a trace suggests a state or transition that the state machine can't accommodate, it indicates a discrepancy between the model and its implementation."
    - known issue: "Partially persisted logs: the model assumes atomic persistence, but real systems may crash mid-write" (my paraphrase of the README; checked)
    - "It typically takes a few minutes to validate 3000 traces."
  - MongoDB, Davis, Hirschhorn, Schvimer, VLDB 2020; retrospective by Davis, [MongoDB blog, 2 June 2025](https://mongodb.com/blog/post/engineering/conformance-checking-at-mongodb-testing-our-code-matches-our-tla-specs)
    - "It took us a month to figure out how to instrument MongoDB to get a consistent snapshot of all these values at one moment."
    - spec "was written long after most of the implementation, and it was highly abstract"
    - "even if we'd gotten trace-checking to work for one spec we'd be practically starting over with the next spec"
    - test-case generation from the spec worked on another product: "immediately achieved 100% branch coverage of the implementation, which we hadn't accomplished with our handwritten tests (21%) or millions of executions with the AFL fuzzer (92%)" ([Davis blog](https://emptysqua.re/blog/mongodb-conformance-checking/))
    - if restarting, per the MongoDB blog summary: model observable events such as network messages, develop spec alongside code
- model-based testing: generate tests from the spec
  - Mocket, Wang et al., EuroSys 2023: model checking produces all traces of a finite TLA+ model; annotations in the code map variables and actions; the code is run to follow each trace with faults injected ([repo](https://github.com/tcse-iscas/Mocket); I could not get its paper numbers; abstract not read)
  - SandTable, Tang et al., EuroSys 2024
    - abstract: "lifting state-space exploration from the implementation level to the specification level, and confirming bugs at the implementation level"
    - "SandTable identified 23 bugs in total, with 18 new bugs, 17 confirmed, and 13 fixed"; 8 systems implementing "consensus protocols such as Raft and Zab"
    - "114×—2989× faster than implementation-level exploration"
    - §1: when adapting existing ZooKeeper specs, "it took two person weeks to modify the specification to conform to the implementation"
  - Netrix, Dragoi, Enea, Nagendra, Srivas (arXiv 2023): "4 deviations of the Tendermint implementation from the protocol specification... reproduce 4 previously known bugs in Raft"; tests are programmer-written scenarios, not generated from a spec
  - Model-guided fuzzing, Gulcan, Ozkan, Majumdar, Nagendra (arXiv 2024, v3 2025)
    - "We discovered 13 previously unknown bugs in their implementations, four of which could only be detected by model-guided fuzzing" (Etcd-raft and RedisRaft)
  - Formal Model Guided Conformance Testing for Blockchains, Drobnjakovic et al. (arXiv Jan 2025)
    - formal model plus implementation inside a deterministic blockchain simulator; two workflows, trace generator and checker; "both workflows are needed to detect all types of violations"
  - Ellsberg (NSDI 2025): see verification_boundaries.md
- spec-free checking of consensus: Twins, Jepsen-style, fuzzers
  - Twins, Bano et al., OPODIS 2021 (DiemBFT)
    - "twin copies" of a node with the same keys model equivocation, double voting, state loss
    - production code: "no errors"; "subtle safety bugs that were deliberately injected for the purpose of validating the implementation of Twins itself were exposed within minutes"
  - ByzzFuzz, Winter, Buse, de Graaf, von Gleissenthall, Ozkan, OOPSLA 2023
    - "small-scope message mutations"; "detected several bugs in the implementation of PBFT, a potential liveness violation in Tendermint, and materialized two theoretically described vulnerabilities in Ripple's XRP Ledger Consensus Algorithm"
  - Mallory, Meng, Pîrlea, Roychoudhury, Sergey, CCS 2023
    - "Compared to the start-of-the-art black-box fuzzer Jepsen, Mallory explores more behaviours and takes less time to find bugs. Mallory discovered 22 zero-day bugs (of which 18 were confirmed by developers)... 6 new CVEs"; targets include Braft, Dqlite, Redis
  - blockchain-focused fuzzers (abstract/summary only)
    - LOKI, NDSS 2023: "20 serious previously unknown vulnerabilities with 9 CVEs" in Go-Ethereum, Diem, Fabric, FISCO-BCOS
    - Fluffy (consensus bugs in Geth, found by differential testing across clients), Tyr, Phoenix ("13 previous-unknown resilience issues" in 5 blockchains): I have not read these beyond summaries
  - Jepsen findings on Raft systems
    - Redis-Raft: "twenty-one issues in development builds of Redis-Raft, including partial unavailability in healthy clusters, crashes, infinite loops on any request, stale reads, aborted reads, split-brain leading to lost updates, and total data loss on any failover" ([Jepsen](https://jepsen.io/analyses/redis-raft-1b3fbf6), 2020)
    - NATS JetStream 2.12.1 (2025): [Jepsen](https://jepsen.io/analyses/nats-2.12.1) writes that nodes "must flush [new log entries] to their disks" before acknowledging per the Raft thesis, and NATS acknowledges before the two-minute fsync; a single-bit error on one of five nodes lost 49.7% of acknowledged writes per a secondary report

### deterministic simulation testing for consensus

- general background is in [../finding_bugs/deterministic_simulation_testing.md](../finding_bugs/deterministic_simulation_testing.md)
- TigerBeetle VOPR
  - [protocol-aware DST post, 20 Aug 2026](https://tigerbeetle.com/blog/2026-08-20-protocol-aware-dst): checks invariants "not just at the database level, but also at the level of each individual replica" and the simulator can "run the real consensus and storage engine code"
  - the post names no specific bugs; a search result claims 30 bugs found, unverified
- Antithesis, ["finding bugs in raft implementations"](https://antithesis.com/blog/2026/finding-bugs-in-raft-implementations/), 27 July 2026
  - tested HashiCorp Raft, Aeron Cluster, OpenRaft, MicroRaft; "we've found bugs in every Raft implementation we've tested"
  - HashiCorp Raft: broken consensus from async heartbeats (state divergence), deadlock after leadership transfer, livelock in snapshot installation
  - OpenRaft (Rust) bugs not yet detailed in the post
  - workload: a state machine that "just hashes the bytes of incoming commands" plus a client sending random bytes
  - caveat: vendor blog, not peer reviewed
- FoundationDB, Rust simulators (madsim, turmoil), Shuttle and Loom
  - AWS ShardStore (Bornholt et al., SOSP 2021, Rust, a storage node not a consensus system): "develops executable reference models as specifications to be checked against the implementation"; "Our work has prevented 16 issues from reaching production"; "We use Loom to soundly check all interleavings of small, correctness-critical code... and Shuttle to randomly check interleavings of larger test harnesses"
  - AWS "Systems Correctness Practices at AWS" (Brooker and Desai, CACM June 2025): lists TLA+, P, property-based testing, fault injection, deterministic simulation, runtime trace validation (abstract via search; page blocked, not read)
- Stateright, Nadal ([README](https://github.com/stateright/stateright))
  - "Stateright is a Rust actor library... providing an embedded model checker, a UI for exploring system behavior, and a lightweight actor runtime."
  - "It also features a linearizability tester that can be run within the model checker for more exhaustive test coverage than similar solutions such as Jepsen."
  - includes single-decree Paxos example; the same Rust actors run on a real network
  - I found no peer-reviewed evaluation on a production consensus library

### LLM and agent work

- writing specs from code
  - SysMoBench, Cheng et al., arXiv 2509.23130 (v3 Jan 2026; ICLR 2026 version): 11 systems incl. etcd and Redis Raft, ZooKeeper election; four stages: syntax, runtime, conformance to code traces, invariants
    - Davis's review: "only Claude Sonnet could even write a syntactically valid spec of etcd Raft. Its conformance score was less than 8%"; and "LLMs have a long way to go before they replace human spec authors" ([review](https://emptysqua.re/blog/review-sysmobench/))
  - Specula, Cheng et al., arXiv 2607.25333 (28 July 2026): "a push-button agentic system that generates high-quality formal specifications for large, complex system code and uses the specifications for highly effective model checking and bug finding"; "found 249 bugs including many deep bugs that are hard to find by existing approaches" across 48 open-source projects (abstract only; saved)
    - it won the 2025 GenAI-accelerated TLA+ challenge per a search summary, with etcd Raft (Go) and Asterinas SpinLock (Rust) as demos
  - TLAssist, Cao et al., IACR ePrint 2026/978: LLM-assisted TLA+ for Byzantine reliable broadcast; "uncovered a previously undetected flaw in a CCS'25 distinguished paper" (abstract summary only)
  - NL-to-TLA+ benchmarks: TLA+-Bench, Can LLMs Write Correct TLA+ Specifications (Bisharat et al., 2026); TLA-Prover; LLM-guided TLAPS proofs (Zhou and Tripakis 2025); all in collection, not read
- finding bugs
  - Agora, Liu et al., arXiv 2605.29910 (May 2026): multi-agent; Raft (etcd), EPaxos, HotStuff, Bullshark (Sui); "discovers 15 previously unknown protocol-level logic bugs that violate safety properties, while existing LLM-based agents fail to detect any"
    - §4.1: of 46 reports from its TestGen agent, 34 real, "false positive rate of only 26.1%"
    - §5: "it still requires a certain amount of human knowledge"
  - DDBench, arXiv 2608.14863: 60 historical bugs from 13 distributed systems; pass rates "span 61 pp"; about repair, not finding
- writing proofs for Rust systems
  - VeruSAGE, Yang, Neamtu, Hawblitzel, Lorch, Lu, arXiv 2512.18436 (v2 Apr 2026): 849 proof tasks from eight Verus systems (incl. Anvil, IronKV, node replication); "The best LLM-agent combination in our study completes over 80% of system-verification tasks"
  - the eight systems include no consensus protocol; this is my reading of its Table 2 (IronKV, Anvil, memory allocator, node replication, NR kernel, storage, Atmosphere, verified parser)
  - RAG-Verus: only 20% or less of proof tasks in IronKV and others with GPT-4o, as quoted in VeruSAGE §1
  - related Verus agents (AutoVerus, VeriStruct, KVerus, StarVerus, ExVerus) are in the sibling project

## what is unsolved or messy

- the spec is also code, and it can be wrong
  - Fonseca: IronFleet's spec lacked exactly-once semantics; IronSpec (OSDI 2024) found ten spec bugs in six verified systems
- keeping spec and code in step as code changes
  - CCF put it in CI because "minor versions and patches released every 11 days on average" (§1); one-off efforts rot
  - MongoDB: work "specific to that spec" cannot be reused
- atomicity and persistence granularity
  - Cirstea: discrepancies from "differences in the grain of atomicity"
  - etcd TLA+ README: partial persistence not modeled
  - Jepsen NATS: fsync policy decides if a "committed" write survives; specs usually assume it does
- snapshotting state of a multithreaded process for trace checking (MongoDB, "a month")
- liveness: Grove leaves it outside its proofs; IronFleet proves some
  - simulation and fault testing provide additional evidence for particular executions
- protocol changes in production
  - CCF: Raft "sufficiently modified" so it is "an unproven algorithm"
  - Fonseca: each system's TCB hides assumptions
- who checks the checker
  - LLM-written specs can compile and conform to traces yet encode the wrong requirement; SysMoBench uses template invariants chosen by humans
  - Agora admits human knowledge still needed
- simulators miss what they do not model (disk corruption, real fsync, clock skew); Jepsen-NATS corruption results need exactly those faults
- evidence is mostly vendor blogs and abstracts for 2026 items; I could not independently check the bug counts

## research ideas

### 1. repeat Fonseca's study on Rust/Verus-era verified systems
- what exists: Fonseca 2017 (Dafny, Coq); IronSpec 2024 for spec bugs; PK toolkit
- search result: this review did not establish an incident-based evaluation of those Verus systems at their verified/unverified boundary
- why it matters: tells the human where to spend testing effort when they verify Agave pieces; findings will be concrete bug lists
- first experiment: list every `external_body`, `assume`, and trusted spec in IronKV and Anvil; fuzz the trusted shims (serialization, network, time); compare with Fonseca's categories
- risk: low to medium; closest work are Fonseca 2017, IronSpec 2024, "Verifying Verus" (Lean formalization of translation, thesis 2026)

### 2. trace validation for a Rust consensus library
- what exists: trace validation for Go (etcd raft), C++ (CCF), Java (Cirstea); SandTable for Java/Go/C systems; Specula demo on a Rust spinlock
- search result: this review did not establish a Rust consensus library with protocol-model checks of recorded executions in CI
  - inspect OpenRaft and raft-rs before treating this as a contribution
- why it matters: gives a repeatable recipe in Rust; Antithesis says OpenRaft has bugs, so there is something to find
- first experiment: adapt the etcd TLA+ spec and NDJSON trace logger idea to OpenRaft via the `tracing` crate; run under madsim or turmoil; ask TLC to validate traces; log mismatch classes (atomicity, persistence)
- risk: medium; closest: etcd raft TLA+ (Go), CCF, Specula

### 3. Alpenglow: spec, model check, then check Agave against it
- what exists: whitepaper with paper proofs; Votor/Rotor spec; implementation in Agave/Alpenglow branch
- remaining question: whether existing community models cover the intended voting rules and match a pinned Agave implementation
  - inspect and reproduce those models before proposing another spec
- why it matters: directly on the human's Agave work; consensus code about to go to mainnet (press says 2H 2026)
- first experiment: audit one existing Votor model against the whitepaper, reproduce its checks, then test whether recorded Rust vote-handling executions follow it
- risk: medium to high; Anza or auditors may have done it privately; unknown; check Alpenglow repos and Anza research posts first

### 4. spec-derived oracles inside deterministic simulation
- what exists: TigerBeetle protocol-aware DST (hand-written invariants); Antithesis hash-chain workload; SandTable; model-guided fuzzing
- candidate question: which additional defects automatically derived model checks find beyond an existing simulator’s assertions
- first experiment: take OpenRaft or raft-rs under madsim; compare a hash-of-commands oracle against invariants generated from the etcd TLA+ spec
- why: Antithesis shows even a weak oracle finds bugs; the question is what the stronger oracle adds
- risk: medium; closest: Gulcan et al. 2024, TigerBeetle post

### 5. agent-maintained spec in CI
- what exists: CCF human process; Specula one-shot generation; SysMoBench measures it
- candidate question: whether an agent can maintain a useful model across real code changes
  - checking recorded executions alone cannot establish that the model expresses the intended requirements
- first experiment: replay 50 commits of etcd raft or OpenRaft; ask an agent to update the TLA+ spec; score by whether traces still validate and by caught regressions
- risk: medium to high; SysMoBench and Specula authors (Xu group) are close

### 6. verified Rust Multi-Paxos or Raft with Verus, using agents
- what exists: IronFleet Paxos (Dafny); Paxos with Prusti ghost locks; Verus IronKV; VeruSAGE shows 80% on system tasks
- search result: no such Verus implementation or agent evaluation was established here
  - novelty and proof effort remain untested
- first experiment: port IronFleet's Paxos protocol layer to Verus state machines; measure proof lines per code line (Woos: 45000 extra lines for Raft; IronFleet and Grove numbers in their papers) and agent success on the lemmas
- risk: medium; I found none, but a private or recent project is plausible; check the Verus mailing list and Verus projects page

## sources

(P = saved to /hdd1/sichanghe/paper_collection by me this session; C = already in collection)

- Fonseca et al., An Empirical Study on the Correctness of Formally Verified Distributed Systems, EuroSys 2017 (C)
- Hawblitzel et al., IronFleet, SOSP 2015 (C)
- Wilcox et al., Verdi, PLDI 2015 (C); Woos et al., Planning for Change in a Formal Verification of the Raft Consensus Protocol, CPP 2016, [PDF](https://homes.cs.washington.edu/~jrw12/raft-proof.pdf) (C)
- Rahli et al., Velisarios, ESOP 2018 (C)
- Sergey, Wilcox, Tatlock, Programming and Proving with Distributed Protocols (Disel), POPL 2018, [PDF](https://discovery-pp.ucl.ac.uk/id/eprint/10030738/1/Sergey_disel.pdf)
- Padon et al., Paxos Made EPR, OOPSLA 2017 (C); Taube et al., Modularity for Decidability, PLDI 2018, [PDF](https://homes.cs.washington.edu/~jrw12/modularity-for-decidability.pdf)
- Sharma et al., Grove, SOSP 2023 (C)
- Lorch et al., Armada, PLDI 2020 (C)
- Sprenger et al., Igloo, OOPSLA 2020, [arXiv 2010.04749](https://arxiv.org/abs/2010.04749)
- Liu, Stoller et al., Moderately Complex Paxos Made Simple (DistAlgo), [arXiv 1704.00082](https://arxiv.org/abs/1704.00082)
- Kim et al., LiDO, PLDI 2024, [page](https://flint.cs.yale.edu/publications/lido.html)
- Lewchenko, Kaki, Chang, Bolt-On Strong Consistency, OOPSLA 2025, [page](https://plv.colorado.edu/papers/bolt-oopsla25.html)
- Bílý, Pereira, Schär, Müller, Refinement Proofs in Rust Using Ghost Locks, PLDI 2024, [arXiv 2311.14452](https://arxiv.org/abs/2311.14452) (P); A Refinement Methodology for Distributed Programs in Rust, OOPSLA 2025, [ETH page](https://www.research-collection.ethz.ch/items/091a2877-257f-4060-a4c4-dd266ff721b3)
- Sun et al., Anvil, OSDI 2024 (C); [Verus projects](https://verus-lang.github.io/verus/publications-and-projects/)
- Newcombe et al., Use of Formal Methods at Amazon Web Services, 2014, [PDF](https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf)
- Brooker, Desai, Systems Correctness Practices at AWS, CACM 68(6) 2025, [link](https://cacm.acm.org/practice/systems-correctness-practices-at-amazon-web-services) (not read; page blocked)
- Bornholt et al., Using Lightweight Formal Methods to Validate a Key-Value Storage Node in Amazon S3, SOSP 2021 (C; I also saved a copy, P)
- Hackett, Rowe, Kuppe, Understanding Inconsistency in Azure Cosmos DB with TLA+, ICSE-SEIP 2023, [arXiv 2210.13661](https://arxiv.org/abs/2210.13661) (P)
- Howard, Kuppe, Ashton, Chamayou, Crooks, Smart Casual Verification of CCF, NSDI 2025 (C)
- Cirstea, Kuppe, Loillier, Merz, Validating Traces of Distributed Programs Against TLA+ Specifications, 2024, [arXiv 2404.16075](https://arxiv.org/abs/2404.16075) (C)
- etcd raft TLA+ and trace validation, [repo dir](https://github.com/etcd-io/raft/tree/main/tla)
- Davis, Hirschhorn, Schvimer, eXtreme Modelling in Practice, VLDB 2020, [arXiv 2006.00915](https://arxiv.org/abs/2006.00915) (C); Davis, [Conformance Checking at MongoDB](https://mongodb.com/blog/post/engineering/conformance-checking-at-mongodb-testing-our-code-matches-our-tla-specs), 2025; Davis, [blog](https://emptysqua.re/blog/mongodb-conformance-checking/)
- Wang et al., Model Checking Guided Testing for Distributed Systems (Mocket), EuroSys 2023, [DOI](https://dl.acm.org/doi/10.1145/3552326.3587442), [repo](https://github.com/tcse-iscas/Mocket) (abstract not read)
- Tang et al., SandTable, EuroSys 2024 (C)
- Dragoi, Enea, Nagendra, Srivas, A Domain Specific Language for Testing Consensus Implementations (Netrix), [arXiv 2303.05893](https://arxiv.org/abs/2303.05893) (P)
- Gulcan, Ozkan, Majumdar, Nagendra, Model-guided Fuzzing of Distributed Systems, [arXiv 2410.02307](https://arxiv.org/abs/2410.02307) (P)
- Drobnjakovic et al., Formal Model Guided Conformance Testing for Blockchains, [arXiv 2501.08550](https://arxiv.org/abs/2501.08550)
- Bano et al., Twins: BFT Systems Made Robust, OPODIS 2021, [arXiv 2004.10617](https://arxiv.org/abs/2004.10617) (P)
- Winter et al., Randomized Testing of Byzantine Fault Tolerant Algorithms (ByzzFuzz), OOPSLA 2023, [PDF](https://gleissen.github.io/papers/byzzfuzz.pdf) (P)
- Meng, Pîrlea, Roychoudhury, Sergey, Greybox Fuzzing of Distributed Systems (Mallory), CCS 2023, [arXiv 2305.02601](https://arxiv.org/abs/2305.02601) (P)
- LOKI, NDSS 2023, [page](https://www.ndss-symposium.org/ndss-paper/loki-state-aware-fuzzing-framework-for-the-implementation-of-blockchain-consensus-protocols); Fluffy (Yang et al., OSDI 2021, [page](https://www.usenix.org/conference/osdi21/presentation/yang)); Tyr and Phoenix (summaries only, [Phoenix](https://citation.thinkst.com/talk/86997))
- Jepsen: [Redis-Raft](https://jepsen.io/analyses/redis-raft-1b3fbf6), [NATS 2.12.1](https://jepsen.io/analyses/nats-2.12.1), [jetcd 0.8.2](https://jepsen.io/analyses/jetcd-0.8.2)
- Lim, Padhye, Primi, [Finding bugs in Raft implementations](https://antithesis.com/blog/2026/finding-bugs-in-raft-implementations/), Antithesis, 2026
- TigerBeetle, [VOPR docs](https://docs.tigerbeetle.com/about/vopr), [Protocol-aware DST](https://tigerbeetle.com/blog/2026-08-20-protocol-aware-dst), 2026
- Stateright, [repo](https://github.com/stateright/stateright)
- Cheng et al., SysMoBench, [arXiv 2509.23130](https://arxiv.org/abs/2509.23130) (C); Davis review, [blog](https://emptysqua.re/blog/review-sysmobench/)
- Cheng et al., Specula, [arXiv 2607.25333](https://arxiv.org/abs/2607.25333) (C)
- Cao et al., TLAssist, [ePrint 2026/978](https://eprint.iacr.org/2026/978)
- Liu et al., Agora, [arXiv 2605.29910](https://arxiv.org/abs/2605.29910) (P)
- DDBench, [arXiv 2608.14863](https://arxiv.org/abs/2608.14863)
- Yang et al., VeruSAGE, [arXiv 2512.18436](https://arxiv.org/abs/2512.18436) (C)
- Alpenglow: [Anza blog](https://www.anza.xyz/blog/alpenglow-a-new-consensus-for-solana), [SIMD-0326](https://github.com/solana-foundation/solana-improvement-documents/blob/main/proposals/0326-alpenglow.md) (not read in detail)
- Kani, [arXiv 2607.01504](https://arxiv.org/abs/2607.01504) (title only)

## searched for and not found

- Verus-verified Raft or Multi-Paxos implementation
- machine-checked (Lean, Isabelle, Dafny) Raft proof from 2023-2026; searches returned only Verdi and older work
- Alpenglow code-to-spec checks
  - the earlier absence claim about models is superseded by the community repositories linked in [the shortlist](research_shortlist.md)
- CockroachDB TLA+ or trace validation (only a blog on replication checks surfaced)
- Mocket paper numbers; the repo gives none
- bug details for OpenRaft in the Antithesis post (promised later by the authors)
- any peer-reviewed evaluation of Stateright on a production consensus library
- AWS CACM 2025 article text (HTTP 403); Fluffy, Tyr, Phoenix full text
- arXiv API listing was unavailable, so 2025-2026 coverage comes from web search and may miss papers
