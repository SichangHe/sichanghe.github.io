# A Formal Analysis of IEEE 802.11’s WPA2: Countering the Kracks Caused by Cracking the Counters
(authored by agents unless marked 🧑)
Tag: `cremers2020wpa2`, [paper](https://www.usenix.org/conference/usenixsecurity20/presentation/cremers)

## model the protocol as executable state machines

The paper models WPA2's four-way handshake, group-key handshake, WNM sleep mode, and data-confidentiality protocols in Tamarin. Its goal is to cover ordinary and attack traces, including KRACK key reinstallation. The authors state: “We perform an automated analysis on our model using the Tamarin prover [23].” (§1, p. 2). Tamarin represents protocol executions as multiset-rewriting rules over symbolic algebraic terms. A rule consumes facts on the left, emits facts on the right, and may record action facts for security formulas (§2.3, p. 5).

Apply the modeling method as follows:
1. Define state-machine facts for each participant and handshake role. The standard yields seven machine types: two four-way, two group-key, one authenticator group-key generator, and two WNM sleep machines (§3, p. 5).
2. Encode each transition as a multiset-rewriting rule. A `READY` state can produce an encrypted `Out` fact, while action facts record events visible to lemmas (§2.3, p. 5).
3. Let the Dolev–Yao attacker control the network and send arbitrary messages; Tamarin's built-in symbolic cryptography models normal key knowledge (§2.3, p. 5).
4. Add restrictions for semantic requirements that are cumbersome as transitions, such as monotonic replay counters. The paper describes restrictions as formulas “that must hold in every valid execution of the protocol.” (§2.3, p. 5).
5. Represent each protocol mode's state and message order, including retransmissions and arbitrarily many rekeys (§3, p. 5; §5.1, p. 13).

Inference: For a Verus implementation, represent each state machine as a Rust enum and state transition invariants over event sequences. Establish a correspondence between the implementation and the symbolic model before applying the paper's protocol guarantees to the implementation.

## model nonce reuse as an explicit attacker capability

WPA2's TKIP, CCMP, and GCMP use a key and nonce for authenticated encryption. Reusing a nonce enables decryption and replay for all three, and forgery for TKIP or GCMP (§2.1, pp. 3–4). The paper deliberately weakens perfect-cryptography assumptions. It introduces a ternary `snenc(message,key,nonce)` and binary `sndec`, with equation `sndec(snenc(message,key,nonce),key) = message` (§3.4, p. 9).

Steps:
1. Track a sender's current PTK and nonce in a `SenderPTK` fact.
2. Increment the nonce when sending; emit `SenderPTK` with the new value (§3.4, p. 9).
3. Enforce FIFO ordering with an `Enqueue` action and a restriction that earlier enqueued messages are sent earlier (§3.4, pp. 8–9).
4. Add an explicit rewrite rule: if the attacker supplies two ciphertexts of different plaintexts made with the same key and nonce, emit the key. This models a worst case of nonce reuse (§3.6, p. 10).
5. Prove nonce-uniqueness lemmas for PTKs and GTKs before proving their secrecy (Figure 7, p. 17).

The paper says: “This rule models the worst case in which any reuse of a nonce immediately allows the attacker to obtain the key and thus decrypt all messages sent with the same key.” (§3.6, p. 10). The model also uses the PTK itself where the standard uses a derived key, strengthening the attacker and simplifying the model (§3, p. 6). Inference: For a Verus implementation, prove nonce monotonicity across all uses of a key, including reinstallation, and connect that invariant to the symbolic compromise rule.

## handle message queues and replay counters

The model uses one queue per thread, with `OutEnc(message, senderThreadID, messageID)` representing an enqueued message. A second rule sends it, using the PTK installed at transmission time and an incremented nonce (§3.4, pp. 8–9). The authors explain the queue's scope: “Our proofs hold for both cases, because any attack on a more restrictive queue implementation would also manifest itself in our more general model.” (§3.4, p. 9). A separate plaintext-send rule permits unencrypted messages even after key installation; the authors report that this liberal choice does not cause violations of the analyzed properties (§3.4, p. 9).

Replay counters have two roles: authenticated-encryption nonces and handshake message counters (§3.5, p. 9). The receiver restriction requires increasing nonces for a given key ID, receiver ID, and key. WNM messages use different nonces from four-way and group-key handshake messages. On the authenticator side, message 2's replay counter must equal the counter sent in message 1; other handshake responses must carry a counter the authenticator used in that handshake (§3.5, pp. 9–10).

The model permits arbitrarily many devices and concurrent threads (§3, p. 6). Within a thread, four-way and group-key handshakes run sequentially. WNM communication can run alongside them, but starts only after initial PTK installation. Queues are per-thread and FIFO, and a supplicant thread tracks only the latest received GTK (§3.7, p. 10).

Inference: Rust code should keep queue order and counter state explicit, and Verus invariants should quantify over an abstract event history or prove a local monotonic counter property. Modeling independent queues as an over-approximation can preserve soundness if the concrete implementation refines the model.

## prove secrecy and injective agreement

With the countermeasures in place, the analysis proves secrecy of the pairwise master key (PMK), pairwise transient key (PTK), and group temporal keys (GTK), plus injective agreement for the four-way handshake. The paper says: “In fact, our whole analysis consists of around 70 lemmas (including the main properties).” (§4, p. 11).

PMK secrecy states that an associated PMK can be known only after a `RevealPMK` event. PTK secrecy is proved from both supplicant and authenticator perspectives, assuming the relevant PMK is never revealed; other PMKs may be revealed. It requires nonce-uniqueness and no PTK reinstallation (§§4.1–4.2, p. 11). GTK secrecy assumes no PMK is revealed, since compromising one supplicant can expose the group's traffic (§4.3, pp. 11–12). Injective agreement requires each completed run to have a prior matching peer run, agreement on PMK, PTK, ANonce, and SNonce, and a unique peer run. An authenticator commits on receiving message 4, matched to a supplicant sending message 4. A supplicant commits on sending message 4, matched to an authenticator sending message 3; it does not know whether the authenticator received message 4 (§4.4, p. 12).

The proof strategy is layered:
1. Prove wellfoundedness lemmas to identify loop entry points and invariants (§Appendix A, p. 17).
2. Prove uniqueness and ordering lemmas so Tamarin can discard impossible traces early (§Appendix A, p. 17).
3. Prove PMK secrecy.
4. Prove PTK nonce uniqueness and PTK secrecy.
5. Combine GTK nonce uniqueness with PTK secrecy to prove GTK secrecy.
6. Prove injective agreement from both participant perspectives (§4, pp. 10–13).

The authors report: “Except for the two authentication lemmas and one helper lemma, all lemmas (including the helper lemmas) can be proved automatically by Tamarin, which takes around two hours overall on an 8-core machine with 30 GB of memory.” (§4.5, pp. 12–13). Those three lemmas need manual proof-search guidance. Two helper lemmas about the authenticator and supplicant not reusing encryption nonces take nearly all the time (§4.5, p. 13). Inference: A Verus protocol proof could similarly separate state invariants, uniqueness/order lemmas, key-secrecy predicates, and agreement lemmas.

## evaluate countermeasures and coverage

The patched model proves all Table 1 properties: PMK secrecy, PTK secrecy from supplicant and authenticator views, GTK secrecy from both views, and four-way injective agreement from both views (§5.2, p. 13). Two countermeasures suffice within the scope:
1. “A supplicant should not reset or modify the nonces of a key (pairwise transient key or group temporal key) if that key is currently installed [29].”
2. “A supplicant should delete the current group temporal key before entering WNM sleep mode.” (§5.2, p. 13).

Without the first patch, key-reinstallation attacks in the model prevent guarantees of PTK and GTK secrecy (§5.2, p. 13). The second patch aims to prevent receiver-side GTK reinstallations that permit group-message replay. The authors explicitly limit their result: “While such group-key reinstallations don’t violate any of the security properties proved in our analysis, we want to highlight that we did neither prove that they are impossible nor did we find such reinstallation attacks.” (§5.2, p. 13). Inference: The secrecy and agreement results do not establish replay protection for received group messages; treat that protection as a separate proof obligation.

Within the modeling assumptions, the paper covers standard four-way, group-key, and WNM traces, retransmissions, arbitrary rekeys, and key-reinstallation attack traces (§5.1, p. 13). It excludes side channels, the wider 802.11 stack, and implementation decisions (§5.2, p. 14). Kr00k concerns chip implementations that encrypt and transmit after disassociation, rather than the analyzed standard (§5.3, p. 14).

WPA2's offline guessing attacks remain by design (§7, p. 14). Inference: For agent-written verified Rust, reuse the paper's decomposition and countermeasure invariants, while separately proving that the implementation follows the modeled transitions. Those protocol proofs alone would not establish resistance to implementation flaws or side channels.

## techniques for the catalog

- multiset-rewriting protocol model — encode protocol states and transitions as facts, rules, and action events
- attacker-strengthening nonce model — reveal a key from two ciphertexts of different plaintexts encrypted with that key and nonce
- semantic restrictions — state replay ordering and queue FIFO requirements as formulas over every valid trace
- layered proof decomposition — use wellfoundedness, uniqueness, ordering, secrecy, and agreement lemmas in sequence
- injective agreement — require each completed role run to match one unique peer run with agreed transcript data
- countermeasure verification — model attacks without countermeasures and prove key secrecy and agreement with the two patches, keeping receiver-side group replay outside the proven properties
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "By including this rule into our model, we thus make sure that our security properties are not violated by a strong attacker who can exploit nonce reuse in all possible ways."): checked every quotation, number, section and printed-page reference, modeling step, proof dependency, patch claim, and stated limitation; corrected the publisher link, page references, nonce-compromise condition, patch wording, proof timing, and receiver-side GTK limitation, and narrowed implementation suggestions to labeled inferences; did not inspect the downloadable models or proofs, rerun Tamarin, or validate the Verus suggestions.
