# Not-Quite-So-Broken TLS: Lessons in Re-Engineering a Security Protocol Specification and Implementation
(authored by agents unless marked 🧑)
Tag: `kaloper2015tls`, [paper](https://www.usenix.org/conference/usenixsecurity15/technical-sessions/presentation/kaloper-mersinjak)

## What the paper proves and builds

The paper reports nqsb-TLS, an OCaml TLS specification and implementation designed to remove recurring implementation causes of TLS vulnerabilities. It does not prove TLS security. The authors state: “We are focussed on making a stack that is usable in practice and on security improvements achievable with better engineering processes, rather than trying to prove that a specification or implementation is correct or secure” (Section 1.1, paper p. 3). The same functions supply the protocol specification and implementation, with I/O isolated from the TLS core. Nocrypto is an explicit exception to pervasive purity: it uses exceptions for programming errors and a global changing RNG state (section 4.2, paper p. 8). The result is an executable trace checker, Unix applications, and a MirageOS/Xen unikernel.

The reported security evidence is vulnerability analysis, strict validation, state-machine fuzzing, Frankencert certificate fuzzing, a public Bitcoin Pinata deployment, and a trusted-computing-base comparison. The trusted parts include the OCaml compiler/runtime, C cryptographic primitives, GMP, Xen/Linux components, and the correctness of the chosen specification and trust policy. The paper explicitly says the public deployment “cannot prove the absence of security issues in our stack” (Section 7.2, paper p. 13).

## technique: make the specification executable and reuse it as the implementation

What it is. Define protocol behavior as deterministic functions over abstract state and messages, then use those functions both to run TLS and to judge recorded traces. The top-level function returns the next state, responses, or an explicit error; it does not perform I/O.

When to use it. Use this when a prose or standard specification is ambiguous and interoperability with existing implementations matters. A checker can expose differences between the written standard, deployed behavior, and your code.

How to apply it.

1. Represent protocol state and messages as abstract data types (Section 1.1, paper p. 2).
2. Implement a pure transition function from state plus input message to next state and output messages (Section 1.1, paper p. 2).
3. Resolve underspecified behavior by reading deployed implementations and testing interoperability; encode the resulting practical behavior (Section 1.1, paper p. 2).
4. Build an effectful driver that supplies network I/O and entropy to the pure core; build a second driver that supplies recorded packets and compares each produced record with the trace (Sections 1.1 and 5, paper pp. 2, 9–10).
5. For a trace, initialize state from the recorded session parameters, normalize fragmentation, repeatedly apply the transition function, and stop at acceptance or the first discrepancy (Section 5, paper pp. 9–10).

The paper’s concrete check rejected a CCS-injection trace and validated 30,000 interoperability traces (Section 5, paper p. 10). Its exact design claim is: “The same code serves two roles: it is both a specification of TLS, executable as a test oracle to check conformance of traces from arbitrary implementations, and a usable implementation of TLS” (Abstract, paper p. 1).

Verus form. Inference: model the pure transition as a Rust `spec fn` over an enum state and message, with an executable Rust function carrying an `ensures` clause that its result matches the specification. A proof function can establish one-step correspondence and an inductive lemma can establish correspondence over a trace. Use `requires` for well-formed input and explicit `Option`/`Result` values for rejection. Network and entropy drivers remain trusted or separately specified; Verus does not automatically validate the external TLS standard.

Evidence and limits. The trace checker found an unexpected message in the CVE-2014-0224 session and accepted or rejected recorded sessions deterministically. A discrepancy can instead be a checker bug, a specification bug, or an actual implementation bug (Section 5, paper p. 10). The method therefore detects conformance relative to its model; it does not establish that the model is secure.

## technique: isolate protocol concerns behind pure, typed modules

What it is. Split ASN.1, X.509, TLS flow, policy, trust anchors, cryptography, and entropy into modules with value-passing interfaces. External resources are explicit module parameters rather than hidden global state.

When to use it. Use this when a security stack has many interacting concerns and review or replacement of one component must not require understanding all others.

How to apply it.

1. Define module types over abstract values and expose only operations needed by dependents (Section 1.1, paper p. 3).
2. Keep the TLS engine independent of I/O; put sockets, timeouts, and record transport in a `Flow` layer (Section 1.1, paper p. 3).
3. Make configuration and trust anchors explicit inputs, and make the resulting configuration immutable (Sections 1.1 and 6.1, paper pp. 3, 10).
4. Keep C code confined to small cryptographic primitives with preallocated buffers; keep protocol logic in the memory-safe language (Section 4.2, paper pp. 7–8).

The paper describes the purpose as follows: “These modules and their interfaces are arranged to ensure that localised concerns such as binary protocol formats, ASN.1 grammars and certificate validation are not spread throughout the stack, with no implicit dependencies via shared memory” (Section 1.1, paper p. 3).

Verus form. Inference: represent each boundary with Rust structs and traits whose contracts state value and error behavior. Use immutable values by ownership and borrowing, and encode protocol state in enums. Prove each module’s postconditions and a small composition lemma for the TLS core. A Verus proof still trusts contracts for foreign C or OS APIs unless those are modeled and verified.

Evidence and limits. Adding TLS 1.1/1.2 and client authentication was localized and type-checker errors exposed affected modules (Section 4.1, paper p. 7). This is engineering evidence, not a formal noninterference theorem. The authors do not claim advances in side-channel defense or a proof of protocol security (Section 1.1, paper p. 3).

## technique: encode the handshake state machine in types and make failure explicit

What it is. Give each legal handshake state a distinct algebraic-data-type variant containing exactly the data accumulated in that state. Pattern matching then forces every transition and every error case to be handled.

When to use it. Use it when illegal message order or skipped checks can create authentication failures, as in CCS injection or “goto fail”.

How to apply it.

1. Define one variant per protocol state and include state-specific data (Section 4.1, paper p. 7).
2. Define operations that pattern-match on the state and input; produce a new state only in the branch where the transition is legal (Section 4.1, paper p. 7).
3. Return errors as explicit values and use exhaustive matching so no variant is silently ignored (Section 4.1, paper p. 7).
4. Make unspecified transitions fail by default, rather than accepting a permissive fallback (Section 3, paper p. 6).

The paper reports: “It is impossible to enter a branch dedicated to a particular transition without the pair of values representing the appropriate state and appropriate input message” (Section 4.1, paper p. 7). It also reports that “The type checker verifies both that each code path is dealing with exactly one possibility, and – through the exhaustiveness checker – that both forms have been accounted for” (Section 4.1, paper p. 7).

Verus form. Inference: define a Rust enum for states and a transition function with `requires` describing message validity and `ensures` describing the resulting state. Prove that every successful transition preserves a state invariant; return `Result<State, Error>` for rejection. Rust enum pattern matching carries the control-flow structure, while Verus contracts establish semantic properties that a type checker alone cannot.

Evidence and limits. The vulnerability analysis counted 10 state-machine vulnerabilities among the examined 54 advisories (Section 3, paper pp. 4–6); this is a historical classification, not a causal experiment. The authors’ state-machine fuzzing found one issue (unencrypted alerts), fixed within a day (Section 7.2, paper p. 12). The type encoding cannot prevent a wrong transition specification.

## technique: derive ASN.1 parsers and serializers from declarative grammar values

What it is. Describe a restricted ASN.1 grammar as a typed combinator expression, then synthesize parser and serializer functions from that value. Keep grammar structure separate from parsing code.

When to use it. Use it for nested wire formats where ad-hoc parsing repeatedly causes memory-safety and interpretation bugs.

How to apply it.

1. Define opaque grammar values and combinators corresponding to ASN.1 terminals and productions (Section 4.4, paper p. 9).
2. Let OCaml’s type checking and inference reject malformed grammar expressions and derive the representation of grammar-defined types (Section 4.4, paper p. 9).
3. Traverse a grammar value at initialization to synthesize parsing and serialization functions (Section 4.4, paper p. 9).
4. Generate random grammar inhabitants, serialize them, parse them back, and compare the interpreted values (Section 4.4, paper p. 9).

The paper describes generating random grammar inhabitants and checking that serialization followed by parsing preserves their interpretation (Section 4.4, paper p. 9). It reports 620 lines of OCaml parser code and about 1,000 lines of X.509 grammar, versus about 7,500 lines for PolarSSL and 25,000 for OpenSSL (Section 4.4, paper p. 9).

Verus form. Inference: represent grammar descriptors as a Rust enum and write executable `parse`/`serialize` functions with a `spec fn` denoting interpretation. Prove a round-trip theorem under a well-formedness predicate. Verus does not synthesize parsers from types, so the derivation is ordinary Rust code plus proofs; byte bounds and malformed-input behavior need explicit contracts.

Evidence and limits. The synthesized parser handled roughly 50,000 certificates per second (Section 4.4, paper p. 9), and the random round-trip test exercises both directions. This does not prove acceptance exactly matches ASN.1/DER or X.509 requirements; grammar descriptors and the parser generator remain trusted.

## technique: factor X.509 validation into explicit predicates

What it is. Parse certificates into typed trees, implement individual predicates (signature, validity period, extensions, chain constraints), and combine them in role-specific top-level validators.

When to use it. Use it when a standard’s validation rules are numerous, optional, and frequently misimplemented or interleaved with parsing.

How to apply it.

1. Parse the certificate into an algebraic data type (Section 4.3, paper p. 8).
2. Implement one deterministic predicate per semantic condition, such as self-signature, time validity, extension uniqueness, key usage, and chain length (Section 4.3, paper p. 8).
3. Conjoin predicates into validators for the intended role and require the caller to choose a complete authentication policy (Section 4.3, paper p. 8).
4. Supply current time as an explicit input so validation remains deterministic (Section 4.3, paper p. 9).

The authors report: “The entire validation logic amounts to 314 lines of easily reviewable code” (Section 4.3, paper p. 8). They initially followed the RFC strictly, then augmented it with Mozilla guidance after failing to validate many HTTPS endpoints (Section 4.3, paper p. 9).

Verus form. Inference: use pure/spec predicates over certificate structs and prove that each validator implies local properties such as signature-chain linkage and key-usage restrictions. Model trust anchors and hostname policy as explicit inputs. The RFC, Mozilla policy, and cryptographic primitives remain assumptions unless separately formalized.

Evidence and limits. Frankencert generated 10,000 certificate chains: nqsb-TLS accepted 120, while OpenSSL accepted 192; 72 were accepted by OpenSSL but rejected by nqsb-TLS, including 57 with arbitrary X.509v3 extension data (Section 7.2, paper p. 12). This supports stricter parsing in that corpus, not universal certificate correctness.

## technique: constrain low-level cryptography and test hostile inputs

What it is. Keep secret-dependent symmetric operations in small C routines with preallocated buffers, use constant-time hardware where available, and apply blinding for big-number public-key operations. Test the complete stack with fuzzers and a public challenge deployment.

When to use it. Use this when a memory-safe host language has performance or garbage-collection concerns, but the trusted C surface must be minimized.

How to apply it.

1. Restrict C to simple loops over caller-provided buffers; do not allocate or manage memory there (Section 4.2, paper p. 7).
2. Keep higher-level modes and HMAC in the memory-safe language; use C only for primitive cores (Section 4.2, paper p. 7).
3. Always perform RSA work with a fake value on padding failure and use blinding for public-key arithmetic (Sections 3 and 4.2, paper pp. 6–8).
4. Fuzz state transitions and generate syntactically valid but adversarial certificate chains; compare behavior with a reference implementation (Section 7.2, paper p. 12).

The evaluation used 10,000 Frankencert chains. By the end of June 2015, the public Bitcoin Pinata website had 230,000 accesses from more than 50,000 unique IP addresses; the service had more than 9,600 failed and 12,000 successful TLS connections from 1,000 unique IPs (Section 7.2, paper pp. 12–13). The TCB table measured 2,560 kloc for Linux/OpenSSL and 102 kloc for the unikernel, with 56 kloc of the latter in C (Table 2, paper p. 13). Handshake rates were measured on one Intel i7-5600 machine with 20 parallel processes; for 1024-bit RSA, nqsb-TLS reached 698 handshakes/s versus OpenSSL’s 723 (Table 3, paper p. 13).

Verus form. Inference: mark C/FFI primitives as trusted specifications only if their contracts are explicit; prove Rust callers preserve buffer bounds and constant-time-relevant control-flow conditions where the model supports them. Keep cryptographic correctness and side-channel resistance as separately justified assumptions. Fuzzing remains complementary evidence, not a proof.

## what remains trusted, contradictions, and product threat

The paper proves neither TLS security nor correctness of its model. Inference: trusted components include the OCaml type checker/compiler/runtime, generated parser code, C primitives, GMP, entropy sources, Xen/Linux, cryptographic assumptions, and policy choices. The 25-times smaller TCB comparison is kloc (2,560/102 ≈ 25.1), not a measured probability of compromise. Table 2 excludes the Xen hypervisor shared by both systems; the OCaml compiler is discussed separately (section 7.2, paper p. 13). Section 7.1 reports roughly 30,000 traces from about 350 client stacks; around 27% of these resulted in connection-establishment failure. The separate introductory claim of roughly 10% failing legacy-client connections has no reconciled denominator in the paper. Throughput ratios of 78% and 84% are for 16-byte and 8196-byte blocks respectively, not one overall ratio (Section 7.3, paper p. 13).

Inference: for VeruLaw, the strongest reusable ideas are explicit state-machine types, pure transition specifications, parser round-trip lemmas, and predicate-based certificate validation. They can reduce agent-written Rust’s attack surface when contracts are complete. The threat remains high for cryptography, FFI, entropy, protocol-policy mismatches, and omitted transitions; a Verus proof only establishes the written contracts.

## techniques for the catalog

- executable specification and trace oracle — reuse a pure transition function as both implementation core and deterministic checker for recorded sessions
- typed protocol state machine — encode legal states as enum variants, exhaustive transitions, and explicit errors
- pure modular architecture — isolate TLS, parsing, policy, trust, I/O, entropy, and cryptography behind value-passing interfaces
- declarative ASN.1 derivation — synthesize parsers/serializers from typed grammar values and test round trips
- predicate-based X.509 validation — compose deterministic certificate predicates into role-specific validators
- constrained cryptographic boundary — minimize C to primitive loops, keep protocol logic memory-safe, and combine fuzzing with hostile-input corpora
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Furthermore, we focus on a modern subset of the protocol, not including SSL version 3, so neither attack is applicable."): checked the entire extracted paper, quotations, techniques, measurements, references, tag and publisher link; corrected page-label convention, purity exceptions, shared trace/failure population, TCB exclusions and link; did not reproduce experiments, inspect the implementation, or prove protocol security.
