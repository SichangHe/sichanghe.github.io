# Daily program-verification proposal — October 11, 2026

(authored by agents unless marked 🧑)

## Decision

I recommend funding a **small, killable pilot**, not yet a full project.

The proposed research object is **arrival-partition semantics**: whether a parser gives the same meaning when the same byte sequence arrives in one buffer, one-byte fragments, or any other chunking.

The concrete artifact, working name **CutParse**, is a Verus library and generator for resumable binary parsers with three joint guarantees:

1. terminal results do not depend on transport chunk boundaries
2. committed input bytes are neither skipped nor consumed twice
3. parser-owned memory has a statically proved bound

This is not a new parser-format DSL and does not repeat parser–serializer round-trip correctness. The main risk is EverParse3D: it already supports non-contiguous and streaming sources. The narrower hypothesis is that its paper does not specify a resumable arrival API, partition-invariance theorem, and live-buffer theorem together. That boundary must survive a code-level prior-art audit before the project proceeds. [Normale Sup+2](https://www.normalesup.org/~ramanana/research/everparse/pldi2022/paper.pdf)

Terminology used below:

- **fact**: directly observed in a cited source
- **author claim**: a result reported by the source authors but not reproduced here
- **inference**: my conclusion from the reviewed evidence
- **hypothesis**: a claim the proposed pilot must test

No implementation or performance experiment ran today.

---

# Proposal memo

## 1. Problem

Verified parser systems generally establish properties of a parser applied to a logical input buffer or stream. Production I/O adds another stateful component: bytes arrive incrementally, fields cross read boundaries, partial prefixes must be retained, and an apparent error may only mean that more input is needed.

**Fact.** Vest’s public parser API takes a Rust byte slice. EverParse’s low-level API uses a buffer slice and position. Narcissus’s optimized decoder uses a fixed-length byte buffer. [USENIX+2](https://www.usenix.org/system/files/usenixsecurity25-cai-yi.pdf)

**Fact.** EverParse3D is the strongest contrary precedent. It explicitly supports non-contiguous or streaming sources with on-demand fetching. Its logical validator consumes a stream through an abstract position and can discard consumed input. [Normale Sup+1](https://www.normalesup.org/~ramanana/research/everparse/pldi2022/paper.pdf)

**Fact.** Nom 8.0.0 offers practical partial-input semantics. Its documentation says: “A streaming parser assumes that we might not have all of the input data.” It returns Incomplete(Needed) when additional bytes are required. [Docs.rs+3](https://docs.rs/nom/latest/nom/)

**Inference.** The useful gap is not “verified streaming parsing.” That claim is contradicted by EverParse3D. The candidate gap is a separately resumable parser whose observable terminal semantics are proved independent of how an ordered byte stream is divided into calls, while its retained state is also bounded.

That is a systems boundary between transport and format parsing. It is distinct from the recent GPU representation, API evolution, verifier-translation, and allocator-budget proposals. It is also narrower than protocol liveness or a general storage-boundary study.

## 2. Artifact: CutParse

CutParse would contain:

1. A small format language or combinator subset for deterministic, left-to-right binary formats:

  - fixed-width integers
  - refinements
  - sequencing
  - discriminated choices
  - bounded repetitions
  - length-delimited subformats
  - opaque or incrementally consumed payloads
2. A resumable machine with an API resembling:

Rust`enum Step<E> {
    NeedMore { at_least: usize },
    Produced(E),
    Done,
    Reject(ParseError),
}

fn feed(&mut self, chunk: &[u8], sink: &mut impl Sink) -> Step<Event>;
fn finish(&mut self, sink: &mut impl Sink) -> Step<Event>;`1. A reference, whole-input specification generated from the same format description.
2. A static analysis that computes a maximum machine-state size, including unresolved lookahead, partial fixed-width fields, and stored semantic values.
3. Verus proofs relating the executable resumable machine to the reference semantics.

The code generator may remain untrusted if Verus verifies every generated machine against its generated specification. The trusted core should not contain format-specific assume, external_body, or unsafe Rust.

The artifact should initially mirror only the relevant subset of Vest combinators. It should not promise to incrementalize arbitrary Rust or arbitrary Vest parsers. Vest outputs may borrow from the original input buffer, which is incompatible with dropping transport chunks unless the output representation changes.

## 3. Precise target guarantee

Let:

- F be a supported format
- x be a finite byte sequence
- π be any finite sequence of chunks whose concatenation is x
- ref_F(x, eof) be the whole-input reference result
- run_F(π, eof) be the incremental event trace and terminal result
- normalize remove NeedMore observations and concatenate fragments belonging to the same logical payload

The target theorem is:

normalize⁡(run⁡F(π,EOF))=ref⁡F(x,EOF)\operatorname{normalize}(\operatorname{run}_F(\pi,\mathrm{EOF}))
=
\operatorname{ref}_F(x,\mathrm{EOF})normalize(runF​(π,EOF))=refF​(x,EOF)for every partition π of x.

The result includes Done, Reject, and Truncated; therefore malformed and prematurely terminated inputs are covered, not only accepted inputs.

The complete proof target has five parts.

### 3.1 Partition independence

For any two partitions π₁ and π₂ of the same bytes:

normalize⁡(run⁡F(π1,EOF))=normalize⁡(run⁡F(π2,EOF))\operatorname{normalize}(\operatorname{run}_F(\pi_1,\mathrm{EOF}))
=
\operatorname{normalize}(\operatorname{run}_F(\pi_2,\mathrm{EOF}))normalize(runF​(π1​,EOF))=normalize(runF​(π2​,EOF))Chunking may change when NeedMore is returned and how large payload fragments are delivered. It must not change parsed values, normalized payload bytes, consumed length, error class, or terminal outcome.

### 3.2 Exact consumption

Every consumed input interval has one monotonically increasing logical offset. Accepted intervals are ordered and disjoint. No byte is omitted from, or duplicated in, the normalized result.

This is a semantic consumption guarantee, not necessarily a claim that the implementation physically loads every byte only once.

### 3.3 Bounded retained state

At every return from feed:

owned_bytes⁡(state)≤BF\operatorname{owned\_bytes}(\text{state}) \le B_Fowned_bytes(state)≤BF​where B_F is computed from the supported format.

Two modes are useful:

- **materializing mode** may retain a complete variable-size value, so its bound includes the declared cap C_F
- **sink mode** emits large fields incrementally, so its machine bound must be independent of their total length

Events in sink mode remain provisional until Done. A consumer that performs irreversible effects before Done is outside the guarantee. An end-to-end constant-memory result requires a bounded-state sink, such as a hash, counter, or verified streaming decoder.

### 3.4 Early size rejection

A declared length larger than C_F must produce Oversize before allocating or retaining the declared body. Arithmetic used to compute lengths and offsets must be proved free of overflow.

### 3.5 Safety and progress

For every input and partition:

- no out-of-bounds access, arithmetic overflow, panic, or dangling reference
- after explicit EOF, the machine reaches a terminal result
- a complete input accepted by the reference parser cannot remain permanently at NeedMore

## 4. Semantic and threat assumptions

The guarantee assumes:

- an ordered, lossless byte stream
- explicit EOF
- arbitrary chunk sizes, including empty and one-byte chunks
- caller-owned chunk memory remains unchanged during feed
- CutParse keeps no reference to a chunk after feed returns
- deterministic formats with bounded lookahead and explicit maximum lengths
- no unbounded backtracking
- any sink used in the end-to-end theorem satisfies a stated Verus contract

The adversary may control all bytes, length fields, truncation points, and arrival boundaries.

The proposal does not claim:

- packet reordering or lossy-datagram recovery
- protocol state-machine correctness
- cryptographic or application-level validity
- constant-time machine code
- correctness of rustc, Verus, or the operating system
- bounded application memory when the application sink accumulates unbounded output
- safe irreversible use of provisional events before Done

## 5. Source-supported boundary and unsupported novelty

### Supported by the reviewed sources

- Vest shows that rich real formats can be expressed and verified efficiently in Verus, but its documented parse call consumes a byte slice. [USENIX+1](https://www.usenix.org/system/files/usenixsecurity25-cai-yi.pdf)
- EverParse establishes strong-prefix and length-delimited parser properties, but its concrete APIs in the reviewed paper use immutable byte strings or buffer slices. [Project Everest+1](https://project-everest.github.io/assets/everparse.pdf)
- EverParse3D already handles non-contiguous and streaming sources and therefore blocks any broad novelty claim about verified streaming parsers. [Normale Sup](https://www.normalesup.org/~ramanana/research/everparse/pldi2022/paper.pdf)
- PulseParse uses “incremental” for zero-copy traversal of a validated input array. The top-level interface still takes an array and length, and EverCDDL performs an initial validation pass. [arXiv+2](https://arxiv.org/pdf/2505.17335)
- Leapfrog supplies relevant relational-proof ideas for comparing parser automata, but it studies parser-language equivalence rather than repeated partial-input calls. [arXiv+1](https://arxiv.org/abs/2205.08762)
- Nom supplies a serious unverified Rust baseline for NeedMore behavior. [Docs.rs+1](https://docs.rs/nom/latest/nom/)

### Unsupported and therefore only a hypothesis

**Inference.** None of the six reviewed papers states the exact conjunction of:

1. an externally resumable chunk-fed API
2. terminal equivalence for every partition of the same bytes
3. a statically proved bound on retained parser state

This is negative evidence from six papers, not a literature-wide novelty result. In particular, the public EverParse3D implementation may contain semantics or proofs not described in the paper.

**Hypothesis.** A reusable Verus construction proving this conjunction for a useful deterministic subset would constitute a worthwhile result.

No “first” claim should appear in a paper draft unless a broader literature and code audit supports it.

## 6. Falsifiable pilot

### Target

Implement the subset needed for Vest’s TLS 1.3 ServerHello representation and its length-delimited extension sequence. Vest already provides a monolithic Verus implementation and a concrete performance baseline for TLS parsing. [USENIX+1](https://www.usenix.org/system/files/usenixsecurity25-cai-yi.pdf)

Scope excludes the TLS record layer, handshake state machine, cryptography, and all other handshake messages.

### Planned work

1. Inspect EverParse3D’s public stream implementation before writing substantial code:

  - does it return a resumable insufficient-input result?
  - can the caller release already consumed buffers?
  - does it prove invariance under alternate arrival partitions?
  - does it expose or prove a retained-memory bound?
2. Implement and verify:

  - partial fixed-width reads
  - sequencing
  - refinement
  - tagged choice
  - bounded length-delimited vectors
  - feed and finish
  - materializing and sink modes
3. Instantiate:

  - a minimal dependent TLV microformat
  - TLS ServerHello plus extension framing
4. Validate the theorem mechanically and use tests only as bug-finders:

  - enumerate every partition for short inputs
  - split valid and malformed inputs at every byte
  - test empty, one-byte, random, and 4 KiB chunks
  - truncate at every possible byte
  - mutate and overflow every supported length field

No test outcome is claimed here.

## 7. Baselines

1. **Direct Vest**

  - contiguous complete buffer
  - establishes the available monolithic parser throughput
2. **Buffer-all plus Vest**

  - append incoming chunks until a full candidate is present, then invoke Vest
  - simplest verified-equivalent systems baseline
  - exposes the memory cost that CutParse is intended to avoid
3. **Nom 8 streaming parser**

  - hand-written equivalent format using Incomplete(Needed)
  - practical unverified Rust baseline
4. **Hand-written Rust state machine**

  - measures abstraction and proof overhead separately from the cost of resumability
5. **EverParse3D**

  - mandatory literature and feature baseline
  - executable comparison only if its public tooling can express the same format and stream contract without disproportionate setup

## 8. Metrics

### Correctness and proof cost

- all five target theorems verified
- number of trusted declarations, assumes, external_bodys, and unsafe blocks
- executable, specification, and proof lines
- clean and incremental Verus verification time
- verification failures or timeouts across ten identical runs

### Expressiveness

- supported combinators
- format-specific annotations
- amount of format-specific proof
- whether nested length-delimited extensions fit the generic library

### Runtime

- throughput and cycles per byte
- median and p99 feed latency
- total allocations
- bytes copied
- maximum parser-owned state
- maximum end-to-end memory with the bounded sink
- slowdown under one-byte chunks relative to 4 KiB chunks
- latency until the first semantic event and until Done

## 9. Kill criteria

These are proposed pilot thresholds, not standards derived from the literature.

Stop or redirect the project if any of the following holds:

1. **Prior-art kill**

  - EverParse3D or another public artifact already supplies substantially the same resumable API, partition theorem, and memory theorem
2. **Proof kill**

  - the generic core requires trusted format-specific assumptions
  - sequencing or length-delimited parsing can only be proved by duplicating the full proof for each format
3. **Bound kill**

  - sink-mode parser memory grows with payload length
  - an oversized length can force proportional retention before rejection
4. **Expressiveness kill**

  - the library cannot express the selected nested TLS extension format without embedding a custom parser outside the proved core
5. **Performance kill**

  - at 4 KiB chunks, throughput is below 70% of the hand-written state machine
  - verification of the small TLS target repeatedly exceeds five minutes on the available environment
  - the generated state machine performs asymptotically more work under one-byte chunking
6. **Semantic kill**

  - partition independence requires suppressing or redefining externally observable errors so aggressively that the API ceases to be useful

## 10. Limitations

The first artifact would cover a deliberately restricted parser class. General backtracking parsers, recursive formats, checksums over arbitrarily large bodies, and outputs borrowing from expired chunks need separate designs.

The buffer theorem applies to parser-owned state. A sink that retains every payload byte still uses payload-sized memory.

Error timing may vary by partition even when the terminal error class and logical byte offset are invariant. The specification must distinguish observable terminal semantics from nonsemantic scheduling observations.

A proof against a generated specification does not establish that the format specification matches an RFC. Vest and EverParse make similar trusted-specification distinctions. [USENIX+1](https://www.usenix.org/system/files/usenixsecurity25-cai-yi.pdf)

## 11. Funding rationale

**Inference.** This proposal targets code that existing whole-buffer proofs leave to system integrators: the conversion from repeated I/O results into parser state. Bugs here can duplicate, omit, retain, or prematurely expose bytes even when the underlying parser is correct.

The pilot is worth limited funding because:

- the artifact is reusable across formats
- Verus and Vest provide a credible implementation base
- the central theorem is precise
- failure is detectable early
- the strongest contrary prior art is known
- the pilot can stop before a large format library is built

I would fund a two- to three-week pilot. Continued funding should require both a surviving prior-art boundary and a generic proof on the selected TLS subset.

Advisor fit is unassessed because no advisor profile was supplied.

---

# Six deeply reviewed source cards

## 1. Vest: Verified, Secure, High-Performance Parsing and Serialization for Rust

**Metadata.** Yi Cai, Pratap Singh, Zhengyao Lin, Jay Bosamiya, Joshua Gancher, Milijana Surbatovich, and Bryan Parno. 34th USENIX Security Symposium, August 2025, pp. 6917–6935. Suggested key: cai2025vest. [USENIX](https://www.usenix.org/conference/usenixsecurity25/presentation/cai-yi)

**Primary URLs.**

- landing page: [https://www.usenix.org/conference/usenixsecurity25/presentation/cai-yi](https://www.usenix.org/conference/usenixsecurity25/presentation/cai-yi?utm_source=chatgpt.com)
- official PDF: [https://www.usenix.org/system/files/usenixsecurity25-cai-yi.pdf](https://www.usenix.org/system/files/usenixsecurity25-cai-yi.pdf?utm_source=chatgpt.com)

**Exact quote.** “The parse function operates on byte slices (&[u8] in Rust).” §2, paper p. 5. [USENIX](https://www.usenix.org/system/files/usenixsecurity25-cai-yi.pdf)

**Task and baseline.** Vest generates verified Rust parsers and serializers from a DSL and Verus combinators. Runtime baselines are Rust Bitcoin, rustls, and wasmparser; verification baselines are EverParse and vWasm. [USENIX](https://www.usenix.org/system/files/usenixsecurity25-cai-yi.pdf)

**Metric and author result.** The authors report 2.3× faster Bitcoin parsing than Rust Bitcoin, 1.25× faster TLS parsing than rustls, and comparable WebAssembly parsing. They report verification-time improvements of 44×, 328×, and 33× against the selected prior implementations. [USENIX](https://www.usenix.org/system/files/usenixsecurity25-cai-yi.pdf)

**Limitations.** Zero-copy values may borrow the complete input buffer. The WebAssembly case flattens recursive instructions and requires preprocessing because Vest lacks the needed stack counter. Its guarantees depend on Verus and rustc; side-channel preservation through compilation is not proved. [USENIX+2](https://www.usenix.org/system/files/usenixsecurity25-cai-yi.pdf)

**Negative evidence.** PDF text search found no occurrence of chunk or resume. The documented entry point is a slice parser. This does not establish that no unpublished adapter exists. [USENIX+1](https://www.usenix.org/system/files/usenixsecurity25-cai-yi.pdf)

**Access caveat.** The USENIX paper and appendix are public. I reviewed the paper, not the code or appendix proofs.

## 2. EverParse: Verified Secure Zero-Copy Parsers for Authenticated Message Formats

**Metadata.** Tahina Ramananandro, Antoine Delignat-Lavaud, Cédric Fournet, Nikhil Swamy, Tej Chajed, Nadim Kobeissi, and Jonathan Protzenko. 28th USENIX Security Symposium, August 2019, pp. 1465–1482. Suggested key: ramananandro2019everparse. [USENIX](https://www.usenix.org/conference/usenixsecurity19/presentation/delignat-lavaud)

**Primary URLs.**

- landing page: [https://www.usenix.org/conference/usenixsecurity19/presentation/delignat-lavaud](https://www.usenix.org/conference/usenixsecurity19/presentation/delignat-lavaud?utm_source=chatgpt.com)
- official PDF: [https://www.usenix.org/system/files/sec19-ramananandro_0.pdf](https://www.usenix.org/system/files/sec19-ramananandro_0.pdf?utm_source=chatgpt.com)

**Exact quote.** “We represent their input as a slice, that is, a Low* buffer and its length, and a position within this slice.” §4.4, project PDF p. 8. [Project Everest](https://project-everest.github.io/assets/everparse.pdf)

**Task and baseline.** EverParse generates verified zero-copy C parsers and serializers for tag-length-value formats. Applications include TLS, Bitcoin, and PKCS #1. Baselines include the original MITLS parsers, Bitcoin Core, and mbedTLS. [USENIX+1](https://www.usenix.org/conference/usenixsecurity19/presentation/delignat-lavaud)

**Metric and author result.** Metrics include generated code size, verification/extraction time, request rate, and parser throughput. In the sequential MITLS experiment, the paper reports 53.3 requests/s with EverParse versus 49.8 for the original implementation; its generated TLS development required 46 minutes of verification in the reported environment. [Project Everest](https://project-everest.github.io/assets/everparse.pdf)

**Limitations.** QuackyDucky focuses on non-malleable TLV formats. The trusted base includes F*, Z3, KReMLin, and the compiler. The input format is trusted for liveness, and constant-time behavior is left to future work. [Project Everest+1](https://project-everest.github.io/assets/everparse.pdf)

**Negative evidence.** PDF text search found no chunk or resume; the reviewed APIs use complete byte strings or slices. Its strong-prefix theory is relevant, but the paper does not state an arrival-partition theorem. [Project Everest+2](https://project-everest.github.io/assets/everparse.pdf)

**Access caveat.** The USENIX PDF and source repository are public. I did not build the historical F*/C toolchain.

## 3. Hardening Attack Surfaces with Formally Proven Binary Format Parsers

**Metadata.** Nikhil Swamy, Tahina Ramananandro, Aseem Rastogi, Irina Spiridonova, Haobin Ni, Dmitry Malloy, Juan Vazquez, Michael Tang, Omar Cardona, and Arti Gupta. PLDI 2022, June 13–17, 2022. DOI 10.1145/3519939.3523708. Suggested key: swamy2022everparse3d. [Normale Sup](https://www.normalesup.org/~ramanana/research/everparse/pldi2022/paper.pdf)

**Primary URLs.**

- author-hosted PDF: [https://www.normalesup.org/~ramanana/research/everparse/pldi2022/paper.pdf](https://www.normalesup.org/~ramanana/research/everparse/pldi2022/paper.pdf?utm_source=chatgpt.com)
- DOI: [https://doi.org/10.1145/3519939.3523708](https://doi.org/10.1145/3519939.3523708)

**Exact quote.** “Parsing from non-contiguous or streaming data sources, with on-demand fetching of data.” §1.2, p. 2. [Normale Sup](https://www.normalesup.org/~ramanana/research/everparse/pldi2022/paper.pdf)

**Task and baseline.** EverParse3D generates verified C validators with dependent formats, parsing actions, double-fetch protection, and abstract stream inputs. Its deployment comparison replaced handwritten parsers in Hyper-V network virtualization. [Normale Sup+1](https://www.normalesup.org/~ramanana/research/everparse/pldi2022/paper.pdf)

**Metric and author result.** Internal acceptance criteria included no functional regressions and no more than 2% cycles-per-byte overhead. The authors report meeting both and finding some configurations marginally faster. [Normale Sup+1](https://www.normalesup.org/~ramanana/research/everparse/pldi2022/paper.pdf)

**Limitations.** Functional behavior of imperative parsing actions is not captured by the main specification; only safety, footprint, and related invariants are proved. The Windows formats, source, and detailed internal measurements are proprietary. [Normale Sup+1](https://www.normalesup.org/~ramanana/research/everparse/pldi2022/paper.pdf)

**Negative evidence.** This source defeats any broad “verified streaming parser” claim. However, PDF text search found no chunk or resume, and I identified no theorem quantifying over alternative arrival partitions or bounding retained bytes between resumptions. That is a paper-level observation, not evidence about all public code. [Normale Sup+1](https://www.normalesup.org/~ramanana/research/everparse/pldi2022/paper.pdf)

**Access caveat.** The paper and generic EverParse toolchain are public; the production case study is not reproducible from the published artifacts.

## 4. Secure Parsing and Serializing with Separation Logic Applied to CBOR, CDDL, and COSE

**Metadata.** Tahina Ramananandro, Gabriel Ebner, Guido Martínez, and Nikhil Swamy. arXiv 2505.17335, version 2, July 17, 2025. No archival venue is shown on the reviewed public version. Suggested key: ramananandro2025pulseparse. [arXiv](https://arxiv.org/abs/2505.17335)

**Primary URLs.**

- abstract: [https://arxiv.org/abs/2505.17335](https://arxiv.org/abs/2505.17335)
- official arXiv PDF: [https://arxiv.org/pdf/2505.17335](https://arxiv.org/pdf/2505.17335)

**Exact quote.** “parse such formats with only a constant amount of stack space.” Abstract, p. 1. [arXiv](https://arxiv.org/pdf/2505.17335)

**Task and baseline.** PulseParse verifies parser and serializer combinators using separation logic; EverCBOR and EverCDDL apply them to CBOR and CDDL. Performance baselines include QCBOR, TinyCBOR, and an OpenSSL-based COSE implementation. [arXiv+1](https://arxiv.org/pdf/2505.17335)

**Metric and author result.** Results are mixed. The record benchmark reports 3.33 μs for EverCDDL validation/parsing versus 1.91 μs for QCBOR and 3.78 μs for TinyCBOR. Map lookup is faster at 138 μs versus 282 and 306 μs. Large nested-array parsing is slower at 4.92 s versus 2.91 and 2.68 s. [arXiv+1](https://arxiv.org/pdf/2505.17335)

**Limitations.** EverCDDL first validates the full input before reading it; its iterators can rescan prior prefixes. Floating point and recursive CDDL are unsupported in the reviewed version. [arXiv+2](https://arxiv.org/pdf/2505.17335)

**Negative evidence.** The paper’s “incremental” parser creates partial, pointer-based views into an already valid input array. PDF text search found no chunk or resume; this is not documented as a repeated arrival API. [arXiv+2](https://arxiv.org/pdf/2505.17335)

**Access caveat.** Only an arXiv version was reviewed. I did not reproduce its benchmarks or inspect later unpublished revisions.

## 5. Leapfrog: Certified Equivalence for Protocol Parsers

**Metadata.** Ryan Doenges, Tobias Kappé, John Sarracino, Nate Foster, and Greg Morrisett. PLDI 2022, pp. 950–965; arXiv v1 submitted May 18, 2022. DOI 10.1145/3519939.3523715. Suggested key: doenges2022leapfrog. [arXiv](https://arxiv.org/abs/2205.08762)

**Primary URLs.**

- abstract: [https://arxiv.org/abs/2205.08762](https://arxiv.org/abs/2205.08762)
- official arXiv PDF: [https://arxiv.org/pdf/2205.08762](https://arxiv.org/pdf/2205.08762)

**Exact quote.** “parser equivalence proofs in Leapfrog are fully automatic and push-button.” Abstract, p. 1. [arXiv](https://arxiv.org/abs/2205.08762)

**Task and baseline.** Leapfrog proves equivalence of P4 protocol-parser automata using symbolic bisimulation in Coq with SMT discharge. Its useful internal baselines are optimization ablations: leaps disabled and reachable-state pruning disabled. [arXiv+1](https://arxiv.org/pdf/2205.08762)

**Metric and author result.** Small experiments of roughly ten states completed within five minutes and 16 GB. Large cases required hundreds of gigabytes and one ran out of memory. Disabling leaps changed the smallest example from 30 seconds and 1.7 GB to 42 minutes and 36 GB; disabling reachable-state pruning prevented completion. [arXiv](https://arxiv.org/pdf/2205.08762)

**Limitations.** The authors identify combinatorial state growth and SMT performance variability as central constraints. The largest reported cases needed roughly 400 GB of RAM. [arXiv+1](https://arxiv.org/pdf/2205.08762)

**Negative evidence.** PDF text search found neither chunk nor streaming. The verified relation compares packet parsers, not different partial-delivery executions of one parser. [arXiv+1](https://arxiv.org/pdf/2205.08762)

**Access caveat.** The paper is public. I did not run the Coq development or provision the memory required for its large cases.

## 6. Narcissus: Correct-by-Construction Derivation of Decoders and Encoders from Binary Formats

**Metadata.** Benjamin Delaware, Sorawit Suriyakarn, Clément Pit-Claudel, Qianchuan Ye, and Adam Chlipala. Proceedings of the ACM on Programming Languages 3, ICFP, Article 82, August 2019, 29 pages. DOI 10.1145/3341686. Suggested key: delaware2019narcissus. [Adam Chlipala](https://adam.chlipala.net/papers/NarcissusICFP19/NarcissusICFP19.pdf)

**Primary URLs.**

- author-hosted PDF: [https://adam.chlipala.net/papers/NarcissusICFP19/NarcissusICFP19.pdf](https://adam.chlipala.net/papers/NarcissusICFP19/NarcissusICFP19.pdf)
- DOI: [https://doi.org/10.1145/3341686](https://doi.org/10.1145/3341686)

**Exact quote.** “guarantees that they form inverses of each other.” Abstract, p. 1. [Adam Chlipala](https://adam.chlipala.net/papers/NarcissusICFP19/NarcissusICFP19.pdf)

**Task and baseline.** Narcissus derives verified encoders and decoders in Coq from relational format descriptions. The systems evaluation replaces hand-written Ethernet, ARP, IPv4, TCP, and UDP handling in MirageOS. [Adam Chlipala+1](https://adam.chlipala.net/papers/NarcissusICFP19/NarcissusICFP19.pdf)

**Metric and author result.** The authors report less than 1% page-load overhead on small pages and 0.5–4% on large pages. Integration required roughly 15–30 lines of glue per format. [Adam Chlipala+1](https://adam.chlipala.net/papers/NarcissusICFP19/NarcissusICFP19.pdf)

**Limitations.** Optimized decoders operate on fixed-length byte buffers. Extracted custom byte and vector data structures are unverified and part of the trusted base. The integration performs extra checks and incurs representation-conversion costs. [Adam Chlipala+2](https://adam.chlipala.net/papers/NarcissusICFP19/NarcissusICFP19.pdf)

**Negative evidence.** PDF text search found neither chunk nor streaming. The reviewed interface threads an offset through a fixed-length buffer rather than exposing a repeated partial-input operation. [Adam Chlipala+2](https://adam.chlipala.net/papers/NarcissusICFP19/NarcissusICFP19.pdf)

**Access caveat.** The author PDF and historical source pointers are public. The paper used Coq 8.7.2; I did not reconstruct that environment.

---

# Actual query log

Search date: October 11, 2026.

1. verified streaming parser chunk boundary independence bounded buffering paper
2. Vest verified binary parsers paper PDF
3. EverParse verified parsers paper PDF
4. incremental parser verified bounded memory protocol parsing paper
5. site:dl.acm.org verified streaming binary parser arbitrary chunks bounded buffer
6. site:usenix.org verified incremental parser network protocol stream chunks
7. "chunk boundary" parser combinator streaming protocol paper
8. formal verification incremental binary parser streaming buffer bound
9. Leapfrog Certified Equivalence for Protocol Parsers official PDF PLDI 2022
10. nom parser streaming input incomplete official documentation chunk

Search accounting:

- queries issued: **10**
- unique records retained for title/abstract screening: **34**
- sources deeply reviewed: **6**
- supplementary official documentation reviewed: nom 8.0.0
- search pages also emitted duplicates and clearly off-topic snippets; these were not retained or inspected as result records
- the browser interface does not expose an auditable active-minutes counter, so I cannot provide an exact browser-minute log; the query and deep-source ceilings are exact

# Disclosures

- I could not access /ssd1/sichanghe.github.io/src/notes/, the existing paper_collection, or other local files from this chat
- I therefore could not deduplicate against, edit, or save into those collections
- the six public PDF URLs and metadata above are intended for manual collection
- I relied on the prompt’s description of recent proposals and covered local topics
- available Verus version 0.2025.11.30.840fa61 was supplied by the human; I did not execute it
- no implementation, verification, benchmark, or pilot experiment ran today
- no attachment or local file is claimed
- the literature boundary is provisional and does not support a first-ever claim
