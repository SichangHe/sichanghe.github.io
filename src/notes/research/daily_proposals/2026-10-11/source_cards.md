# Six primary-source evidence cards
(authored by agents unless marked 🧑)

## Vest

Confidence: high for checked metadata/quote, provisional for gap relevance. Metadata and observed interfaces are facts; published results are author claims; negative-evidence positioning is inference.

Yi Cai, Pratap Singh, Zhengyao Lin, Jay Bosamiya, Joshua Gancher, Milijana Surbatovich, Bryan Parno. *Vest: Verified, Secure, High-Performance Parsing and Serialization for Rust*. USENIX Security 2025, pp.6917–6935. Primary paper: https://www.usenix.org/system/files/usenixsecurity25-cai-yi.pdf. Query: “Vest verified binary parsers paper PDF”. Selected as direct Verus baseline.

Exact quote, PDF p.6: “The parse function operates on byte slices”. Future-work statement, PDF p.16: “supporting streaming formats”. Paper section is Discussion and Future Work; the previous screened note's §8 reference is imprecise. Task: verified combinator/DSL parsing and serialization. Targets: Bitcoin, TLS and Wasm. Baselines: Rust Bitcoin, rustls, wasmparser; EverParse and vWasm for verification. Metrics: runtime and verification time. Result: author-reported competitive runtime and faster verification; numerical ratios in Pro answer remain provisional locally. Limitations: slice lifetime, flattened Wasm instructions and trusted compiler/verifier. Negative evidence: parser generation/round trips/prefix stability are prior art. Local relation: `rust_verifiers/verified_systems.md` and October 10 screened memo.

