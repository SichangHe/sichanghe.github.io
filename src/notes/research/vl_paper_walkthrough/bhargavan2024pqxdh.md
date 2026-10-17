# Formal verification of the PQXDH Post-Quantum key agreement protocol for end-to-end secure messaging
(authored by agents unless marked 🧑)
Tag: `bhargavan2024pqxdh`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/bhargavan)

## what the paper proves or measures

Bhargavan, Jacomme, Kiefer, and Schmidt analyze the PQXDH hybrid key-agreement protocol used by Signal. They model revision 1 with ProVerif, find attacks, update the specification with the Signal designers, and prove revision 2 with ProVerif and CryptoVerif. The paper states: “In this work, we formally specify and analyze the security of the PQXDH protocol against both classical and quantum adversaries.” (Introduction, printed p. 469.) The main security goals are mutual authentication and forward secrecy; deniability is outside scope. The authors state: “We emphasize that protection against active quantum adversaries is not a goal for PQXDH, although Signal engineers intend to provide this in a future protocol version.” (Section 2.2, printed p. 471). The reported flaws are not exploitable in Signal’s implementation: its key encodings prevent public-key confusion, and Kyber prevents the reported re-encapsulation attack (Sections 4.1.1–4.1.2, printed pp. 476–478).

The workflow combines a high-automation symbolic model with a computational game-based proof. The authors report: “Our final methodology is then to use both tools in parallel.” (Section 3.6, printed p. 475.) ProVerif explores many compromise combinations and finds concrete traces; CryptoVerif gives stronger computational guarantees for a smaller set of properties and compromises. The results are conditional on the protocol model, cryptographic assumptions, event definitions, and deployment details.

## technique 1: formalize a protocol specification as applied pi-calculus roles

what it is: translate the English protocol into processes for Alex and Blake, public-key servers, a trusted PKI, and an untrusted network. The model includes arbitrary agents, optional one-time pre-keys, one encrypted message, and medium-term KEM keys (Section 3.1, printed p. 473).

when to use: Inference: use this when a protocol has concurrent sessions, public channels, pre-key servers, multiple key classes, and cryptographic operations that need symbolic attack exploration.

how to do it:
1. Define each role’s key material and messages. PQXDH uses identity keys, signed pre-keys, one-time pre-keys, ephemeral DH keys, and a PQ signed pre-key (Section 2, printed pp. 470–472).
2. Model the public PKI as a database and the pre-key server as a public channel. The server is fully untrusted, so an attacker can replace uploaded material (Section 3.1, printed p. 473).
3. Encode protocol completion as events carrying all parameters needed for agreement. The paper gives `event(BlakeDone(A,B,spk,pqpk,sk))` for Blake’s completed session (Section 3.3, printed p. 473).
4. Add compromise processes for identity, signed pre-key, one-time pre-key, ephemeral, and KEM keys. Mark the time of a compromise or quantum break and state security for sessions completed before it (Section 3.2, printed p. 473).

Verus form: Inference: represent roles and messages as Rust datatypes and state transitions, with `spec fn` predicates for valid bundles and session states. Use verified functions with `requires` and `ensures` for each transition. Inference: ProVerif’s unbounded process semantics and public-channel attacker do not automatically exist in Verus; model traces or an abstract transition system explicitly.

evidence: the paper’s model includes “an arbitrary number of agents communicating together” and an untrusted pre-key server (Section 3.1, printed p. 473). The formal models are published at reference [12]; standard tool versions suffice and are not supplied there (Models and reproducibility, printed p. 470).

limits and assumptions: the model gives each connection one encrypted Alex-to-Blake message and no follow-up messages. The complete Signal ecosystem and Double Ratchet are not modeled. Inference: a Rust proof of only this handshake cannot establish conversation security or deniability.

## technique 2: event-based mutual authentication and compromise-aware secrecy

what it is: annotate processes with events and state correspondence queries over event parameters and timepoints. Events do not change execution; they expose the trace to the verifier. The paper says: “Events do not affect the concrete execution of the trace and are only used to reason about it.” (Section 3.3, printed p. 473.)

