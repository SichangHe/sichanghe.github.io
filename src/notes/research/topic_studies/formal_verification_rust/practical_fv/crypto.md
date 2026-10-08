verified cryptography and secure protocol code
(authored by agents unless marked 🧑)

short version

- fact: cryptographic correctness has several separate parts
  - compute the specified function
  - avoid memory errors
  - avoid revealing secrets through modeled execution behavior
  - use the primitive in a secure protocol
- claim: HACL* and Fiat Crypto show that proved implementations can be useful in production
- inference: compiler, machine, caller, and protocol assumptions deserve explicit tests
- inference: a proof of arithmetic or functional correctness alone does not establish resistance to timing attacks or protocol attacks
- recommended research: use historical upgrades to measure whether proved crypto retains its properties after compilation and integration

what is being verified

- functional correctness: returned values match the mathematical algorithm
- memory safety: modeled execution avoids invalid memory accesses
- secret independence: specified observations do not depend on secret inputs
  - observations can include branches and memory addresses
  - this is narrower than proving the absence of every physical side channel
- cryptographic security: an adversary cannot break a stated protocol goal under stated mathematical assumptions
  - this requires an adversary model and assumptions about the primitives

what existing work shows

- [HACL*: A Verified Modern Cryptographic Library](https://www.microsoft.com/en-us/research/wp-content/uploads/2018/08/tmp536.pdf), CCS 2017, peer reviewed
  - fact: implements cryptographic primitives in F*, verifies them, and generates readable C
  - claim: guarantees memory safety, functional correctness, and modeled timing-leak mitigations
    - abstract: “mitigations against timing side-channels”
  - fact: reported generated library size is about 7,000 C lines
  - claim: GCC-compiled primitives match the fastest pure-C OpenSSL/Libsodium versions in its benchmark
    - reported slowdown against fastest vectorized assembly is 1.1–5.7×
    - hardware, algorithms, and versions are those evaluated in 2017
  - fact: trusted tools include F* typechecker, Z3, KreMLin extraction, and the mainstream C compiler
    - section 1: “we still rely on the correctness” of these tools
  - fact: the timing discipline excludes secret-dependent branches and memory accesses under a model of primitive operation timing
  - fact: compilation preserving timing guarantees is treated separately
    - section 3: “an important but independent challenge”
  - inference: functional compilation correctness does not by itself preserve the source leakage model
  - cost limit: the paper reports both focused implementation work and larger specification effort
    - avoid treating a short primitive-proof time as total library-development cost

- [Simple High-Level Code For Cryptographic Arithmetic – With Proofs, Without Compromises](https://adam.chlipala.net/papers/FiatCryptoSP19/FiatCryptoSP19.pdf), IEEE S&P 2019, peer reviewed
  - fact: Fiat Crypto starts with high-level arithmetic and uses proved transformations to produce specialized low-level code
    - abstract: “80 prime fields and multiple CPU architectures”
  - claim: generated arithmetic is competitive with specialized implementations
  - fact: the paper reports deployment through BoringSSL into Chrome, Android, and CloudFlare
  - fact: the proved arithmetic pipeline ends before ordinary C compilation and deployed machine execution
  - fact: source-level timing discipline is established by construction; compiler preservation is assumed in the reported pipeline
    - section III: “we presume that popular compilers like GCC and Clang do preserve constant time”
  - inference: the proof is about the generated field arithmetic, not every caller, elliptic-curve protocol, or security assumption
  - fact: [the maintained repository](https://github.com/mit-plv/fiat-crypto) documents generation and extraction
    - current repository features must not be attributed wholesale to the 2019 paper

- [HACL*, Vale, and EverCrypt manual](https://hacl-star.github.io/HaclValeEverCrypt.html), current primary project documentation
  - fact: explains their different roles
    - HACL*: portable verified implementations
    - Vale: verified assembly implementations
    - EverCrypt: combines implementations and selects suitable ones
  - fact: [Microsoft's HACL* project publication page](https://www.microsoft.com/en-us/research/publication/hacl-a-verified-modern-cryptographic-library/) describes the combined provider
    - “automatically picks the fastest one available”
  - inference: implementation selection creates another correctness boundary
    - the caller must select a supported algorithm, parameter set, and platform implementation
- [EverCrypt: A Fast, Verified, Cross-Platform Cryptographic Provider](https://www.andrew.cmu.edu/user/bparno/papers/evercrypt.pdf), IEEE S&P 2020
  - source depth: author-hosted paper methods, threat model, trusted tools, and interoperation guarantees checked
  - fact: proves algorithm selection and selection between implementations against shared specifications
    - agility means changing algorithms through one interface
    - multiplexing means selecting an implementation of the same algorithm
  - fact: verifies calls between portable Low* code and Vale assembly using a model of memory layout and calling conventions
    - section V-D verifies CPU-feature detection and the required instruction support
    - section V-D describes handwritten platform macros
    - these macros still need review
  - fact: proves memory safety, agreement with mathematical specifications, and independence of instruction and memory-address traces from secrets
    - section II-B excludes stronger leakage guarantees
      - stronger physical and speculative-execution attacks are outside the stated leakage model
      - examples include electromagnetic radiation and speculative execution
  - fact: the executable guarantee depends on trusted specifications, F*, Z3, extraction to C, the selected C compiler, and assembly/linking behavior
    - section V-B: “we rely on the C compiler, assembler and linker”
    - the formal call model must match the compiled calls
  - fact: primitive correctness is separate from a proof of cryptographic security
    - introduction: “EverCrypt does not (yet) include cryptographic proofs of security”
    - the paper separately proves a collision-resistance reduction for its Merkle-tree application
    - unverified callers can violate API preconditions or expose keys through their own memory bugs
  - inference: verified dispatch itself is established work
    - a new deployment study must target changes outside those proved selection rules and explicitly list its trusted build and platform assumptions

- [Verifying Constant-Time Implementations](https://www.usenix.org/system/files/conference/usenixsecurity16/sec16_paper_almeida.pdf), USENIX Security 2016, peer reviewed
  - fact: ct-verif checks optimized LLVM implementations using SMACK and Boogie
    - abstract: “verifies optimized LLVM implementations”
  - fact: models two executions and proves their permitted leakage agrees
    - supports benign differences already revealed by public outputs
    - verifies the underlying reduction in Coq for a core language
  - fact: evaluates NaCl, OpenSSL, FourQ, and other library components, including top-level APIs
    - timings are separated into product construction and verification
    - no reliable single aggregate verification-time figure extracted here
  - fact: the checked representation is LLVM, before final machine-code generation
    - section 6: “Operand-based constant-time properties, however, are generally not preserved”
  - fact: library-function timing behavior and allocator behavior are assumed
  - inference: ct-verif already addresses compilation-related leakage in optimized intermediate code
    - rerunning this checker across compiler versions alone is not a new verification method

- [Jasmin maintained documentation](https://jasmin-lang.readthedocs.io/en/stable/about.html), primary project documentation
  - fact: defines source semantics in Coq and identifies the compiler-correctness statement in `proofs/compiler/compiler_proof.v`
    - documentation: “formally verified for correctness”
  - fact: [constant-time tooling](https://jasmin-lang.readthedocs.io/en/stable/tools/ct.html) provides both a type-system checker and extraction of explicit leakage into EasyCrypt
    - safety must be established before the relational leakage theorem
  - fact: the ordinary leakage model observes branches and memory access
    - optional DOIT mode also constrains operands of instructions outside the approved data-independent timing list
  - inference: instruction timing assumptions depend on the target and selected leakage policy
    - functional source-to-assembly correctness alone is not evidence for every hardware side channel

- [The Last Mile: High-Assurance and High-Speed Cryptographic Implementations](https://arxiv.org/pdf/1904.04606), associated with IEEE S&P 2020
  - source depth: methods and guarantee boundaries checked in the authors' April 2019 preprint, arXiv v1
    - the final proceedings text was not separately obtained
  - fact: proves reference ChaCha20 and Poly1305 implementations correct, then proves optimized and vectorized versions equivalent in EasyCrypt
  - fact: proves the Jasmin compiler preserves functional behavior into modeled x86 assembly
    - section 3 requires programs to be well typed, safe, terminating, and accepted by the compiler
    - memory access must satisfy the stated valid-memory calling contract
  - fact: checks secret independence of source-level branch and memory-address traces through an instrumented EasyCrypt translation
    - section 4.4 instruments branch decisions and memory addresses
  - limit: this manuscript does not supply one fully connected proof that compilation preserves the timing guarantee
    - section 2: “the connection between these two works has not been established yet”
    - this refers to the Jasmin compiler and a separate proof that many optimization passes preserve constant-time behavior
  - limit: the bridge between Coq's Jasmin semantics and the EasyCrypt model is not automatically certified in this manuscript
    - section 4.2: “would still need to be argued informally”
    - the source program's safety is a prerequisite
  - limit: the checked compiler result ends at modeled assembly
    - these inspected results do not establish correctness of an arbitrary assembler, linker, deployed CPU, or speculative-execution leakage
  - inference: functional compilation and source-level timing proofs are strong prior work, but their distinct proof boundaries must remain visible
    - current Jasmin documentation can describe later guarantees separately

- [Implementing TLS with Verified Cryptographic Security](https://inria.hal.science/hal-00863373/document), IEEE S&P 2013, peer reviewed
  - fact: full paper opened; this is the original F#/F7 miTLS result for TLS 1.2
    - later TLS 1.3 implementations require separate evidence
  - fact: verifies record-layer authenticated stream encryption and handshake key establishment, then combines them through the protocol state machine
  - fact: the game-based theorem covers adversaries controlling network traffic and scheduling parallel connections
    - theorem 6: “For all p.p.t. adversaries”
    - p.p.t. means probabilistic polynomial time, the paper's restriction on adversary computation
    - oracle-based corollary avoids restricting adversaries to the implementation's abstract API types
  - fact: security is conditional on the stated primitive and handshake hypotheses
    - theorem 4 assumes secure signatures, pseudorandom functions, extraction, and RSA/DH key-establishment properties
    - section VII: “rather strong assumptions for the Handshake”
  - fact: the evaluation reports approximately 5,000 implementation lines and 2,500 interface/annotation lines
    - whole-program typechecking takes about 15 minutes in the reported setup
  - fact: this version does not support ECDH or AES-GCM
  - fact: F7, the F# compiler, .NET runtime, and underlying cryptographic libraries remain trusted
    - section VII: “a large, unverified TCB”
  - fact: timing side channels are outside the formal guarantee
    - section VII: “do not formally account for side channels”
  - fact: some usage restrictions are not established by typechecking
  - inference: this supplies a concrete protocol-security result beyond primitive correctness
    - it does not establish that every supported or legacy ciphersuite satisfies the strong-suite hypotheses
    - its game-based protocol theorem and HACL*/Jasmin leakage proofs address different obligations

- [libcrux ML-KEM](https://github.com/cryspen/libcrux/blob/d3f1327340c0549375b5c04702dedfeb4a86ce96/libcrux-ml-kem/README.md) and [ML-DSA](https://github.com/cryspen/libcrux/blob/d3f1327340c0549375b5c04702dedfeb4a86ce96/libcrux-ml-dsa/README.md), current primary project documentation
  - source status: checked October 2026 repository snapshot; project evidence rather than an independently reviewed paper
  - fact: implements all three ML-KEM parameter sets and all three ML-DSA parameter sets
    - provides portable and optimized implementations
  - claim: uses hax and F* to verify arithmetic, polynomial transforms, serialization, and selected higher-level implementation code
  - fact: [ML-KEM verification status](https://github.com/cryspen/libcrux/blob/d3f1327340c0549375b5c04702dedfeb4a86ce96/libcrux-ml-kem/proofs/verification_status.md) explicitly calls its table a “rough guide”
    - its correctness column can mean mathematical properties, range bounds, or correctness against an input/output specification
    - those meanings must not be collapsed into complete algorithm correctness
  - fact: that table reports portable arithmetic 13/13 panic-free and correct, but generic sampling 0/5 and Neon arithmetic 0/13
    - these are snapshot function counts, not a percentage of all production security obligations
  - fact: ML-DSA README's verification statement names arithmetic, polynomial transforms, and serialization
    - it does not establish full signing-algorithm security
  - fact: ML-KEM's source timing discipline does not guarantee compiled timing behavior
    - README: “there are no guarantees from the compiler”
    - describes assembly inspection and established coding patterns as its validation practice
  - fact: callers must provide suitable randomness and perform the documented serialized-key validation
  - inference: this is a current candidate for the proposed versioned regression study
    - it combines checked source properties, explicit incomplete coverage, runtime implementation selection, and ordinary Rust compilation
    - assessing hax/F* translation and Rust-to-binary correspondence remains necessary
  - limit: no proof rerun, benchmark replication, cryptographic hardness proof, or protocol-security proof performed in this review

- [CryptoProver, the human's existing audit](../../../cryptoprover_20260807.md), August 2026
  - fact from that audit: the studied preprint targets production Rust cryptographic crates and functional contracts
    - its quoted paper limit: “not cryptographic security”
  - inference: this reinforces the separation between proving implementation behavior and proving an adversary cannot break a protocol
  - scope: the extensive existing artifact audit belongs in that note
    - this page does not repeat it or treat its results as independently reproduced

what is missing

- inference: these implementation results do not establish an entire application's protocol security
  - randomness, key lifetime, nonce reuse, parsing, and misuse by callers may fall outside the primitive theorem
- research gap candidate: evidence that proved source properties survive real compiler and integration upgrades
  - constant-time validation and verified cryptographic compilers already address parts of this problem
  - ct-verif and Jasmin already cover optimized-code checking and verified assembly generation
  - the narrower candidate concerns historical changes in deployment assumptions, not inventing constant-time compilation
- research gap candidate: detect deployment changes outside proved implementation-selection rules
  - EverCrypt already verifies algorithm and implementation selection, CPU-feature detection, and C/assembly interoperation
  - target handwritten configuration, build tools, linked binaries, and caller preconditions
  - demonstrate failures beyond existing guarantees

research we can do

- a versioned benchmark of proof-to-binary property regressions
  - question: which source guarantees survive compiler, CPU-target, and integration changes?
  - builds on [HACL*](https://www.microsoft.com/en-us/research/wp-content/uploads/2018/08/tmp536.pdf), [Fiat Crypto](https://adam.chlipala.net/papers/FiatCryptoSP19/FiatCryptoSP19.pdf), and [Alive2](compilers.md)
  - proposed new contribution: preserve one precise guarantee across source proof, generated code, binary observations, and version history
    - compare functional and secret-independence checks rather than merging their outcomes
    - baseline: ct-verif on LLVM and Jasmin/EasyCrypt on supported source-to-assembly paths
    - new work would have to expose unsupported integration or platform changes beyond those existing guarantees
  - why it may matter: proof success can coexist with a bad compiler assumption or an incorrect integration
  - first experiment: a few arithmetic and symmetric-crypto routines across historical GCC/Clang releases
    - include known source-to-binary timing counterexamples as positive controls
  - convincing result: real regressions with minimized causes and explicit limits of each checker
    - a clean matrix alone is weak evidence of research novelty
  - cost estimate: six to eight weeks for a pilot
    - agent estimate, excluding new binary semantics or hardware measurement infrastructure
  - closest work: constant-time verification, compiler leakage studies, Jasmin, Vale, verified compilation
    - ct-verif and The Last Mile already occupy the core checking and assembly-generation space
    - reject this proposal if it only repeats those checks without new deployment evidence

- caller contracts that prevent cryptographic misuse
  - question: can verified primitive APIs make assumptions such as nonce uniqueness explicit and checkable at integration time?
  - builds on the primitive contracts in [HACL*](https://www.microsoft.com/en-us/research/wp-content/uploads/2018/08/tmp536.pdf)
  - proposed new contribution: test a narrow stateful API against historical caller bugs and compare proof obligations with runtime enforcement
  - why it may matter: correct arithmetic cannot repair a reused nonce
  - first experiment: one authenticated-encryption interface and one key lifecycle
  - convincing result: catches real misuse while imposing measured, acceptable caller changes
  - cost estimate: two months for one API, depending on available callers
  - closest work: typestate APIs, secure protocol verification, and misuse-resistant cryptographic libraries
    - novelty is uncertain; a new wrapper alone is unlikely to suffice

ChatGPT's opinion

- Extra High consultation submitted for these three topics
- see [consolidated research directions](research_directions.md) for the group's consultation and response
  - this page will not treat model opinion as evidence of novelty

what was searched

- opened HACL* CCS 2017 PDF, Fiat Crypto IEEE S&P 2019 PDF, ct-verif USENIX Security 2016 PDF, miTLS IEEE S&P 2013 PDF
- October 8 follow-up checked EverCrypt author-hosted methods and The Last Mile April 2019 manuscript
  - final Last Mile proceedings text not separately checked
- opened maintained HACL*/Vale/EverCrypt manual, Microsoft project page, Fiat Crypto repository, Jasmin documentation, The Last Mile primary abstract, and libcrux ML-KEM/ML-DSA documentation and verification status
- inspected the existing CryptoProver audit and static-analysis notes before drafting
- primary IACR fetches returned HTTP 403; alternate author-hosted PDFs succeeded for HACL* and Fiat Crypto
- search endpoint failed with HTTP 404
- not covered deeply: later miTLS/TLS 1.3, protocol-security composition beyond the 2013 result, Vale papers, later Jasmin compiler/leakage developments and broader EasyCrypt applications, post-quantum proof artifacts beyond the checked libcrux documentation, 2024–2026 cryptographic verification papers
  - these omissions prevent calling the review exhaustive or claiming a research gap is established
- overlap: [compiler review](compilers.md) covers semantic preservation; [specification and trusted base](spec_quality_trusted_base.md) covers general assumption tracking
