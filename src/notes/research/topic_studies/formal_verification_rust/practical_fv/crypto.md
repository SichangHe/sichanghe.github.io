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
  - source limit: the EverCrypt research PDF was unavailable through the attempted primary URLs
    - this section describes project documentation, not an independently inspected EverCrypt paper
    - no paper-specific benchmark or theorem claim added

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
  - novelty is unconfirmed until Jasmin, Vale, ct-verif, and binary-checking work are reviewed
- research gap candidate: combine performance-oriented implementation selection with machine-checked API assumptions and regression tests
  - avoid claiming runtime dispatch itself is unverified without inspecting the relevant theorem

research we can do

- a versioned benchmark of proof-to-binary property regressions
  - question: which source guarantees survive compiler, CPU-target, and integration changes?
  - builds on [HACL*](https://www.microsoft.com/en-us/research/wp-content/uploads/2018/08/tmp536.pdf), [Fiat Crypto](https://adam.chlipala.net/papers/FiatCryptoSP19/FiatCryptoSP19.pdf), and [Alive2](compilers.md)
  - proposed new contribution: preserve one precise guarantee across source proof, generated code, binary observations, and version history
    - compare functional and secret-independence checks rather than merging their outcomes
  - why it may matter: proof success can coexist with a bad compiler assumption or an incorrect integration
  - first experiment: a few arithmetic and symmetric-crypto routines across historical GCC/Clang releases
    - include known source-to-binary timing counterexamples as positive controls
  - convincing result: real regressions with minimized causes and explicit limits of each checker
    - a clean matrix alone is weak evidence of research novelty
  - cost estimate: six to eight weeks for a pilot
    - agent estimate, excluding new binary semantics or hardware measurement infrastructure
  - closest work: constant-time verification, compiler leakage studies, Jasmin, Vale, verified compilation
    - this proposal may be scooped already; search these before implementation

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

- opened HACL* CCS 2017 PDF, Fiat Crypto IEEE S&P 2019 PDF, maintained HACL*/Vale/EverCrypt manual, Microsoft project page, Fiat Crypto repository
- inspected the existing CryptoProver audit and static-analysis notes before drafting
- primary IACR fetches returned HTTP 403; alternate author-hosted PDFs succeeded for HACL* and Fiat Crypto
- search endpoint failed with HTTP 404
- not covered deeply: miTLS, protocol-security composition, Jasmin, Vale papers, EasyCrypt, post-quantum implementations, 2024–2026 cryptographic verification papers
  - these omissions prevent calling the review exhaustive or claiming a research gap is established
- overlap: [compiler review](compilers.md) covers semantic preservation; [specification and trusted base](spec_quality_trusted_base.md) covers general assumption tracking