when to use: Inference: use events to express that one party’s completion implies an earlier matching completion by its peer, and to express secrecy unless explicitly listed compromise cases occur.

how to do it:
1. Raise `AlexDone` and `BlakeDone` with identities, pre-key public keys, and the derived key.
2. Query that Blake’s completion has a matching Alex completion at an earlier time. The simplified query is `BlakeDone(...)@i ==> AlexDone(...)@j & j<i` (Section 3.3, printed p. 474).
3. State forward-secrecy confidentiality as a disjunction: the key is not attacker-known, or a long-term key was compromised before completion, or a quantum break occurred before completion (Section 3.3, printed p. 474).
4. Iterate the query. When ProVerif finds an expected compromise trace, add that case; stop when the query proves or the trace is an unexpected attack.
5. Manually check each disjunct’s independence. The paper calls a query maximal when removing any one case produces an attack, but says this is maximality only with respect to the model and Dolev–Yao attacker (Section 3.4, printed p. 475).

Verus form: Inference: encode a ghost event trace and prove that each Blake completion index has an earlier matching Alex event. Use `requires` for honest-key assumptions and `ensures` for secrecy predicates. Inference: a compromise disjunction should be a specification predicate over the trace; do not treat an event annotation as executable behavior.

evidence: the final ProVerif analysis proves three query families: responder-key secrecy, initiator-key secrecy, and authentication (Appendix A, printed p. 484). The symbolic theorems enumerate compromise cases rather than percentages. For example, Theorem 8 guarantees that Blake’s acceptance has a matching Alex acceptance unless Alex’s identity key or Blake’s signed pre-key was compromised before the exchange, or DH was broken before it (Appendix A, printed p. 485).

limits and assumptions: event correspondence proves only the modeled events and parameters. The authors warn that maximality is not completeness for the real world or computational model (Section 3.4, printed p. 475). Inference: omitted serialization, key reuse, or session continuation can invalidate an apparently complete event query.

## technique 3: use ProVerif as an exhaustive attack-finding and query-refinement loop

what it is: exploit ProVerif’s automation to explore variants, add attacker capabilities, and refine security queries until expected compromises are separated from genuine flaws. ProVerif assumes perfect cryptography by default, but the model can explicitly grant discrete-log computation or KEM decapsulation to the attacker (Section 3.4, printed p. 474).

when to use: Inference: use this alongside a computational proof, especially for hybrid protocols with many key-compromise combinations and classical/quantum break points.

how to do it:
1. Start with a broad query and run ProVerif on revision 1.
2. Inspect each attack trace. If it is a normal case, such as a deliberately compromised identity key, add that case to the disjunction.
3. Re-run until the query either proves or produces a trace that does not match a normal compromise.
4. When a potential modeling abstraction may hide an attack, add the suspected behavior explicitly and re-run. The paper did this for KEM/DH public-key confusion and obtained a concrete trace (Section 4.1.1, printed p. 476).
5. Preserve the final query and every disjunct’s interpretation as part of the security theorem.

Verus form: Inference: ProVerif has no direct Verus equivalent. Use its traces to generate Rust proof obligations and adversarial tests, then prove the fixed implementation with Verus contracts. Inference: a Verus proof cannot silently inherit ProVerif’s symbolic attacker; the trace semantics must be encoded or justified separately.

evidence: all attacks on revision 1 were found in a few minutes on a laptop with 32 GB RAM and an 11th-generation Intel i7-1165G7 CPU (Section 4, printed p. 476). This is a runtime for the reported attack searches, not a denominator-based success rate.

limits and assumptions: ProVerif’s attacker is weaker than the computational model because perfect cryptography is assumed unless capabilities are added (Section 3.4, printed p. 474). Inference: a proof of a ProVerif query alone cannot establish computational security.

## technique 4: computational game proofs with CryptoVerif

what it is: encode the protocol as a cryptographic game and ask CryptoVerif to apply valid game transformations under assumptions such as gapDH, IND-CCA, EUF-CMA, PRF, and AEAD integrity. CryptoVerif models a stronger computational attacker but is less automated and does not perform attack finding (Section 3.5, printed p. 475).

