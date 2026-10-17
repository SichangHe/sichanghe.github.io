# A Formal Analysis of SCTP: Attack Synthesis and Patch Verification
(authored by agents unless marked 🧑)
Tag: `ginesin2024formal`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/ginesin)

## what the paper does

The paper analyzes the Stream Control Transmission Protocol (SCTP) connection-establishment and teardown state machines. It translates the RFC behavior into a finite-state PROMELA model, states ten Linear Temporal Logic (LTL) properties, model-checks the un-attacked model with SPIN, and then uses KORG to synthesize denial-of-service attacks under four attacker models. It repeats the analysis with the RFC 9260 patch for CVE-2021-3772 and manually checks two ambiguous RFC passages against Linux and FreeBSD. The authors summarize the method as: “We create a formal P ROMELA model of SCTP, and define 10 properties capturing the essential protocol functionality based on its RFC specification and consultation with the lead RFC author.” (Abstract, p. 3099)

Inference: the result is a model-relative security argument. It proves properties of the finite model and finds attacks expressible by KORG; it does not prove every implementation, every RFC behavior, or every possible attacker. The paper explicitly warns: “It is therefore possible that the patch could introduce an attack outside the scope of what we analyzed using KORG.” (Introduction, p. 3101)

## technique: requirements to a finite protocol model

What it is. Encode each peer as a finite state machine (FSM), connect two peers with asynchronous FIFO channels, and represent SCTP packets as finite message values. The modeled peer states include Closed, Cookie_Wait, Cookie_Echoed, Established, and teardown states. The system is the parallel composition of Peer A, a channel, and Peer B. The authors state: “Our model captures the following aspects of SCTP per RFC 9260 [58]: internal peer states, packet verification using the itag and vtag, timers, TSNs, and handling for invalid, unexpected, and OOTB packets.” (Sect. 3.1, p. 3104)

Inference: use this reduction when the security question concerns a protocol’s finite handshake or teardown and can be stated as state and message properties. It is unsuitable for unbounded parallel sessions, cryptographic secrecy, statistical attacks, side channels, or behavior omitted from the abstraction.

How to do it:

1. Read the RFC and extract the peer states, transitions, packet checks, timers, and exceptional or out-of-the-blue (OOTB) packet rules (Sect. 3.1–3.2, pp. 3104–3105).
2. Define finite message types. The paper models each message as a chunk, vtag, and itag, with tags abstracted as expected, unexpected, and none. The optional TSN field can be enabled for replay analysis; Fig. 6 gives the grammar without it (Sect. 3.2, pp. 3104–3106).
3. Compose the peer FSMs with one channel process containing a size-one FIFO buffer in each direction. Rendezvous communication between the peers and this process gives asynchronous communication; the channel abstracts away loss, reordering, and corruption (Sect. 3.2, pp. 3104–3105).
4. Make explicit what is omitted: crashes and restarts, tie-tags and INIT collision, data transfer while Established, multi-chunk packets, fragmentation, and detailed DATA fields (Sect. 3.4, pp. 3105–3106).
5. Configure the invalid-packet defenses with or without the CVE patch so the same properties and attacker searches can be compared (Sect. 3.2, p. 3105).

Inference: the paper uses PROMELA and SPIN, not Verus. A possible Verus adaptation follows. Represent protocol states and finite packet fields as Rust enums and define a pure transition relation with `spec fn`. Give an executable `step` function a `requires` clause for a well-formed state and packet, and an `ensures` clause that its output is one of the transition relation’s successors. Use a loop `invariant` for channel bounds and state well-formedness, and `proof fn` lemmas for each transition case. A Verus proof can validate a concrete Rust FSM against the abstract relation, but it does not automatically replace SPIN’s temporal model checker or prove unbounded traces. The omitted RFC behavior remains a model assumption and must be recorded as such.

## technique: requirements as LTL properties

