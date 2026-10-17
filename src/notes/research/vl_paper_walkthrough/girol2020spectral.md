# A Spectral Analysis of Noise: A Comprehensive, Automated, Formal Analysis of Diffie-Hellman Protocols
(authored by agents unless marked 🧑)
Tag: `girol2020spectral`, [paper](https://www.usenix.org/conference/usenixsecurity20/presentation/girol)

## scope and result

The paper builds a systematic symbolic-verification workflow for every two-way Noise handshake in the specification. Its object is not a single implementation: it models handshake patterns, application payloads, transport messages, adversary capabilities, and four security claims, then computes the strongest threat model (STM) under which each claim holds. The authors use Tamarin as the proof engine and package generation, scheduling, and result comparison in Vacarme. They report 53 two-way patterns for secrecy and agreement and 46 patterns for the more expensive anonymity analysis.

The central method is to separate (1) a claim, such as secrecy or injective agreement, from (2) a threat model, a propositional combination of atomic adversary capabilities. The paper states: “We evaluate claims with respect to a range of threat models, which are modeled by describing the adversary’s capabilities.” (§3.3, p. 1865). A threat-model formula describes exceptions to a claim: the property has the form `trigger ⇒ claim ∨ threat-model formula`. In disjunctive normal form, each STM clause gives a minimal combination of capabilities that can violate the claim. The STM uniquely subsumes every threat model under which the claim is true: “There exists a unique element in T̄1(C) that subsumes all other threat models in T̄1(C). We denote this element by B(C) and call it the Strongest Threat Model (STM) for C.” (Theorem 2, §3.4, p. 1866).

## technique 1: model a Noise pattern and its environment

what it is and when to use it

Represent a handshake by Noise’s compact pre-message/message grammar, then model all relevant application behavior and key-distribution assumptions. Inference: use this when a protocol family has many variants and informal security levels are too coarse. A pattern contains pre-messages (already shared keys), message tokens (`e`, `s`, `es`, `se`, `ss`, `ee`, `psk`), and a direction for each message. The paper’s worked NN example sends an ephemeral key, derives `ee`, and protects the second payload with the resulting key (§2.1.1, Example 1, pp. 1859–1860).

how to do it

1. Encode each Noise pattern and its primitive operations. The model includes Diffie–Hellman, AEAD, hash, and KDF symbols. The paper says, “We model both the case of a prime order group and Curve25519, a primitive recommended by the specification which is of non-prime order and contains a small subgroup, following [11].” (§2.2, p. 1861).
2. For secrecy and agreement, permit unbounded agents and concurrent sessions, with agents able to play both roles. Identify peers by exchanged keys, including PSKs, rather than internal agent labels. (§3.1, pp. 1863–1864.) For anonymity, the paper instead assumes at most one initiator and one recipient, a prime-order DH group, honest PKI and peer static keys, and only active network control, peer static-key reveal, and PSK reveal as adversary capabilities (§3.3.1, p. 1866).
3. Let the adversary choose application payloads and prologues, except a payload whose secrecy is being tested. Model transport messages similarly, adding sequence numbers. (§3.1, p. 1864.)
4. Treat pre-messages and PSKs abstractly: record whether they are authentic, attacker-generated, secret, shared, or public. This covers honest PKI, compromised PKI, pairwise PSKs, group PSKs, and dummy PSKs. (§3.1, p. 1864.)

Verus form

Inference: in Verus, represent the protocol state and transcript as Rust data structures, expose mathematical transition and message rules as `spec fn`, and state state-machine properties with `requires`, `ensures`, and loop invariants. Use proof functions for lemmas about key-state transitions; keep cryptographic primitives abstract through trusted specifications. A transfer would need explicit proofs connecting the Rust model and its security properties to the symbolic model, including observational equivalence for anonymity.

## technique 2: enumerate adversary capabilities and compute STMs

what it is and when to use it

Create atomic capabilities and combine them into threat-model formulas instead of translating prose security levels by hand. Capabilities include active network control, timed or untimed reveals of actor/peer ephemeral and static keys, PSK reveals, dishonest PKI, and dishonest peer key generation (Figure 3, §3.3.1, p. 1865). The claims are secrecy, non-injective agreement, injective agreement, and anonymity (§3.2, pp. 1864–1865).

how to do it

1. Define a claim trigger, the property required at that point, and a threat-model formula. For example, the paper gives secrecy for I1N’s third payload as `Rre ∨ Dre ∨ (Re ∧ Rs)` in STM form (Example 4, §3.4, p. 1866).
2. Define subsumption rules: a reveal-before-claim subsumes an unrestricted reveal; dishonest PKI subsumes dishonest peer static-key generation; dishonest key generation subsumes an active attacker. (Definition 4, §3.3.2, p. 1866.)
3. Enumerate proof obligations as Tamarin lemmas, label each true or false, and compute the unique true threat model that subsumes all other true threat models. Express its formula in disjunctive normal form, with each clause giving a minimal set of attack capabilities (§3.4, pp. 1866–1867).
4. Translate the STM back to prose only after the proof result exists. Their Destination Level 4 example says secrecy holds unless the attacker is active, the recipient’s ephemeral key is adversarially generated, and one of three static-key conditions holds (§5.2, Example 7, p. 1870).

Verus form

Inference: encode a capability set as a ghost/specification value and state each security property as `trigger ⇒ claim ∨ exception`, with the exception expressed by the threat-model formula. Use `requires` for assumptions and `ensures` for the guarantee; prove monotonicity lemmas as `proof fn`. The proof would need to justify how its session model corresponds to the paper’s unbounded-session analysis.

## technique 3: scale automated proofs with sound reductions

what it is and when to use it

Avoid one Tamarin run per claim and every one of the more than 10^12 possible threat models. Vacarme combines static elimination, dynamic subsumption, a DAG of obligations, and a handshake-independent Tamarin oracle (§§3.4–4.1, pp. 1867–1868).

how to do it

1. Quotient threat models by the subsumption equivalence. This reduces 16,384 capability conjunctions to 1,701 (§4.1.1, p. 1867).
2. Remove trivial attacks statically: for example, a fully compromised peer defeats secrecy and agreement, and a key reveal that cannot affect a claim is omitted. The paper reports that this makes more than 99% of obligations immediately false, leaving an average of 63 obligations per remaining claim (§4.1.1, p. 1867).
3. Build a DAG whose edges are proof-obligation subsumptions. If a stronger property is true, weaker properties are true; a counterexample propagates to stronger properties (§4.1.2, p. 1868).
4. Traverse obligations with a heuristic that approximates the expected number of proof obligations saved by each evaluation. This reduces about 410,000 obligations to 150,000 (§4.1.2, p. 1868).
5. Use a sound oracle that delays new identities or sessions until constraints on existing sessions are exhausted. (§4.1.3, p. 1868.)

evidence and limits

The toolchain is described as “push-button: given any Noise handshake, written in the Noise syntax as in Figure 1, or any Noise handshake name from the specification, it returns a table of STMs for all claims and messages.” (§4.2, p. 1868). Secrecy/agreement required 150,000 lemma evaluations, 74 CPU-days, and 75 GB peak RAM for 53 patterns; anonymity for 46 patterns required 97 CPU-days and 125 GB (§4.2, p. 1868). These are symbolic-model results with black-box cryptographic primitives (§2.2, p. 1861). The paper states that Tamarin remains sound with the oracle and is complete for trace properties (§4.1.3, p. 1868); it also notes that automatic analysis may fail to terminate (§2.2, p. 1861). Anonymity analyses were not all completed (§5.4, p. 1872).

## technique 4: compare protocols by STM hierarchy

For a fixed key infrastructure, define system parameters (which roles have static keys, whether keys are pre-shared or transmitted, and PSK availability), then order handshake A above B when every claim and threat model secured by B is also secured by A (§5.1, p. 1869). This exposes redundant deferred patterns and incomparable secrecy/privacy trade-offs. The paper reports that only two deferred patterns were non-redundant among analyzed patterns, while KK and KK1 were incomparable because one favored secrecy/agreement and the other anonymity (§5.1, pp. 1869–1870).

## technique 5: test PSK, dummy-PSK, and anonymity assumptions

The same STM analysis discovers three distinct PFS flavors: compromise of static keys must occur before the session; compromise of the PSK must occur before the session; or both must occur before the session (§5.3.1, p. 1872). The authors also model a public dummy PSK as an immediately revealed PSK and find different agreement and anonymity from the corresponding non-PSK pattern. They state: “Before the first psk or DH token, PSK and non-PSK patterns have a different policy with respect to payload encryption.” (§5.3.2, p. 1872). Early encryption can improve agreement against a passive adversary. In KXpsk2 with a dummy PSK, it breaks initiator anonymity because an attacker can test candidate public keys by reconstructing the associated data and verifying the AEAD (§5.3.2, p. 1872). Separately, revealing the transcript-hash session identifier defeats anonymity even against a passive adversary; applications requiring anonymity must keep it secret (§5.4, p. 1873).

## what is proved, trusted, and relevant to VL

The proved artifacts are symbolic secrecy, agreement, and selected anonymity properties of modeled Noise handshakes (§4.2, p. 1868). Inference: the analysis relies on the symbolic algebra, Tamarin implementation, generated model fidelity, and assumptions about honest actor key generation; these results do not prove a Rust implementation, cryptographic algorithm security, compiler correctness, or application-level requirements. The paper itself notes that Noise Explorer’s generated implementations “are not proven correct or secure.” (§2.3.1, p. 1862.)

Inference: for agent-written verified Rust, the useful transferable idea is STM-driven threat enumeration: make assumptions explicit, prove each property under a named capability set, and preserve a machine-readable hierarchy of guarantees. The threat to VL is high when agents silently choose a threat model or confuse sender and recipient secrecy; it is lower for the Tamarin-specific search engine, which would need a Rust/Verus abstraction and a separate correspondence argument.

## contradictions and work VL should not redo

The paper finds that the Noise levels’ numeric ordering is not monotonic: “a user may upgrade from one handshake to another with a higher Destination Level and, yet, lose security.” (§5.2, p. 1871). It also reports 74 distinct STM classes versus the specification’s nine levels (§5.2, p. 1870); these counts classify different abstractions rather than the same table. Noise Explorer already generated and checked formal models for its claims, and fACCE analyzed eight of 59 handshakes manually (§2.3, pp. 1862–1863). Inference: VL should not repeat those model-comparison or whole-family enumeration tasks without a new Rust/Verus correspondence question.

## techniques for the catalog

- claim/threat separation — express secrecy, agreement, and anonymity separately from compositional adversary capabilities
- strongest threat model — enumerate symbolic proof obligations and summarize all successful cases by one formula that subsumes every successful threat model
- sound proof reduction — use quotienting, static trivial-attack elimination, DAG subsumption, and a sound oracle to reduce Tamarin runs
- protocol hierarchy — compare handshakes by implication over every claim and threat model under fixed system parameters
- PSK/anonymity analysis — model public dummy keys, timed reveals, and session identifiers to expose non-obvious privacy and PFS failures
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "For example, if the adversary completely compromises the peer’s state, then secrecy and agreement properties no longer hold."): checked all quotations, numbers, section/page references, technique steps, title, author/year tag, and paper link; corrected a quotation, claim and proof-graph page references, anonymity restrictions, threat-model semantics, scheduling claims, and unsupported transfer assertions; used the publisher page printed on the paper; did not rerun Vacarme, inspect its source or the technical report, or verify the proposed Verus adaptations.