when to use: Inference: use this when computational guarantees are required; feed results back into symbolic exploration as the paper’s parallel workflow does.

how to do it:
1. Choose classical and post-quantum assumptions. The post-quantum proof uses classical EUF-CMA for signatures, post-quantum IND-CCA for the KEM, PRF for the KDF, and quantum-resistant AEAD security; it makes no curve assumption (Section 3.5, printed p. 475).
2. Define authentication events and raise them only when the peer is honest and not yet compromised. This removes compromise cases from the query and makes the game property conditional by construction (Section 3.5, printed p. 475).
3. For secrecy, assign the variables to be proved strongly secret only when both parties are honest and not yet corrupted. Other sessions remain in the protocol model.
4. Guide transformations manually when automation cannot find a proof. The paper states that manual guidance is often needed for complex applications (Section 3.5, printed p. 475).
5. Validate proposed protocol changes in the models before recommending them, as the authors did (Section 5.2, printed p. 479).

Verus form: Inference: represent cryptographic games as abstract specifications and prove Rust implementation refinement separately. Verus can prove protocol-level algebraic obligations under stated axioms, but it does not replace CryptoVerif’s computational reduction. Inference: keep assumptions such as IND-CCA or PRF explicit in ghost interfaces and document them as trusted.

evidence: for revision 2, Theorem 2 gives classical computational security under gapDH, random-oracle KDF, AEAD IND-CPA+INT-CTXT, and EUF-CMA signatures. Theorem 3 gives post-quantum secrecy under KEM IND-CCA, KDF PRF, and final AEAD IND-CPA+INT-CTXT, provided signatures were unforgeable when the exchange completed (Section 5.2, printed p. 479). These are conditional theorems, not measured probabilities.

limits and assumptions: CryptoVerif’s model considered only dynamic compromise of long-term identity keys, whereas ProVerif considered dynamic compromise of any cryptographic material (Section 3.2, printed p. 473). Inference: the stronger computational guarantee covers fewer compromise scenarios in this study.

## technique 5: model hybrid-protocol attacks and repair them by domain separation and key binding

what it is: test whether adding a post-quantum KEM preserves authentication and secrecy when combined with DH, signatures, AEAD, and existing X3DH material. The analysis found a public-key confusion attack and a KEM re-encapsulation attack in revision 1. KDF input confusion and weak post-quantum forward secrecy are additional design concerns, not confirmed attacks on the target properties (Section 4, printed p. 476).

how to do it:
1. Check that encodings of DH and KEM public keys have pairwise disjoint ranges. Without this, the attacker may substitute one key type for another (Section 4.1.1, printed p. 476).
2. Authenticate the KEM public key by including it in AEAD associated data, or require a KEM property that binds the shared secret to the public key (Section 5.1, printed p. 479).
3. Account for the KDF’s `info` field. Ignoring it produced false cross-protocol attacks in the first model. It distinguishes calls within PQXDH, but a theoretical X3DH/PQXDH confusion remains possible depending on X3DH’s application-chosen `info` (Section 4.2.1, printed p. 478). Revision 2 requires disjoint public-key encodings and introduces identifiers distinguishing one-time and last-resort KEM keys. Those identifiers do not establish the distinction against an untrusted server (Section 5.1, printed p. 479).
4. Include all public keys in KDF input in a future revision to strengthen data agreement and reduce reliance on the extra KEM assumption (Section 5.4, printed p. 481).
5. Define and prove the needed KEM property. In semi-honest collision resistance (SH-CR), generate an honest key pair and give its secret key to the attacker. The attacker chooses another public key; honest encapsulation to that key produces a secret and ciphertext. Given both, the attacker tries to produce a ciphertext that decapsulates under the original secret key to the same secret, while either the ciphertext or public key differs. SH-CR requires this success probability to be negligible (Definition 1, Section 5.3.1, printed p. 480).

