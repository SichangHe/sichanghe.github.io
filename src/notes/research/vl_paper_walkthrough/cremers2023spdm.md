# Formal Analysis of SPDM: Security Protocol and Data Model version 1.2
(authored by agents unless marked 🧑)
Tag: `cremers2023spdm`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/cremers-spdm)

## what the paper proves or measures

Cremers, Dax, and Naska build the first formal models of SPDM version 1.2.1 and analyze device attestation plus three key-exchange modes: certificates, preshared public keys, and preshared symmetric keys. The abstract says: “In this work we develop the first formal models of the three modes of the SPDM protocol version 1.2.1, and formally analyze their main security properties.” (Abstract, proceedings p. 6611.) They model the protocol in Tamarin’s symbolic model and prove responder authentication, measurement authentication, mutual authentication, handshake secrecy, and a restricted forward-secrecy property.

The models are split because the complete protocol is too large for current analysis tools. The authors write: “Because of the size and complexity of the protocol, we split the analysis into four TAMARIN models.” (Section 3, proceedings p. 6616.) Inference: these proofs cover the selected flows, and their applicability depends on the extracted state machines, trust assumptions, and omitted functionality. Section 5.5 explicitly leaves full composition unverified (proceedings p. 6625).

## technique 1: multiset-rewriting model of state machines

what it is: encode protocol transitions as Tamarin multiset-rewriting rules. A rule consumes facts on the left, emits action facts, and produces new state facts on the right. Persistent facts, marked with `!`, remain available; linear facts are consumed. Tamarin’s `In`, `Out`, and `Fr` facts model network input, output, and fresh values.

when to use: Inference: use this for protocols with explicit state machines, concurrent sessions, fresh nonces, attacker-controlled messages, and transitions whose security properties refer to event ordering.

how to do it:
1. Extract the protocol’s phases and states from the specification, including device initialization, VCA, options, session handling, key exchange, application data, and termination (Section 3, proceedings p. 6616).
2. Represent each state as a fact containing identifiers, thread identifiers, keys, transcript state, and the next protocol state.
3. Write each transition as `LHS -- Actions -> RHS`; consume linear state, preserve persistent facts, and add an action fact for later formulas (Section 2.2, proceedings pp. 6615–6616).
4. Generate unique long-term keys and certificates from `Fr` and a persistent root CA. The paper’s certificate rule emits a public key and certificate signed by the root (Section 3.1, proceedings p. 6617).
5. Track thread replacement with `StartThread` and `CurrentThread`, and add a restriction preventing an old thread from continuing after replacement (Section 3.1, proceedings p. 6617).

Verus form: Inference: represent each state as a Rust enum or ghost record and each transition as a verified function with `requires` for the current state and `ensures` for the next state. Inference: use `spec fn` predicates for state validity and transition relations, and proof functions for preservation lemmas. Inference: network input should be explicit function arguments constrained by attacker assumptions. Inference: Tamarin’s unbounded multiset and concurrent rule semantics do not carry over automatically; a Verus development needs an explicit trace or abstract state-machine model.

evidence: “In total, our model included 17 rewriting rules.” (Options phase, Section 3.2, proceedings p. 6617.) For the certificate handshake: “To represent the handshake with certificates and mutual authentication we modeled 18 rules in total, in addition to the 13 rules needed for device initialization and VCA phase.” Section 3.4 also reports 8 handshake rules for preshared public keys and 9 for preshared symmetric keys (proceedings p. 6618). Section 3 identifies five components, combined into four models (proceedings p. 6616).

limits and assumptions: the root CA is a single trusted authority and certificate-chain failures are abstracted away (Section 3.1, proceedings pp. 6616–6617). The authors model a single certificate slot per communication partner. Inference: a Verus proof using the same abstraction would trust the certificate issuance model unless it separately verifies the real PKI and provisioning code.

## technique 2: split a large protocol into four analyzable models

what it is: divide SPDM into naturally distinct models while preserving the protocol’s state-machine structure. The four are Device Attestation, Key Exchange Certificate, Key Exchange Preshared Public Keys, and Key Exchange Preshared Symmetric Keys (Section 3, proceedings p. 6616).

