# Language-Based Security for Low-Level MPC
(authored by agents unless marked 🧑)
Tag: `skalka2024lowlevel`, [paper](http://arxiv.org/abs/2407.16504v1)

## what the paper proves or measures

Skalka and Near present Overture, a language for synchronous finite-field MPC protocols, and Prelude, a metalanguage that generates Overture programs. Their methodology combines automatic verification of small binary-field primitives with partially automated proofs for larger protocols. Section 1.1 states: “The complete methodology enables the verification of real-world MPC protocols like GMW.” (p. 2). Examples include three-party Shamir addition, two-party GMW Boolean circuits, and two-party BDOZ-authenticated Beaver multiplication. The paper identifies itself as arXiv:2407.16504v1, dated 23 July 2024 (p. 1), supporting the link above.

The results include semantic lemmas, exact truth-table/Datalog correspondence, implications between security properties, and a compositional argument for GMW noninterference modulo output. The BDOZ discussion models preprocessing and authentication and relates cheating detection to integrity. There are no reported runtime measurements, benchmark counts, or implementation experiments. Proof-assistant integration is future work: “To support better verification, integration of our tactics with a proof assistant is a compelling direction that resonate with previous work [22].” (Section 8, p. 13).

Inference: these are results about protocol models. Applying them to executable Rust/Verus networking and cryptography would require a separate argument that the implementation follows the model. The paper does not supply that argument.

## technique 1: model low-level protocols in Overture

what it is: Overture represents protocols as assignment sequences over a prime finite field `F_p`. Variables distinguish secrets `s[w]@i`, random inputs `r[w]@i`, received messages `m[w]@i`, public reveals `p[w]`, and outputs `out@i`. The three initial command forms send a message, broadcast a public value, and record a local output (Sections 2.1–2.2, pp. 3–4). Section 3.5 adds assertions and abort for malicious execution (p. 6).

when to use: the language models synchronous finite-field protocols with a statically given federation of clients. Honest and corrupt clients form a partition of that federation. The semantics uses a uniformly sampled random tape; execution is deterministic once the initial memory is fixed. The authors state: “Concurrency is out of scope in this work but an avenue for future work.” (Section 2, p. 3).

how to do it:

1. Choose the prime field and static federation; identify honest `H` and corrupt `C` for the security property being checked (Section 2, p. 3)
2. Declare secret and random inputs, then encode message sends, public reveals, and local outputs as assignments (Section 2.1, p. 3)
3. Use memories that retain inputs and every assigned value; assignment extends memory rather than overwriting an existing variable (Definition 2.2, p. 4)
4. Describe any preprocessing constraints on initial memories and define `runs(π)` as the resulting final memories (Definition 3.5, p. 5)
5. Specify the ideal functionality and compare the protocol's outputs and views with its security policy (Sections 3.4–3.5, pp. 5–6)

example: the three-party addition protocol has each client choose `r[local]` and another random value `r[x]`, retain the first as its local share, and send the other two shares. Each client then reveals the sum of its shares. Finally, all clients output the sum of the three reveals (Section 2.3, p. 4). The paper explicitly distinguishes the sharing phase from the revealing phase: “This step does reveal information about secrets” (p. 4). It notes that `r[local]` is reused at reveal, so it is no longer a one-time pad.

Verus form: Inference: represent field values and protocol memories with Rust data and ghost projections for messages, reveals, and outputs. State field identities and view relations in specifications and proof functions. A specification for synchronous execution and uniform randomness would need to be related explicitly to the actual scheduler and randomness API.

evidence and limits: the syntax supports general prime fields, while the automated analysis in Section 5 is restricted to `F2`. Concurrency and universal composability are future directions (Section 8, p. 13). Inference: neither a model proof nor a local Rust contract alone establishes the behavior of an unmodeled network implementation.

## technique 2: express security as probabilistic hyperproperties

what it is: the authors use joint probability mass functions (pmfs), marginalization, and conditioning to express relations among secrets, messages, reveals, and outputs. Definition 3.5 assigns equal probability to each admitted complete run; by default, secret inputs and random tapes are uniform. A preprocessing predicate can restrict initial memories (Sections 3.1–3.2, pp. 4–5). Uniformity is part of this distribution definition, rather than a consequence of deterministic execution alone.

when to use: these properties permit outputs to reveal a specified function of secrets. Passive security compares real corrupt views with a simulator that receives corrupt inputs and ideal outputs. Malicious security additionally permits adversarial rewriting of corrupt computations and abort (Sections 3.4–3.5, pp. 5–6).

how to do it:

1. Construct `BD(π)` from admitted initial memories and complete runs (Definition 3.5, p. 5)
2. Distinguish corrupt views, sent from honest to corrupt clients, from honest views, sent from corrupt to honest clients; include public broadcasts by the relevant senders (Definition 3.6, p. 5)
3. Check passive correctness: the ideal output occurs with probability one for each input (Definition 3.7, p. 5)
4. State noninterference modulo output: conditioning on corrupt views adds no information about honest secrets beyond corrupt inputs and outputs (Definition 4.1, p. 6)
5. To derive passive security via Theorem 4.3, establish correctness and the paper's assumption that the ideal functionality is pre-imageable, meaning its sets of inputs producing given outputs can be computed tractably (Definition 4.2 and Theorem 4.3, p. 7)
6. For malicious execution, add adversarial rewriting and assertions; pad unexecuted views and outputs with `⊥` after abort (Definitions 3.10–3.11, p. 6)
7. Establish integrity, which requires adversarial behavior to match a passive input choice in the specified conditional distributions, up to abort (Definition 4.6, p. 7)

The central implication is explicit: “If a protocol is passive secure and has integrity, then it is malicious secure.” (Theorem 4.8, p. 7). Gradual release requires corrupt messages to be independent of honest secrets; robust declassification combines gradual release with integrity. These properties alone do not enforce the ideal functionality's release bounds. Theorem 4.10 states that robust declassification does not imply malicious security, while passive security together with robust declassification does (Section 4.3, p. 7).

Verus form: Inference: finite memories and exact probability relations could be represented as ghost data and pure specification functions. A translation would need proofs for conditioning and marginalization, rather than treating security as a predicate with no established connection to execution. The paper provides no Verus encoding.

evidence and limits: passive-security soundness has explicit correctness and pre-imageability assumptions. The malicious model uses a rewrite function and abort; it does not model arbitrary concurrent network behavior. These are semantic implications, not empirical measurements of deployed MPC.

## technique 3: compute exact pmfs by truth tables and stratified Datalog

what it is: in `F2`, `models Σ ε i` filters candidate memories to those where expression `ε`, evaluated by client `i`, is one. Folding assignment transformers over all initial memories computes `runs(π)` exactly (Lemmas 5.1–5.2, p. 8). A second construction translates assignments into stratified Datalog and computes a least Herbrand model for each input fact base (Section 5.2, p. 8).

when to use: exact enumeration is intended for small Boolean primitives. The authors warn: “Since runs(π) is exponential in the size of secrets(π) ∪ rands(π), this strategy is feasible only for smaller protocols.” (Section 5, p. 7). Datalog permits parallel computation over independent input fact bases. It does not remove the exponential number of input combinations. The conversion is described for passive protocols without assertions (p. 7).

how to do it:

1. Recursively evaluate the `models` filter for Boolean expressions using set operations (Figure 4 and Section 5.1, p. 8)
2. For each assignment, extend satisfying memories with output one and the complement with output zero; fold over the assignment sequence (Lemma 5.2, p. 8)
3. For Datalog conversion, compute the satisfying memories for each assignment's expression and turn each into a conjunction of positive or negated variable literals (Definitions 5.3–5.4, p. 8)
4. Supply facts for the variables equal to one in a chosen secret/random input memory (Definition 5.5, p. 8)
5. Compute its unique least Herbrand model; repeat over all secret/random memories, potentially in parallel. Lemma 5.6 relates these models exactly to `runs(π)` (p. 8)
6. Query the resulting runs through marginalization and conditioning to check passive correctness and security properties (Section 5.2, p. 8)

The authors report using this method for Shamir addition in `F2`, individual AND and XOR computations, and compositional circuit properties (Section 5.2, p. 8). Section 7 gives the GMW library with abstract oblivious transfer. It states: “Critically, the sender learns nothing about ε₁ and the receiver learns nothing about the unselected value” (p. 10). The implementation of oblivious transfer itself is abstracted there.

Verus form: Inference: a finite Boolean model could expose the enumeration and assignment transformer as specification functions. A proof would need to relate the computed runs to executable state. An external Datalog engine would need either a correctness argument or independently checked results before its answers could support an implementation theorem.

evidence and limits: the paper proposes HPC acceleration but reports no timings or scalability measurements. Generalizing automated analysis from `F2` to larger arithmetic fields is future work (Section 8, p. 13).

## technique 4: compose local circuit proofs and authenticate BDOZ shares

what it is: Prelude adds functions, records, identifiers, and expression construction. Evaluation accumulates a residual Overture program, allowing a library to generate complete circuits (Section 6, p. 9). For two-party GMW, the library splits inputs into additive Boolean shares, computes XOR locally and AND via one-of-four oblivious transfer, and reveals final shares during decoding (Figure 6, p. 10).

how to do it:

1. Give circuit outputs unique identifiers and construct a sequence of Prelude bindings followed by decoding (Section 7, p. 10)
2. Establish the circuit invariant: reconstructed intermediate values are deterministic given secrets, corrupt messages are conditionally uniform, and reconstructed values satisfy the stated conditional independence from their share pairs (Lemma 7.3, p. 10)
3. Automatically prove the local AND conditions: conditional determinism of the reconstructed output, conditional uniformity of each output share, and conditional independence of the reconstructed output from its share pair, given reconstructed inputs (Lemma 7.4, p. 11)
4. Use the conditioning lemmas for determinism, uniformity, and independence to combine local results by induction over Prelude evaluation (Lemma 7.5 and proof of Lemma 7.3, p. 11)
5. Reason about the final public reveals to obtain noninterference modulo output for the generated GMW circuit (Theorem 7.6, p. 11)
6. For BDOZ multiplication, impose preprocessing constraints on shares, MACs, keys, and a Beaver triple whose reconstructed values satisfy `a*b=c` (Definition 7.7, p. 12)
7. Locally form masked sums and their authentication data, open and authenticate them on honest client 1, compute product shares, and authenticate client 2's revealed product share before client 1 outputs (Figures 7–8 and Section 7.2, pp. 11–12)

For BDOZ, each client holds a share and its MAC; the other client holds the authentication key. Per-share keys are distinct, while the authentication multiplier is shared across MACs checked by the same client (Section 7.2, pp. 11–12). The shown multiplication assumes trusted client 1. The authors state: “The authentication scheme can also be run symmetrically on client 2.” (p. 12).

Verus form: Inference: express local share and distribution properties as specifications, then prove composition by induction over the circuit representation. Authentication must correspond to executable checks and an explicit failure path. A Rust assertion or proof of field algebra alone would not supply the probabilistic secrecy assumptions used by the protocol model.

evidence and limits: Theorem 7.6 concludes noninterference modulo output. It should be combined with the assumptions of Theorem 4.3 when invoking that theorem to derive passive security. Section 7.3 discusses cheating detection and integrity for BDOZ; it does not provide a benchmark or a machine-checked implementation proof.

## trusted boundary, contradictions, and product threat

The paper contains inconsistent wording about cheating detection. Section 1.1 calls it a “strictly weaker property” (p. 2), while Section 7.3 calls it “a stronger property” (p. 12). The formal direction is: “If cheating is detectable in π, then π has integrity.” (Lemma 7.10, p. 12). Inference: the study should use this stated implication, without asserting the reverse implication or strictness. BDOZ security is argued using preprocessing and information-theoretic authentication assumptions (Section 7.3, p. 12).

Inference: the implementation trust boundary would include the encoding of finite-field arithmetic and probability, the correctness of the analysis engine, the realization of preprocessing and oblivious transfer, and the relation between executable behavior and the protocol semantics. VL could reuse the explicit views and compositional proof structure, but would still need to justify randomness, permitted disclosures, authentication, and abort behavior in its Rust/Verus contracts. A proof about weakened contracts would not establish the protocol's stated security policy.

## techniques for the catalog

- Overture protocol modeling — encode synchronous finite-field messages, reveals, outputs, and explicit random tapes
- pmf security properties — relate passive and malicious MPC security to conditional distributions, integrity, and permitted disclosures
- truth-table and Datalog execution — compute exact Boolean runs and parallelize independent input fact bases
- compositional circuit proofs — combine local determinism, uniformity, and independence facts into circuit noninterference
- BDOZ authentication — model preprocessing and verify opened shares with MAC checks and abort

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "In addition to converting view deﬁnitions to logic clauses, we also need to convert secrets and random tapes."): checked all paper text, study quotations, technique steps, theorem assumptions, and page and section references; corrected the cheating-detection implication, missing passive-security assumptions, distribution explanation, GMW proof descriptions, and page references; did not independently reprove the theorems, run the authors' analysis implementation, or validate Rust/Verus adaptations.
