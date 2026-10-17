# A Comprehensive Formal Security Analysis of OPC UA
(authored by agents unless marked 🧑)
Tag: `diemunsch2025opcua`, [paper](https://www.usenix.org/conference/usenixsecurity25/presentation/diemunsch)

## scope and model

Diemunsch, Hirschi, and Kremer give a formal symbolic analysis of OPC UA Binary 1.05.03, covering secure-channel and session subprotocols, ECC and RSA, channel modes, user authentication, channel reopening, and session switching; the RSA and session parts also cover v1.04. Out of scope by the paper's own statements: sessionless requests and issued-token user authentication (Section 2.1, footnotes 1-2), profiles with authenticated-encryption schemes (3 of 11, "left as future work", Section 2.2), and attacker control of a machine that leaks ephemeral secrets such as the DH client secret c (Section 2.3.1). They state, “We have extracted what we believe to be a specification suitable for a protocol security analysis.” The model is written in the applied pi calculus for ProVerif. It represents clients, servers, and users, public channels controlled by an active Dolev–Yao attacker, and evolving channel/session tables.

The protocol has an OpenChannel handshake, CreateSession, and ActivateSession. Channels may be Enc (integrity and confidentiality), Sign (integrity), or None. Sessions may use SSec or SNoAA; users may authenticate by certificate, password, or anonymously. The authors formalize confidentiality and injective agreement, then instantiate the model across a configuration lattice. Inference: the paper's lesson (Section 5.7) is that many attacks come from combining layers and options; it says the complexity "is not inherently insecure, but requires a careful analysis".

## technique: executable symbolic model with explicit state

What it is. ProVerif abstracts cryptography as symbolic terms and models protocol roles as parallel processes. Four tables store evolving channels and sessions (channels and sessions, each for clients and for servers); events record protocol actions and queries relate events. The paper says, “Protocols are described by parallel processes, that model message exchanges and verification steps performed by agents.”

How to apply it.

1. Define cryptographic constructors and destructors (signatures, encryption, key derivation) as function symbols and equations (section 3.1).
2. Write client, server, and user processes for OpenChannel, CreateSession, and ActivateSession. Record state in separate client and server tables, because their views may differ (section 3.2).
3. Add `event` facts at sends, receives, key creation, leaks, and authentication points.
4. Define attacker control through a public channel; permit interception, injection, message construction, and explicit compromise events.
5. Parameterize protocol options rather than duplicating models.

Verus form (Inference: this paper uses ProVerif, not Verus). Model each protocol state as a Rust datatype and each transition as a function with `requires` and `ensures`; represent cryptographic axioms as `spec fn` equations and prove state-table invariants with proof functions. Verus cannot model an unconstrained network attacker directly, so adversarial messages must be quantified in the specification or supplied by a separate symbolic model. Keep cryptographic primitives trusted only through explicit specifications and avoid treating executable cryptography as proved by these lemmas.

Evidence and limits. The unfolded full model is 8.6 kLoC and 2.3 k initial clauses (for the full configuration when verifying a confidentiality property); the modular source is 2.4 kLoC (Section 3.2). The paper says it is the largest ProVerif model in LoC and initial clauses it knows of (Section 1); its TLS 1.3 comparison point is 7.3k LoC and 1.4k clauses. Inference: as a symbolic model with perfect cryptography, it does not cover implementation-level side channels, parser bugs, or cryptographic failures.

## technique: configuration lattice and modular generation

What it is. The authors expose SecurityPolicy (ECC/RSA), channel Mode (Enc/Sign/None), SessionSecurity (SSec/SNoAA), UserAuthentication (Cert/Pwd/Ano), key leakage (Ltk/Chk/Nok), Reopen, and Switch. A Python Jinja preprocessor emits one ProVerif model for each selected combination. The paper reports “7 056 possible configurations and as many models.”

How to apply it.

1. Define an order for each option: set inclusion for protocol-configuration and key-leakage options (e.g. Sign < Enc | Sign) and F < T for the Reopen and Switch options, ordered point-wise (section 4.2).
2. Generate a model from a configuration record.
3. Enumerate the lattice, but prune using monotonicity: if a property holds at configuration c, it holds in every c↓; if falsified at c, it is falsified in c↑; as a heuristic, if ProVerif does not conclude on c, they assume it will not conclude on c↑ (section 4.2).
4. Run configurations in parallel with increasing time and memory budgets.
5. Record maximal configurations where the property holds, minimal configurations with attacks, and minimal configurations where ProVerif cannot conclude.

Verus form (Inference). Represent each feature set as a Rust enum or ghost configuration value and prove properties under explicit `requires` assumptions. Monotonicity is valid only when enabling a feature truly adds behaviors; it must be proved for the model, not assumed for arbitrary Rust code. A build matrix can run `verus` over selected configurations, but failed or timed-out proofs remain unknown.

Evidence and limits. The script starts with a few seconds and megabytes of RAM, raises budgets for unresolved cases, and uses multiple CPU cores. “ProVerif may not terminate, since the underlying problem is undecidable.” Thus `cannot-be-proved` is not evidence of an attack or safety.

## technique: security goals as conditional injective correspondences

What it is. The ConfC/ConfS queries say that if the attacker learns a request or response in Mode = Enc, the server key must have leaked (leak(S_pk)); for ECC, the paper's formula adds the timing condition ts < t, which it describes as the leak having to occur before the request (perfect forward secrecy). Authentication uses injective events: each server receive must correspond to a distinct client send, conditioned on explicit exceptions such as anonymous users, compromised agents, or Mode=None.

How to apply it. Define event arguments containing certificates, session IDs, user identity, and request data. Write a correspondence `inj-event(receive(...)) ==> inj-event(send(...))` plus disjunctive compromise conditions. Add sanity checks that the hypothesis can occur and that removing the conditioning (e.g. dropping event(leak(U_pk)) in ConfPwd) causes a violation (section 3.3). Inference: this avoids vacuous proofs.

Verus form (Inference). Encode correspondence as a ghost history `Seq` and prove that every receive has a unique prior send with matching context. Use a ghost counter or unique token to express injectivity and `assert` to discharge matching equations. Verus does not provide event queries; the history and uniqueness invariant are application code/specification that must be maintained.

Evidence and limits. Their Table 2 marks ConfC, ConfS, ConfPwd, AgrS, and AgrC separately for v1.05.03 and v1.05.04 RC. A cross means ProVerif found attack(s); a checkmark means ProVerif proved the property. The caption adds: "When we claim a proof: not all configurations have necessarily been proven, but all configuration options are covered (see "Scope of the proofs" in Section 5)." For example, the ECC proofs of ConfC/ConfS are for the maximal configuration excluding None and SNoAA, and ConfPwd is proved for the maximal configuration only without Leak (Section 5).

## technique: proof-search tuning with noselect, precise contexts, and lemmas

What it is. ProVerif's resolution may loop on recursive session tables. The paper adjusts name contexts, adds precision annotations for selected inputs, and uses lemmas (queries that are later supplied as proof helpers). It emphasizes that context changes do not change model semantics, but they alter termination and precision.

How to apply it.

1. Identify a looping fact by inspecting verbose resolution output (section 4.3.2, Step 1).
2. Add `noselect` to the selected table fact and rerun; repeat until the loop terminates (Step 2).
3. Inspect the resulting `cannot-be-proved` derivation for false assumptions introduced by noselect (Step 3).
4. Write an invariant contradicting each impossible assumption (Step 4).
5. Remove noselect and prove each invariant as a query before assuming it for the main proof (Step 5).
6. If an invariant itself loops, prove it using previously proved invariants; ensure the resulting dependency graph is acyclic.

The paper's concrete example observes that two session-table entries with the same client signing key but different remaining channel keys are impossible because all keys derive from one seed (section 4.3.2). It says, “To ensure soundness, we use ProVerif to prove that these invariants indeed hold.”

Verus form (Inference). The closest Verus analogue is a ghost state invariant proved by a `proof fn` and used by later proof functions. Do not encode an unproved invariant as an axiom: Verus's trusted assumptions would then be the same unsoundness risk the paper avoids. Verus has no ProVerif `noselect`; instead, split a difficult proof into lemmas over smaller state transitions and prove every helper.

Evidence and limits. The authors modified contexts for 34 of 39 new names. The paper says larger contexts "enlarge the verification complexity but yield more precise results" and that `precise` annotations "significantly degrades performance". Their soundness claim relies on all axioms first being proved as queries and on ProVerif's soundness independent of name contexts (Section 4.3.2). Inference: an unproved helper invariant would invalidate the result.

## technique: sanity checks and attack minimization

Before trusting a result, they check that all expected protocol flows are executable in each configuration (as event reachability), that each property is violated when not conditioned correctly, and that each correspondence hypothesis H can be satisfied, since otherwise the property would trivially hold (section 3.3). Protocol simplifications (Reopen/Switch off) are also used to minimize attack traces and narrow down the features needed (section 4.1). Inference: this is a reusable validation pattern: test both intended behavior and deliberate failure.

Verus form (Inference). Add executable tests for state-machine reachability and proof lemmas that construct each correspondence hypothesis. A Verus proof of an implication with an impossible antecedent is vacuous, so a witness-producing test or lemma is needed to show the antecedent is reachable.

## findings and evidence

The paper reports "8 new vulnerabilities and other weaknesses in OPC UA v1.05", 6 of which also affect v1.04 (Section 1); all were disclosed to and acknowledged by the OPC Foundation. The paper's Section 5.7 attributes the attacks to missing bindings: activated sessions are not bound to their user (5.1); signed requests are not bound to the recipient (5.2); signed user tokens are not bound to the client (5.3); new channel keys from reopening are not bound to previous keys (5.4, 5.5); and signatures lack a context binding (5.6). Proposed fixes (Table 3) include a fresh session token per user, enforcing receiver identity in ECC, including client identity in user signatures, chaining channel keys across reopening, keeping the session token secret in Sign mode and using it as a MAC, and adding context and tags to signatures. Not all were adopted: the Foundation judged the backward-incompatible fix for the 5.3 user-impersonation KCI attack too costly for now (server long-term key compromise being a very strong threat model), and the 5.1 race condition got only mitigations in v1.05.04 RC (ticket 9351).

The race condition affects all versions and requires no key compromise: a request sent by U1 can be delayed while the session is reactivated by U2, then interpreted as U2's request. The paper's description is precise: “After the session transfer, the request R is received by the server and interpreted as a request from U2, hence violating AgrS.” Other attacks depend on ECC, SNoAA, leaked client or server keys, Reopen, or Switch. The password downgrade (5.6) shows that when channel keys are leaked, Mode = Enc is less secure than Mode = Sign because the specification allows sending passwords in plaintext under channel encryption; the signature oracle (5.6) arises when a server configured with SNoAA may not verify the client certificate and just signs the client nonce, giving server signatures on adversarially chosen data.

Table 2 reports that v1.05.03 has attacks for ConfC, ConfPwd, AgrS, and AgrC, while ConfS is proved in the listed scope. Updated v1.05.04 RC fixes several attacks, but residual risks remain in some configurations for AgrS and AgrC (marked ✗/✓−), so the paper proves weakened properties AgrS− and AgrC− instead; ConfC, ConfS, and ConfPwd are proved for v1.05.04 RC. The paper also states that, without key compromise, OPC UA satisfies all goals except AgrS and AgrC (race condition, 5.1). These outcomes are configuration- and threat-model-specific; they are not universal claims about every OPC UA implementation.

## trusted base, limitations, and VeruLaw relevance

Inference on the trusted base: the results rest on the applied-pi calculus abstraction, ProVerif's symbolic cryptography and soundness, the model's event placement, the configuration generator, and the authors' reading of the specification (the paper says it extracted what it believes suitable). Inference: the model does not cover concrete cryptographic code, transport parsers, timing behavior, or denial of service. Stated by the paper: it assumes a Dolev–Yao attacker and models compromise of agents' long-term keys and, in some configurations, channel keys (Leak: Ltk/Chk).

Inference: for agent-written verified Rust, the most transferable practice is to make state and configuration explicit, state security properties with exact context bindings, enumerate feature combinations, and prove helper invariants before using them. The largest product threat is a specification that proves an attractive property under the wrong configuration or with missing identity bindings. Dynamic or symbolic attack traces should become Verus regression lemmas and tests, but a ProVerif proof cannot substitute for memory safety, integer safety, or implementation-level Verus proofs.

Inference: the paper already completed an OPC UA model, configuration lattice, proof-search methodology, attack minimization, and remediation analysis, so VL should not redo those tasks for OPC UA; it should reuse the binding and conditional-property lessons when specifying its own protocol/state machine.

## techniques for the catalog

- explicit symbolic state model: represent protocol roles, cryptography, tables, events, and attacker control in applied pi calculus
- configuration lattice: generate one model per feature combination and prune by proved monotonicity
- conditional injective correspondence: state confidentiality and authentication with exact compromise and mode conditions
- proof-search tuning: combine context selection, `noselect`, precision annotations, and proved helper lemmas
- invariant methodology: inspect false assumptions, state invariants, prove them independently, and maintain an acyclic dependency graph
- sanity and reachability checks: test expected flows, non-vacuous hypotheses, and deliberate violations before accepting proofs
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Despite the addition of proof helpers as described above, the verification did not terminate for authentication properties on most configurations."): checked all quotations, numbers (7 056 configurations, 8.6 kLoC, 2.3 k clauses, 2.4 kLoC, 34 of 39 names, 8 vulnerabilities and 6 on v1.04), section references, the technique steps and the findings against the paper text; changed the link to the publisher page given in the paper, fixed section references (lattice order is 4.2, sanity checks 3.3), corrected the ConfC condition, the Table 2 caveat, the token-binding description and the fixes list, and marked own conclusions "Inference:"; did not check the full-version paper [14] or artifact [15], the PDF figures beyond the text, or the OPC UA specification itself.