What it is. State protocol correctness as temporal properties over every execution of the composed FSM. The ten properties cover establishment and teardown transitions, cookie-timer progress, no half-open connections, synchronization between peers, and eventual termination. They intentionally target security-relevant behavior rather than claiming a complete RFC specification. Property φ2, for example, formalizes “no half-open connections” as a liveness condition because an in-transit ABORT can temporarily leave one peer Established and the other Closed (Sect. 3.5, p. 3107).

How to apply it:

1. Choose a concrete safety or liveness claim grounded in an RFC transition or security requirement. Examples include the φ4 cookie-timer condition and the φ10 eventual-Closed condition (Sect. 3.5, p. 3107).
2. Express the claim in LTL over the model’s state propositions, including the exceptional timer and user-abort cases where the RFC requires them (Sect. 3.5, p. 3107).
3. First run SPIN without an attacker. Check every property, deadlock freedom, livelock freedom, and state reachability. The authors say: “To verify our model, we extracted the properties listed above from the SCTP RFCs, and then used the model-checker to prove that our model satisfies all of the properties.” (Sect. 3.6, p. 3107)
4. Inference: inspect a failed property’s counterexample against the RFC and model encoding.

Inference: a possible Verus adaptation follows. Encode each state predicate and one-step transition as `spec fn`s. Prove inductive invariants with `proof fn`s and loop `invariant` clauses for bounded executions. For a finite protocol trace, an executable checker can produce a trace and a Verus proof can establish that each step preserves a safety predicate. Unbounded eventuality such as φ10 needs a well-founded progress measure or a separately verified temporal certificate; a local `ensures` clause alone does not establish liveness. Do not write LTL syntax as if it were a Verus construct.

## technique: attack synthesis from an invariant and a variant

What it is. KORG divides a correct system into an invariant component P that the attacker cannot change and a variant component Q that it can replace. Given a property φ that P∥Q satisfies, it searches for a finite replacement A for Q such that P∥A violates φ. The authors define it precisely: “In other words, we study a system that behaves correctly, and ask if we can change some constrained aspect so that it behaves incorrectly.” (Sect. 4.1, p. 3108)

How to do it:

1. Supply KORG with P and Q in PROMELA, the LTL property φ, and a YAML grammar describing the attacker’s permitted inputs and outputs (Sect. 4.1, p. 3108).
2. Ensure the baseline P∥Q satisfies φ; the authors perform this preliminary verification with SPIN.
3. KORG replaces Q with a nondeterministic “daisy” process, adds a termination precondition to φ, and asks SPIN to find a counterexample (Sect. 4.1, p. 3108).
4. Parse the counterexample into the finite attacker action sequence A. If no attack exists, KORG reports none; if search exhausts resources, it reports “Search not completed” rather than a proof of absence (Introduction, p. 3100; Sect. 4.1, p. 3108).
5. Inference: inspect the synthesized sequence against the protocol trace and the intended attacker capability.

KORG is reported sound and complete for the finite-state, LTL attack class: “KORG is proven to be sound (it has no false-positives) and complete (if attacks of the kind KORG looks for exist, given enough resources, KORG will find one)” (Sect. 4.1, p. 3108). Completeness is conditional on enough resources and the specified model, not on real SCTP generally.

Inference: a possible Verus adaptation follows. Implement the finite transition relation and attacker grammar as verified Rust data structures. Use `spec fn` predicates for valid attacker actions and a `proof fn` to show each generated trace step satisfies the grammar and the composed transition relation. A Verus checker could validate a supplied finite trace that reaches a state violating a safety predicate. A liveness counterexample needs additional evidence, such as a reachable cycle and an argument about the infinite execution it represents. It cannot itself search all nondeterministic traces without a separate finite search procedure, nor can a proof of one trace establish that no other attack exists. Keep the attack generator and any external model checker in the trusted or independently checked tooling boundary.

## technique: attacker models as explicit capability scopes

The paper makes the attacker a formal part of the model instead of using one vague “network attacker.” It studies Off-Path, Evil-Server, Replay, and On-Path models, all limited to denial of service against one association with two agents (Sect. 4.2, p. 3108).