when to use: Inference: use this when one complete model exceeds solver memory or search capacity, but the protocol has coherent subflows whose properties can be stated independently.

how to do it:
1. Identify components A–E: device initialization/VCA, options, session handling, three key exchanges, and application data/termination (Section 3, proceedings p. 6616).
2. Build Device Attestation from A+B, and each key-exchange model from A+C+its variant of D+E (Section 3, proceedings p. 6616).
3. Prove properties within each model. The paper leaves attacks involving the complete composition unresolved (Section 5.5, proceedings p. 6625).
4. Restrict the forward-secrecy model so each within-session transition executes only once; add a helper lemma and a script to guide that proof (Section 4.5, proceedings p. 6623).

Verus form: Inference: use Rust modules with shared specification types and explicit refinement lemmas at module boundaries. Inference: prove that a state exported by one phase satisfies the preconditions of the next phase. Inference: cross-model composition requires a separate end-to-end theorem; splitting files alone does not establish it.

evidence: “In addition, TAMARIN automatically proved 54 sanity lemmas in total, showing that our models execute correctly and capture the intended protocol flow.” The main guarantees and helper lemmas are also automatic except for forward secrecy, whose search is guided by a script (Section 4.6, proceedings p. 6623). Table 1 reports ✓ for responder authentication, measurement authentication, mutual authentication, handshake secrecy, and restricted forward secrecy. Table 1 places forward secrecy only in the restricted preshared-public-key model. Runtime ranges from 3 seconds for device-attestation responder authentication to 249 seconds for certificate handshake secrecy; the table’s runtimes are per property on the stated machine and four threads per call (Table 1, proceedings p. 6624).

limits and assumptions: the paper explains the split: “This is an inherent limitation of the current scalability of the analysis tools, and as we will see later, our split models already push the boundary of what can be realistically handled by state-of-the-art tools.” (Section 3, proceedings p. 6616.) It explicitly says that complete composition could reveal cross-protocol attacks and is beyond current methodology (Section 5.5, proceedings p. 6625). Inference: an agent-written verified Rust product must treat each split model as partial coverage and track missing inter-model transitions.

## technique 3: transcript modeling with multiset facts and helper lemmas

what it is: store filtered protocol transcripts as multiset terms, update them at every message exchange, and prove helper lemmas that establish their expected structure. Transcripts are then reused for signatures, authentication, and key derivation.

when to use: Inference: use this when different protocol phases authenticate different transcript prefixes or when the same transcript feeds several cryptographic derivations.

how to do it:
1. Define separate transcript variables for VCA and handshake phases.
2. Update each transcript variable with the new messages using multiset union, written `+` in Tamarin (Section 3.4, proceedings p. 6620).
3. Encode the expected structure as a guarded first-order lemma. The paper’s example requires `KETranscriptR` to equal the multiset union of `Get_Key_Exchange`, `Key_Exchange_Resp`, `Finish`, and `Finish_Resp` messages (Section 3.4, proceedings p. 6620).
4. Use transcript facts in signature verification, finished-key derivation, and session-key derivation.
5. Include the VCA messages, certificate/public-key hashes, key-exchange messages, and finish messages applicable to the current mode and stage. Preshared symmetric-key transcripts omit the certificate/public-key hashes (Section 3.4, proceedings pp. 6619–6620; Appendix A.1, proceedings p. 6628).

Verus form: Inference: represent a transcript as an immutable sequence or ghost list, define `spec fn` append and prefix predicates, and prove that every transition preserves the expected shape. Inference: sequence equality is clearer in Verus than multiset union when message order matters; if order is intentionally abstracted, prove that the abstraction preserves the cryptographic property.

evidence: “In our models, we store the messages of the transcript using multisets.” (Section 3.4, proceedings p. 6620.) Their model defines `TH1` and `TH2` from VCA, certificate, key-exchange, and finish components (Figure 5 caption, proceedings p. 6621).

limits and assumptions: transcript facts capture the modeled messages, not every wire encoding or chunking behavior. The paper lists sending messages in chunks among omitted functionality (Section 5.5, proceedings p. 6625). Inference: a Rust proof must connect transcript construction to serialization and parsing, or it can prove a transcript property for data that the implementation hashes differently.

