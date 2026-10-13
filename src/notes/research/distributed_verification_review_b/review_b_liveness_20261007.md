liveness and concrete distributed verification cases
(authored by agents unless marked 🧑)

main findings

- liveness: something eventually happens
- safety: a bad event never happens
- inference: propose the guarantee and assumptions before producing a proof
  - “recover” could mean responding, restoring replica count, or reaching a stable configuration
- distinguish abstract protocol proofs from implementation proofs
  - refinement: a proof connecting code executions to allowed model executions
  - code can remain safe while taking forever without advancing its model
- directly relevant executable examples: IronFleet, Anvil, Welder
- preserve incomplete-proof qualifications
  - Shipwright: end-to-end PBFT proof incomplete in inspected preprint
  - Fairneris: Stenning model liveness uses a paper proof
  - Trillium: distributed Paxos and two-phase commit examples establish safety refinement

papers and boundaries

- IronFleet: Proving Practical Distributed Systems Correct
  - authors: Chris Hawblitzel, Jon Howell, Manos Kapritsos, Jacob R. Lorch, Bryan Parno, Michael L. Roberts, Srinath Setty, Brian Zill
  - SOSP 2015; [paper](https://www.andrew.cmu.edu/user/bparno/papers/ironfleet.pdf), [code](https://github.com/microsoft/Ironclad/tree/master/ironfleet)
  - Dafny implementation → protocol model → abstract service
  - guarantees: IronRSL client progress; IronKV reliable packet delivery
    - IronKV packet delivery is narrower than completion of every key-value request
  - assumptions: §2.5 and §5.1.4
    - IronRSL: live quorum, eventual bounded delivery/scheduling, bounded clock error/input bursts
    - enough memory; no overflow-prevention halt
    - IronKV: recurring host execution; eventual delivery of repeatedly transmitted packets
  - trusted: I/O, verifier, compiler, runtime, OS, packet integrity
  - figure 12, PDF p12: specification / implementation / proof lines / verification minutes
    - IronRSL liveness: “167 – 7869 115”
    - IronKV liveness: “98 – 2093 23”
    - IronRSL implementation: “6 2941 7535 152”
    - IronKV implementation: “6 1340 2937 42”
    - separate layer counts; not whole-project totals
  - §7.1, PDF p12: framework plus both systems took “approximately 3.7 person-years”

- Anvil: Verifying Liveness of Cluster Management Controllers
  - authors: Xudong Sun, Wenjie Ma, Jiawei Tyler Gu, Zicheng Ma, Tej Chajed, Jon Howell, Andrea Lattuada, Oded Padon, Lalith Suresh, Adriana Szekeres, Tianyin Xu
  - OSDI 2024; [paper](https://www.usenix.org/system/files/osdi24-sun-xudong.pdf), [code](https://github.com/anvil-verifier/anvil)
  - Verus verifies Rust ZooKeeper, RabbitMQ, FluentBit controllers
  - eventually stable reconciliation
    - stable desired state ⇒ cluster eventually matches and remains matched
  - §4.3: fair scheduling, eventual cessation of crashes/request failures, restricted competing controllers
  - trusted: environment, external APIs, wrappers, entry point
  - §5: prove eventual environment suitability, then progress from any reachable state
  - §6.1, p659: effort
    - ZooKeeper: “around two person-months”
    - other controllers using established strategy: “around two person-weeks”
  - table 1, p660: trusted / executable / proof totals
    - ZooKeeper: “950 1134 8352”
    - RabbitMQ: “548 1598 7228”
    - FluentBit: “828 1208 8395”
    - trusted counts include specification and unverified components
  - §7.2: fault testing found a bug in a trusted ZooKeeper API assumption
    - authors corrected model, implementation, and proof
    - inference: check deployment assumptions independently of proof completion

- Welder: Compositional Liveness Verification of Cluster Control Planes
  - authors: Zhizhen Cathy Cai, Nikhil Date, Jiawei Tyler Gu, Cody Rivera, Tej Chajed, Oded Padon, Tianyin Xu, Xudong Sun
  - SOSP 2026; [author PDF](https://cathy-cai.page/pubs/welder26.pdf), [DOI](https://doi.org/10.1145/3830418.3843868), [code](https://github.com/anvil-verifier/anvil)
  - Verus verifies composed Rust Deployment, ReplicaSet, StatefulSet, RabbitMQ controllers
  - CORE: eventual stable reconciliation plus restrictions on inter-controller changes
  - §4.1: repeated dependent updates before desired-state stabilization
  - §4.2: scheduling an update does not guarantee winning its version race
    - retry wrapper and extra fairness justify conflict-free update abstraction
  - §3.2: temporarily violating object ownership can leave a permanent name conflict
  - §8: discussed composition rule assumes acyclic progress dependencies
  - trusted: Kubernetes libraries, wrappers, environment, runtime
  - table 1, PDF p13: specification / unverified / executable / model / conformance / CORE lines
    - ReplicaSet: 205 / 257 / 300 / 418 / 119 / 7726
    - Deployment: 254 / 387 / 365 / 563 / 190 / 10327
    - StatefulSet: 194 / 380 / 896 / 1274 / 366 / 12085
    - RabbitMQ: 247 / 298 / 1619 / 1660 / 175 / 6920
    - composition: 429 lines; total CORE: 37487; included reconciliation proof: 36215
  - §7.1, PDF p12: “Verifying the four controllers took 1.5 person-years.”
    - includes framework development; later RabbitMQ verification took 40 days

- Trillium: Higher-Order Concurrent and Distributed Separation Logic for Intensional Refinement
  - authors: Amin Timany, Simon Oddershede Gregersen, Léo Stefanesco, Jonas Kastberg Hinrichsen, Léon Gondelman, Abel Nieto, Lars Birkedal
  - POPL 2024; [paper](https://iris-project.org/pdfs/2024-popl-trillium.pdf), [DOI](https://doi.org/10.1145/3632851)
  - Coq/Iris connects code traces to abstract models
  - §4: Fairis concurrent examples prove liveness under fair scheduling
    - yes-no termination; diverging neighboring thread; even/odd counter
  - §5: AnerisLang Paxos and two-phase commit refine manually translated TLA+ models
    - not a verified TLA+ compiler or Rust translation
  - §5, p9:23: “we will target safety trace properties”
  - §5: “We leave a more principled approach to proving liveness properties of distributed systems as future work.”
  - supplement: CRDT eventual consistency under communication assumptions
    - supplement not fully audited here
  - [framework repository](https://github.com/logsem/trillium)
    - README: “trace refinements between programs and models”
    - exact paper-version artifact not independently built

- Shipwright: Proving liveness of distributed systems with Byzantine participants
  - authors: Derek Leung, Nickolai Zeldovich, Frans Kaashoek
  - arXiv preprint 2507.14080, 2025; [paper](https://arxiv.org/pdf/2507.14080)
  - Dafny specifications/code extracted to Go
  - PBFT prototype: one log entry; indefinitely many views
  - §3.2: eventual network stabilization, bounded subsequent delivery, delivered timeouts, progressing clocks
  - §3.1: trusted runtime/signatures; protected honest private keys
  - §4.2: top-level theorem excludes full client replies
  - §5, p12: “We have not yet proven correct all of the trace properties required for safety and liveness of the end-to-end specification.”
  - inference: incomplete implementation proof, not completed PBFT liveness baseline
  - public repository and later completion status unresolved

- Planning for Change in a Formal Verification of the Raft Consensus Protocol
  - authors: Doug Woos, James R. Wilcox, Steve Anton, Zachary Tatlock, Michael D. Ernst, Thomas Anderson
  - CPP 2016; [paper](https://homes.cs.washington.edu/~mernst/pubs/raft-proof-cpp2016.pdf), [code](https://github.com/uwplse/verdi-raft)
  - Coq/Verdi implementation proves Raft safety and linearizability
  - network semantics permits faults and unreliable delivery
  - §3.1: “we have only verified Raft’s safety properties, leaving liveness for future work.”
  - §3.2: “530 lines of code and 50,000 lines of proof”

- Programming and Proving with Distributed Protocols
  - authors: Ilya Sergey, James R. Wilcox, Zachary Tatlock
  - POPL 2018; [paper](https://jamesrwilcox.com/disel.pdf), [code](https://github.com/DistributedComponents/disel)
  - Disel combines executable Coq programs with composable protocol specifications
  - extraction uses an OCaml runtime shim
  - examples: replicated services; two-phase commit
  - §1, p4: “focusing on verification of safety properties and leaving reasoning about liveness properties for future work.”
  - inference: return-value correctness does not prove a call returns

- Grove: A Separation-Logic Library for Verifying Distributed Systems
  - authors: Upamanyu Sharma, Ralf Jung, Joseph Tassarotti, M. Frans Kaashoek, Nickolai Zeldovich
  - SOSP 2023; [paper](https://pdos.csail.mit.edu/papers/grove:sosp23.pdf), [code](https://github.com/mit-pdos/grove)
  - Go components verified in Coq/Iris
    - replication, reconfiguration, leases, RPC effects, locks, bank client
  - §1, p2: “Grove cannot verify liveness properties, such as ensuring that the system will respond or otherwise make progress.”
  - inference: lease safety does not establish availability

- Verifying Strong Eventual Consistency in Distributed Systems
  - authors: Victor B. F. Gomes, Martin Kleppmann, Dominic P. Mulligan, Alastair R. Beresford
  - OOPSLA 2017; [paper](https://arxiv.org/pdf/1707.01747), [code](https://github.com/trvedata/crdt-isabelle)
  - Isabelle/HOL convergence theorem and executable CRDT definitions
    - replicated growable array; observed-remove set; increment/decrement counter
  - network abstraction: asynchronous unreliable causal broadcast
  - §5.2, p109:12: “we make no assumptions about the reliability or the ordering of messages.”
  - inference: equal received operations ⇒ convergence does not prove eventual delivery

- Fairneris: Verifying Liveness Properties of Distributed Systems via Trace Refinement in Higher-Order Concurrent Separation Logic
  - authors: Jonas Kastberg Hinrichsen, Léo Stefanesco, Lars Birkedal, Amin Timany
  - author-hosted 2024 manuscript; venue/date not independently established; [PDF](https://cpv.au.dk/pdfs/2024-fairneris.pdf)
  - artifact unresolved
  - AnerisLang implementation of Stenning transfer over UDP-like networking
  - §4.1: every sequence number eventually acknowledged under scheduling/network fairness
  - §1, p5: “The only exception is the liveness theorem of the Stenning model, for which we instead give a paper proof.”
  - Coq checks refinement and most infrastructure
    - model liveness remains a paper argument
  - inference: a checked refinement does not imply a checked model liveness theorem

- LVR: Mostly Automated Verification of Liveness Properties for Distributed Protocols with Ranking Functions
  - authors: Jianan Yao, Runzhou Tao, Ronghui Gu, Jason Nieh
  - POPL 2024, [DOI](https://doi.org/10.1145/3632877), [artifact](https://doi.org/10.5281/zenodo.10039066)
  - mypyvy/P-FOL-IC3 proves abstract protocol obligations after ranking synthesis
    - ranking: a measure that decreases until the desired result is reached
  - §9.1 abstracts IronFleet host behavior for sliding-window translation
  - fairness and protocol premises supplied as input
  - table 3, p35:25: eight model cases
    - ticket lock; hybrid reliable broadcast; alternating bit; TLB shootdown
    - Paxos; multi-Paxos; stoppable Paxos; sliding window
  - table 4: corresponding model code lines
    - “68 137 127 361 133 135 160 119”
  - each case needed user-added variables
    - some needed bounds, tiers, or missing contradictions
  - §9.2, p35:27: “Only three” safety obligations needed manually found invariants
    - “manually in a few hours each”
  - inference: ranking synthesis success is narrower than autonomous end-to-end verification

- LiDO: Linearizable Byzantine Distributed Objects with Refinement-Based Liveness Proofs
  - authors: Longfei Qiu, Yoonseung Kim, Ji-Yong Shin, Jieung Kim, Wolf Honoré, Zhong Shao
  - PLDI 2024; [paper page](https://flint.cs.yale.edu/publications/lido.html), [DOI](https://doi.org/10.1145/3656423), [artifact](https://doi.org/10.5281/zenodo.10909272)
  - Coq proves unpipelined and pipelined Jolteon model refinements
  - assumptions: partial synchrony, Byzantine fault threshold, recurring honest leaders, timers
    - partial synchrony: communication/processing eventually meet specified timing bounds
  - §6 extracts unpipelined network specification to OCaml
  - §6, p193:20: code “lacks implementations of the network primitives and the timer”
    - manually added network/timer shim remains separate
  - §4.4, p193:19: “Proving its liveness took around 1,800 lines”
  - §5, p193:20: pipelined proof “required around 2,000 lines”

- LiDO-DAG: A Framework for Verifying Safety and Liveness of DAG-Based Consensus Protocols
  - authors: Longfei Qiu, Jingqi Xiao, Ji-Yong Shin, Zhong Shao
  - PLDI 2025; [paper page](https://flint.cs.yale.edu/publications/lido-dag.html), [DOI](https://doi.org/10.1145/3729306), [artifact](https://doi.org/10.5281/zenodo.15223659)
  - Coq model proofs: Narwhal with Jolteon, Bullshark, Sailfish
  - Narwhal uses Jolteon rather than the original HotStuff combination
    - §4.2: “Here we reused the Jolteon”
    - BFT requests wait until the proposed vertex is locally available
  - OCaml extraction plus manually connected network/timer primitives
  - §8: “Our work is currently limited to partially synchronous protocols.”
  - table 2, p203:20: specification / proof lines
    - Bullshark: “603” / “4343”
    - original Sailfish: “270” / “3479”
    - Narwhal includes imported definitions/proofs
  - inference: model proof and executable demonstration do not prove production repositories

- Mechanized Safety and Liveness Proofs for the Mysticeti Consensus Protocol under the LiDO-DAG Framework
  - authors: Longfei Qiu, Jingqi Xiao, Zhong Shao
  - IEEE S&P 2026; [Yale publications](https://flint.cs.yale.edu/publications/), [artifact](https://zenodo.org/records/17345693)
  - Rocq proves a modified Mysticeti model
  - arbitrary round jumps can prevent progress
  - assumptions: partial synchrony and eventual compliance with repaired vertex-creation rule
  - §2, p3: “we construct a formal model of the modified Mysticeti protocol in Rocq”
  - §5, p16: “6271 lines”; “developed by two persons in two months”
  - authors separately audit Sui/IOTA implementations
    - historical paper claims; October 2026 deployment status not checked
  - inference: repaired model proof is distinct from unchanged deployed-code proof

- Implicit Rankings for Verifying Liveness Properties in First-Order Logic
  - authors: Raz Lotan, Sharon Shoham
  - TACAS 2025; collection PDF; [DOI](https://doi.org/10.1007/978-3-031-90643-5_20)
  - SMT checks composed first-order relations implying decreasing measures
  - §6 models finite but unbounded populations
  - §6, pp388–389: “assume a finite (but unbounded) semantics for the domain”
  - §6: “All examples are successfully verified within 10 minutes.”
    - excludes human ranking/hint design
  - cases: stabilization, binary counter, token/leader rings, SAT search, Dijkstra protocols
  - repository URL unresolved

additional temporal methods

- Reducing Liveness to Safety in First-Order Logic
  - Oded Padon, Jochen Hoenicke, Giuliano Losa, Andreas Podelski, Mooly Sagiv, Sharon Shoham
  - POPL 2018; [paper](https://www.cs.tau.ac.il/~sharonshoham/papers/popl18.pdf); [DOI](https://doi.org/10.1145/3158114)
  - first-order model verification through safety reduction
- Temporal Prophecy for Proving Temporal Properties of Infinite-State Systems
  - Oded Padon, Jochen Hoenicke, Kenneth L. McMillan, Andreas Podelski, Mooly Sagiv, Sharon Shoham
  - FMCAD 2018; extended FMSD 57:246–269, 2021; [DOI](https://doi.org/10.1007/s10703-021-00377-1)
  - added justified state makes infinite-state safety reduction more precise
- [official Ivy examples](https://github.com/kenmcmil/ivy/tree/master/doc/examples/liveness)
  - ticket scheduling; FIFO; cascaded, blocked, bypassing queues; model refinement
  - abstract proof models; checker not run in this slice
  - [tutorial README](https://github.com/kenmcmil/ivy/blob/master/doc/examples/cav2020/liveness/README.md)
    - “ticket.ivy: running example of the POPL'18 paper”
    - “ticket_nested.ivy: running example of the FMCAD'18 paper that requires temporal prophecy”

agent evidence

- VeruSAGE: A Study of Agent-Based Verification for Rust Systems
  - Chenyuan Yang, Natalie Neamtu, Chris Hawblitzel, Jacob R. Lorch, Shan Lu
  - arXiv 2512.18436v2, 2026; [paper](https://arxiv.org/abs/2512.18436); [benchmark](https://github.com/microsoft/verus-proof-synthesis)
  - table 3: Anvil Library row “104 48% 79% 86% 100%”
  - individual proof-completion tasks under existing contracts
  - inference: not success rates for discovering requirements and complete proofs from vague requests

concrete cases

- [45-case CSV register](review_b_liveness_cases_20261007.csv)
  - problem, guarantee, proof level, source section
  - implementation proofs retain their paper-specific trust boundary
  - grouped variants and repeated protocols reflect distinct published demonstrations
  - not 45 unique production systems

evaluation recommendations; agent inferences

- score requirement choice, assumptions, model proof, code refinement, execution separately
- keep safety and liveness scores separate
- challenge progress claims with never-responding code and indefinitely postponed actions
- check whether transport and scheduling premises exclude those executions
- controller cases: name conflicts, version races, desired-state changes, interrupted API calls
- refinement cases: code that loops forever after a safe prefix
- preserve human requirements during proof repair
  - record weakened guarantees, new assumptions, excluded faults, admitted lemmas, trusted wrappers
- combine proof checking with independent environment inspection and fault testing
- score bounded counterexample search separately from unbounded proof
- smaller tasks: retransmission, FIFO delivery, CRDT counter, single controller
- larger tasks: Raft safety, IronRSL progress, controller composition, Byzantine consensus

provenance and gaps

- page references: printed paper pages unless labeled PDF pages
- relevant sections of 18 primary full texts inspected on 7 October 2026
- inherited material: formal-verification foundations and sequential termination tools
  - retained as references; not every inherited claim re-audited
- PDFs: shared paper collection; two missing collection copies saved
  - Fairneris manuscript; Padon POPL2018
- discovery: primary HTTP retrieval, Crossref, GitHub, inherited sources, parent Google leads
  - web search API failed; no successful Scholar search claimed
- source audit: [full working note](/ssd1/sichangheagent/verus_distributed/lit_b/liveness_cases.md)
- unresolved: pinned proof reproduction, Fairneris artifact/venue, Shipwright completion
- unresolved: complete case-specific fairness contracts and effort beyond proof-line counts