- Off-Path can spoof a peer’s IP and port but cannot read in-transit messages or know association vtags; it sends invalid-tag messages into one channel.
- Evil-Server temporarily controls one peer and executes a finite malicious sequence before normal behavior resumes. The experiments allow it to send only valid messages and exclude DATA to reduce the search space (Sect. 5.1, p. 3110).
- Replay captures and retransmits packets without editing or blocking them. The experiments use memory for two packets and discard stored packets upon receiving an INIT to model vtag changes between associations (Sect. 5.1, p. 3110).
- On-Path controls the channel and can drop or insert valid messages, then terminates its finite attack sequence and behaves as an honest channel.

Inference: to apply the technique, define each capability as a distinct process composition and constrain the action grammar before searching. Do not infer that a result for one model covers another. The authors give two limits: their approach does not scale to unbounded parallel sessions, and “The Dolev-Yao attacker, by definition, controls the communication channels and therefore can pull off a DoS trivially.” (Introduction, p. 3100, footnote 3; Sect. 4.2, p. 3108)

Inference: a possible Verus adaptation follows. Use an enum for attacker capabilities and a `spec fn` predicate `allowed_action` that checks the model-specific restrictions. Prove that the executable attacker interpreter emits only allowed actions with `requires`/`ensures`; maintain a ghost trace and prove that each protocol transition consumes one allowed action or an honest-channel step. This establishes the scope of a test harness, not the absence of attacks outside that scope.

## technique: patch verification by differential re-analysis

What it is. Enable the RFC 9260 CVE patch in the same model, rerun the attack search, and compare both the previously violated property and every property that passed before. The authors report that KORG finds the CVE attack Off-Path when disabled and no Off-Path attack when enabled. They also find that no previously satisfied attacker/property pair becomes violated among the ten properties and four models (Sect. 5.3, p. 3111).

How to do it:

1. Run baseline SPIN checks and record all ten property outcomes and attack traces for the unpatched model.
2. Change only the patch configuration in the PROMELA model.
3. Repeat KORG with the same four attacker grammars, search limits, and property set.
4. Confirm that the property violated by the CVE trace now holds under its discovered attacker model.
5. Inference: compare all other results and state the model, properties, and attacker capabilities covered.

Evidence. The experiments ask KORG for at most ten attacks per run, use default search depth 600,000 and maximum depth 2,400,000, and report no out-of-memory runs in the presented experiments. They state: “It either finds at least one attack or fully exhausts the search-space before hitting the configured maximum search depth.” (Sect. 5.1, p. 3110) The paper’s prose reports one Off-Path CVE variant, four Evil-Server attacks, one Replay attack, and six On-Path attacks (Sect. 5.2, pp. 3110–3111). Table 2 (p. 3111) additionally lists the two Off-Path attacks enabled by RFC misinterpretations. Its On-Path rows say “4 attacks where the attacker manipulates both peers into Shutdown_Received.” under φ5, “2 where the attacker spoofs A to guide B through passive establishment.” under φ8, and “2 where the attacker spoofs B to guide A through passive establishment.” under φ9. Inference: those table entries total eight, so the table and prose disagree; the study cannot resolve that discrepancy. With the patch, the authors say they find the exact same attacks in the other models and none in Off-Path, under the same ten properties (Sect. 5.3, p. 3111).

Inference: a possible Verus adaptation follows. Represent old and patched transition relations as two explicit `spec fn`s and prove a refinement or preservation lemma for the patch’s intended behavior. A verified regression harness could check that the CVE counterexample is eliminated and previously satisfied properties remain satisfied in the same attacker models. Other pre-patch attacks can remain; the paper reports that they do. This needs an enumerated finite graph or a separately verified search; two independent function contracts are not a differential proof.

## technique: ambiguity analysis plus implementation validation

The authors manually inspect RFC 9260 for ambiguous text, ask the lead RFC author to confirm the intended interpretation, model each incorrect interpretation, and synthesize an attack. They find two ambiguities where a reasonable misreading enables an Off-Path denial of service. They then inspect Linux and FreeBSD and use PACKET DRILL; neither implementation makes either mistake (Sect. 5.4, p. 3111). One proposed erratum had been accepted by the SCTP RFC committee by the paper’s publication (Abstract, p. 3099).

