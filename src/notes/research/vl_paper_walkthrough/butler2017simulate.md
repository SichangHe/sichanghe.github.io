# How to Simulate It in Isabelle: Towards Formal Proof for Secure Multi-Party Computation
(authored by agents unless marked 🧑)
Tag: `butler2017simulate`, [paper](https://arxiv.org/abs/1805.12482)

## result and scope
Butler, Aspinall, and Gascón formalise simulation-based security proofs for probabilistic MPC protocols in Isabelle/HOL using CryptHOL. The abstract explains that “MPC proofs use a simulation approach, in which security is established by showing indistinguishability between execution traces in the actual protocol execution and an ideal world where security is guaranteed by definition.” (Abstract, p. 1.) They formalise computational indistinguishability, semi-honest simulation, information-theoretic proofs for a trusted-initialiser secure multiplication protocol, for the receiver in Naor–Pinkas OT and for a one-bit trusted-initialiser OT, a DDH reduction for the Naor–Pinkas sender (presented at a "high level view of the pencil and paper", Section 6.1, p. 13), and an OT-based AND protocol. The paper states: "As far as we know, this is the first formalisation of MPC proofs in a theorem prover." (Section 1, p. 2.)

Inference: for VeruLaw, the transferable technique is to make security views explicit probabilistic programs and prove equality or an explicit indistinguishability relation through hybrids. Verus is not a probabilistic cryptography prover, so the Rust mapping below is an inference and needs a probability model or an external theorem prover for cryptographic assumptions.

## technique: shallow probabilistic programs with CryptHOL

What it is. CryptHOL represents a discrete subprobability distribution as `α spmf`, with mass, weight, uniform sampling, `returnspmf`, `bindspmf`, `mapspmf`, and an aborting `assert_spmf`. Probabilistic programs are sequences of monadic operations; the paper says this “gives a shallow embedding for probabilistic programs which we use to define simulations and views, exploiting the monadic do notation.” (Section 2, p. 3.)

How to use it.
1. Choose a value type for the protocol view and a security-parameter type.
2. Write each random draw and computation using `sample_uniform`, `bindspmf`, and `returnspmf`.
3. Use `assert_spmf` for protocol conditions; failed assertions abort the subdistribution.
4. Prove distribution equalities by rewriting monadic expressions and applying map/bind lemmas.
5. Add domain-specific distribution lemmas. The paper proves that an injective and surjective map on `{..<q}` preserves `sample_uniform q` (Lemma 1, p. 4), then derives the maps `y - b`, `y + b` and `y + x·b` modulo `q`, the last needing `x` and `q` coprime (Lemma 2, pp. 4–5).

Inference: steps 1–4 are my reconstruction of how the paper's proofs are built, not a procedure the paper states.

Verus form. Inference: model random choices as an abstract `spec fn` distribution or a finite support ghost map, and model protocol views as mathematical sequences. Verus can prove deterministic algebraic relations and permutation properties, but it does not provide CryptHOL's probability monad or negligible-function library. A production proof should keep the executable RNG outside the trusted Verus model and connect it to a separately verified distribution theorem.

Trust and limits. The paper builds on CryptHOL (Section 2) and, for polynomial-time distinguishers, “will assume a family of constants giving us the set of all polynomial-time distinguishers for every type ν” (Section 3, p. 5); it says “We do not formalise a notion of polynomial-time programs in Isabelle” (Section 3, p. 5). Inference: the shallow embedding avoids formalising a programming-language semantics; the paper only says a deep embedding with a semantics and complexity measure could do so “in principle”.

## technique: define computational indistinguishability and simulation security

What it is. A probability ensemble is a family of random variables indexed by an input `a` and a security parameter `n` (Definition 1; Isabelle type `(α, ν) ensemble = α ⇒ nat ⇒ ν spmf`, p. 5). Two ensembles are computationally indistinguishable when every polynomial-time distinguisher has negligible probability gap. The paper defines: “Two ensembles X and Y are said to be computationally indistinguishable … if for every non-uniform polynomial-time algorithm D there exists a negligible function ε such that for every a and every n” the distinguishing gap is at most ε(n) (Definition 1, Section 3, p. 5).

A two-party protocol has functionality `f = (f1,f2)` and real views containing input, local randomness, and received messages. Semi-honest security requires simulators whose input is only the party's input and output: “A protocol π is said to securely compute f in the presence of a semi-honest adversary if there exist probabilistic polynomial time algorithms (simulators) S1, S2” satisfying indistinguishability of simulated and real views, each paired with the joint functionality output (Definition 3, Section 4, p. 7). The simulator also receives the security parameter in unary, `1^n`.

How to apply it.
1. Define the functionality and each party's output distribution.
2. Define real views from the protocol's random draws and received messages.
3. Define a simulator from only the corrupted party's input, that party's functionality output, and the security parameter.
4. State indistinguishability for each party; for deterministic protocols the paper relaxes Definition 3 to correctness plus view-only indistinguishability (Equations 5 and 6, Section 4, p. 7), and says it will “explicitly show Equations 5 and 6 and assume correctness”.
5. For information-theoretic security, prove distribution equality; the paper says “Information theoretic security is a stronger notion of security than computational indistinguishability and Isabelle proves the former implies the latter with ease” (Section 4, p. 7).

Verus form. Inference: encode functionality and views as ghost mathematical records and prove an observational relation for every allowed adversary input. Use `ensures` for deterministic output correctness. A negligible probability bound cannot be represented by an ordinary Boolean postcondition; it needs a ghost asymptotic model and assumptions about adversary classes, so a Verus-only claim should be explicitly limited to algebraic or finite-distribution properties.

## technique: hybrid sequence for simulation proofs

What it is. Instead of equating real and simulated views in one step, construct intermediate probabilistic programs `(Ri,Si)` and prove adjacent equality or indistinguishability. The paper calls this “the hybrid argument in cryptography” (Section 4.1, p. 8) and proves transitivity of computational indistinguishability: “Let X, Y and Z be probability ensembles then we have” that `X ≡c Y` and `Y ≡c Z` imply `X ≡c Z` (Lemma 3, p. 8).

How to do it.
1. Start with the real view `R1` and simulator `S1`.
2. Identify one algebraic or cryptographic change that makes the next pair equivalent.
3. Define `R2,S2`, preserving all unchanged components.
4. Prove each adjacent pair equal for information-theoretic steps or indistinguishable under an assumption.
5. Compose the chain using transitivity until the final simulator has only permitted inputs.

Verus form. Inference: represent each hybrid as a separate ghost function and prove an observational equivalence lemma between successive functions. Mark any computational-hardness step as an assumption supplied to the proof, rather than hiding it inside an `ensures` clause. This mirrors Verus's explicit contracts but does not supply cryptographic probability automation.

## technique: information-theoretic secure multiplication with preprocessing

The protocol works over a prime field `Zq` with a trusted initializer sampling `a,b,r` and distributing `(c1,d1)=(a,r)` to party one and `(c2,d2)=(b,a·b−r)` to party two (Figure 2, p. 9). Party one sends `e2=x+c1`; party two sends `e1=y−c2`; outputs are `s1=x·e1−d1` and `s2=e2·c2−d2` modulo `q`.

This is a non-deterministic functionality, so the views include the functionality outputs and the paper must show exactly the property of Definition 3 (Section 4, p. 7). To prove it, define simulator `S1` and real view `R1` as CryptHOL programs (Figure 3, p. 10), then show `S1 x y = R1 x y` for all inputs (Lemma 4, p. 10), through a series of small equality steps between intermediate programs (Section 5.1, p. 9). Repeat for party two (Lemma 5, p. 10). The theorem states: “The protocol in Fig. 2 securely computes the functionality given in Equation 4 in the semi-honest adversary model.” (Theorem 1, Section 5, p. 9.)

Verus form. Inference: Verus can verify the modular algebra and share invariant with `requires`/`ensures`, but trusted preprocessing and random uniformity must be modelled as explicit assumptions. Do not claim information-theoretic privacy from deterministic arithmetic proofs alone.

## technique: Naor–Pinkas OT with case split and DDH reduction

The protocol uses a cyclic group of prime order `q`. The receiver's view is information-theoretically simulatable; the sender's security reduces to DDH. First simplify the DDH random self-reduction into separate triple and non-triple distributions (Lemmas 6–7, p. 11). Use `assert_spmf` to enforce `z0 ≠ z1`, ensuring one ciphertext is decryptable and the other is not (Section 6.1, p. 12). For receiver security, rewrite real views using Lemmas 6–7 and apply a CryptHOL lemma that multiplying a uniform exponent's power by a fixed group element leaves the distribution unchanged, to show `S2 v = R2(m0,m1,v)` (Lemma 8, p. 12). For the sender with `v = 0` the views are built identically (Lemma 9, p. 13). For sender security with `v = 1`, reduce in two steps via an intermediate tuple `(g^a,g^b,g^c,g^d)`, build two DDH adversaries (the paper spells out Adv1 and calls Adv2 “analogous”), and bound the distinguisher gap by the sum of two DDH advantages (Lemma 10, p. 13).

The theorem is: “The protocol defined in Fig. 4 securely computes a 1-out-of-2 OT in the semi-honest adversary model.” (Theorem 2, Section 6, p. 11.) The DDH advantage is explicitly defined as the difference of probabilities for `(g^a,g^b,g^{ab})` and `(g^a,g^b,g^c)` with uniform `a,b,c` (Definition 4, p. 13).

Verus form. Inference: verify group equations, branch conditions, and view-shape invariants in Verus; state DDH indistinguishability as an external axiom or imported theorem with the exact group and sampling assumptions. The proof must keep the sender's computational assumption distinct from the receiver's equality proof.

## technique: lift OT to an AND protocol

The paper defines a one-bit OT in which a trusted initialiser gives party one random `r0, r1` and party two a random `d` with `rd` (Figure 6, p. 14), and proves both party views equal their simulators (Lemma 11, Section 7, p. 14). In the AND protocol, party A samples `u`, sets `(m0,m1)=(¬u,a⊕¬u)`, sends them through OT using party B's choice `b`, and outputs `u`; B outputs the received `mb` (Figure 7, p. 15). The paper says “Each party outputs an additive share of the desired AND gate output”. Inference: reading the shares as XOR, the masks as printed give `u ⊕ mb` equal to 1 for `b = 0` and to `¬a` for `b = 1`, which is not `a ∧ b`; Figure 7 may contain a typo, and I did not resolve this. The paper shows the simulator for A only (Figure 8) and says B's is “constructed in an analogous way”. Security follows by reusing Lemma 11: “Information theoretic security for the AND gate protocol is shown by the equalities RA a b = SA a and RB a b = SB b.” (Lemma 12, p. 15.)

Verus form. Inference: this is a compositional proof pattern for verified Rust protocols: prove a primitive's simulation relation once, then instantiate it in a higher-level protocol and discharge only the new algebraic relation. The trusted initializer and random-bit distribution remain assumptions. The paper notes the trusted initialiser could be replaced by Naor–Pinkas OT, but that needs OT over a ring (addition and multiplication) and an extension of Isabelle's ring theory, left as future work (Section 7, p. 15).

## what is proved, measured, and trusted

The paper proves distribution equalities and a DDH-based bound on distinguishing advantage in Isabelle/HOL. It does not prove correctness of the deterministic protocols: it says it will “assume correctness” (Section 4, p. 7). It reports no runtime benchmark, proof-time denominator, or probability measurements from experiments; all quantitative claims are symbolic (`q`, negligible `ε`, and DDH advantage). Trusted components include Isabelle/HOL, CryptHOL's shallow semantics, the assumed family of polynomial-time distinguishers, the trusted initialiser in the secure multiplication protocol and the one-bit OT, and the DDH assumption for Naor–Pinkas sender security. The paper does not formalise malicious adversaries; its definitions and theorems use the semi-honest model.

Inference: threat to agent-written verified Rust is high for cryptographic privacy claims unless the probability model and assumptions are explicit. Verus can help prove implementation algebra and memory safety, but a successful deterministic proof does not establish simulation security, negligible advantage, correct randomness, or a sound DDH reduction. The paper already supplies a reusable hybrid and simulator methodology; VL should not redo a generic simulation proof without a new protocol or a verified Rust probability boundary.

## techniques for the catalog

- shallow probabilistic embedding — model random programs as subprobability monads and prove distribution equalities with reusable lemmas
- simulation-based security — define real views, ideal functionality, and simulators from only permitted inputs
- hybrid argument — connect real and simulated programs through adjacent equality or indistinguishability steps
- uniform-masking lemmas — prove bijective transformations preserve uniform distributions and reuse them in protocol proofs
- assumption-separated protocol composition — isolate information-theoretic steps, trusted preprocessing, and DDH-based reductions before composing higher-level protocols
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Intuitively, security results from the messages being sent in the protocol always being masked by some randomness."): I read the whole paper text (arXiv v1, pp. 1-17) and the whole study, and checked every quotation, figure/lemma/theorem/definition reference and page number, the protocol descriptions (Figures 2, 4, 6, 7), and the technique steps. I changed: the link to the arXiv page given in the paper text (the old DOI link is not in the paper text, so it is unverified here; the tag year 2017 is also not shown by the paper text, which carries an arXiv 2018 stamp); the Lemma 3 and Definition 1 quotations; two page references (Lemmas 6-7 are on p. 11, Lemma 8 on p. 12, Lemma 2 spans pp. 4-5); removed the unsupported claim that correctness is proved (the paper assumes it) and the claim that the shallow embedding avoids operational semantics, now marked Inference; added that the DDH sender reduction is described at pencil-and-paper level, the Lemma 9 case, the Figure 7 XOR-share inconsistency (my own hand computation, marked Inference), and reworded my own headings to avoid the term for the AND protocol. I did not check the Verus mapping paragraphs (Inference), the external claims about CryptHOL beyond this paper, the Isabelle sources, or the cited references; I could not check the original Springer pagination (the pages cited are the arXiv pages).
