# Language-Based Security for Low-Level MPC
(authored by agents unless marked 🧑)
Tag: `skalka2024lowlevel`, [paper](http://arxiv.org/abs/2407.16504v1)

## what the paper proves or measures

Skalka and Near present a language-and-analysis stack for low-level secure multiparty computation (MPC). Overture is a small probabilistic protocol language over a finite field; Prelude is a metalanguage that generates composable Overture code. The paper's central claim is an end-to-end methodology with “(1) A low-level language for defining MPC primitives (Section 2) with an associated metalanguage to ease programming (Section 6). (2) A fully-automated verification method for low-level MPC primitives in F2 (Section 5). (3) A partially-automated verification method for MPC protocols, which leverages automated proofs for low-level primitives (Section 7).” (Section 1.1, p. 2). It instantiates the method on Shamir addition, GMW Boolean circuits, and BDOZ-authenticated Beaver multiplication.

The paper proves semantic lemmas about the language, the correspondence between truth-table and Datalog execution, hyperproperty implications, and GMW/BDOZ protocol properties. It does not report a benchmark denominator or wall-clock evaluation in the extracted text. The verified artifacts are protocol models and their properties; the trust boundary includes the semantics, finite-field arithmetic, the Datalog/least-Herbrand-model implementation, and the correctness of the encoded protocol. Inference: a Rust/Verus implementation would need an explicit refinement argument from real network/cryptographic code to this model before these model theorems establish product security.

## technique 1: model low-level protocols in Overture

what it is: Overture represents synchronous protocols as assignment sequences over a finite field `F_p`. Variables distinguish secrets `s[w]@i`, random tapes `r[w]@i`, messages `m[w]@i`, public reveals `p[w]`, and outputs `out@i`; commands are message sends, public broadcasts, and outputs. The authors deliberately omit concurrency and complex control: “The lack of sophisticated control structures in Overture is intentional, since minimizing features eases analysis and control abstractions such as function definitions can be integrated into a metalanguage that generates Overture programs.” (Section 2, p. 3).

when to use: use it for synchronous, finite-field protocols whose security can be stated over complete message/reveal views. The threat model statically partitions clients into honest and corrupt sets; randomness is an explicit uniform tape and execution is deterministic once the tape is fixed.

how to do it:

1. Choose the finite field and static federation and partition clients into honest `H` and corrupt `C` (Section 2, p. 3)
2. Declare secret and random input variables and use the three command forms for messages, public reveals, and outputs (Sections 2.1–2.2, pp. 3–4)
3. Execute the small-step semantics on memories that record all inputs and views; define `runs(π)` as the possible final memories (Section 3.2, p. 5)
4. Encode the intended ideal functionality and compare protocol outputs and corrupt views against it (Sections 3.4–3.5, pp. 5–6)

example: for three-party Shamir addition, each client samples `r[local]`, sends one-time-pad shares, publicly reveals sums, and outputs the sum of the three reveals (Section 2.3, p. 4). The paper says, “This scheme guarantees that messages are viewed as random noise by any observer besides ι.” (Section 2.3, p. 4).

Verus form: Inference: represent field values and protocol state as Rust structs with ghost views for messages and public reveals. Put protocol preconditions and postconditions in `requires` and `ensures`; use loop `invariant` clauses for repeated rounds and `proof fn` lemmas for field algebra and view relations. Overture's syntax, synchronous scheduler, and explicit random tape do not carry over automatically to Rust networking or cryptographic APIs; each API needs a contract and a refinement proof.

evidence and limits: Overture's semantics is exact for the modeled finite-field, synchronous programs. Concurrency is explicitly out of scope (Section 2, p. 3). The one-time-pad example assumes uniform fresh randomness; reuse of `r[local]` during reveal is accounted for as deliberate declassification. Inference: failing those assumptions invalidates the security conclusion even if the Overture proof succeeds.

## technique 2: express security as probabilistic hyperproperties

what it is: the authors define a joint probability mass function (pmf) over complete memories, then use marginal and conditional distributions to state passive correctness/security, malicious simulation, conditional noninterference, gradual release, declassification, robust declassification, and integrity. The basic distribution is uniform over `runs(π)` because protocol execution is deterministic given secrets and random tape (Section 3.2, p. 5).

when to use: use this when outputs necessarily reveal a permitted function of secrets and ordinary noninterference would be too strong. Passive security compares the distribution of corrupt views in the real protocol with a simulator given corrupt inputs and ideal output; malicious security adds adversarial rewriting and abort.

how to do it:

1. Define `runs(π)` from all secret and random memories satisfying preprocessing, and set `BD(π)(σ) = 1/|runs(π)|` for runs (Section 3.2, p. 5)
2. Project complete memories to honest/corrupt views and define marginals and conditional pmfs (Sections 3.1–3.3, pp. 4–5)
3. State passive correctness as ideal output with probability one and passive security as equality between simulator and real corrupt-view distributions (Section 3.4, p. 5)
4. For malicious security, add an adversary that rewrites corrupt expressions and model failed assertions as `⊥` abort memories (Section 3.5, pp. 6–7)
5. State information-flow properties conditioned on allowed outputs; pair passive security with integrity properties to derive malicious security (Section 4, pp. 7–8)

The paper's key result is that probabilistic conditional noninterference is sound for passive security, while a new integrity property paired with passive security implies malicious security (Section 1.1, p. 2). It also shows BDOZ/SPDZ-style MACs establish the weaker property “cheating detection,” which implies integrity (Lemma 7.10, pp. 12–13).

Verus form: Inference: define pure `spec fn` predicates for view projections, marginal/conditional relations, and allowed declassification; state local preservation with `ensures` and prove algebraic lemmas with `proof fn`. Verus's SMT logic does not provide a probabilistic pmf library equivalent to the paper, so a finite model, ghost maps, or externally verified probability kernel is needed. `spec fn` remains pure; executable code must not be replaced by an unproved model.

evidence and limits: The theorems are semantic implications over finite distributions, not measurements on deployed MPC. The model assumes a static federation and finite field, and malicious behavior is represented by a rewrite function plus abort. Inference: cryptographic assumptions (uniform randomness, MAC secrecy, and field operations) remain trusted unless separately formalized.

## technique 3: compute exact pmfs by truth tables and stratifed Datalog

what it is: for protocols over `F2`, the paper computes exact runs by filtering sets of memories with `models Σ ε i`, then folds assignment commands. To scale, it converts each command to stratified Datalog clauses; a least Herbrand model for each secret/random fact base yields exactly the protocol runs. The correctness statement is explicit: “For all π, datalog(π) is a normal, stratified program [7], and σ is the unique Least Herbrand Model of: (facts(σsecrets(π)∪rands(π)), datalog(π)) iff σ ∈ runs(π).” (Lemma 5.6, p. 8).

when to use: use exact truth tables for small primitives and Datalog/HPC parallelization when the protocol's state space is large but finite and Boolean.

how to do it:

1. For an expression, filter a candidate memory set with the recursive `models` operation (Section 5.1, p. 8)
2. For each assignment `x := ε@i`, set `x` to one on models satisfying `ε` and to zero on the complement; fold this transformer over the protocol (Lemma 5.2, p. 8)
3. Convert each assignment to a Datalog body and each possible memory to a conjunction of positive/negative literals (Section 5.2, p. 8)
4. Add secret/random facts for one initial memory, compute the unique least Herbrand model, and repeat over all fact bases; distinct bases can be computed in parallel (Section 5.2, p. 8)
5. Query the resulting `runs(π)` with marginalization/conditioning implementations to check the hyperproperties (Section 5.2, p. 8)

Verus form: Inference: encode a bounded finite-field model with ghost maps or sequences, write a `spec fn` for `models`, and prove each assignment transformer preserves the relation between the abstract memory and executable protocol state. The Datalog solver is not a Verus construct; a Verus proof can check a finite certificate or a refinement lemma, while solver execution remains an external trusted component unless its results are independently checked.

evidence and limits: the approach is “perfectly accurate but has high complexity” (Section 1.1, p. 2). Datalog permits parallel least-model computation, but the paper gives no runtime, instance count, or denominator. It applies directly to `F2`; arbitrary fields require the paper's more general semantics but not necessarily the same Boolean Datalog encoding.

## technique 4: compositional gate tactics for GMW and BDOZ

what it is: prove local invariants for each circuit gate, then compose them by induction over Prelude evaluation. For GMW, each gate preserves distribution of the reconstructed value, uniformity of each party's share, and the relation between reconstructed value and shares (Lemma 7.4, p. 10). Conditioning lemmas transfer distribution, uniformity, and independence facts from inputs to outputs (Lemma 7.5, p. 11). Theorem 7.6 concludes noninterference modulo output for arbitrary GMW circuits (pp. 11–12).

how to do it:

1. Define Prelude functions for gate construction and a decoder that maps shared messages to reconstructed values (Section 7, pp. 9–10)
2. Prove the base invariant for inputs and the local `And Gate Tactic` conditions for every gate (Lemma 7.4, p. 10)
3. Induct over the small-step evaluation of the generated protocol; use conditioning-composition lemmas to combine the two input invariants (Lemma 7.5 and proof of Lemma 7.3, pp. 10–11)
4. At output, show public reveals expose only the allowed reconstructed value and apply Theorem 7.6 (p. 12)
5. For BDOZ, encode preprocessing for shares, MACs, keys, and Beaver triples, then authenticate opened shares with `assert` (Section 7.2, pp. 12–13)

Verus form: Inference: represent each gate's share invariant as a `spec fn`; give a verified Rust gate function an `ensures` relating input and output ghost shares, and prove composition with `proof fn` induction over a circuit AST. Use `assert` for local field identities and loop `invariant` for gate traversal. Authentication checks should be executable predicates with explicit failure postconditions, not `external_body` on the verified function.

evidence and limits: Theorem 7.6 is a model theorem for Prelude-generated GMW circuits. BDOZ's result assumes a trusted client in the shown multiplication and claims symmetry can authenticate either party; it relies on information-theoretic MAC assumptions. The authors explicitly note that “The authentication scheme can also be run symmetrically on client 2.” (Section 7.2, p. 13). Inference: this is a protocol-design and proof pattern, not evidence that an unmodeled Rust implementation has the same security.

## trusted boundary, contradictions, and product threat

What is proved: the paper proves Overture operational facts, exact truth-table/Datalog correspondence, hyperproperty implications, local GMW gate invariants, arbitrary-circuit noninterference modulo output, and BDOZ cheating-detection/integrity lemmas. What remains trusted includes the finite-field and probability model, the Datalog engine and least-model computation, cryptographic preprocessing assumptions, and the refinement from implementation to protocol model. No experimental denominator or runtime number is supplied, so claims of automation are qualitative.

Inference: VL should reuse the paper's small-kernel language design, explicit views, compositional gate contracts, and separation between passive confidentiality and active integrity. VL should not redo generic observations that local primitives can compose; it should test whether a Rust/Verus implementation's contracts are complete and whether its network/cryptographic boundary refines the modeled protocol. The threat to agent-written verified Rust is high when the agent silently weakens declassification, randomness, abort, or MAC assumptions, even if Verus proves the resulting local contracts.

## techniques for the catalog

- Overture protocol modeling — encode synchronous finite-field messages, reveals, outputs, and random tapes in a minimal language
- pmf hyperproperty security — state passive/malicious MPC security and declassification as marginal and conditional distribution relations
- truth-table and Datalog execution — compute exact finite protocol runs and scale least-model evaluation over independent fact bases
- compositional gate tactics — prove local share/distribution invariants and compose them into whole-circuit security
- BDOZ cheating detection — authenticate Beaver-shared values with MAC checks so malformed corrupt messages abort
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