## technique 4: symbolic key derivation and explicit compromise models

what it is: model HMAC/HKDF and role-oriented key chains as symbolic functions, then add attacker rules for network control, malicious certificates, and session-key compromise. The paper derives finished keys and encryption/decryption keys from a DH or preshared secret and transcript values (Sections 3.4 and 3.6, proceedings p. 6620).

when to use: Inference: use this to state secrecy and forward secrecy under explicit compromise scenarios rather than assuming every key remains secret.

how to do it:
1. Define symbolic HMAC/HKDF functions and derive role-specific major secrets, finished keys, and message keys (Figure 5, proceedings p. 6621).
2. Add the built-in Dolev–Yao attacker, which can inject, modify, and drop network messages (Section 3.6, proceedings p. 6620).
3. Add a malicious-certificate rule that lets the attacker obtain a certificate for an honest device identifier over an attacker-controlled key (Section 3.6, proceedings p. 6620).
4. Model session-key compromise separately from handshake secrecy. Definition 5 states that when a Requester records a handshake secret and its partner’s public key was honestly generated, the attacker never knows that secret at any time (Section 4.4, proceedings p. 6622).
5. Express key-update forward secrecy: if the Requester updates from `s1` to `s2`, the attacker knows `s1`, and the partner has not been compromised, then the Requester must have been compromised before the update (Section 4.5 and Definition 6, proceedings pp. 6622–6623). Prove it only in the restricted preshared-public-key model shown in Table 1 (proceedings p. 6624).

Verus form: Inference: model HMAC/HKDF as `spec fn` abstractions with explicit cryptographic assumptions and prove key-chain properties in Verus. Inference: represent compromise as an assumption in `requires` or as an attacker trace event, and prove that leaked future keys do not derive prior keys under the stated one-wayness axiom. Inference: concrete cryptographic implementation proofs and side-channel properties remain separate work.

evidence: the authors prove handshake secrecy for certificate, preshared public-key, and preshared symmetric-key models. They could not prove responder-side secrecy for unilateral certificate handshakes because a responder can finish without authenticating a requester; they found a counterexample trace (Section 4.4, proceedings p. 6622). The authors write: “The best case where we can prove secrecy of the Responder’s handshake, is when the parties are mutually authenticated.” (Section 4.4, proceedings p. 6622.)

limits and assumptions: the symbolic cryptographic functions use classical Dolev–Yao abstractions. The authors experimented with broken primitives and observed authentication failures, using that model as a sanity check rather than a complete downgrade analysis (Section 5.5, proceedings p. 6625). Inference: Verus must state which cryptographic contracts are trusted and should not treat symbolic secrecy as computational security.

## technique 5: authentication and integrity as correspondence formulas

what it is: use action facts for `Running`, `Commit`, and `HonestlyGenerated` events, then state Lowe-style correspondence: a successful commit by one role requires an earlier matching run by the other role over the same data.

when to use: Inference: use this for unilateral authentication, mutual authentication, measurement integrity, and agreement over transcripts, keys, and roles.

how to do it:
1. Log running and commit action facts. For mutual authentication, the Requester commits after `FINISH_RSP`, and the Responder after the `FINISH` request (Section 4.3, proceedings p. 6622).
2. Include all agreed data in the action fact. For mutual authentication the paper includes the complete transcript `TH2`, exchanged keys/nonces, and handshake secret (Section 4.3, proceedings p. 6622).
3. For public-key authentication, condition the guarantee on honest generation of the partner’s key and require an earlier matching running event. Definition 1 covers responder authentication; Definition 2 covers measurements (Sections 4.1–4.2, proceedings pp. 6621–6622).
4. Require the opposite role for mutual authentication. Definition 3 includes both public keys, the secret, and `TH2`. Definition 4 for symmetric keys omits the public keys and the honest-generation condition; preshared secrets are assumed uncompromised (Sections 3.6 and 4.3, proceedings pp. 6620, 6622).
5. Add helper lemmas when search cannot discover the correspondence automatically; the measurement property required four helper lemmas (Section 4.2, proceedings p. 6622).