Official artifact pin `11af01ddaef76cceded03517cd48764adb9d35b1`: [proof trait](https://github.com/secure-foundations/vest/blob/11af01ddaef76cceded03517cd48764adb9d35b1/vest_lib/src/core/proof.rs#L220-L249) defines a `NoLookAhead` contract stating common successful prefixes “parse to the same value”. [Parser API](https://github.com/secure-foundations/vest/blob/11af01ddaef76cceded03517cd48764adb9d35b1/vest_lib/src/core/exec/parser.rs#L10-L14) returns `Result<(usize, O), ParseError>`. [Pair](https://github.com/secure-foundations/vest/blob/11af01ddaef76cceded03517cd48764adb9d35b1/vest_lib/src/combinators/tuple/exec.rs#L37-L52) returns error if the second parse fails, with no first-result continuation. Applicability of `NoLookAhead` to the target TLS parser is unverified. This is a narrow implementation observation. Encoded BER/CBOR chunks do not themselves establish transport arrival semantics. Read-only agent searched 167 library/guide files; current artifact build and repository-wide absence remain unproved. Access: public primary PDF reused from October 10; pinned core files freshly retrieved with hashes. Existing collection year retained despite metadata correction to 2025.

## EverParse

Confidence: high for checked metadata/quote, provisional for gap relevance. Metadata and observed interfaces are facts; published results are author claims; negative-evidence positioning is inference.

Tahina Ramananandro, Antoine Delignat-Lavaud, Cédric Fournet, Nikhil Swamy, Tej Chajed, Nadim Kobeissi, Jonathan Protzenko. *EverParse: Verified Secure Zero-Copy Parsers for Authenticated Message Formats*. USENIX Security 2019, pp.1465–1482. Primary author PDF: https://www.microsoft.com/en-us/research/wp-content/uploads/2019/05/20190601everparse.pdf. Query: “EverParse verified parsers paper PDF”. Selected for strong-prefix and secure-combinator precedent.

Exact quote, §4.4, PDF p.9: “We represent their input as a slice”. Task: verified zero-copy parsers/serializers for TLV formats. Targets: TLS, Bitcoin, PKCS #1. Baselines: MITLS, Bitcoin Core, mbedTLS. Metrics: generated size, verification/extraction time, request rate and throughput. Result: functional/safety/representation guarantees and systems case studies; benchmark numbers not independently validated. Limitation: trusted format adequacy and F*/Z3/extraction/compiler; no historical build reproduced. Negative evidence: prefix properties and zero-copy correctness are established. Does not establish absence of arrival proofs elsewhere. Local relation: `practical_fv/ebpf_wasm_network.md`. Source type: primary published paper, extraction reused from October 10. Access: public PDF; retrieved physical page differs from Pro's project-PDF page number.

## EverParse3D

Confidence: high for checked metadata/quote, provisional for gap relevance. Metadata and observed interfaces are facts; published results are author claims; negative-evidence positioning is inference.

Nikhil Swamy, Tahina Ramananandro, Aseem Rastogi, Irina Spiridonova, Haobin Ni, Dmitry Malloy, Juan Vazquez, Michael Tang, Omar Cardona, Arti Gupta. *Hardening Attack Surfaces with Formally Proven Binary Format Parsers*. PLDI 2022; DOI 10.1145/3519939.3523708. Primary author PDF: https://www.normalesup.org/~ramanana/research/everparse/pldi2022/paper.pdf. Queries: verified streaming/incremental binary parsers. Selected as strongest contrary precedent.

Exact quote, §1.2, PDF p.3: “Parsing from non-contiguous or streaming data sources, with on-demand fetching of data”. §3.2, PDF p.7 says consuming a byte makes it “provably impossible to read that byte again”. Task: verified C validators with dependent formats, actions, abstract streams and double-fetch freedom. Target: Hyper-V network virtualization formats. Baseline: handwritten production parsers. Metrics: functional regression and cycles/byte acceptance criteria. Result: deployed author case study, not reproduced. Limitations: action functional behavior underspecified; production formats/measurements proprietary. Negative evidence: broad verified-streaming/exact-consumption claims are defeated. Local relation: reviewed streaming alternative. Source type: primary conference paper. Access: fresh public author PDF, hash recorded; public stream implementation not audited today. Gap around suspension and memory remains a hypothesis.

## PulseParse

Confidence: high for checked metadata/quote, provisional for gap relevance. Metadata and observed interfaces are facts; published results are author claims; negative-evidence positioning is inference.

Tahina Ramananandro, Gabriel Ebner, Guido Martínez, Nikhil Swamy. *Secure Parsing and Serializing with Separation Logic Applied to CBOR, CDDL, and COSE*. arXiv:2505.17335v2, July 17, 2025. Primary: https://arxiv.org/pdf/2505.17335v2. Later archival venue/version not established. Query: formal verification incremental binary parser streaming buffer bound. Selected to distinguish partial traversal from partial arrival.

Exact quote, abstract p.1: “a constant amount of stack space”. §3.2, PDF p.7: “incremental, mostly zero-copy parsing”; its partial values contain pointers into the input array. Task: separation-logic combinators, CBOR/CDDL validation/parsing/serialization. Targets: record/map/nested array and COSE. Baselines: QCBOR, TinyCBOR, OpenSSL-based handling. Metrics: execution time and allocations/representations. Result: mixed author performance; quantitative numbers provisional. Limitations: full-input validation before EverCDDL access, representation and unsupported features; not rebuilt. Negative evidence: constant stack and incremental traversal already exist; neither phrase alone establishes resumable arrivals. Local relation: parser memory hypothesis. Source type: primary preprint. Access: fresh versioned PDF; later-version check unresolved.

## Leapfrog

Confidence: high for checked metadata/quote, provisional for gap relevance. Metadata and observed interfaces are facts; published results are author claims; negative-evidence positioning is inference.

Ryan Doenges, Tobias Kappé, John Sarracino, Nate Foster, Greg Morrisett. *Leapfrog: Certified Equivalence for Protocol Parsers*. PLDI 2022; DOI 10.1145/3519939.3523715. arXiv:2205.08762v1, May 18, 2022. Primary: https://arxiv.org/pdf/2205.08762v1. Query: “Leapfrog Certified Equivalence for Protocol Parsers official PDF PLDI 2022”. Selected as relational-proof prior art.

Exact quote, abstract p.1: “fully automatic and push-button”. Task: Coq/SMT equivalence for P4 parser automata. Targets: network parser transformations. Baselines: internal leaps/reachable-state-pruning ablations. Metrics: proof time/memory. Checked author statement in Overall Performance: small cases up to roughly ten states finish within five minutes; large-state scaling difficult. Numerical ablation ratios remain provisional. Limitations: model excludes externs, header stacks, calls and lookahead; large configuration growth. Negative evidence: certified parser equivalence is established; transport-call theorem still needs a different relation. Local relation: parser partition theorem. Source type: primary conference preprint. Access: fresh versioned PDF; no Coq reproduction.

## Narcissus

Confidence: high for checked metadata/quote, provisional for gap relevance. Metadata and observed interfaces are facts; published results are author claims; negative-evidence positioning is inference.

Benjamin Delaware, Sorawit Suriyakarn, Clément Pit-Claudel, Qianchuan Ye, Adam Chlipala. *Narcissus: Correct-by-Construction Derivation of Decoders and Encoders from Binary Formats*. PACMPL 3, ICFP, Article 82, August 2019; DOI 10.1145/3341686. Author PDF: http://adam.chlipala.net/papers/NarcissusICFP19/NarcissusICFP19.pdf. Queries: incremental parser verified bounded memory protocol parsing paper. Selected to exclude generic synthesis/round-trip novelty.

Exact quote, abstract p.1: “form inverses of each other”. Task: Coq derivation from relational formats. Target: MirageOS Ethernet/ARP/IP/TCP/UDP processing. Baseline: handwritten networking stack. Metric: page-load overhead. Checked author report §7: “less than 1% on small pages” and “0.5-4% on large pages”; not reproduced. Limitation: fixed-length optimized buffers and custom extracted data structures are trusted/unverified (§7 implementation discussion). Negative evidence: correct-by-construction encoder/decoder derivation exists. Local relation: streaming parser lifetime/representation concerns. Source type: primary published author PDF. Access: HTTPS PDF 403; HTTP author PDF succeeded. `narcissus_candidate` filenames indicate retrieval route, not uncertain identity: title/authors/article/DOI checked in PDF.

## Supplementary baseline and accounting
