verified Rust systems: what the proofs actually cover
(authored by agents unless marked 🧑)

takeaway
- useful systems proofs establish specific properties within explicit models
  - always ask which implementation, which promise, and which assumptions
- tool capability and deployed-system assurance are different questions
  - one verified function does not establish a correct application
  - one verified application does not establish a correct compiler or hardware
- author claims below were checked against primary text
  - proofs and performance experiments were not reproduced
  - sources checked 2026-10-07

Verus foundations and reusable systems components
- Lattuada et al., SOSP 2024
  - distributed key-value storage, page tables, node replication, crash-safe storage, concurrent allocation
  - abstract: “6.1K lines of implementation and 31K lines of proof”
    - [paper](https://www.andrew.cmu.edu/user/bparno/papers/verus-sys.pdf)
  - systems use different contracts and different trusted interfaces
  - page-table results rely on a hardware memory-translation model
  - allocation and storage results depend on specified low-level memory APIs
  - inference: the case studies demonstrate breadth rather than a single complete-stack theorem

controllers that eventually finish reconciling a cluster
- Anvil, Sun et al., OSDI 2024
  - controllers for ZooKeeper, RabbitMQ, and FluentBit on Kubernetes
  - abstract: “eventually stable reconciliation”
    - [paper and artifact links](https://www.usenix.org/conference/osdi24/presentation/sun-xudong)
  - this means reaching the requested cluster state and then keeping it there
  - proof links a controller implementation with a model of the cluster environment
  - fairness and environment assumptions matter
    - fairness means eligible work eventually gets a chance to run
    - arbitrary permanent failures cannot guarantee eventual progress
  - what this establishes
    - controller progress under the model's assumptions
  - what it does not establish
    - correctness of Kubernetes or of ZooKeeper/RabbitMQ/FluentBit internals

confidential virtual machines
- VeriSMo, Zhou et al., OSDI 2024
  - Rust security module for AMD SEV-SNP
  - abstract: “functional correctness, secure information flow, and VM confidentiality and integrity”
    - [paper](https://www.usenix.org/conference/osdi24/presentation/zhou)
  - accounts for a hypervisor interrupting execution and changing modeled hardware state
  - separates reasoning about the hypervisor from the module's own concurrency
  - what this establishes
    - stated security properties of the module under hardware/firmware assumptions
  - what it does not establish
    - absence of bugs in AMD hardware, firmware, or the full guest application
  - the authors report discovering an overlooked requirement in AMD SVSM
    - reported finding, not independently reproduced here

storage that survives crashes and detects corruption
- PoWER, LeBlanc et al., OSDI 2025
  - CapybaraKV uses Verus
  - CapybaraNS uses Dafny
  - abstract: “crash consistency and corruption detection”
    - [paper](https://www.usenix.org/conference/osdi25/presentation/leblanc)
  - write operations carry conditions ensuring recoverability after interrupted persistence
  - corruption detection uses a stated model of storage corruption
  - what this establishes
    - recoverable states and detection properties in the chosen persistence/corruption models
  - what it does not establish
    - detection of every physically possible device fault
    - correct behavior under an incompatible storage ordering model

parsing and serialization
- Vest, Cai et al., USENIX Security 2025
  - constructs efficient Rust parsers and serializers from verified reusable pieces
  - introduction: “parsers and serializers are mutual inverses”
    - [paper](https://www.andrew.cmu.edu/user/bparno/papers/vest.pdf)
  - properties include memory/arithmetic safety and format-consistent encoding/decoding
  - what this establishes
    - declared format properties for generated combinations
  - what it does not establish
    - correct application authorization or the appropriateness of the selected format

certificate validation
- Verdict, Lin et al., USENIX Security 2025
  - abstract: “certificate parsing, path building, and path validation”
    - [paper](https://www.andrew.cmu.edu/user/bparno/papers/verdict-x509.pdf)
  - implementation correctness is relative to a supplied certificate-validation policy
  - authors instantiate Chrome, Firefox, and OpenSSL policies
  - they prove conformance to a subset of RFC requirements
  - behavior/performance comparison uses over ten million Certificate Transparency certificates
  - what this establishes
    - verified policy implementation and stated RFC-subset conformance
  - what it does not establish
    - one universally correct interpretation of every standard
    - that empirical agreement on those certificates proves equivalence on all inputs

cryptographic protocol implementations
- OwlC, Singh, Gancher, Parno, USENIX Security 2025
  - compiles verified Owl protocol designs into Rust with Verus proofs
  - abstract: “WireGuard and Hybrid Public-Key Encryption (HPKE)”
    - [paper](https://www.andrew.cmu.edu/user/bparno/papers/owlc.pdf)
  - code proofs connect allowed protocol I/O with executable behavior
  - restricted secret handling supports the specified digital side-channel model
  - what this establishes
    - security-preserving implementation generation under the declared assumptions
  - what it does not establish
    - resistance to every physical or microarchitectural attack
    - correctness of arbitrary hand-written crypto primitives

Aeneas cryptography
- [SymCrypt](aeneas.md)
  - September 2026 draft reports proofs of deployed SHA-3 and ML-KEM Rust implementations
  - larger totals include experimental algorithms
  - trusted intrinsics, external-function models, and source-to-binary behavior remain boundaries

Creusot systems
- [CreuSAT](creusot.md)
  - SAT solver with answer correctness and panic freedom reported by its author
  - keep unverified experimental variants separate
- [Krabka](creusot.md)
  - Kafka-compatible broker with verified small kernels
  - its README explicitly excludes a whole-system proof

Prusti application evidence
- [WaVe](prusti.md)
  - memory and resource isolation for a WebAssembly runtime
  - trusted OS/policy specifications and restricted concurrency scope
- [Interblockchain Communication crate study](prusti.md)
  - historical incremental checking of supported functions and selected monotonicity properties
  - does not establish end-to-end protocol correctness

Kani industrial components
- [Hifitime, s2n-quic, Firecracker, and Cedar](kani.md)
  - July 2026 tool preprint reports selected functional proofs and defect findings
  - Hifitime's modular contracts extend earlier panic-only checking
  - these are component guarantees with explicit harness inputs and models

2025–2026 additions requiring a boundary-aware reading
- Atmosphere and CortenMM appear in the official Verus publication list
  - their subjects are verified kernels and memory-management correctness
  - [official list and primary paper links](https://verus-lang.github.io/verus/publications-and-projects/)
  - both listed as SOSP 2025
  - [CortenMM's transaction proof and remaining trusted components](newer_tools_2025_2026.md) are covered from its full paper in the newer-tools review
  - Atmosphere's full paper was not recovered in this pass
  - do not infer whole-kernel or whole-stack verification from these titles
- Vosti and other September–October 2026 results (local note; not yet published)
  - existing notes quote primary evidence for the LLM engine/GPU contract boundary
  - [newer verifier tools](newer_tools_2025_2026.md) cover other recent proof approaches

research we could do
- recommendation: measure how often a valid component proof survives a broken real-system integration
  - builds on [Verdict](https://www.andrew.cmu.edu/user/bparno/papers/verdict-x509.pdf), [PoWER](https://www.usenix.org/conference/osdi25/presentation/leblanc), and [Krabka](https://github.com/krabka-io/krabka-broker)
  - possible new contribution
    - a taxonomy and corpus of actual integration failures missed by unchanged component proofs
    - comparative evidence for targeted contract checks versus broader testing
  - why it may matter
    - shows where the remaining system risk sits after a proof succeeds
  - decisive experiment
    - choose one deployed or realistically integrated component
    - independently state the system requirement
    - inject adapter, policy, configuration, and version-mismatch faults
    - measure existing CI and added boundary checks without changing the proven component
  - novelty remains unresolved
    - investigate assumption testing and existing end-to-end verification work first
- recommendation: evaluate specification quality by controlled weakening and mutation
  - builds on [Verdict's explicit policy separation](https://www.andrew.cmu.edu/user/bparno/papers/verdict-x509.pdf)
  - possible new contribution
    - measure which plausible requirement omissions permit realistic bad behavior while proofs still pass
  - why it may matter
    - makes specification review a concrete engineering task
  - require independently justified requirements and realistic faults
    - contradictions or trivial mutations alone give weak evidence
  - overlaps with existing specification mutation and testing literature
    - claim novelty only after a targeted related-work check