The re-encapsulation trace compromises one of Blake’s KEM keys, makes Alex encapsulate to it, and recovers the shared secret. The attacker then produces a new ciphertext for an uncompromised key of the same Blake with the same shared secret, and substitutes both ciphertext and key identifier. Blake accepts, breaking KEM-key agreement and session independence (Section 4.1.2, printed pp. 476–478). Kyber does not allow this attack.

Verus form: Inference: represent key domains as distinct Rust enum variants or tagged encodings and prove injective, disjoint serialization. Include all negotiated public keys in a ghost KDF-input record and prove that AEAD associated data binds the same record on both sides. Inference: SH-CR is a cryptographic assumption or external theorem; Verus can verify protocol use of it but cannot derive Kyber security from Rust control flow alone.

evidence: CryptoVerif proves “Kyber is SH-CR” when Kyber hash functions are modeled as random oracles (Theorem 5, printed p. 480), and Theorem 6 proves PQXDH public-key agreement under assumptions matching Theorem 2 plus SH-CR (printed p. 480). The paper notes that McEliece does not meet SH-CR and that the situation is unclear for BIKE and HQC (Section 5.3.2, printed p. 480).

limits and assumptions: the re-encapsulation attack can occur without violating standard IND-CCA, so IND-CCA alone is insufficient for PQXDH’s KEM public-key agreement (Section 5.3, printed p. 479). Inference: hybrid composition needs protocol-specific binding properties in addition to each primitive’s stand-alone definition.

## what is proved, what remains trusted, and product threat

The paper proves symbolic theorems for revision 2 and computational theorems for selected properties and compromises. It also proves Kyber’s SH-CR property under random-oracle modeling. Inference: the trusted boundary includes ProVerif and CryptoVerif semantics, the applied pi-calculus and game models, cryptographic assumptions, event placement, and the link between Signal’s implementation and the model. The paper itself states: “We note that our proofs only hold for our models, which do not capture all the details of how the protocol is deployed.” (Section 5.5, printed p. 481.)

The authors list important omissions: Signal reuses long-term identity material for X25519 and XEdDSA, while their model uses separate key pairs; CryptoVerif models only long-term-key compromise; deniability, full Signal composition, and the complete Double Ratchet are outside this work (Section 5.5, printed p. 481). Inference: for agent-written verified Rust, the main threat is a model that silently omits key reuse or composition while the Rust implementation still has it. Inference: the product needs refinement proofs for parsing, key-domain tags, AEAD associated data, and KDF inputs, plus explicit assumptions for external cryptography.

Inference: what VL should not redo is an undirected symbolic search or a generic post-quantum protocol tutorial. Inference: the reusable workflow is the combination of ProVerif attack discovery, maximal compromise-aware queries, CryptoVerif computational proofs, and protocol changes that separate key encodings and authenticate the KEM public key. Inference: VL should invest in the Rust-to-protocol refinement boundary and in replaying ProVerif attack traces against executable code.

## techniques for the catalog

- applied pi-calculus protocol modeling — encode hybrid roles, key servers, public channels, and compromise processes
- event correspondence queries — prove mutual authentication and compromise-aware secrecy over ordered completion events
- iterative ProVerif query refinement — add expected compromise cases until a maximal model-relative property proves or a genuine attack remains
- CryptoVerif computational games — obtain stronger computational guarantees under explicit classical and post-quantum assumptions
- hybrid domain separation — use disjoint key encodings and version/input separation to prevent cross-protocol confusion
- KEM public-key binding — authenticate KEM keys in AEAD data or prove a protocol-specific SH-CR property
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "As a consequence, PQXDH offers a weaker forward secrecy guarantee than Alex may expect, since Alex cannot know if the decryption key will be immediately deleted."): read the whole paper, including references and appendices; checked quotations, numbers, assumptions, technique steps, and section and printed-page references; corrected the publisher link, references, attack scope, SH-CR game, and computational-proof conditions, and marked recommendations as inferences; did not run the formal models or inspect Signal’s implementation. The mid-paper sentence is from Section 4.2.2, printed p. 478.