The first ambiguity concerns which parameters to reuse when replying to an unexpected INIT in Cookie_Echoed. Their proposed clarification says: “The verification tag used in the packet containing the INIT_ACK chunk MUST be the initiate tag of the newly received INIT chunk.” The second concerns whether verification-tag checking precedes chunk processing. Their accepted clarification says: “When receiving an SCTP packet, the endpoint MUST first ensure that the value in the Verification Tag field of the received SCTP packet matches its own tag before processing any chunks or changing its state.” (Sect. 3.3, p. 3105)

Inference: this technique catches specification-to-model and specification-to-code gaps. Apply it by maintaining both interpretations as explicit model branches, searching each branch, and then checking real implementations against the selected branch. The result is evidence about the checked implementation versions and test cases, not a proof that all implementations conform.

Inference: a possible Verus adaptation follows. Encode the normative interpretation as a `spec fn` transition predicate and the implementation parser or dispatcher as executable Rust. Prove that each accepted packet follows the normative branch, and make an incorrect branch an explicit counterexample input. A `requires` clause can state packet well-formedness; `ensures` can state the resulting state transition. PACKET DRILL remains external evidence unless its test harness and implementation are separately modeled and verified.

## evidence, trusted base, and failures

The paper formally proves the ten LTL properties only for its finite PROMELA model with no attacker and reports KORG attack results for the four finite attacker models. It manually compares OOTB logic with Linux and FreeBSD C and runs PACKET DRILL for the two ambiguity checks. Inference: trusted or assumed elements include the RFC interpretation, model fidelity, PROMELA and SPIN, KORG’s implementation, finite search bounds, the abstraction of tags and channels, and the selected property set. The paper states that KORG “does not find other types of attacks, such as statistical attacks against pseudo-random values used in the protocol or side-channel attacks against protocol implementations” (Introduction, p. 3100).

The model omits crashes, restarts, packet loss, reordering, corruption, data exchange while Established, and unbounded parallel sessions. Its “Perfect channel” and two-agent assumptions are explicit (Sect. 3.4, pp. 3105–3106; Sect. 4.2, p. 3108). Inference: the patch result covers the ten properties and four attacker models, not universal patch correctness.

Inference: verified Rust can still implement an incorrect protocol abstraction or omit relevant attacker capabilities. Verus can make the transition relation, packet ownership, bounded channels, and regression obligations explicit, reducing implementation errors. It cannot infer the right RFC properties, prove omitted network behavior, or turn a finite attack search into universal security without a complete model. VL should reuse the paper’s separation of protocol model, temporal properties, attacker capabilities, and patched-vs-unpatched differential checks. VL should not redo generic finite-state attack synthesis as if KORG’s method were new; the product-specific contribution would be a verified Rust refinement and an auditable certificate boundary.

## techniques for the catalog

- RFC-to-FSM modeling — encode protocol states, packet fields, channels, and explicit omissions as a finite transition system
- LTL property extraction — derive safety and liveness properties from normative protocol behavior and model-check the un-attacked system
- KORG attack synthesis — replace a constrained attacker component with a nondeterministic process and extract counterexample traces as attacks
- capability-scoped attackers — model Off-Path, Evil-Server, Replay, and On-Path powers as separate finite grammars
- differential patch verification — rerun the same properties and attack searches with a patch and compare every attacker/property result
- ambiguity attack analysis — model plausible RFC misinterpretations, synthesize attacks, and validate the intended reading against implementations
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The purpose of this attacker model is to study the degree to which an adversary capable of temporarily controlling one peer in a connection can negatively impact the other."): checked the full text, quotations, counts, references, model assumptions, attacker capabilities, and technique steps; corrected an altered model quotation, page references, the publisher link, attack-count attribution, and speculative adaptations; did not rerun the paper’s experiments, inspect its artifacts or implementation sources, or verify the proposed Verus adaptations (quote: Sect. 4.2, p. 3109).
