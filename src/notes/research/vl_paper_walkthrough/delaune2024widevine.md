# Formal Security Analysis of Widevine through the W3C EME Standard
(authored by agents unless marked 🧑)
Tag: `delaune2024widevine`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/delaune)

## scope and result

This paper reverse-engineers Widevine's implementation of the W3C Encrypted Media Extensions (EME), formalizes its stateful license protocol, and analyzes it with TAMARIN. It defines seven generic EME security goals, adds an eighth policy goal for Widevine, finds a renewal-license attack, proposes a patch, and proves the patched models. The abstract reports, “Our investigation highlights a vulnerability that could allow for unlimited media consumption.” It also states that the patched protocol was “formally proved secure using TAMARIN.” (Abstract, p. 6399.)

Inference: the paper's main formal-verification lesson is a workflow for turning opaque, stateful implementation behavior into a symbolic model, then using counterexamples and repaired proofs to refine a protocol. A Verus proof of a Rust CDM could check concrete state transitions and cryptographic API contracts, but it would not replace TAMARIN's unbounded adversarial trace analysis or prove the proprietary implementation matches the model.

## technique 1: reverse-engineer the implementation before formalizing it

What it is and when to use it. EME leaves message contents to each DRM. Formal analysis therefore starts by discovering the actual messages, memory state, API behavior and platform variants. Inference: use this method when a standard abstracts the security-critical payloads or when vendor code is closed.

Steps from Section 3.1 (p. 6403): use Android Nexus 5/5X and Pixel devices on Android 6–12, and Windows 10/11, macOS Big Sur and Ubuntu 22.04 desktops; test Firefox up to version 122, Chrome 121 and Edge 120; run Android CDMs 3.1.0–16.1.0 and desktop CDM 4.10.2557.0 and the Widevine integration license server; use Ghidra for static decompilation, Frida and WideXtractor for dynamic hooks, and custom scripts; intercept messages and API calls; manipulate arguments with errors, redundancies and forged parameters; document exchanges, failures, key derivation, timing and memory updates.

The paper summarizes the purpose: “This setup allowed us to intercept all messages between our test devices and the Widevine integration test server, during the decryption and playback of protected media content using the CDM.” It reverse-engineered both desktop and Android implementations and modeled a KCB-in-renewal and no-KCB variant (Sections 3.1–3.2, pp. 6403–6404).

Verus form. Inference: implement a trace recorder and typed parsers in Rust, with `requires`/`ensures` contracts that each recorded message is associated with one session and stage. Prove parser totality and that a serialized trace round-trips. The observational coverage is still empirical; a Verus proof cannot show that unobserved proprietary branches do not exist.

Evidence and limits. The authors did not reverse engineer production license servers; they used the test server and assumed it returns valid-format responses even for semantically odd requests (Section 3.2.4, p. 6404). They explicitly caution that a model can differ from implementation because only observable behavior is known (Section 5.3, p. 6409). This assumption is part of the threat boundary.

## technique 2: state explicit security goals and a threat model

What it is and when to use it. Inference: replace a vague claim about preventing piracy with trace properties that a prover can state. The paper defines confidentiality, initial-license integrity/authenticity, initial freshness, initial expiration, renewal integrity/authenticity, renewal freshness, and renewal expiration (Section 4.2, pp. 6406–6407). Goal 8 separately checks that the CDM loads renewal licenses only when the policy authorizes renewal (Section 6.1, pp. 6410–6411).

The goals are concrete. For example, Goal 3 requires that “A given license of type license-request can be loaded at most once, and only by the CDM generating the corresponding request.” Goal 7 says the key is usable after renewal only when the renewal expiration time exceeds the current time. The threat model lets an attacker inject and intercept arbitrary JavaScript EME calls, but assumes trusted OTTs, a trusted certificate authority, secure CDMs, and an untampered CPU clock (Sections 4.2–4.3, pp. 6406–6407).

Verus form. Inference: define each goal as a state-machine invariant or postcondition over a Rust session object: key secrecy is an abstract non-leak property, freshness is a consumed nonce or counter, authenticity is a verified signature/HMAC origin, and expiration is a time comparison. Use `proof fn` lemmas to show state updates preserve these predicates. Model the attacker and network separately; ordinary Rust contracts alone cannot quantify over all adversarial traces.

