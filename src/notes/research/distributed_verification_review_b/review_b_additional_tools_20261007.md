additional tools and Byzantine agreement, review B, 7 October 2026
(authored by agents unless marked 🧑)

guarantee differences
- Remix and Mocket compare selected implementation executions with models
- PVerifier checks inductive proofs of supplied P designs
- Velisarios proves PBFT agreement
    - full linearizability and liveness remain future work

Remix
- Lingzhi Ouyang, Xudong Sun, Ruize Tang, Yu Huang, Madhav Jivrajani, Xiaoxing Ma, Tianyin Xu
    - Multi-Grained Specifications for Distributed System Model Checking and Verification
    - EuroSys 2025
    - [paper](https://arxiv.org/abs/2409.14301)
- §3.5 names Remix as the paper's tool
    - developers select module specifications and their detail manually
    - TLC checks the combined model
    - a coordinator replays model actions against instrumented ZooKeeper code
    - developers map the start and end of code actions
- §3.4: “The conformance checking is unsound”
    - the following paragraph says unmodeled implementation behavior can be missed
    - only safety properties are checked
- inference: replay success covers checked executions
    - no proof establishes conformance for all Java executions
- repository identity unresolved

Mocket
- [Icysandwich/Mocket](https://github.com/Icysandwich/Mocket)
    - primary README checked on 7 October 2026
    - publication authors, venue, and year unresolved
- README: “The goal is to find inconsistencies between the TLA+ specification and distributed system implementations”
- preprocessing and testing sections describe the workflow
    - annotate Java state and actions
    - export TLC's state graph
    - generate paths through the graph
    - drive implementation runs with instrumentation and a testing server
    - configure fault types and client requests
- inference: this is model-guided testing
    - coverage depends on paths, action mapping, instrumentation, and configured faults
    - no universal implementation or progress theorem located

PVerifier
- [official source announcement](https://github.com/p-org/P/blob/master/Docs/docs/advanced/PVerifierLanguageExtensions/announcement.md)
    - connects the backend to the Message Chains paper below
- announcement: “all executions over all possible system configurations”
    - claim applies to the supplied P design under its assumptions
    - users supply assumptions and an inductive invariant
    - UCLID5 and an SMT solver check initialization, step preservation, and the desired property
- [2PC tutorial](https://github.com/p-org/P/blob/master/Docs/docs/advanced/PVerifierLanguageExtensions/twophasecommitverification.md)
    - accepting implies every participant preferred acceptance
    - configuration restrictions and auxiliary invariants support the proof
    - no crash-tolerant completion theorem established by this tutorial
- announcement reports internal sharded transaction verification with snapshot isolation
    - internal system details and proof remain unreleased
    - inference: author report, beyond independently inspectable public proof evidence

Message Chains for Distributed System Verification
- Federico Mora, Ankush Desai, Elizabeth Polgreen, Sanjit A. Seshia
    - OOPSLA 2023
    - [paper](https://doi.org/10.1145/3622876)
    - [UPVerifier source](https://github.com/FedericoAureliano/upverifier)
- §3 proves invariants over reachable states by induction
- §4 proposes specifications learned from message histories
    - candidate statements still need verification
- §6 cases include ring election, firewall, onion routing, clock queries, and transaction commit
    - models express their claimed properties
    - these are not proofs of production Tor or AWS ClockBound binaries
- §6.2.4: “we focus on basic correctness”
    - onion-routing case checks the path back to the originating client
    - statistical anonymity and cryptographic guarantees are outside that case
- inference: message histories help formulate useful auxiliary statements
    - example executions alone do not establish a guarantee

Velisarios: Byzantine Fault-Tolerant Protocols Powered by Coq
- Vincent Rahli, Ivana Vukotic, Marcus Völp, Paulo Esteves-Verissimo
    - ESOP 2018
    - [correct author PDF](https://vrahli.github.io/articles/velisarios.pdf)
    - [source](https://github.com/vrahli/Velisarios)
    - [agreement theorem](https://github.com/vrahli/Velisarios/blob/master/PBFT/PBFTagreement.v)
- §5 proves agreement for the executable Coq PBFT implementation
    - correct replicas return the same reply for the same client and timestamp
    - theorem assumes authenticated origins, correct keys, and a bound on faulty nodes
- §5: “we leave linearizability for future work”
    - conclusion also leaves liveness and timeliness for future work
- §6 extracts OCaml code and uses a networking/cryptography runtime
    - inference: runtime and cryptographic assumptions remain part of the guarantee boundary
- correct PDF freshly retrieved and matched the existing collection byte for byte
    - unrelated inherited PDF labelled Velisarios excluded

coverage
- two additional primary papers: Message Chains and Velisarios
    - Remix belongs to an already covered paper
    - Mocket README is repository evidence
- no missing PDF required another collection entry
- open gaps: Mocket publication metadata and Remix repository identity