Verus form: Inference: represent a trace as a ghost sequence of event records and prove that each `Commit` index has a smaller matching `Running` index. Inference: use `requires` for honest-key facts and `ensures` for correspondence. Inference: uniqueness or injectivity needs an additional distinct-index lemma; simple postconditions only prove non-injective agreement.

evidence: Table 1 reports responder authentication in the device-attestation model at 3 seconds, certificate responder authentication at 53 seconds, measurement authentication at 6 seconds, certificate mutual authentication at 91 seconds, preshared-public-key mutual authentication at 33 seconds, and preshared-symmetric-key mutual authentication at 13 seconds (proceedings p. 6624). Each is a successful proof in its named model and setting.

limits and assumptions: identities are equated with public keys. The paper says: “Currently, all authentication essentially authenticates keys, not devices or their identifiers.” It recommends including hardware object identifiers (OIDs) in transcripts (Section 5.1, proceedings p. 6623). Inference: proving correspondence over a key does not prove that the key is bound to the intended physical device.

## design observations and omissions

The analysis finds practical risks beyond the proved formulas. The authors write: “The size of the ID share of each party is two bytes, which is cryptographically insufficient to prevent replays; there exist practical attacks that exploit such small ranges.” In PSK mode, omitting the responder nonce can permit replay when the session ID repeats, and indefinite impersonation of the Requester to the Responder after session-key compromise (Section 5.1, proceedings p. 6623). Device reset can cause counter reuse unless counters are stored in non-volatile memory. Vendor-defined requests can break guarantees if they reuse protocol secrets. Remote certificate setting lacks a default deny-all policy. These are design observations in Section 5.1 (proceedings pp. 6623–6624), rather than attacks demonstrated against a deployed implementation. Inference: they merit explicit product requirements.

Inference: the study’s trusted base includes Tamarin, its parser and symbolic semantics, the four model encodings, helper lemmas and restrictions, and assumptions about the SPDM specification. Inference: the paper does not verify Rust, firmware, cryptographic library implementations, wire serialization, hardware, or the real certificate authority. Inference: for VL, a relevant threat is an agent producing a proof for an incomplete state machine or key identity model. The paper’s modelling lesson is direct: “We recommend to build detailed state machines of the protocol before starting to formally model in TAMARIN: in our experience it makes the debugging process faster and leaves less room for errors.” (Section 5.3, proceedings p. 6625.) Inference: VL should preserve that discipline, add refinement proofs from Rust parsing and state transitions to the abstract model, and mark split-model boundaries.

Inference: VL should not redo a generic symbolic-protocol tutorial or an unstructured single-prover search. The paper supplies patterns: state-machine extraction, correspondence events, transcript invariants, explicit compromise rules, helper lemmas, and model splitting with known blind spots. Inference: VL’s new work should concentrate on linking those abstract obligations to agent-written Rust and on checking omitted vendor, reset, and serialization behavior.

The application-data model also abstracts key-update request and verification into one step because of state-space growth: “To model this mechanism we had to abstract the request and verify in the same step.” (Section 3.5, proceedings p. 6620.) Inference: implementing the complete exchange in Rust requires a separate argument connecting its intermediate states to this abstraction.

## techniques for the catalog

- multiset-rewriting state machines — encode protocol transitions, facts, freshness, and event labels in Tamarin rules
- split-model analysis — divide an oversized protocol into coherent models while recording missing cross-model attacks
- transcript invariants — maintain phase-specific transcript facts and prove helper lemmas for their structure
- compromise-aware key derivation — model HMAC/HKDF chains and explicit network, certificate, and session-key leaks
- correspondence authentication — prove that commit events have earlier matching runs over the agreed data
- symbolic protocol sanity checking — vary cryptographic assumptions and attack rules to expose design pitfalls and omissions
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Transcripts are heavily used in the protocol, not only to be verified and sent to their partners, but also to derive the session keys and the authentication keys for the transcripts themselves as we will see next."): checked every study quotation, number, section and proceedings-page reference, technique step, and claimed result against the full paper; corrected quotations, references, component count, forward-secrecy conditions and scope, per-party session-ID size, inference labels, and the publisher link, and added the key-update abstraction; did not rerun Tamarin, inspect the external models or specification, or validate the proposed Verus translations.