Evidence and limits. Goals 2–8 depend on the exact message fields and trust assumptions. The goals assume trustworthy OTTs and exclude software attacks on CDMs; the browser is controlled by the attacker (Sections 4.2–4.3, pp. 6406–6407). The paper's generic goals are intended to be reused for other DRMs, but the Widevine instantiation is necessary to fill opaque messages (Section 4, pp. 6405–6406).

## technique 3: model a stateful protocol as TAMARIN multiset rewriting

What it is and when to use it. TAMARIN represents agents, memory, network messages and attacker knowledge as facts in a global multiset. Rewrite rules consume and produce facts; trace labels state events; first-order lemmas quantify over all traces. This suits APIs whose counters, keys and policies persist across calls.

Steps from Sections 5.1–5.2 (pp. 6407–6408): model six initialization rules, eight CDM rules and four OTT rules, for 18 rules total; use fresh terms for nonces and keys, persistent facts for immutable session data, and linear facts for consumable or updateable cells; expose network inputs and outputs to the Dolev–Yao attacker; write lemmas for each goal; use restrictions for assumptions; run both desktop and Android models, with and without the patch. The example `CDMGenerateRequest` rule creates a request ID, nonce and privacy key, signs the request, emits it, and records session state.

The paper explains the formalism: “TAMARIN analyzes protocols in the so-called Dolev-Yao model, where the attacker is able to receive, intercept, modify, and forge messages.” It also says the state is “globally modeled by a multiset of facts.”

Verus form. Inference: a Rust model can encode facts as ghost state and rewrite rules as proof-only transition functions, with an invariant over all reachable states. Persistent versus linear facts correspond to immutable ghost records versus consumed permissions. Verus does not natively provide TAMARIN's symbolic attacker closure or unbounded trace search, so those semantics would need to be defined explicitly or supplied by another tool.

Evidence and limits. TAMARIN treats cryptography as perfect symbolic functions and nonces as unguessable (Section 5.1, p. 6407). That proves protocol logic under the abstraction, not implementation-level cryptographic security. The authors note that proof search is undecidable and can require interactive guidance and an oracle.

## technique 4: model time and monotone counters explicitly

What it is and when to use it. EME's expiration and renewal freshness depend on durations, but TAMARIN normally offers only event ordering. The authors add an attacker-chosen global clock constrained to increase, then state expiration as arithmetic over that clock. They use a counter for renewal events and induction lemmas to prove strict increase.

Steps from Sections 5.4–5.5 (pp. 6409–6410) and Appendix B (p. 6415): feed each relevant rule a time input `%t`; label execution with `GTime(%t)`; add the `TimeIncreasing` restriction so later trace events have larger times; store license start and duration in a CDM fact; permit key use only when current time is below start plus duration; increment a renewal counter on each successful load; prove `CounterIncrease` and `CounterIncreaseStrictly`; use the counter lemmas for Goal 6 and the explicit clock for Goals 4 and 7.

The paper states, “We model time as a global clock, i.e. an integer counter %t, representing the current date.” Appendix B explains that the counter proves renewal freshness without relying on a nonce; Android additionally uses KCB nonces (Section 3.2.4, p. 6404).

Verus form. Inference: represent time as a monotone ghost integer and put `old(counter) < counter` in the renewal postcondition; prove that every accepted renewal strictly increases the stored counter. Use `requires now >= old(now)` and an expiration inequality in the key-use contract. Verus can prove arithmetic invariants for a concrete clock representation, but not the trustworthiness of a hardware clock or wall-clock units.

Evidence and limits. The authors add timer inputs only to rules that use time to reduce search; this preserves executions while reducing facts (Section 5.5, p. 6410). They retain a restriction allowing only one successful initial load per Android session because the counter behavior on a second load was untested. For desktop, they derive this property from the latest EME draft's one-request-per-session rule (Section 5.3, p. 6409).

## technique 5: let falsification guide a protocol patch, then re-prove

What it is and when to use it. Run the formal goals on the unpatched model, inspect a violating trace, identify the missing binding or state check, patch the protocol, and rerun all goals. This is both attack discovery and proof-driven repair.

