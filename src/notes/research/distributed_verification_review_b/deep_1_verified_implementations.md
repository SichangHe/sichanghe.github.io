# Human verification of executable distributed systems and their correctness specifications
(authored by agents unless marked 🧑)

Research cutoff: 6 October 2026. This review records 50 papers, with 9 newly saved PDFs and 35 PDFs reused from the collection. Six entries rely on metadata or author abstracts because full-text retrieval failed. “Formal-language implementation” means code with mutable state, threads, or network primitives proved in a formal operational semantics; it does not establish a runnable artifact by itself. “Extracted prototype” means proof-assistant code translated into a runnable language with listed runtime assumptions. “Production code” means code intended for the independently developed/deployed system. Refinement means proving that concrete execution conforms to an abstract specification; conformance is that connection for controller code. Trusted components are assumed correct rather than proved by the reported work. Collection links below identify stored copies, which may differ in pagination from the primary versions linked online and extracted into research_verified/*.paper.txt. Page references mean physical PDF pages unless stated otherwise; conference cover sheets therefore count. Short quotations preserve the relevant wording within copyright limits; the linked section supplies its context.

## What the evidence establishes

Humans usually start by choosing what clients are allowed to observe, rather than by proving every internal state “correct.” They then define the failures and environment under which that promise applies, and connect runnable code to that specification through refinement or component contracts. IronFleet’s concise statement is “The spec for IronRSL is simply linearizability” (§5.1); its implementation proof is layered below that specification. [IronFleet](https://www.andrew.cmu.edu/user/bparno/papers/ironfleet.pdf)

Progress needs additional obligations. A safe service can stop answering forever. Grove explicitly says “Grove cannot verify liveness properties” (Introduction). By contrast, Anvil formulates eventually stable reconciliation and proves temporal progress subject to an environment model and fairness. Welder makes interference and dependencies between controllers explicit. These results answer different questions and should not share one undifferentiated “verified distributed system” score. [Grove](https://pdos.csail.mit.edu/papers/grove:sosp23.pdf), [Anvil](https://www.usenix.org/system/files/osdi24-sun-xudong.pdf), [Welder](https://tianyin.github.io/pub/welder.pdf)

A proof of a protocol model does not cover a parser, scheduler, network wrapper, crash-recovery routine, or compiler unless a further argument connects them. This distinction is especially important for Verus IronKV: its authors explicitly write “We skip the protocol level” (§4.2.1). Conversely, LiDO’s extracted unpipelined Jolteon and Shipwright’s translated Go PBFT prototype do supply runnable cases, with limitations recorded below. [Verus 2024](https://doi.org/10.1145/3694715.3695952), [LiDO](https://flint.cs.yale.edu/publications/lido.pdf), [Shipwright](https://arxiv.org/abs/2507.14080)

**Inference for this project:** the task “vague human requirement → strong specification → proof” has at least three separately assessable outcomes: a specification that expresses the intended observations, assumptions the deployment can justify, and a proof that covers the intended code. None of these papers establishes that proving a generated specification automatically validates the user’s intent.

## What “correct” means in these cases

| Meaning | Concrete observation to formalize | Cases below |
|---|---|---|
| Linearizability | Completed calls behave like one sequential service, respecting real-time order | IronRSL, Verdi Raft, Grove vKV |
| Strict serializability | Entire transactions appear in a single order consistent with real time | Tulip; distinguish local vMVCC from a distributed database |
| Causal consistency/session guarantees | Reads respect causally prior updates and relevant session history | Chapar, distributed causal memory |
| CRDT convergence | Replicas with equivalent updates agree; eventual convergence additionally needs eventual communication | Op-/state-based CRDTs, Trillium formal-language proofs |
| Crash consistency/durability | Recovery returns an allowed persistent state after each possible crash | Perennial, VeriBetrKV, DaisyNFS, PoWER |
| Fault-aware atomic interface | Clients receive a well-defined result or explicitly modeled failure | WormSpace, Advert, Adore |
| Byzantine agreement | Honest nodes cannot decide incompatible values despite malicious peers | Velisarios, LiDO, Shipwright |
| Eventual stable reconciliation | A permanently desired state eventually matches the managed state forever | Anvil, Welder |
| Fair delivery/resumption | Retried transfer or a ready suspended task eventually advances under its stated assumptions | Fairneris (partly paper proof), Lion (abstract only) |
| Network security | Packets satisfy the specified forwarding/security rules in an adversarial environment | Verified SCION |

These names do not define a theorem by themselves. The entries link to the human-authored definitions and implementation boundary. In particular, “eventually” needs a trace model, a fairness/timing contract, and a decision about which event counts as success.

For Anvil-style reconciliation, a useful reading is `∀d. □(□desired(d) ⇒ ◇□matches(d))` at each eligible suffix of an execution: when the target remains desired forever, eventually it matches forever. Here `□` means always and `◇` means eventually; the outside `□` makes the promise apply at every suffix of an execution. Predicates abbreviate the paper’s desired-state and matching-state definitions. A changing target can make the fixed-target premise false, so a proof can hold without serving a continuously changing workload. Welder’s CORE contract further separates assumptions about interference, dependencies, success, and the controller’s own guarantee. [Anvil §§3–5](https://www.usenix.org/system/files/osdi24-sun-xudong.pdf), [Welder §§3–4](https://tianyin.github.io/pub/welder.pdf)

## Concrete problem inventory

Each row names a case and its code connection in parentheses, its actual guarantee/boundary, and the proof tools and human authors. Paper identifiers refer to the annotated entries below, which include source/artifact links and size/effort evidence. “Not reported” means this review did not establish a comparable human-effort figure; it does not mean no effort was required.

| Concrete case / source | Guaranteed observation and scope | Tool, people, size or effort |
|---|---|---|
| [IronRSL / IronKV](#ironfleet) (runnable prototype) | linearizable service + conditional IronRSL progress; map/refinement + IronKV retransmission fairness | Dafny; Hawblitzel et al.; 3.7 person-years for combined project |
| [Network transformers / replicated counter](#verdi) (runnable prototype) | preserve application observations while adding modeled failures | Coq→OCaml; Wilcox et al.; effort not established |
| [Raft](#raft-proof) (runnable prototype) | linearizable replication; no reconfiguration/liveness theorem | Coq→OCaml; Woos et al.; 530 code / 50,000 proof lines |
| [Two-phase commit / composed clients](#disel) (runnable prototype) | protocol and client functional safety; no guaranteed commit termination | Coq→OCaml; Sergey et al.; nine person-days core TPC |
| [Causal KV implementations / clients](#chapar) (runnable prototype) | causal observation correctness | Coq→OCaml; Lesani et al.; effort not established |
| [PBFT](#velisarios) (runnable prototype) | Byzantine agreement, not complete PBFT progress | Coq→OCaml; Rahli et al.; around one person-year |
| [Lock / logging / two-phase commit](#aneris) (formal-language code) | modular safety specifications in formal-language programs | Iris/Coq, ML-like code; Krogh-Jespersen et al. |
| [Causal database / session manager](#causal) (formal-language code) | causal histories and session guarantees in formal-language programs | Aneris/Coq; Gondelman et al. |
| [Operation CRDTs / causal broadcast](#opcrdt) (OCaml source → formal-language proof) | functional semantics and convergence condition | Aneris/Coq; Nieto et al. |
| [StateLib / state CRDTs](#crdts) (AnerisLang proof + OCaml execution) | merge correctness and convergence condition | Aneris/Coq; Nieto et al. |
| [Reliable channels / RPC / leader-follower KV](#reliable) (OCaml-like formal-language proof) | ordered protocol/API safety over UDP | Aneris/Coq; Gondelman et al. |
| [Paxos / 2PC implementations](#trillium) (formal-language code) | formal-language trace refinement and safety; do not infer runnable consensus liveness | Trillium/Aneris/Coq; Timany et al. |
| [Replicated CRDT](#trillium) (formal-language code) | strong eventual consistency under fair communication | Trillium/Aneris/Coq; Timany et al. |
| [Stenning sliding-window transfer](#fairneris) (formal-language code + paper proof) | implementation/model refinement; Stenning model liveness only a paper proof | Fairneris/Coq; Hinrichsen et al.; formal-language program |
| [vKV / reconfiguration / leases / bank](#grove) (runnable prototype) | linearizable KV and safe composition through crashes; no liveness | Go/Goose/Perennial/Coq; Sharma et al.; 2,435 Go / 28,077 spec-proof lines |
| [Crash-safe mail / replicated disks](#perennial) (local code) | local concurrent and recovery correctness | Go/Perennial/Coq; Chajed et al.; local replication |
| [DaisyNFS / GoTxn](#daisynfs) (runnable prototype) | concurrent/crash-safe verified core; unverified network wrapper | Go + Dafny + Perennial; Chajed et al.; wrapper 1,144 lines |
| [vMVCC](#vmvcc) (local code) | local transaction correctness | Go/Perennial/Coq; Chang et al. |
| [Weak-isolation MVCC database](#weakisolations) (OCaml source → formal-language proof) | read-uncommitted/committed/snapshot contracts and anomaly exclusions | OCaml/Aneris/Rocq; Mathiasen et al.; single database node |
| [Concurrent C-like structures](#armada) (local code) | refinement under modeled memory behavior | Armada/Dafny; Lorch et al.; local |
| [Node replication / concurrent cache](#ironsync) (local code) | linearizable shared-memory behavior; no general liveness | IronSync/Dafny; Hance et al.; local |
| [VeriBetrKV](#veribetrkv) (local code) | durable local map through asynchronous I/O and crashes | Dafny→C++; Hance et al.; local |
| [ZooKeeper controller](#anvil) (runnable prototype) | ESR through modeled crashes/restarts; conditional fairness | Rust/Verus + temporal model; Sun et al.; about two person-months ESR |
| [RabbitMQ / FluentBit controllers](#anvil) (runnable prototype) | ESR; RabbitMQ also application-specific safety | Rust/Verus; Sun et al.; about 2.5 person-months to implement/verify each controller |
| [ReplicaSet / Deployment / StatefulSet / RabbitMQ compositions](#welder) (runnable prototype) | conditional ESR + interference/dependency contracts | Rust/Verus; Cai et al.; 1.5 person-years framework/four cases |
| [Rust IronKV host](#verus24) (Rust host/local code) | host implements protocol-level host description; protocol skipped | Verus; Lattuada et al.; end-to-end effort not applicable |
| [Verus node replication](#verus24) (Rust host/local code) | shared-memory concurrent refinement | Verus; Lattuada et al.; local |
| [Tokenized state machines](#verus23) (proof infrastructure) | permission/transition obligations; no automatic distributed theorem | Verus macros; Lattuada et al.; infrastructure |
| [Leader election / replication / security examples](#igloo) (runnable prototype) | model-to-code safety; no eventual election theorem | Isabelle + VeriFast/Nagini; Sprenger et al. |
| [Write-once registers / shared log / applications](#wormspace) (runnable prototype) | functional refinement and failure atomicity; variants excluded | C/Coq/CCAL/CertiKOS; Shin et al.; six person-months core |
| [Multi-Paxos / chain replication / composite objects](#advert) (runnable prototype) | fault-aware atomic refinement | C/Coq/CCAL; Honoré et al.; Multi-Paxos 2.6K code / 43.9K proof |
| [Reconfigurable Raft-like system](#adore) (runnable prototype) | safe dynamic membership; no liveness | Coq→OCaml; Honoré et al.; five person-weeks abstract safety only |
| [Unpipelined Jolteon](#lido) (runnable prototype) | Byzantine linearizable object + infinitely-often responses under assumptions; extracted subset | Coq→OCaml; Qiu et al. |
| [Single-entry PBFT prototype](#shipwright) (runnable prototype) | agreement + conditional progress; no complete client reply/multi-entry theorem | Dafny→Go; Leung et al.; 1,888 implementation lines |
| [LastVoting/Paxos and round algorithms](#psync) (runnable prototype) | agreement/decision under stated good-round assumptions | Scala + SMT; Drăgoi et al.; 89 algorithm-only lines |
| [Round switching](#resync) (runnable runtime abstraction) | execution abstraction for benign/Byzantine consensus | Scala/runtime + mathematical argument; Drăgoi et al. |
| [Executable message-history algorithms](#distalgo) (runnable language, no generic proof) | language/compiler support; no generic protocol proof | DistAlgo→Python; Liu et al. |
| [S3 ShardStore node](#shardstore) (production validation) | tested/model-checked API, crash, concurrent properties; incomplete exploration | Rust reference models/property tests/Shuttle; Bornholt et al.; expert effort in entry |
| [CapybaraKV / notary](#power) (local storage/service core) | crash consistency/corruption detection; local storage/service core | Verus/Rust + Dafny/C#; LeBlanc et al.; sizes in entry |
| [VeriSMo](#verismo) (local code) | confidential-VM module security, not distributed replication | Rust/Verus; Zhou et al. |
| [Vest message formats](#vest) (format library) | parser/serializer properties, not protocol availability | Rust/Verus; Cai et al. |
| [Atmosphere kernel](#atmosphere) (local code) | kernel refinement/isolation, not network service correctness | Rust/Verus; Chen et al.; less than 2.5 person-years |
| [Tulip](#txn) (abstract + runnable repository) | strictly serializable sharded/replicated transactions; full assumptions unaudited | Go/Perennial/Rocq; Chang et al.; abstract: 3,956 code lines |
| [Lion async runtime](#lion) (abstract only) | ready yielded task eventually resumes; application/network progress separate | Rust/Verus; Zhou et al.; abstract only |
| [AutoMan protocol reimplementations](#automan) (abstract only) | generated + manual code checked by refinement; full boundary unaudited | AutoMan; Zhang et al.; abstract only |
| [Concurrent Memcached](#rustref) (abstract only) | Rust guard-based refinement; full boundary unaudited | Rust verification library; Bílý et al.; abstract only |
| [Verified SCION production router](#router) (abstract + production repository) | protocol security + Go crash/race freedom and refinement; full coverage unaudited | Isabelle/Gobra project; Pereira et al.; abstract + repo |
| [Derecho coordination C mechanism](#derecho) (metadata only) | targeted proof; exact theorem not retrieved | VST/Coq; Nagasamudram et al.; metadata only |
| [Fast Paxos / Jolteon abstraction](#adob) (extracted prototype + models) | GenJolteon extracted executable + conditional liveness; Fast Paxos network liveness incomplete | Coq→OCaml; Honoré et al.; prototype + protocol models |
| [Narwhal / Bullshark / Sailfish](#lidodag) (protocol model) | model agreement and conditional commitment | Coq; Qiu et al.; model-only |
| [Mysticeti](#mysticeti) (protocol model + production audit) | corrected model safety/liveness + production bug audit | Coq; Qiu et al.; production code not wholly proved |
| [Randomized asynchronous agreement](#suredistrib) (protocol model) | model probability-one termination, not every random trace | Coq; Qiu et al.; model-only |
| [Isolation-level adequacy](#isolation26) (specification theorem) | API proof entails named transactional consistency model | Rocq; Mathiasen et al.; semantic bridge |

## Annotated primary sources

Entries give the human authors, concrete implementation connection, guarantee boundary, and relevance to choosing a specification. Effort figures have deliberately different denominators. A reused component proof, an abstract protocol proof, and development of an entire framework are not comparable person-time measurements.

<a id="ironfleet"></a>

### IronFleet: Proving Practical Distributed Systems Correct

Chris Hawblitzel; Jon Howell; Manos Kapritsos; Jacob R. Lorch; Bryan Parno; Michael L. Roberts; Srinath Setty; Brian Zill. SOSP, 2015. [Paper](https://www.andrew.cmu.edu/user/bparno/papers/ironfleet.pdf). [Source/artifact or project](https://github.com/microsoft/Ironclad/tree/main/ironfleet). [Collection PDF](</hdd1/sichanghe/paper_collection/IronFleet-  Proving Practical Distributed Systems Correct, Chris Hawblitzel, Jon Howell, Manos Kapritsos, Jacob R. Lorch, Bryan Parno, Michael L. Roberts, Srinath Setty, Brian Zill, SOSP, 2015.pdf>). Boundary: **executable distributed**.

Humans write a small sequential service specification, a distributed protocol, then imperative Dafny code that implements each host. The proof combines protocol invariants, implementation refinement, and temporal progress arguments. IronRSL provides linearizable state-machine replication and progress under eventual timing bounds and sufficiently many responsive hosts. IronKV refines a key-value map and proves a retransmission fairness property; do not transfer IronRSL’s entire service-liveness theorem to IronKV. Compilation, OS/network interfaces, environment assumptions, and the manually justified concurrency reduction are part of the trust boundary. This is the direct precedent for translating a user-visible service promise into multiple proof layers. [Source](https://www.andrew.cmu.edu/user/bparno/papers/ironfleet.pdf)

Evidence: “The spec for IronRSL is simply linearizability” (§5.1, PDF p.9; quotation located on PDF p.9). [Context](https://www.andrew.cmu.edu/user/bparno/papers/ironfleet.pdf)

Size/effort: §7.1, PDF p.12: “3.7 person-years”. This covers methodology and both systems, not one protocol; Figure 12 separates implementation, proof, and specification counts. [Evidence](https://www.andrew.cmu.edu/user/bparno/papers/ironfleet.pdf)

<a id="verdi"></a>

### Verdi: A Framework for Implementing and Formally Verifying Distributed Systems

James R. Wilcox; Doug Woos; Pavel Panchekha; Zachary Tatlock; Xi Wang; Michael D. Ernst; Thomas Anderson. PLDI, 2015. [Paper](https://homes.cs.washington.edu/~mernst/pubs/verify-distsystem-pldi2015.pdf). [Source/artifact or project](https://github.com/uwplse/verdi). [Collection PDF](</hdd1/sichanghe/paper_collection/Verdi- A Framework for Implementing and Formally Verifying Distributed Systems, James R. Wilcox, et al., PLDI, 2015/paper.pdf>). Boundary: **executable distributed**.

Humans first prove event handlers in a friendly network, then apply verified transformers that add toleration of loss, duplication, crashes, or replication. Coq extraction produces OCaml handlers; a handwritten runtime handles sockets and scheduling. Correctness is preservation of application observations through these transformations. The original Raft work is extended by the separate CPP 2016 proof below. This offers reusable transformations for an agent, but their applicability must be checked against the requested failure model. [Source](https://homes.cs.washington.edu/~mernst/pubs/verify-distsystem-pldi2015.pdf)

Evidence: “verified system transformers” (Abstract; §§3–5; quotation located on PDF p.2). [Context](https://homes.cs.washington.edu/~mernst/pubs/verify-distsystem-pldi2015.pdf)

Size/effort: The paper reports artifact/code breakdowns; no comparable total person-time established in this review. [Evidence](https://homes.cs.washington.edu/~mernst/pubs/verify-distsystem-pldi2015.pdf)

<a id="raft-proof"></a>

### Planning for Change in a Formal Verification of the Raft Consensus Protocol

Doug Woos; James R. Wilcox; Steve Anton; Zachary Tatlock; Michael D. Ernst; Thomas Anderson. CPP, 2016. [Paper](https://homes.cs.washington.edu/~mernst/pubs/raft-proof-cpp2016.pdf). [Source/artifact or project](https://github.com/uwplse/verdi-raft). [Collection PDF](</hdd1/sichanghe/paper_collection/Planning for Change in a Formal Verification of the Raft Consensus Protocol, Doug Woos, James R. Wilcox, Steve Anton, Zachary Tatlock, Michael D. Ernst, Thomas Anderson, CPP, 2016.pdf>). Boundary: **executable distributed**.

The team iteratively discovered strengthened invariants, arranged the proof in reusable intermediate properties, and connected Raft state-machine safety to Verdi’s linearizability result. Extracted OCaml runs a key-value service. Membership reconfiguration and liveness are outside this result. The case is useful for evaluating invariant discovery and proof maintenance rather than merely asking an agent to fill an already stated lemma. [Source](https://homes.cs.washington.edu/~mernst/pubs/raft-proof-cpp2016.pdf)

Evidence: “state machine replication” (Abstract, PDF p.1; quotation located on PDF p.1). [Context](https://homes.cs.washington.edu/~mernst/pubs/raft-proof-cpp2016.pdf)

Size/effort: §5, PDF p.5: “530 lines of code and 50,000 lines of proof”. These are Raft development counts, not the whole runtime or framework. [Evidence](https://homes.cs.washington.edu/~mernst/pubs/raft-proof-cpp2016.pdf)

<a id="disel"></a>

### Programming and Proving with Distributed Protocols

Ilya Sergey; James R. Wilcox; Zachary Tatlock. POPL, 2018. [Paper](https://jamesrwilcox.com/disel.pdf). [Source/artifact or project](https://github.com/DistributedComponents/disel). [Collection PDF](</hdd1/sichanghe/paper_collection/Programming and Proving with Distributed Protocols, Ilya Sergey, James R. Wilcox, Zachary Tatlock, POPL, 2018.pdf>). Boundary: **executable distributed**.

A protocol defines allowed node states, messages, and transitions; local Hoare specifications explain what callers may rely on. Coq proves event-handling code and composition across protocol boundaries, then extracts runnable OCaml. Its main achievement is functional safety of both servers and clients, rather than termination through failures. The two-phase-commit example exposes why atomic agreement alone does not describe what an application actually gets. [Source](https://jamesrwilcox.com/disel.pdf)

Evidence: “compositional verification” (Abstract; §§3–4,8; quotation located on PDF p.1). [Context](https://jamesrwilcox.com/disel.pdf)

Size/effort: §8, PDF p.24: “nine person-days of work” for the core TPC development; Table 2 separates coordinator, participant, invariant, and supporting developments. [Evidence](https://jamesrwilcox.com/disel.pdf)

<a id="chapar"></a>

### Chapar: Certified Causally Consistent Distributed Key-Value Stores

Mohsen Lesani; Christian J. Bell; Adam Chlipala. POPL, 2016. [Paper](https://adam.chlipala.net/papers/ChaparPOPL16/ChaparPOPL16.pdf). [Source/artifact or project](https://github.com/mit-plv/chapar). [Collection PDF](</hdd1/sichanghe/paper_collection/Chapar- Certified Causally Consistent Distributed Key-Value Stores, Mohsen Lesani, Christian J. Bell, Adam Chlipala, POPL, 2016.pdf>). Boundary: **executable distributed**.

Coq proves two causal-store implementations against abstract causal semantics and extracts OCaml stores. Client checking reasons over those semantics instead of every network interleaving. Seeing an update must respect its causal dependencies; this is a weaker and different promise than a single global order. Runtime/shim and extraction remain trusted. This is a useful counterexample to automatically choosing linearizability whenever a user says “consistent.” [Source](https://adam.chlipala.net/papers/ChaparPOPL16/ChaparPOPL16.pdf)

Evidence: “We have verified the causal consistency of two key-value store implementations from the literature using a novel proof technique.” (Abstract, PDF p.1). [Context](https://adam.chlipala.net/papers/ChaparPOPL16/ChaparPOPL16.pdf)

Size/effort: Not separately reported here. [Evidence](https://adam.chlipala.net/papers/ChaparPOPL16/ChaparPOPL16.pdf)

<a id="velisarios"></a>

### Velisarios: Byzantine Fault-Tolerant Protocols for Verified Distributed Systems

Vincent Rahli; Ivana Vukotic; Marcus Völp; Paulo Esteves-Verissimo. ESOP, 2018. [Paper](https://vrahli.github.io/articles/velisarios.pdf). [Source/artifact or project](https://github.com/vrahli/Velisarios). [Collection PDF](</hdd1/sichanghe/paper_collection/Velisarios- Byzantine Fault-Tolerant Protocols for Verified Distributed Systems, Vincent Rahli, et al., ESOP, 2018/paper.pdf>). Boundary: **executable distributed**.

The authors use Coq’s event-based model to prove agreement for PBFT in the presence of Byzantine nodes and extract OCaml code. The proof talks about authenticated information and fault thresholds; the executable environment supplies networking and cryptographic operations. Agreement is the important established property, not a complete PBFT client-response or progress theorem. This tests whether an agent distinguishes incompatible-output prevention from eventual service. [Source](https://vrahli.github.io/articles/velisarios.pdf)

Evidence: “PBFT’s agreement property” (§6, PDF p.21; quotation located on PDF p.21). [Context](https://vrahli.github.io/articles/velisarios.pdf)

Size/effort: §6, PDF p.21: “around 1 person year”; “around 20000 lines of specifications”; “around 22000 lines of proofs”. These are PBFT counts, with separate framework counts. [Evidence](https://vrahli.github.io/articles/velisarios.pdf)

<a id="aneris"></a>

### Aneris: A Mechanised Logic for Modular Reasoning about Distributed Systems

Morten Krogh-Jespersen; Amin Timany; Marit Edna Ohlenbusch; Simon Oddershede Gregersen; Lars Birkedal. ESOP, 2020. [Paper](https://iris-project.org/pdfs/2020-esop-aneris-final.pdf). [Source/artifact or project](https://github.com/logsem/aneris). [Collection PDF](</hdd1/sichanghe/paper_collection/Aneris-  A Mechanised Logic for Modular Reasoning about Distributed Systems, Morten Krogh-Jespersen, Amin Timany, Marit Edna Ohlenbusch, Simon Oddershede Gregersen, Lars Birkedal, ESOP, 2020.pdf>). Boundary: **formal-language implementation**.

Iris/Coq separation logic lets a human verify one node or component while describing other components through their interfaces. Assertions track local memory, sent messages, received messages, and logical resources. These are modular functional-safety/partial-correctness specifications over an ML-like formal language. The original paper proves programs within AnerisLang; it does not establish an OCaml extraction/runtime connection. An OCaml-like syntax is not by itself a runnable artifact. The practical lesson is to expose enough history in an interface for clients to prove useful statements without revealing server internals. [Source](https://iris-project.org/pdfs/2020-esop-aneris-final.pdf)

Evidence: “Notice that the programs look as if they were written in a realistic functional language with sockets like OCaml.” (§2.3, PDF p.7). [Context](https://iris-project.org/pdfs/2020-esop-aneris-final.pdf)

Size/effort: Not separately reported here. [Evidence](https://iris-project.org/pdfs/2020-esop-aneris-final.pdf)

<a id="causal"></a>

### Distributed Causal Memory: Modular Specification and Verification in Higher-Order Distributed Separation Logic

Léon Gondelman; Simon Oddershede Gregersen; Abel Nieto; Amin Timany; Lars Birkedal. POPL, 2021. [Paper](https://iris-project.org/pdfs/2021-popl-ccddb-final.pdf). [Source/artifact or project](https://github.com/logsem/aneris). [Collection PDF](</hdd1/sichanghe/paper_collection/Distributed Causal Memory-  Modular Specification and Verification in Higher-Order Distributed Separation Logic, Leon Gondelman, Simon Oddershede Gregersen, Abel Nieto, Amin Timany, Lars Birkedal, POPL, 2022.pdf>). Boundary: **formal-language implementation**.

Aneris specifications connect reads/writes to causally ordered histories and support separate proofs of database clients. The session library establishes read-your-writes, monotonic reads/writes, and writes-follow-reads. This gives concrete meanings for a user’s request to preserve order across sessions. The theorem concerns allowed observations and functional correctness; it should not be described as unconditional eventual delivery or database availability. [Source](https://iris-project.org/pdfs/2021-popl-ccddb-final.pdf)

Evidence: “causally-consistent distributed database that supports modular verification of full functional correctness properties of clients and servers” (Abstract, PDF p.1). [Context](https://iris-project.org/pdfs/2021-popl-ccddb-final.pdf)

Size/effort: Not separately reported here. [Evidence](https://iris-project.org/pdfs/2021-popl-ccddb-final.pdf)

<a id="opcrdt"></a>

### Modular Verification of Op-Based CRDTs in Separation Logic

Abel Nieto; Léon Gondelman; Alban Reynaud; Amin Timany; Lars Birkedal. OOPSLA, 2022. [Paper](https://iris-project.org/pdfs/2022-oopsla-crdts.pdf). [Source/artifact or project](https://github.com/logsem/aneris). [Collection PDF](</hdd1/sichanghe/paper_collection/Modular Verification of Op-Based CRDTs in Separation Logic, Abel Nieto, Leon Gondelman, Alban Reynaud, Amin Timany, Lars Birkedal, OOPSLA, 2022.pdf>). Boundary: **OCaml source translated to formal-language implementation**.

Humans prove a causal-broadcast layer and a reusable operation-based replication library, then verify individual data types against their abstract operations. This separates the obligation that concurrent operations commute from the obligation that transport respects dependencies. Convergence when replicas have processed the same operations is a safety condition. Eventual arrival of all updates requires an additional progress theorem; the 2024 Trillium example explicitly supplies one. OCaml library source is translated into AnerisLang for proof; compiler, translator, and actual network runtime coverage must be treated separately. [Source](https://iris-project.org/pdfs/2022-oopsla-crdts.pdf)

Evidence: “This paper presents a framework for verifying safety properties of CRDT implementations using separation logic.” (Abstract, PDF p.1). [Context](https://iris-project.org/pdfs/2022-oopsla-crdts.pdf)

Size/effort: Not separately reported here. [Evidence](https://iris-project.org/pdfs/2022-oopsla-crdts.pdf)

<a id="crdts"></a>

### Modular Verification of State-Based CRDTs in Separation Logic

Abel Nieto; Arnaud Daby-Seesaram; Léon Gondelman; Amin Timany; Lars Birkedal. ECOOP, 2023. [Paper](https://iris-project.org/pdfs/2023-ecoop-crdts.pdf). [Source/artifact or project](https://doi.org/10.5281/zenodo.7718868). [Collection PDF](</hdd1/sichanghe/paper_collection/Modular Verification of State-Based CRDTs in Separation Logic, Abel Nieto, Arnaud Daby-Seesaram, Leon Gondelman, Amin Timany, Lars Birkedal, ECOOP, 2023.pdf>). Boundary: **AnerisLang proof with OCaml execution experiment**.

A reusable verified library merges states; individual CRDT proofs connect internal lattices and merge functions to application operations. The framework prevents inconsistent answers for equivalent replicated knowledge. It is a concrete way to formulate correctness for mergeable data without requiring a global total order. The artifact gives executable examples; do not infer a delivery/termination theorem from the word convergence alone. The paper explicitly discusses OCaml used to run the code (§4.2); the proof remains over AnerisLang, so this is not a verified OCaml compiler or production-runtime theorem. [Source](https://iris-project.org/pdfs/2023-ecoop-crdts.pdf)

Evidence: “Using StateLib, we have further verified convergence and functional correctness of multiple example CRDTs from the literature.” (Abstract, PDF p.1). [Context](https://iris-project.org/pdfs/2023-ecoop-crdts.pdf)

Size/effort: Not separately reported here. [Evidence](https://iris-project.org/pdfs/2023-ecoop-crdts.pdf)

<a id="reliable"></a>

### Verifying Reliable Network Components in a Distributed Separation Logic with Dependent Separation Protocols

Léon Gondelman; Jonas Kastberg Hinrichsen; Mário Pereira; Amin Timany; Lars Birkedal. ICFP, 2023. [Paper](https://iris-project.org/pdfs/2023-icfp-relcom.pdf). [Source/artifact or project](https://github.com/logsem/aneris). [Collection PDF](</hdd1/sichanghe/paper_collection/Verifying Reliable Network Components in a Distributed Separation Logic with Dependent Separation Protocols, Léon Gondelman, et al., ICFP, 2023/paper.pdf>). Boundary: **OCaml-like formal-language implementation**.

Dependent protocols specify both the order and contents of messages exchanged through a reliable-channel abstraction. Humans verify acknowledgement/sequence handling over unreliable UDP, then reuse the abstraction for RPC and a leader/follower key-value service. This is compositional functional correctness under the modeled network, not a claim that arbitrary failed peers eventually answer. The distinction is valuable when an agent chooses a transport specification. The source is described as an OCaml-like language; no independently audited real-runtime refinement is claimed here. [Source](https://iris-project.org/pdfs/2023-icfp-relcom.pdf)

Evidence: “Our library is imple- mented in an OCaml-like language on top of UDP” (Abstract, PDF p.1). [Context](https://iris-project.org/pdfs/2023-icfp-relcom.pdf)

Size/effort: Not separately reported here. [Evidence](https://iris-project.org/pdfs/2023-icfp-relcom.pdf)

<a id="trillium"></a>

### Trillium: Higher-Order Concurrent and Distributed Separation Logic for Intensional Refinement

Amin Timany; Simon Oddershede Gregersen; Léo Stefanesco; Jonas Kastberg Hinrichsen; Léon Gondelman; Abel Nieto; Lars Birkedal. POPL, 2024. [Paper](https://iris-project.org/pdfs/2024-popl-trillium.pdf). [Source/artifact or project](https://github.com/logsem/trillium). [Collection PDF](</hdd1/sichanghe/paper_collection/Trillium- Higher-Order Concurrent and Distributed Separation Logic for Intensional Refinement, Amin Timany, Simon Oddershede Gregersen, Leo Stefanesco, Jonas Kastberg Hinrichsen, Leon Gondelman, Abel Nieto, Lars Birkedal, POPL, 2024.pdf>). Boundary: **formal-language implementation**.

Trace refinement relates execution steps to an abstract model while preserving temporal properties. Aneris instances verify safety of Paxos/2PC implementations; a CRDT example establishes strong eventual consistency with fair inter-replica communication, and Fairis handles fair termination of concurrent programs. These are different examples, not one general proof that every Paxos implementation terminates. The contribution explains what extra proof machinery is needed to carry progress from a model to a formal-language program. [Source](https://iris-project.org/pdfs/2024-popl-trillium.pdf)

Evidence: “fairness of the inter-replica communication” (Introduction, PDF p.3; §§4–5 and CRDT appendix). [Context](https://iris-project.org/pdfs/2024-popl-trillium.pdf)

Size/effort: Not separately reported here. [Evidence](https://iris-project.org/pdfs/2024-popl-trillium.pdf)

<a id="fairneris"></a>

### Verifying Liveness Properties of Distributed Systems via Trace Refinement in Higher-Order Concurrent Separation Logic

Jonas Kastberg Hinrichsen; Léo Stefanesco; Lars Birkedal; Amin Timany. author manuscript, 2024. [Paper](https://cpv.au.dk/pdfs/2024-fairneris.pdf). [Source/artifact or project](https://github.com/logsem/aneris/tree/fairneris). [Collection PDF](</hdd1/sichanghe/paper_collection/Verifying Liveness Properties of Distributed Systems via Trace Refinement in Higher-Order Concurrent Separation Logic, Jonas Kastberg Hinrichsen, Léo Stefanesco, Lars Birkedal, Amin Timany, manuscript, 2024/paper.pdf>). Boundary: **formal-language implementation; model-liveness paper proof**.

The author manuscript extends Aneris/Trillium to distributed safety and progress. It reasons about Stenning sliding-window protocol code in AnerisLang over a formal UDP-like operational semantics. The implementation/model refinement is mechanized, but the Stenning model-liveness theorem is only a paper proof. Consequently, the complete eventual-transfer argument is not fully machine checked. An independent runnable OCaml extraction/runtime was not established here. This is a useful progress/refinement case with an explicit remaining proof obligation, rather than a fully certified runnable UDP implementation. Final publication venue was not established. [Source](https://cpv.au.dk/pdfs/2024-fairneris.pdf)

Evidence: “The only exception is the liveness theorem of the Stenning model, for which we instead give a paper proof.” (§1.4, PDF p.5). [Context](https://cpv.au.dk/pdfs/2024-fairneris.pdf)

Size/effort: Not separately reported here. [Evidence](https://cpv.au.dk/pdfs/2024-fairneris.pdf)

<a id="grove"></a>

### Grove: a Separation-Logic Library for Verifying Distributed Systems

Upamanyu Sharma; Ralf Jung; Joseph Tassarotti; M. Frans Kaashoek; Nickolai Zeldovich. SOSP, 2023. [Paper](https://pdos.csail.mit.edu/papers/grove:sosp23.pdf). [Source/artifact or project](https://github.com/mit-pdos/gokv). [Collection PDF](</hdd1/sichanghe/paper_collection/Grove- a Separation-Logic Library for Verifying Distributed Systems, Upamanyu Sharma, Ralf Jung, Joseph Tassarotti, M. Frans Kaashoek, Nickolai Zeldovich, SOSP, 2023.pdf>). Boundary: **executable distributed**.

Go implementations are translated by Goose and verified in Perennial/Iris/Coq. vKV provides a linearizable map despite independently crashing/recovering multithreaded servers, primary/backup replication, reconfiguration, and reads protected by leases. Abstract time and ghost ownership account for a lease expiring between a check and use. Clients such as a bank application can be proved from component interfaces. The paper explicitly excludes liveness, so the strong fault model does not imply that operations always finish. [Source](https://pdos.csail.mit.edu/papers/grove:sosp23.pdf)

Evidence: “Grove cannot verify liveness properties” (Introduction, PDF p.2; quotation located on PDF p.2). [Context](https://pdos.csail.mit.edu/papers/grove:sosp23.pdf)

Size/effort: Figure 10, PDF p.12: “Total verified 2,435 28,077”, respectively Go code and Coq specification/proof across verified components. The table does not include every trusted/runtime line. [Evidence](https://pdos.csail.mit.edu/papers/grove:sosp23.pdf)

<a id="perennial"></a>

### Verifying concurrent, crash-safe systems with Perennial

Tej Chajed; Joseph Tassarotti; M. Frans Kaashoek; Nickolai Zeldovich. SOSP, 2019. [Paper](https://www.chajed.io/papers/perennial:sosp2019.pdf). [Source/artifact or project](https://github.com/mit-pdos/perennial). [Collection PDF](</hdd1/sichanghe/paper_collection/Verifying concurrent- crash-safe systems with Perennial, Tej Chajed, Joseph Tassarotti, M. Frans Kaashoek, Nickolai Zeldovich, SOSP, 2019.pdf>). Boundary: **local infrastructure**.

Perennial adds crash/recovery reasoning to concurrent separation logic. Humans distinguish ordinary call specifications from recovery specifications, then reason about durable versus volatile ownership. The replicated-disk example is local disk replication, not a network replication protocol. This provides the foundation used later by Grove/Tulip and a way to state what survives a restart. [Source](https://www.chajed.io/papers/perennial:sosp2019.pdf)

Evidence: “a framework for verify- ing concurrent, crash-safe systems” (Abstract, PDF p.1). [Context](https://www.chajed.io/papers/perennial:sosp2019.pdf)

Size/effort: Not separately reported here. [Evidence](https://www.chajed.io/papers/perennial:sosp2019.pdf)

<a id="daisynfs"></a>

### Verifying the DaisyNFS concurrent and crash-safe file system with sequential reasoning

Tej Chajed; Joseph Tassarotti; Mark Theng; M. Frans Kaashoek; Nickolai Zeldovich. OSDI, 2022. [Paper](https://pdos.csail.mit.edu/papers/daisy-nfs:osdi22.pdf). [Source/artifact or project](https://github.com/mit-pdos/daisy-nfsd). [Collection PDF](</hdd1/sichanghe/paper_collection/Verifying the DaisyNFS concurrent and crash-safe file system with sequential reasoning, Tej Chajed et al., OSDI, 2022/paper.pdf>). Boundary: **network-facing, partial boundary**.

Humans verify a Go transaction layer with Perennial, sequential file-system operations with Dafny, and prove a theorem connecting transaction-level atomicity to a concurrent/crash-safe file-system specification. A runnable Go NFS server wraps the verified core. The NFS wrapper is unverified, and interface/translation assumptions remain; this is not a proof of all NFS wire-protocol behavior. It demonstrates composition between two verification tools and the need to list exactly which server code is covered. [Source](https://pdos.csail.mit.edu/papers/daisy-nfs:osdi22.pdf)

Evidence: “daisy-nfsd unverified” (Figure 12, PDF p.12; §9.3; quotation located on PDF p.12). [Context](https://pdos.csail.mit.edu/papers/daisy-nfs:osdi22.pdf)

Size/effort: Figure 12, PDF p.12: the unverified wrapper code count is “1,144”. Verified component counts appear separately; §8 explains trusted interface assumptions. [Evidence](https://pdos.csail.mit.edu/papers/daisy-nfs:osdi22.pdf)

<a id="vmvcc"></a>

### Verifying vMVCC, a high-performance transaction library using multi-version concurrency control

Yun-Sheng Chang; Ralf Jung; Upamanyu Sharma; Joseph Tassarotti; M. Frans Kaashoek; Nickolai Zeldovich. OSDI, 2023. [Paper](https://pdos.csail.mit.edu/papers/vmvcc:osdi23.pdf). [Source/artifact or project](https://github.com/mit-pdos/vmvcc). [Collection PDF](</hdd1/sichanghe/paper_collection/Verifying vMVCC, a high-performance transaction library using multi-version concurrency control, Yun-Sheng Chang, Ralf Jung, Upamanyu Sharma, Joseph Tassarotti, M. Frans Kaashoek, Nickolai Zeldovich, OSDI, 2023.pdf>). Boundary: **local infrastructure**.

Perennial proofs connect concurrent multi-version data structures to a simple transaction interface. The implementation is an in-memory local Go library, not a sharded distributed database. It matters because it makes a strong transaction specification reusable even when the implementation uses versions and fine-grained synchronization. Tulip later addresses distributed transactions rather than merely renaming this local guarantee. [Source](https://pdos.csail.mit.edu/papers/vmvcc:osdi23.pdf)

Evidence: “execute in a linearizable order” (Specification discussion, PDF p.4). [Context](https://pdos.csail.mit.edu/papers/vmvcc:osdi23.pdf)

Size/effort: Not separately reported here. [Evidence](https://pdos.csail.mit.edu/papers/vmvcc:osdi23.pdf)

<a id="weakisolations"></a>

### Reasoning about Weak Isolation Levels in Separation Logic

Anders Alnor Mathiasen; Léon Gondelman; Léon Ducruet; Amin Timany; Lars Birkedal. ICFP, 2025. [Paper](https://iris-project.org/pdfs/2025-icfp-weak-isolations.pdf). [Source/artifact or project](https://doi.org/10.5281/zenodo.15626657). [Collection PDF](</hdd1/sichanghe/paper_collection/Reasoning about Weak Isolation Levels in Separation Logic, Anders Alnor Mathiasen, et al., ICFP, 2025/paper.pdf>). Boundary: **OCaml source translated to formal-language implementation**.

Humans formulate implementation-independent transaction specifications and prove that familiar bad transaction histories are prohibited. They implement an in-memory single-node key-value database with MVCC, accessed by clients through RPC, in OCaml/Aneris. It is not a replicated crash-recovering database. This supplies multiple useful meanings for “transactions are correct” and demonstrates testing the specification against known anomalies instead of treating a proof of the implementation as sufficient validation. The source-to-AnerisLang translation is stated explicitly; this review does not independently verify translator or runtime correctness. [Source](https://iris-project.org/pdfs/2025-icfp-weak-isolations.pdf)

Evidence: “All results are mechanized in the Rocq proof assistant on top of the Iris separation logic framework.” (Abstract, PDF p.1). [Context](https://iris-project.org/pdfs/2025-icfp-weak-isolations.pdf)

Size/effort: Not separately reported here. [Evidence](https://iris-project.org/pdfs/2025-icfp-weak-isolations.pdf)

<a id="isolation26"></a>

### Verifying Isolation Levels of Database Implementations for Free Using Separation Logic

Anders Alnor Mathiasen; Amin Timany; Lars Birkedal. arXiv preprint, 2026. [Paper](https://arxiv.org/abs/2607.15877). [Source/artifact or project](https://github.com/logsem/aneris). [Collection PDF](</hdd1/sichanghe/paper_collection/Verifying Isolation Levels of Database Implementations for Free Using Separation Logic, Anders Alnor Mathiasen, et al., arXiv preprint, 2026/paper.pdf>). Boundary: **specification bridge**.

The authors prove that implementation-level separation-logic specifications imply independently defined transactional consistency models for all program executions. This helps check that a modular API contract actually expresses the named isolation level. It is a semantic bridge over specifications, not evidence that a new production database has been verified. [Source](https://arxiv.org/abs/2607.15877)

Evidence: “derive isolation levels directly” (Abstract, PDF p.1; adequacy/free-theorem sections; quotation located on PDF p.1). [Context](https://arxiv.org/abs/2607.15877)

Size/effort: Not separately reported here. [Evidence](https://arxiv.org/abs/2607.15877)

<a id="armada"></a>

### Armada: Low-Effort Verification of High-Performance Concurrent Programs

Jacob R. Lorch; Yixuan Chen; Manos Kapritsos; Bryan Parno; Shaz Qadeer; Upamanyu Sharma; James R. Wilcox; Xueyuan Zhao. PLDI, 2020. [Paper](https://www.andrew.cmu.edu/user/bparno/papers/armada.pdf). [Source/artifact or project](https://github.com/microsoft/Armada). [Collection PDF](</hdd1/sichanghe/paper_collection/Armada- Low-Effort Verification of High-Performance Concurrent Programs, Jacob R. Lorch, Yixuan Chen, Manos Kapritsos, Bryan Parno, Shaz Qadeer, Upamanyu Sharma, James R. Wilcox, Xueyuan Zhao, PLDI, 2020.pdf>). Boundary: **local infrastructure**.

Humans prove refinement across increasingly optimized concurrent C-like programs, using reusable proof transformations. The system addresses mutable memory and a weak-memory execution model. Its examples are shared-memory programs rather than networked protocols. It is relevant to refining an executable host safely, but supplies no automatic distributed-service or network-liveness theorem. [Source](https://www.andrew.cmu.edu/user/bparno/papers/armada.pdf)

Evidence: “layout and synchronization primitives” (Abstract, PDF p.1). [Context](https://www.andrew.cmu.edu/user/bparno/papers/armada.pdf)

Size/effort: §6.4 queue case, PDF p.12: “∼6 person-days” to write the proof levels, mostly finding the inductive invariant. This is one queue proof, not total Armada development. [Evidence](https://www.andrew.cmu.edu/user/bparno/papers/armada.pdf)

<a id="ironsync"></a>

### Sharding the State Machine: Automated Modular Reasoning for Complex Concurrent Systems

Travis Hance; Yi Zhou; Andrea Lattuada; Reto Achermann; Alex Conway; Ryan Stutsman; Gerd Zellweger; Chris Hawblitzel; Jon Howell; Bryan Parno. OSDI, 2023. [Paper](https://www.andrew.cmu.edu/user/bparno/papers/ironsync.pdf). [Source/artifact or project](https://github.com/secure-foundations/ironsync-osdi2023). [Collection PDF](</hdd1/sichanghe/paper_collection/Sharding the State Machine- Automated Modular Reasoning for Complex Concurrent Systems, Travis Hance et al., OSDI, 2023/paper.pdf>). Boundary: **local infrastructure**.

IronSync connects global state-machine transitions to ownership tokens used by local code. Humans choose the global invariant, localized transitions, and correspondence between logical resources and synchronization. Node replication gives linearizable replicas across cores/NUMA on one machine; it is not replication across unreliable network hosts. The paper does not establish general liveness, termination, or deadlock freedom. This is a predecessor for tokenized state-machine proof construction in Verus. [Source](https://www.andrew.cmu.edu/user/bparno/papers/ironsync.pdf)

Evidence: “IronSync does not verify liveness, termination, or deadlock-freedom.” (Introduction, PDF p.2). [Context](https://www.andrew.cmu.edu/user/bparno/papers/ironsync.pdf)

Size/effort: §7.1, PDF p.12: “2747 lines of non-ghost implementation, plus 316 of shared library.” These are all four concurrent examples, not only node replication. Figure 15 gives per-case proof/implementation breakdowns; no comparable person-time figure established here. [Evidence](https://www.andrew.cmu.edu/user/bparno/papers/ironsync.pdf)

<a id="veribetrkv"></a>

### Storage Systems are Distributed Systems (So Verify Them That Way!)

Travis Hance; Andrea Lattuada; Chris Hawblitzel; Jon Howell; Rob Johnson; Bryan Parno. OSDI, 2020. [Paper](https://www.andrew.cmu.edu/user/bparno/papers/veribetrkv.pdf). [Source/artifact or project](https://github.com/secure-foundations/veribetrkv-osdi2020). [Collection PDF](</hdd1/sichanghe/paper_collection/Storage Systems are Distributed Systems (So Verify Them That Way!), Travis Hance et al., OSDI, 2020.pdf>). Boundary: **local infrastructure**.

The authors apply distributed-style refinement to local storage: asynchronous I/O completion and crashes create an environment analogous to network nondeterminism. A simple crash-safe map specification is refined into a performant Bε-tree store using Dafny with linearity extensions and C++ output. The analogy motivates a proof strategy; the artifact is a local storage engine, not a verified distributed KV service. This separates durability semantics from replication semantics. [Source](https://www.andrew.cmu.edu/user/bparno/papers/veribetrkv.pdf)

Evidence: “asynchronous systems” (Conclusion; abstract and specification/refinement sections; quotation located on PDF p.3). [Context](https://www.andrew.cmu.edu/user/bparno/papers/veribetrkv.pdf)

Size/effort: Table 1, PDF p.10: “total 1210 6373 44685”, respectively specification, implementation, proof. The simple map/crash-safe specification is 283 lines; framework/library implementation is included in the totals. No comparable person-time figure established here. [Evidence](https://www.andrew.cmu.edu/user/bparno/papers/veribetrkv.pdf)

<a id="anvil"></a>

### Anvil: Verifying Liveness of Cluster Management Controllers

Xudong Sun; Wenjie Ma; Jiawei Tyler Gu; Zicheng Ma; Tej Chajed; Jon Howell; Andrea Lattuada; Oded Padon; Lalith Suresh; Adriana Szekeres; Tianyin Xu. OSDI, 2024. [Paper](https://www.usenix.org/system/files/osdi24-sun-xudong.pdf). [Source/artifact or project](https://github.com/anvil-verifier/anvil/tree/osdi24). [Collection PDF](</hdd1/sichanghe/paper_collection/Anvil-  Verifying Liveness of Cluster Management Controllers, Xudong Sun, Wenjie Ma, Jiawei Tyler Gu, Zicheng Ma, Tej Chajed, Jon Howell, Andrea Lattuada, Oded Padon, Lalith Suresh, Adriana Szekeres, Tianyin Xu, OSDI, 2024.pdf>). Boundary: **executable distributed**.

Rust/Verus proves controller code conforms to transition functions and temporal proofs show eventual stable reconciliation (ESR): if a desired state remains fixed, eventually the managed resources match it forever. Progress assumes fair scheduling/request processing and faults/conflicting interference eventually stop as specified. Humans supply the desired/matching predicates, Kubernetes API/environment model, invariants, and progress chain. Existing reference controllers guide newly verified implementations; this is not a proof of Kubernetes itself or the complete applications running in pods. [Source](https://www.usenix.org/system/files/osdi24-sun-xudong.pdf)

Evidence: “eventually stable reconciliation” (Abstract; §§3–5; quotation located on PDF p.2). [Context](https://www.usenix.org/system/files/osdi24-sun-xudong.pdf)

Size/effort: §6.3/Table 1, PDF p.13: “Implementing and verifying each controller takes around 2.5 person-months.” This is per controller, not total across three. Separately, §6, PDF p.12 reports ZooKeeper ESR verification took “around two person-months”; the other two ESR proofs reused the strategy. Table 1 totals 3,940 implementation and 23,975 proof/model lines across all three. [Evidence](https://www.usenix.org/system/files/osdi24-sun-xudong.pdf)

<a id="welder"></a>

### Welder: Compositional Liveness Verification of Cluster Control Planes

Zhizhen Cathy Cai; Nikhil Date; Jiawei Tyler Gu; Cody Rivera; Tej Chajed; Oded Padon; Tianyin Xu; Xudong Sun. SOSP, 2026. [Paper](https://tianyin.github.io/pub/welder.pdf). [Source/artifact or project](https://github.com/anvil-verifier/anvil/tree/sosp26). [Collection PDF](</hdd1/sichanghe/paper_collection/Welder- Compositional Liveness Verification of Cluster Control Planes, Zhizhen Cathy Cai et al., SOSP, 2026.pdf>). Boundary: **executable distributed**.

Welder verifies Rust controllers and their compositions using conditional contracts called CORE. A controller guarantees ESR when its environment respects a rely condition and dependencies succeed; it also promises conditions needed by other controllers. This replaces blanket absence of interference with explicit, checkable interference/dependency contracts. Retry loops need fairness beyond simply scheduling threads fairly. Dependencies are restricted by the composition rules; this is not arbitrary mutually dependent controllers. It is the most direct recent case for deriving a useful progress contract from an operational goal. [Source](https://tianyin.github.io/pub/welder.pdf)

Evidence: “Verifying the four controllers took 1.5 person-years” (§7.1, PDF p.12; quotation located on PDF p.12). [Context](https://tianyin.github.io/pub/welder.pdf)

Size/effort: The quoted effort includes building Welder and verifying four controllers. Table 1, PDF p.13, has the total row “1081 1322 3180 3915 850 37487 (36215)”: trusted specification, unverified components, executable code, controller model, conformance proof, CORE proof (ESR subset). The 429-line composition proof is included. [Evidence](https://tianyin.github.io/pub/welder.pdf)

<a id="verus24"></a>

### Verus: A Practical Foundation for Systems Verification

Andrea Lattuada; Travis Hance; Jay Bosamiya; Matthias Brun; Chanhee Cho; Hayley LeBlanc; Pranav Srinivasan; Reto Achermann; Tej Chajed; Chris Hawblitzel; Jon Howell; Jacob R. Lorch; Oded Padon; Bryan Parno. SOSP, 2024. [Paper](https://doi.org/10.1145/3694715.3695952). [Source/artifact or project](https://github.com/verus-lang/verified-ironkv). [Collection PDF](</hdd1/sichanghe/paper_collection/Verus- A Practical Foundation for Systems Verification, Andrea Lattuada, Travis Hance, Jay Bosamiya, Matthias Brun, Chanhee Cho, Hayley LeBlanc, et al., Chris Hawblitzel, Jon Howell, Jacob R. Lorch, Oded Padon, Bryan Parno, SOSP, 2024.pdf>). Boundary: **executable host; local infrastructure**.

Verus checks Rust executable code plus ghost specifications/proofs. The IronKV case explicitly ports and verifies the host implementation against the protocol-level host description, while skipping the distributed protocol proof. Therefore it does not establish a new Rust end-to-end IronFleet safety/liveness theorem. The node-replication port is a shared-memory concurrent case. Humans retain responsibility for selecting the target specification and connecting host proofs to a global protocol theorem. [Source](https://doi.org/10.1145/3694715.3695952)

Evidence: “We skip the protocol level” (§4.2.1, PDF p.10; quotation located on PDF p.10). [Context](https://doi.org/10.1145/3694715.3695952)

Size/effort: Read §4.2.1–4.2.2 and the macrobenchmark table for scope-separated counts; no whole-system end-to-end distributed proof effort is implied. [Evidence](https://doi.org/10.1145/3694715.3695952)

<a id="verus23"></a>

### Verus: Verifying Rust Programs using Linear Ghost Types

Andrea Lattuada; Travis Hance; Chanhee Cho; Matthias Brun; Isitha Subasinghe; Yi Zhou; Jon Howell; Bryan Parno; Chris Hawblitzel. OOPSLA, 2023. [Paper](https://doi.org/10.1145/3586037). [Source/artifact or project](https://github.com/verus-lang/verus). [Collection PDF](</hdd1/sichanghe/paper_collection/Verus- Verifying Rust Programs using Linear Ghost Types, Andrea Lattuada, Travis Hance, Chanhee Cho, Matthias Brun, Isitha Subasinghe, Yi Zhou, Jon Howell, Bryan Parno, Chris Hawblitzel, OOPSLA, 2023.pdf>). Boundary: **verification infrastructure**.

Verus erases specifications/proofs and compiles the executable Rust. Linear ghost resources prevent duplicating permissions, while invariants connect those resources to concrete mutable memory. State-machine macros and their tokenized form help turn global transitions into local permission operations. These mechanisms are proof infrastructure, not a pre-proved network protocol or an automatic temporal specification generator. The appropriate test is whether code operations actually establish the promised transition and whether a separate global proof exists. [Source](https://doi.org/10.1145/3586037)

Evidence: “linear ghost state” (Introduction; §§3–4; quotation located on PDF p.3). [Context](https://doi.org/10.1145/3586037)

Size/effort: State-machine source: https://github.com/verus-lang/verus/tree/main/source/state_machines_macros; guide: https://verus-lang.github.io/verus/state_machines/. No separate reviewed publication titled VerusSync was established. [Evidence](https://doi.org/10.1145/3586037)

<a id="igloo"></a>

### Igloo: Soundly Linking Compositional Refinement and Separation Logic for Distributed System Verification

Christoph Sprenger; Tobias Klenze; Marco Eilers; Felix A. Wolf; Peter Müller; Martin Clochard; David Basin. OOPSLA, 2020. [Paper](https://arxiv.org/abs/2010.04749). Source repository not located; former ETH project page unavailable. [Collection PDF](</hdd1/sichanghe/paper_collection/Igloo- Soundly Linking Compositional Refinement and Separation Logic for Distributed System Verification, Christoph Sprenger, Tobias Klenze, Marco Eilers, Felix A. Wolf, Peter Muller, Martin Clochard, David Basin, OOPSLA, 2020.pdf>). Boundary: **executable distributed**.

Humans refine event-based distributed models, decompose them into I/O permission specifications, and verify implementation code using separation-logic tools, including VeriFast and Nagini. A sound link transfers abstract safety properties to concrete programs under the listed trust assumptions. The leader-election implementation may run and retry, but the paper does not prove eventual leader election. The important technique is connecting a global protocol proof with local code verification without forcing one language/tool throughout. [Source](https://arxiv.org/abs/2010.04749)

Evidence: “We currently support the verification of safety properties, but not liveness properties.” (§3, PDF p.8). [Context](https://arxiv.org/abs/2010.04749)

Size/effort: Public artifact repository not established; the former ETH project page is unavailable. Full author manuscript supplies the verified Java/Python examples and trust assumptions. [Evidence](https://arxiv.org/abs/2010.04749)

<a id="wormspace"></a>

### WormSpace: A Modular Foundation for Simple, Verifiable Distributed Systems

Ji-Yong Shin; Jieung Kim; Wolf Honoré; Hernán Vanzetto; Srihari Radhakrishnan; Mahesh Balakrishnan; Zhong Shao. SoCC, 2019. [Paper](https://flint.cs.yale.edu/publications/socc19.pdf). [Source/artifact or project](https://doi.org/10.1145/3357223.3362739). [Collection PDF](</hdd1/sichanghe/paper_collection/WormSpace- A Modular Foundation for Simple, Verifiable Distributed Systems, Ji-Yong Shin, Jieung Kim, Wolf Honore, Hernan Vanzetto, Srihari Radhakrishnan, Mahesh Balakrishnan, Zhong Shao, SoCC, 2019.pdf>). Boundary: **executable distributed**.

The write-once-register API lets clients reason about immutable agreed values rather than the coordination protocol. Certified concurrent abstraction layers prove C implementations refine that interface and connect applications to a verified CertiKOS OS, reducing OS trust. The verified core does not include every implementation variant: chain-replication registers and reconfiguration are outside the verified portion. Functional refinement, durability, and failure atomicity are distinct from an availability proof. [Source](https://flint.cs.yale.edu/publications/socc19.pdf)

Evidence: “Write-Once Register” (Abstract; §§4–6; quotation located on PDF p.1). [Context](https://flint.cs.yale.edu/publications/socc19.pdf)

Size/effort: §6, PDF p.10: “6 person months” for core verification and “5 person weeks” for the application/linking proofs. Core effort splits into 4.5 functional-correctness and 1.5 ghost-layer person-months; 108K verification lines. Repository not established. [Evidence](https://flint.cs.yale.edu/publications/socc19.pdf)

<a id="advert"></a>

### Much ADO about Failures: A Fault-Aware Model for Compositional Verification of Strongly Consistent Distributed Systems

Wolf Honoré; Jieung Kim; Ji-Yong Shin; Zhong Shao. OOPSLA, 2021. [Paper](https://flint.cs.yale.edu/publications/ado.pdf). [Source/artifact or project](https://doi.org/10.5281/zenodo.5476274). [Collection PDF](</hdd1/sichanghe/paper_collection/Much ADO about Failures- A Fault-Aware Model for Compositional Verification of Strongly Consistent Distributed Systems, Wolf Honore, Jieung Kim, Ji-Yong Shin, Zhong Shao, OOPSLA, 2021.pdf>). Boundary: **executable distributed**.

The ADO interface exposes selected failure cases instead of pretending every distributed operation is an atomic success. Coq/CCAL refinement verifies distributed C implementations and composition with clients; CertiKOS supplies a verified OS layer. The model gives stronger useful interfaces while acknowledging failures. Progress is left outside the established results, and a termination assumption in an example should not be advertised as proved liveness. [Source](https://flint.cs.yale.edu/publications/ado.pdf)

Evidence: “abstract view of certain key distributed failure cases” (Abstract; §§3–6; quotation located on PDF p.1). [Context](https://flint.cs.yale.edu/publications/ado.pdf)

Size/effort: §6, PDF p.23: “2.6K lines” of multi-Paxos C and “43.9K lines of functional correctness proofs”. These counts concern the multi-Paxos component; they are not total person-time. [Evidence](https://flint.cs.yale.edu/publications/ado.pdf)

<a id="adore"></a>

### Adore: Atomic Distributed Objects with Certified Reconfiguration

Wolf Honoré; Ji-Yong Shin; Jieung Kim; Zhong Shao. PLDI, 2022. [Paper](https://flint.cs.yale.edu/flint/publications/adore.pdf). [Source/artifact or project](https://doi.org/10.5281/zenodo.6321150). [Collection PDF](</hdd1/sichanghe/paper_collection/Adore- Atomic Distributed Objects with Certified Reconfiguration, Wolf Honore, Ji-Yong Shin, Jieung Kim, Zhong Shao, PLDI, 2022.pdf>). Boundary: **executable distributed**.

Adore models protocol history as a branching tree with evidence of election and commitment. Humans prove abstract safety once, then refine a Raft-like protocol to it; Coq extraction supplies an OCaml executable tested across membership changes. Correctness includes safe reconfiguration, a feature omitted by many older proofs. The conclusion explicitly makes no liveness/availability claim. [Source](https://flint.cs.yale.edu/flint/publications/adore.pdf)

Evidence: “no claims about their liveness or availability” (Conclusion, PDF p.14; quotation located on PDF p.14). [Context](https://flint.cs.yale.edu/flint/publications/adore.pdf)

Size/effort: §7, PDF p.13: “2 weeks” for CADO safety, followed by “another 3” for reconfiguration. The combined five person-weeks are the abstract safety proof, not all 13.8K lines of Raft development. [Evidence](https://flint.cs.yale.edu/flint/publications/adore.pdf)

<a id="lido"></a>

### LiDO: Linearizable Byzantine Distributed Objects with Refinement-Based Liveness Proofs

Longfei Qiu; Yoonseung Kim; Ji-Yong Shin; Jieung Kim; Wolf Honoré; Zhong Shao. PLDI, 2024. [Paper](https://flint.cs.yale.edu/publications/lido.pdf). [Source/artifact or project](https://doi.org/10.5281/zenodo.10909272). [Collection PDF](</hdd1/sichanghe/paper_collection/LiDO- Linearizable Byzantine Distributed Objects with Refinement-Based Liveness Proofs, Longfei Qiu, Yoonseung Kim, Ji-Yong Shin, Jieung Kim, Wolf Honore, Zhong Shao, PLDI, 2024.pdf>). Boundary: **executable distributed subset**.

A pacemaker state exposes enough timing/progress information for Coq refinement proofs of Byzantine consensus safety and liveness under partial synchrony. The paper proves responses infinitely often, not eventual response to every client request. Both Jolteon variants are modeled/proved; unpipelined Jolteon is extracted to runnable OCaml with a handwritten communication/timer environment. The pipelined model proof should not be conflated with verification of a production blockchain codebase. This shows how a chosen abstraction can make progress arguments easier while preserving an implementation link. [Source](https://flint.cs.yale.edu/publications/lido.pdf)

Evidence: “OCaml executable” (Introduction, PDF p.3; §7; quotation located on PDF p.3). [Context](https://flint.cs.yale.edu/publications/lido.pdf)

Size/effort: §2.1, PDF p.4: “responds to client requests inﬁnitely often”. The stronger every-request definition is discussed and deliberately not established. No comparable person-time figure established here. §4, PDF p.19, also reports safety “around 4,000 lines”, liveness “around 1,800 lines”, and §5 pipelined proof extension “around 2,000 lines”. [Evidence](https://flint.cs.yale.edu/publications/lido.pdf)

<a id="adob"></a>

### AdoB: Bridging Benign and Byzantine Consensus with Atomic Distributed Objects

Wolf Honoré; Longfei Qiu; Yoonseung Kim; Ji-Yong Shin; Jieung Kim; Zhong Shao. OOPSLA, 2024. [Paper](https://flint.cs.yale.edu/publications/adob.pdf). [Source/artifact or project](https://doi.org/10.1145/3649826). [Collection PDF](</hdd1/sichanghe/paper_collection/AdoB- Bridging Benign and Byzantine Consensus with Atomic Distributed Objects, Wolf Honore, Longfei Qiu, Yoonseung Kim, Ji-Yong Shin, Jieung Kim, Zhong Shao, OOPSLA, 2024.pdf>). Boundary: **extracted executable GenJolteon prototype; other protocol models**.

Coq proves safety/progress of a generic consensus object and refinements from network-level specifications. GenJolteon also has a network-level liveness proof and is extracted into runnable OCaml event handlers with a handwritten network/timer shim. Fast Paxos has safety/refinement work but no completed network-level liveness proof. This is a concrete executable prototype connection, not verification of existing production Jolteon or Fast Paxos code. The abstraction separates benign and Byzantine reasoning while supporting reuse. [Source](https://flint.cs.yale.edu/publications/adob.pdf)

Evidence: “produce an executable version of GenJolteon” (§5, Extraction to OCaml, PDF p.23). [Context](https://flint.cs.yale.edu/publications/adob.pdf)

Size/effort: Abstract benign AdoB proof: under one person-month, excluding initial planning and an existing library (§3.3). GenJolteon refinement/safety: “eight person-months”; liveness: “two person-months”. Reused Fast Paxos safety/refinement: “one person-month”. Case-study discussion, PDF p.22, reports 17,000, 2,700, and 2,000 respective proof lines; no Fast Paxos network-level liveness proof. [Evidence](https://flint.cs.yale.edu/publications/adob.pdf)

<a id="lidodag"></a>

### LiDO-DAG: A Framework for Verifying Safety and Liveness of DAG-Based Consensus Protocols

Longfei Qiu; Jingqi Xiao; Ji-Yong Shin; Zhong Shao. PLDI, 2025. [Paper](https://flint.cs.yale.edu/publications/lido-dag.pdf). [Source/artifact or project](https://doi.org/10.5281/zenodo.15223659). [Collection PDF](</hdd1/sichanghe/paper_collection/LiDO-DAG- A Framework for Verifying Safety and Liveness of DAG-Based Consensus Protocols, Longfei Qiu, Jingqi Xiao, Ji-Yong Shin, Zhong Shao, PLDI, 2025.pdf>). Boundary: **protocol model**.

Humans separate dissemination DAGs from ordering logic, then prove Coq refinements preserving agreement and eventual commitment under the specified timing/fault assumptions. The case studies are protocol models. No Rust production implementation refinement was established in this paper. Its relevance is progress-aware abstraction and proof reuse, not a replacement for verifying message parsing, thread synchronization, and persistence. [Source](https://flint.cs.yale.edu/publications/lido-dag.pdf)

Evidence: “mechanized safety and liveness proofs” (Abstract, PDF p.1; case studies; quotation located on PDF p.1). [Context](https://flint.cs.yale.edu/publications/lido-dag.pdf)

Size/effort: Not separately reported here. [Evidence](https://flint.cs.yale.edu/publications/lido-dag.pdf)

<a id="mysticeti"></a>

### Mechanized Safety and Liveness Proofs for the Mysticeti Consensus Protocol under the LiDO-DAG Framework

Longfei Qiu; Jingqi Xiao; Zhong Shao. IEEE Symposium on Security and Privacy, 2026. [Paper](https://flint.cs.yale.edu/publications/sp26.pdf). [Source/artifact or project](https://zenodo.org/records/17345693). [Collection PDF](</hdd1/sichanghe/paper_collection/Mechanized Safety and Liveness Proofs for the Mysticeti Consensus Protocol under the LiDO-DAG Framework, Longfei Qiu, Jingqi Xiao, Zhong Shao, IEEE S&P, 2026.pdf>). Boundary: **protocol model with production audit**.

The paper uses LiDO-DAG to prove a corrected Mysticeti protocol and investigates correspondence to Sui’s deployed implementation. It finds a progress failure involving unbounded round advancement and formalizes sufficient constraints. Inspecting real code and finding a real defect is valuable evidence, but is different from a machine-checked refinement proof of that entire Rust codebase. An evaluation should give credit for discovering a wrong progress assumption separately from proving code. [Source](https://flint.cs.yale.edu/publications/sp26.pdf)

Evidence: “flaws were found in its liveness proof” (Abstract, PDF p.1). [Context](https://flint.cs.yale.edu/publications/sp26.pdf)

Size/effort: Not separately reported here. [Evidence](https://flint.cs.yale.edu/publications/sp26.pdf)

<a id="suredistrib"></a>

### SureDistrib: Verifying Almost-Sure Termination of Composite Asynchronous Byzantine Protocols

Longfei Qiu; Jingqi Xiao; Ji-Yong Shin; Zhong Shao. PLDI, 2026. [Paper](https://flint.cs.yale.edu/publications/suredistrib.pdf). [Source/artifact or project](https://doi.org/10.5281/zenodo.19616610). [Collection PDF](</hdd1/sichanghe/paper_collection/SureDistrib- Verifying Almost-Sure Termination of Composite Asynchronous Byzantine Protocols, Longfei Qiu, et al., PLDI, 2026/paper.pdf>). Boundary: **protocol model**.

Probabilistic trace refinement and composition support probability-one termination of asynchronous Byzantine protocols. This is different from guaranteeing termination of every random execution, and its fair-delivery/adversary conditions remain essential. The results inspected are protocol-level Coq developments, not verified production node code. This helps an agent avoid an impossible deterministic termination promise under a completely asynchronous fault model. [Source](https://flint.cs.yale.edu/publications/suredistrib.pdf)

Evidence: “We define refinement relations for such systems, and prove composition lemmas” (Abstract, PDF p.1). [Context](https://flint.cs.yale.edu/publications/suredistrib.pdf)

Size/effort: Not separately reported here. [Evidence](https://flint.cs.yale.edu/publications/suredistrib.pdf)

<a id="shipwright"></a>

### Shipwright: Proving liveness of distributed systems with Byzantine participants

Derek Leung; Nickolai Zeldovich; Frans Kaashoek. arXiv preprint, 2025. [Paper](https://arxiv.org/abs/2507.14080). Source repository not located. [Collection PDF](</hdd1/sichanghe/paper_collection/Shipwright- Proving liveness of distributed systems with Byzantine participants, Derek Leung, Nickolai Zeldovich, Frans Kaashoek, arXiv, 2025.pdf>). Boundary: **executable distributed prototype**.

Dafny proofs use well-founded progress measures, liveness-preserving composition/refinement, and an explicit signature model. Code translates to Go and runs with trusted networking/timer/crypto support. The prototype proves safety/progress for agreement on one log entry under partial synchrony, not a complete multi-entry PBFT service. Its top theorem omits client replies; a Byzantine leader can force a null outcome, so end-to-end client-command liveness needs repeated broadcast iterations. These limitations are stated by the authors and are decisive for a strong benchmark specification. [Source](https://arxiv.org/abs/2507.14080)

Evidence: “not currently capture the reply messages” (§4.2 limitations, PDF p.11; quotation located on PDF p.11). [Context](https://arxiv.org/abs/2507.14080)

Size/effort: Figure 11, PDF p.11: “implementation 0 1888 1888”. PBFT specification/proof/code total is 31,138; framework total 13,357. These are line counts, not human effort. Public repository not located; the guessed mit-pdos/shipwright path returned 404. [Evidence](https://arxiv.org/abs/2507.14080)

<a id="psync"></a>

### PSync: A Partially Synchronous Language for Fault-Tolerant Distributed Algorithms

Cezara Drăgoi; Thomas A. Henzinger; Damien Zufferey. POPL, 2016. [Paper](https://dzufferey.github.io/files/2016_PSync_A_Partially_Synchronous_Language_for_Fault-Tolerant_Distributed_Algorithms.pdf). [Source/artifact or project](https://github.com/dzufferey/psync). [Collection PDF](</hdd1/sichanghe/paper_collection/PSync- A Partially Synchronous Language for Fault-Tolerant Distributed Algorithms, Cezara Drăgoi, et al., POPL, 2016/paper.pdf>). Boundary: **executable distributed with runtime boundary**.

Humans describe algorithms in communication rounds and state which good-round assumptions suffice for agreement and eventual decision. A Scala embedding/runtime runs the algorithms, while SMT verification checks user-supplied invariants and progress conditions over lockstep round semantics. A semantic reduction relates partially synchronous executions to those rounds. The runtime itself cannot be implemented/verified within PSync’s round language; the reduction theorem is not verification of every runtime statement. [Source](https://dzufferey.github.io/files/2016_PSync_A_Partially_Synchronous_Language_for_Fault-Tolerant_Distributed_Algorithms.pdf)

Evidence: “safety and liveness properties” (§6; §7.1 runtime limitation; quotation located on PDF p.2). [Context](https://dzufferey.github.io/files/2016_PSync_A_Partially_Synchronous_Language_for_Fault-Tolerant_Distributed_Algorithms.pdf)

Size/effort: Table 2, PDF p.13: LastVoting algorithm code count “89”. The text excludes boilerplate/comments and compares algorithm code, not total runnable system size. [Evidence](https://dzufferey.github.io/files/2016_PSync_A_Partially_Synchronous_Language_for_Fault-Tolerant_Distributed_Algorithms.pdf)

<a id="resync"></a>

### Programming at the Edge of Synchrony

Cezara Drăgoi; Josef Widder; Damien Zufferey. OOPSLA, 2020. [Paper](https://dzufferey.github.io/files/2020_Programming_at_the_Edge_of_Synchrony.pdf). [Source/artifact or project](https://github.com/dzufferey/psync). [Collection PDF](</hdd1/sichanghe/paper_collection/Programming at the Edge of Synchrony, Cezara Drăgoi, et al., OOPSLA, 2020/paper.pdf>). Boundary: **execution abstraction**.

ReSync permits incremental message reception within a round and protocol-specific policies for moving to the next round. The paper establishes a round-switch abstraction and evaluates runnable consensus implementations. This reduces the mismatch between a simple synchronous-looking model and an asynchronous network. Do not infer that every evaluated application implementation is fully proved merely because the runtime abstraction has a correctness argument. [Source](https://dzufferey.github.io/files/2020_Programming_at_the_Edge_of_Synchrony.pdf)

Evidence: “We present a new programming abstraction, ReSync, for implementing benign and Byzantine fault-tolerant protocols.” (Abstract, PDF p.1). [Context](https://dzufferey.github.io/files/2020_Programming_at_the_Edge_of_Synchrony.pdf)

Size/effort: Not separately reported here. [Evidence](https://dzufferey.github.io/files/2020_Programming_at_the_Edge_of_Synchrony.pdf)

<a id="distalgo"></a>

### From Clarity to Efficiency for Distributed Algorithms

Yanhong A. Liu; Scott D. Stoller; Bo Lin; Michael Gorbovitski. OOPSLA, 2012. [Paper](https://www.cs.stonybrook.edu/~liu/papers/DistPL-OOPSLA12.pdf). [Source/artifact or project](https://github.com/DistAlgo/distalgo). [Collection PDF](</hdd1/sichanghe/paper_collection/From Clarity to Efficiency for Distributed Algorithms, Yanhong A. Liu, et al., OOPSLA, 2012/paper.pdf>). Boundary: **executable language; proof gap**.

DistAlgo expresses message-history queries directly and compiles/incrementalizes them into efficient Python execution. This helps preserve a readable relationship between an algorithm and code. The starting paper is about language/optimization, not a generic machine-checked protocol-safety/liveness guarantee. Use it as a source of executable cases and specification-facing representations, with independent proofs or checking required. [Source](https://www.cs.stonybrook.edu/~liu/papers/DistPL-OOPSLA12.pdf)

Evidence: “queries, especially logic quantifications” (Abstract, PDF p.1). [Context](https://www.cs.stonybrook.edu/~liu/papers/DistPL-OOPSLA12.pdf)

Size/effort: Not separately reported here. [Evidence](https://www.cs.stonybrook.edu/~liu/papers/DistPL-OOPSLA12.pdf)

<a id="shardstore"></a>

### Using Lightweight Formal Methods to Validate a Key-Value Storage Node in Amazon S3

James Bornholt; Rajeev Joshi; Vytautas Astrauskas; Brendan Cully; Bernhard Kragl; Seth Markle; Kyle Sauri; Drew Schleit; Grant Slatton; Serdar Tasiran; Jacob Van Geffen; Andrew Warfield. SOSP, 2021. [Paper](https://cdn.amazon.science/77/5e/4a7c238f4ce890efdc325df83263/using-lightweight-formal-methods-to-validate-a-key-value-storage-node-in-amazon-s3-2.pdf). [Source/artifact or project](https://github.com/awslabs/shuttle). [Collection PDF](</hdd1/sichanghe/paper_collection/Using Lightweight Formal Methods to Validate a Key-Value Storage Node in Amazon S3, James Bornholt, Rajeev Joshi, Vytautas Astrauskas, et al., SOSP, 2021/paper.pdf>). Boundary: **production validation, not universal proof**.

Humans write small executable Rust reference models of API behavior and compare implementation histories against them using property-based tests and stateless concurrency checking. They separately validate crash consistency, functional behavior, and concurrency instead of insisting on one giant proof. The deployed system is a local S3 storage node within a distributed service; the production code is not publicly released. This is evidence about practical specification authorship and validation, not a universal theorem over all S3 executions. [Source](https://cdn.amazon.science/77/5e/4a7c238f4ce890efdc325df83263/using-lightweight-formal-methods-to-validate-a-key-value-storage-node-in-amazon-s3-2.pdf)

Evidence: “We do not aim to achieve full formal verification” (Abstract, PDF p.1; authors contrast their pragmatic validation with complete formal verification). [Context](https://cdn.amazon.science/77/5e/4a7c238f4ce890efdc325df83263/using-lightweight-formal-methods-to-validate-a-key-value-storage-node-in-amazon-s3-2.pdf)

Size/effort: §8, PDF p.11: “two formal methods experts” worked full-time for “nine months”; a third joined for “three months”. Abstract: “16 issues” prevented. The linked Shuttle tool is not the proprietary ShardStore implementation. [Evidence](https://cdn.amazon.science/77/5e/4a7c238f4ce890efdc325df83263/using-lightweight-formal-methods-to-validate-a-key-value-storage-node-in-amazon-s3-2.pdf)

<a id="power"></a>

### PoWER Never Corrupts: Tool-Agnostic Verification of Crash Consistency and Corruption Detection

Hayley LeBlanc; Jacob R. Lorch; Chris Hawblitzel; Cheng Huang; Yiheng Tao; Nickolai Zeldovich; Vijay Chidambaram. OSDI, 2025. [Paper](https://www.usenix.org/system/files/osdi25-leblanc.pdf). [Source/artifact or project](https://github.com/microsoft/verified-storage/tree/osdi25-artifact). [Collection PDF](</hdd1/sichanghe/paper_collection/PoWER Never Corrupts-  Tool-Agnostic Verification of Crash Consistency and Corruption Detection, Hayley LeBlanc, Jacob R. Lorch, Chris Hawblitzel, Cheng Huang, Yiheng Tao, Nickolai Zeldovich, Vijay Chidambaram, OSDI, 2025.pdf>). Boundary: **local storage; service example**.

Humans specify which durable states are acceptable after each write and recovery, and distinguish recoverable state from detected corruption. The framework works with Verus/Rust and Dafny/C#, demonstrating that the crash contract can be reused across tools. CapybaraKV is a local persistent-memory store; the notary is a small service example. The proof does not establish distributed replication or network availability. Integrity checking relies on the corruption model/assumptions, not an unconditional guarantee against every possible forged checksum. [Source](https://www.usenix.org/system/files/osdi25-leblanc.pdf)

Evidence: “Crash Consistency and Corruption Detection” (Title; §§3–6; quotation located on PDF p.1). [Context](https://www.usenix.org/system/files/osdi25-leblanc.pdf)

Size/effort: §6.1/Table 2, PDF p.13: KV total row “5244 14255 5531”, respectively trusted, specification/proof, implementation. Notary row “414 673 278”. The short notary verification effort excludes writing its specification/wrapper; compare denominators before using it. [Evidence](https://www.usenix.org/system/files/osdi25-leblanc.pdf)

<a id="verismo"></a>

### VeriSMo: A Verified Security Module for Confidential VMs

Ziqiao Zhou; Anjali; Weiteng Chen; Sishuai Gong; Chris Hawblitzel; Weidong Cui. OSDI, 2024. [Paper](https://www.usenix.org/system/files/osdi24-zhou.pdf). [Source/artifact or project](https://github.com/microsoft/verismo). [Collection PDF](</hdd1/sichanghe/paper_collection/VeriSMo- A Verified Security Module for Confidential VMs, Ziqiao Zhou, Anjali, Weiteng Chen, Sishuai Gong, Chris Hawblitzel, Weidong Cui, OSDI, 2024.pdf>). Boundary: **local/security infrastructure**.

Verus verifies a Rust security module that mediates a confidential guest’s interaction with an untrusted host. The specifications cover secure memory and communication boundaries in that threat model. It is relevant to specifying hostile interfaces and explicit hardware assumptions, but is not a distributed consensus/storage proof. Networked deployment of a confidential VM alone does not change the theorem’s scope. [Source](https://www.usenix.org/system/files/osdi24-zhou.pdf)

Evidence: “functional correctness, secure information ﬂow, and VM conﬁdentiality and integrity” (Abstract, PDF p.2; the source lists verified properties). [Context](https://www.usenix.org/system/files/osdi24-zhou.pdf)

Size/effort: Not separately reported here. [Evidence](https://www.usenix.org/system/files/osdi24-zhou.pdf)

<a id="vest"></a>

### Vest: Verified, Secure, High-Performance Parsing and Serialization for Rust

Yi Cai; Pratap Singh; Zhengyao Lin; Jay Bosamiya; Joshua Gancher; Milijana Surbatovich; Bryan Parno. USENIX Security, 2025. [Paper](https://www.usenix.org/conference/usenixsecurity25/presentation/cai-yi). [Source/artifact or project](https://github.com/secure-foundations/vest). [Collection PDF](</hdd1/sichanghe/paper_collection/Vest- Verified, Secure, High-Performance Parsing and Serialization for Rust, Yi Cai, Pratap Singh, Zhengyao Lin, Jay Bosamiya, Joshua Gancher, Milijana Surbatovich, Bryan Parno, USENIX Security, 2026.pdf>). Boundary: **network-format infrastructure**.

Verus proves parser/serializer properties so executable Rust understands the same bytes as its format specification. This is directly relevant to closing a protocol model’s message-format trust gap. The parser theorem is not a consensus or service-liveness theorem. The existing collection filename says 2026; the PDF cover and official conference page establish 2025, which is used here. [Source](https://www.usenix.org/conference/usenixsecurity25/presentation/cai-yi)

Evidence: “parser and serializer implementations in safe Rust” (Introduction, PDF p.2; generated implementations checked by Verus). [Context](https://www.usenix.org/conference/usenixsecurity25/presentation/cai-yi)

Size/effort: Not separately reported here. [Evidence](https://www.usenix.org/conference/usenixsecurity25/presentation/cai-yi)

<a id="atmosphere"></a>

### Atmosphere: Practical Verified Kernels with Rust and Verus

Xiangdong Chen; Zhaofeng Li; Jerry Zhang; Vikram Narayanan; Anton Burtsev. SOSP, 2025. [Paper](https://doi.org/10.1145/3731569.3764821). [Source/artifact or project](https://github.com/mars-research/atmosphere). [Collection PDF](</hdd1/sichanghe/paper_collection/Atmosphere- Practical Verified Kernels with Rust and Verus, Xiangdong Chen, Zhaofeng Li, Jerry Zhang, Vikram Narayanan, Anton Burtsev, SOSP, 2025.pdf>). Boundary: **local infrastructure**.

Humans refine a high-level kernel specification to executable Rust in Verus, including memory/isolation mechanisms. This is OS infrastructure for a distributed implementation rather than verification of its network algorithm. It gives a recent human-effort datapoint for a substantial Verus system, but should be classified separately when evaluating distributed specifications. [Source](https://doi.org/10.1145/3731569.3764821)

Evidence: “less than 2.5 person-years” (Abstract, PDF p.1; quotation located on PDF p.1). [Context](https://doi.org/10.1145/3731569.3764821)

Size/effort: Abstract, PDF p.1: “6K lines of executable code” associates size with the quoted effort. The further breakdown is kernel development, not distributed-service proof effort. [Evidence](https://doi.org/10.1145/3731569.3764821)

<a id="txn"></a>

### Verifying a high-performance distributed transaction system using permissioned state machines

Yun-Sheng Chang; Joseph Tassarotti; M. Frans Kaashoek; Nickolai Zeldovich. SOSP, 2026. [Paper](https://doi.org/10.1145/3830418.3843873). [Source/artifact or project](https://github.com/mit-pdos/tulip). Full PDF not obtained. Boundary: **executable distributed; abstract/repo checked**.

The author abstract states that Tulip’s Go implementation meets the same specification as a local strictly serializable transaction system despite sharding, replication, crash/coordinator recovery, and multi-versioning. Permissioned state machines make cross-module dependencies explicit. The public repository supplies run commands and links Perennial/Rocq proofs. Full PDF retrieval failed, so this review does not audit theorem assumptions or human effort. The combination is a high-priority follow-up for a strong distributed-transaction benchmark. [Source](https://doi.org/10.1145/3830418.3843873)

Evidence: “3,956 lines of Go code” (Author abstract, DOI landing metadata mirrored by Semantic Scholar; repository README). [Context](https://doi.org/10.1145/3830418.3843873) [Captured author abstract](/ssd1/sichangheagent/verus_distributed/lit_b/research_verified/abstract-txn.json).

Size/effort: Abstract-only size, not an audited line-count methodology. Repository proof link: https://github.com/mit-pdos/perennial/tree/master/src/program_proof/tulip. [Evidence](https://doi.org/10.1145/3830418.3843873)

<a id="lion"></a>

### Lion: Modular Verification of Async Runtime Liveness

Ti Zhou; Zi-Hao Zhang; Omar Chowdhury; Shuai Mu. SOSP, 2026. [Paper](https://doi.org/10.1145/3830418.3843879). Source repository not located. Full PDF not obtained. Boundary: **local runtime; abstract checked**.

The author abstract states that a yielded task eventually resumes once its awaited event fires, subject to environmental/calling conditions. An append-only logical event log and an LTL-to-first-order translation let Verus reason about progress; a concrete/log-event correspondence closes the abstraction link. This is a real Rust runtime liveness claim, but does not by itself prove network delivery or application progress. Full PDF/artifact retrieval was unsuccessful; no detailed trust or effort audit is claimed. [Source](https://doi.org/10.1145/3830418.3843879)

Evidence: “a Tokio-compatible runtime in Rust verified using Verus” (Author abstract, DOI/ Semantic Scholar metadata). [Context](https://doi.org/10.1145/3830418.3843879) [Captured author abstract](/ssd1/sichangheagent/verus_distributed/lit_b/research_verified/abstract-lion.json).

Size/effort: Not separately reported here. [Evidence](https://doi.org/10.1145/3830418.3843879)

<a id="automan"></a>

### AutoMan: Facilitating Verified Distributed Systems Development Through Automatic Code Generation and Manual Optimizations

Zi-Hao Zhang; Ti Zhou; Christa Jenkins; Omar Chowdhury; Shuai Mu. SOSP, 2025. [Paper](https://doi.org/10.1145/3731569.3764822). Source repository not located. Full PDF not obtained. Boundary: **executable distributed; abstract checked**.

The author abstract describes generating implementations and proof obligations from specifications while allowing manually optimized code. Refinement checks the generated result rather than trusting the generator. This matches the project’s proposed model-to-code workflow, but begins with a formal specification, not a vague human request. Full paper retrieval failed, so advertised development-effort reductions are not used as evaluated evidence here. [Source](https://doi.org/10.1145/3731569.3764822)

Evidence: “without placing trust in the code generator” (Author abstract, DOI/ Semantic Scholar metadata). [Context](https://doi.org/10.1145/3731569.3764822) [Captured author abstract](/ssd1/sichangheagent/verus_distributed/lit_b/research_verified/abstract-automan.json).

Size/effort: Not separately reported here. [Evidence](https://doi.org/10.1145/3731569.3764822)

<a id="rustref"></a>

### A Refinement Methodology for Distributed Programs in Rust

Aurel Bílý; João C. Pereira; Peter Müller. OOPSLA, 2025. [Paper](https://doi.org/10.1145/3763119). Source repository not located. Full PDF not obtained. Boundary: **executable Rust; abstract checked**.

The author abstract combines guards, locally inductive invariants, and Rust ownership in a library usable with an off-the-shelf verifier. It claims flexibility for existing implementations rather than generating all code from a top-level model. Memcached is a substantial runnable case, but the full proof boundary, verifier choice, and effort could not be audited without the PDF/artifact. Do not label it Verus-based from its Rust language alone. [Source](https://doi.org/10.1145/3763119)

Evidence: “concurrent implementation of Memcached” (Author abstract, DOI/ Semantic Scholar metadata). [Context](https://doi.org/10.1145/3763119) [Captured author abstract](/ssd1/sichangheagent/verus_distributed/lit_b/research_verified/abstract-rustref.json).

Size/effort: Not separately reported here. [Evidence](https://doi.org/10.1145/3763119)

<a id="router"></a>

### Protocols to Code: Formal Verification of a Secure Next-Generation Internet Router

João C. Pereira; Tobias Klenze; Sofia Giampietro; Markus Limbeck; Dionysios Spiliopoulos; Felix A. Wolf; Marco Eilers; Christoph Sprenger; David Basin; Peter Müller; Adrian Perrig. CCS, 2025. [Paper](https://doi.org/10.1145/3719027.3765104). [Source/artifact or project](https://github.com/viperproject/VerifiedSCION). Full PDF not obtained. Boundary: **production implementation; abstract/repo checked**.

The author abstract reports Isabelle/HOL network-wide protocol/security refinements soundly linked to a Go production-router proof of crash freedom, data-race freedom, and adherence to the concrete model. The implementation comes from an independent development team; the public repository confirms the verified router project. This is the important production-code extension of Igloo-style model-to-code linking. Full PDF retrieval failed, so numeric effort and exact verified-file coverage remain unaudited. [Source](https://doi.org/10.1145/3719027.3765104)

Evidence: “performance-optimized production code” (Author abstract, DOI/ Semantic Scholar metadata; repository README). [Context](https://doi.org/10.1145/3719027.3765104) [Captured author abstract](/ssd1/sichangheagent/verus_distributed/lit_b/research_verified/abstract-router.json).

Size/effort: Not separately reported here. [Evidence](https://doi.org/10.1145/3719027.3765104)

<a id="derecho"></a>

### Verifying a C Implementation of Derecho’s Coordination Mechanism Using VST and Coq

Ramana Nagasamudram; Lennart Beringer; Ken Birman; Mae Milano; David A. Naumann. NASA Formal Methods, 2024. [Paper](https://doi.org/10.1007/978-3-031-60698-4_6). Source repository not located. Full PDF not obtained. Boundary: **implementation fragment; metadata checked**.

Metadata identifies a VST/Coq proof of a C implementation of Derecho’s coordination mechanism. This is a targeted mechanism, not verified status for the complete Derecho system. Full PDF/artifact and the exact correctness theorem were not obtained, so it remains a relevant lead rather than a fully audited benchmark. [Source](https://doi.org/10.1007/978-3-031-60698-4_6)

Evidence: “Verifying a C Implementation” (Paper title in DOI/Semantic Scholar metadata). [Context](https://doi.org/10.1007/978-3-031-60698-4_6) [Captured metadata](/ssd1/sichangheagent/verus_distributed/lit_b/research_verified/detail-derecho.json).

Size/effort: Not separately reported here. [Evidence](https://doi.org/10.1007/978-3-031-60698-4_6)

## How the human work is organized

**Synthesis/inference from these cases:** a useful workflow has six concrete decisions. Each needs its own evidence rather than an agent silently filling in what sounds reasonable.

1. **Identify the observer and success event.** Is success a returned value, a durable acknowledgement, committed transaction, elected leader, Kubernetes object match, or a reply accepted by a client? Shipwright’s omitted reply theorem makes this distinction concrete.
2. **Choose permitted histories.** A map specification, causal dependency graph, transaction history, or controller target/match relation states which observations count as correct. Stronger is not automatically better: causal data and weak isolation can be deliberate product requirements.
3. **Write the environment contract.** State crash/recovery rules, Byzantine thresholds, message authentication, timing bounds, fair delivery, scheduler behavior, clocks, API behavior, and allowed interference. Explain which assumptions are guarantees of code and which are external obligations.
4. **Choose abstraction boundaries.** Humans isolate transport, replicated objects, storage recovery, controller dependencies, and client libraries. The contract must expose enough information to prove the user’s property while remaining usable by other modules.
5. **Connect concrete operations.** A code-to-model proof needs the actual mutable structures, message encoding, synchronization, and recovery paths. Extraction gives one connection; Goose, Igloo, guarded Rust refinements, and Verus conformance proofs offer others. List trusted wrappers and any unverified source files.
6. **Validate the specification separately.** State known bad histories that should be rejected and useful executions that should remain possible. A contradictory precondition, impossible target, assumed desired result, or false progress premise can make a theorem trivial.

The papers demonstrate humans doing these steps with significant domain judgment. The later systems reduce repeated proof work through better abstractions, reusable interfaces, or generated obligations. They do not eliminate choosing the user-facing promise or validating assumptions.

## Evaluation cases suggested by this slice

The following are **recommendations/inferences**, not published benchmark claims. Start from existing executable artifacts with source and proof scripts, and evaluate the full specification-to-code connection as well as proof completion.

| Evaluation case | What a vague request leaves undecided | Failure that the evaluation should catch |
|---|---|---|
| Replicated KV | linearizable versus causal; durable versus volatile acknowledgement; crash/recovery model | wrong reads, dropped durable writes, or a safe service that never responds |
| Kubernetes controller | fixed desired target, dependency success, permissible external writers | stale reads, immutable-field retries, vacuous ESR premise, interference invalidating composition |
| Reliable UDP transfer | message-order guarantee and eventual delivery assumptions | retry proof without network fairness; duplicates delivered twice; permanently ignored packet |
| Membership changes | quorum rule, effect time of a new configuration, overlapping transitions | two configurations accepting incompatible operations |
| Byzantine consensus | agreement, validity, eventual non-null decision, client reply, cryptographic assumptions | counting invalid certificates; null decision mistaken for serving every client command |
| Distributed transactions | strict serializability versus snapshot isolation; coordinator recovery | excluded anomaly permitted by weak contract; incomplete transaction/recovery connection |
| Crash-safe storage | exactly when a write is durable; acceptable partial operation after restart | recovery “succeeds” while acknowledging lost state; unchecked corruption |
| Async runtime | what makes a task ready; executor/environment fairness | liveness of a ghost log without correspondence to waking real tasks |

For each case, assess four separate outcomes: (a) intended bad observations are ruled out; (b) useful implementations/environments can satisfy the assumptions; (c) the verified source really implements that specification; (d) the proof replay and executable tests succeed with the declared trusted boundary. Report specification edits, missing assumptions discovered, human interventions, trusted code, and unresolved obligations. Keep safety, progress, and probabilistic progress as separate categories.

Mutation tests can challenge the entire chain: omit an acknowledgement, reuse a stale controller read, accept a malformed certificate, forget a durable flush, or make a ready-task wakeup disappear. A successful proof after such a mutation needs scrutiny of the target property and coverage, not only proof-script success. Published bugs in Anvil, Welder, Shipwright, and Mysticeti offer concrete starting points; the proposed evaluation protocol itself is our inference.

## Search trail and unresolved gaps

The search began with every named starting point and then followed author publication pages, paper references, artifact links, and cited-by lists for IronFleet, Grove, and Anvil. Successful discovery used primary author/USENIX/arXiv PDFs, repository READMEs, exact-DOI Crossref/Semantic Scholar metadata, and citation metadata. Newly followed 2024–2026 branches include LiDO → LiDO-DAG → Mysticeti/SureDistrib, Anvil → Welder, Grove/Perennial → Tulip, Igloo → verified SCION, and Rust verification → AutoMan/Lion/guard-based refinement.

Built-in web search returned endpoint errors; a connector search also returned no usable results. Direct requests were therefore used. DBLP presented a challenge page; Semantic Scholar search and some metadata calls were rate-limited, although exact-DOI and cited-by calls worked intermittently. ACM PDF downloads repeatedly returned 403. These failures limit completeness, especially the newest full texts. The evidence tier is stated per entry rather than silently filling gaps from memory.

The following remain unresolved:

- **Full text/artifacts for Tulip, Lion, AutoMan, Rust guarded refinement, SCION’s 2025 paper, and Derecho’s C coordination proof.** Tulip and VerifiedSCION have confirmed public implementation repositories, but exact proof coverage/assumptions need a full-paper audit. The other entries explicitly remain abstract/metadata leads.
- **VerusSync as a distinct published framework.** Searches found Verus state-machine infrastructure, IronSync, verified IronKV, and Verus node replication; no independently established paper under that exact name. Treat the name as unresolved, not as an alias proven by this review. Node-replication repository: [verified-node-replication](https://github.com/verus-lang/verified-node-replication).
- **CausalMesh’s original publication and implementation proof.** AutoMan’s author abstract names its reimplementation, but the original paper and its exact causal-cache theorem were not retrieved. Do not count this as an independently audited verified implementation.
- **New S3/cloud-object-store validation successor.** Citation metadata surfaced a 2026 title, *Validating a High-Performance Cloud Object Store with Lightweight Formal Methods*, but full author/venue/theorem information was unavailable. It is not counted among the 50 entries.
- **Production Paxos/Raft variants beyond the audited artifacts.** These sources verify their own implementations/models, not arbitrary etcd, Consul, MongoDB, or production blockchain repositories. Existing independent production-code proofs should be sought explicitly rather than inferred from shared algorithm names.
- **EventML/Nuprl executable consensus.** PSync Table 2 identifies an executable mechanized EventML Paxos comparison. Its primary full text and exact runtime/proof boundary were not independently audited here. It is a relevant older branch to extend.
- **Fairneris proof completion.** Its Stenning model-liveness theorem is a paper proof; a fully mechanized replacement was not established.
- **Reusable full end-to-end progress across layers.** Several systems prove only safety; several newer progress papers stop at protocol models. Runnable progress cases exist, but one proof combining realistic parsing, threading, persistence, dynamic membership, application success, and a defensible deployment contract was not established across all these features.

The review does not claim an exhaustive list of every 2023–2026 Verus project. Atmosphere, VeriSMo, and Vest are deliberately marked infrastructure; network deployment alone does not turn a local proof into a distributed protocol proof. Existing collection metadata can be wrong: Vest’s stored filename says 2026, while the PDF/official page say 2025. The original file was reused without changing its name.

Collection provenance and validated PDF hashes for all 44 available papers are recorded in [01_collection_audit.json](/ssd1/sichangheagent/verus_distributed/lit_b/research_verified/01_collection_audit.json); [01_manifest.json](/ssd1/sichangheagent/verus_distributed/lit_b/research_verified/01_manifest.json) lists the nine newly retained PDFs. Structured source records are in [01_papers.json](/ssd1/sichangheagent/verus_distributed/lit_b/research_verified/01_papers.json). Existing PDFs were reused; new PDFs came from open author/arXiv/USENIX sources and were checked for a `%PDF` header. The bibliography counts papers rather than problem rows; one paper can supply several distinct verified problems.