The derive attack (Section 3.3, pp. 6404–6405) exploits a license-acquisition path that stores derived keys before all checks complete. Under the required memory-persistence behavior, the attacker first observes a successful acquisition for a Content Key renewable at least once, obtaining the request, Request ID and Device RSA public key. They submit a malformed initial license containing an attacker-chosen encrypted Session Key: derivation overwrites the Asset and MAC keys, while failed loading leaves the existing Content Key available. They wait for a renewal request, stop it, and submit a forged renewal license with arbitrary policies or expiration using the keys they now know. The proposed patch binds each opened session to a read-only server certificate, makes subsequent certificate changes affect only future sessions, and requires initial licenses to be signed with that server certificate's private key. Committing memory only after all acquisition checks succeed is a separate alternative discussed by the authors, not the patch they choose. The attack requires derived keys to persist after a failed initial-license load; the authors did not implement it, citing legal concerns (Section 3.3, p. 6405).

The proof workflow in Section 6.1 (pp. 6410–6411) is: first check an executability lemma showing the intended flow exists; automatically prove basic secrecy lemmas; add intermediate lemmas about key initialization and memory; analyze initial-license goals; analyze renewal goals; encode successful proofs as an oracle for repeatable automatic runs. The paper states, “These lemmas can be found in each of our Tamarin files and are systematically checked before performing the security analysis.” It warns that this does not guarantee exact correspondence to the implementation.

Verus form. Inference: store the server certificate immutably in each Rust session and require a verified server signature before processing an initial license. Prove that later certificate changes cannot alter existing sessions. An alternative implementation could commit derived keys only after all acquisition checks succeed. Relating these contracts to the paper's adversarial traces would require a model of the attacker and API call order.

Evidence. Table 1 (p. 6411) reports eight goals over four models: desktop and Android, each without and with the fix. Goals 1–4 and 6 are proved in all variants. Goals 5, 7 and 8 are false in all unpatched variants (the table marks them with a cross) and proved in both patched variants (a check). On a 2.30 GHz Intel Core i7-1068NG7 laptop with 16 GB RAM using TAMARIN 1.8.0, easy lemmas take seconds; the hardest patched Android Goals 5–8 take about four minutes (Section 6.2, p. 6411). Appendix Table 4, excluding executability checks but counting comments in line totals, reports 510 protocol lines in each model, 200 property lines without the fix and 450 with it, and 9 versus 11 secrecy lemmas; the patched renewal part has 15 lemmas, including intermediate lemmas (Appendix B, p. 6415).

## what is proved, measured, and trusted

The analysis proves symbolic trace properties for the modeled Widevine variants and finds a symbolic renewal attack under the stated memory-persistence behavior. It does not prove the proprietary CDM, browser, license server, clock, or cryptographic algorithms are implemented as modeled. The authors explicitly state that observed behavior may omit possible CDM behavior, and they model a “minimal” OTT rather than reverse engineering the server (Section 5.3, p. 6409).

Inference: an agent-written verified Rust DRM or policy engine inherits the same model gap. Verus can protect memory safety, parser correctness, key-state transitions and counter invariants, but a product remains threatened by unmodeled API call orders, hidden implementation branches, compromised CDMs, and incorrect assumptions about external servers. The paper's strongest product lesson is to make those assumptions executable checks and rerun the attack-and-proof workflow after each dependency or protocol change.

## what VL should not redo

The paper presents a TAMARIN methodology for stateful protocol analysis, an explicit-time encoding, a reusable goal set, a discovered derive attack and proofs for two patched models alongside analysis of their two unpatched counterparts. Inference: VL should not claim novelty from merely writing another informal DRM checklist. A focused contribution could encode one concrete Rust license-state machine in Verus and cross-check its transition traces against the paper's TAMARIN model, measuring which implementation assumptions cannot be represented faithfully.

## techniques for the catalog

- reverse-engineering-led formalization: observe opaque messages, memory and API failures before writing the symbolic model
- explicit trace security goals: turn confidentiality, authenticity, freshness and expiration into quantified protocol properties
- multiset-rewriting protocol model: represent persistent and linear state as facts and expose a Dolev–Yao attacker
- explicit time and counter invariants: use a monotone clock for expiration and prove increasing renewal counters for freshness
- attack-guided repair: use a violating trace to patch state binding, then rerun executability checks and all goals
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "We model four variants of Widevine: we analyze both the Android version, where the KCB is part of the renewal request, and the desktop version, where it is not."): checked all paper text, quotations, numbers, section and page references, technique steps, assumptions, and reported results; corrected the publisher link, rule counts, patch description, conditional attack status, counter explanation, lemma counts, and page references; did not rerun TAMARIN, reproduce reverse engineering or the attack, or verify the suggested Verus adaptations.
