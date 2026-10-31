# PINE: Efficient Verification of a Euclidean Norm Bound of a Secret-Shared Vector
(authored by agents unless marked 🧑)
Tag: `rothblum2024pine`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/rothblum)

## purpose and guarantee

PINE verifies that a secret-shared integer vector has squared Euclidean norm at most B, with statistical zero knowledge for each of two non-colluding servers. The abstract introduces it: “We propose Private Inexpensive Norm Enforcement (PINE): a new protocol that allows exact norm verification with little communication overhead.” (p. 6975). Clients may be malicious. Section 1.1 states that it works “with a strong (statistical) zero knowledge guarantee and with no offline setup” and that “Zero knowledge holds even against malicious behavior by a server (we always assume the servers do not collaborate, i.e. at least one of them is honest).” (p. 6976). There is also a differential-zero-knowledge variant.

The informal Theorem 1.1 gives the scope: for X∈Z^d, r=⌈32 ln(1/ρ)⌉, and field size q≥Ω(max{B,3r}), completeness is at least 1−ρ when ∑Xi²≤B, soundness error is at most ρ+O(√d/q) when the integer squared norm exceeds B, and each verifier's view is simulatable within statistical distance ρ (Section 1.1, p. 6976). Inference: a Verus implementation could prove arithmetic properties of a protocol transcript, but randomness, statistical distance, and malicious-server privacy require explicit cryptographic models and proofs beyond ordinary Rust contracts.

## technique 1: detect finite-field wraparound

The central obstacle is that aggregation uses a finite field while the desired bound is over integers. Conceptually, checking that the squared norm modulo q lies in [0,B] leaves two possibilities: the integer squared norm is at most B, or it is at least q. PINE detects the latter using random dot products. The paper explains: “Instead of encoding the coordinates of a vector in their binary representation, we devise a randomized test that can detect whether there is a ‘wraparound’ when computing the sum of squares over a finite field.” (Section 1.1, p. 6977).

Apply it as follows:

1. choose q≥max{81B ln(2/η),1000,3r}, as required by Theorem 3.15, with τ∈(1/2,1] and integer τr
2. sample r independent test vectors, each coordinate independently −1 with probability 1/4, 0 with probability 1/2, or 1 with probability 1/4
3. range-check each dot product modulo q against [−α√B,α√B], where α=√ln(2/η), using alleged bit shares
4. keep test success indicators gk secret; abort if fewer than τr tests succeed, otherwise select exactly τr successes and set the remaining indicators to zero
5. verify ∑gk=τr and the quadratic constraints gk·sk=0, where sk is the difference between the shifted dot product and its claimed bit expansion; also verify all alleged bits

For one test, valid vectors pass with probability at least 1−η; vectors with integer squared norm at least q pass with probability at most 1/2 (Propositions 3.4–3.5, p. 6984). Repetition reduces soundness error. Hiding individual outcomes avoids revealing which random tests failed; the remaining abort probability bounds statistical leakage (Section 3.2, pp. 6982–6986).

The analysis separates large and small infinity norm cases; the latter uses the Berry–Esseen theorem. The paper says, “The challenging case (small infinity norm) is analyzed using the Berry-Esseen theorem.” (p. 6977). Inference: in Verus, model the random choices as ghost values and prove deterministic implications conditioned on explicit bounds; leave probability inequalities and Berry–Esseen as assumptions or separately formalized lemmas. Use `requires` for q, B, and vector-range preconditions and `ensures` for deterministic arithmetic relations.

## technique 2: verify quadratic constraints over secret shares

PINE reduces norm checking to a small collection of quadratic constraints and bitness checks. A constraint has public coefficients and target ak and asserts Σ ci,j Xi'Xj'=ak over GF(q) (Section 3.3, p. 6986). Bitness is expressed as v²−v=0. The protocol of Corollary 3.14 lets two verifiers check all constraints with communication proportional to the square root of the number of variables; parallel repetition lowers soundness.

The paper's four-message L2-bound protocol is concrete (Figure 3, p. 6987):

1. run the wraparound subprotocol, obtaining shares of sk and alleged bits gk, uk,j, vk,j
2. run the modulo-q squared-norm protocol, obtaining alleged bits v'j',u'j'
3. run the quadratic-constraints protocol with repetitions t to check (a) the squared norm equals the bit expansion modulo q, (b) gk·sk=0 for every k, and (c) every alleged value is a bit
4. reject immediately if any subprotocol rejects; otherwise accept

Inference: in Verus, encode field elements and vectors as mathematical sequences in specs and prove each arithmetic constraint with proof functions and `assert`; represent the protocol state as an enum and specify message sequencing with `requires`/`ensures`. This does not prove communication privacy or the simulator's statistical bound without formalizing those properties.

## technique 3: statistical and differential zero knowledge

The analyzed statistical protocol is public-coins with four messages (Theorem 3.15, p. 6987). Theorem 1.1 describes its non-interactive form in the common reference string model: one prover message of O(√d log q + r log²q) bits to each verifier (p. 6976). The transformation uses a distributed variant of the Fiat–Shamir heuristic; its details are deferred to the full version. Remark 2.4 distinguishes the interactive honest-verifier guarantee from the transformed protocol's guarantee against one malicious verifier (p. 6980). Differential PINE instead samples Gaussian noise truncated to bounded Euclidean norm, rounds upward to obtain R, and shares X as −R and X+R. Both shares have bounded norm; checking these bounds rules out integer wraparound for sufficiently large q (Section 4, p. 6988).

Inference: differential PINE is a candidate when aggregate publication already provides differential privacy and weaker secrecy is acceptable. Theorem 4.3 states completeness 1 for valid vectors, soundness error parameterized by q, d, and repetitions t, and (ε,δ)-differential zero knowledge, subject to its field-size bound (p. 6988). Inference: Verus can verify that the two shares sum to X and that each share satisfies a stated norm predicate; sampling distributions and differential zero knowledge need their own formal definitions and proofs.

## evidence and boundaries

Table 1 uses an aggregation field q≈2^64, Euclidean norm bound 2^15 (thus squared-norm bound B=2^30), d∈{10^4,10^5,10^6,10^7}, soundness and ZK error 2^−50, and differential-ZK ε=0.1 (Section 1.1, p. 6977; Table 1, p. 6978). Statistical-ZK overhead is respectively 22%, 3.18%, 0.49%, 0.13%; differential-ZK overhead is 4.77%, 1.46%, 0.32%, 12.63%. These are overheads beyond sending shares without validity proofs, whose per-server cost is d log₂q bits. At d=10^7 differential PINE needs nine-byte field elements rather than eight, adding a 12.5% baseline cost (p. 6977). Table 1 gives prior-work overhead above 1500% at each dimension.

Table 3 changes soundness error to 2^−100 and reports statistical-ZK overhead 43.01%, 6.27%, 0.97%, 0.26% and differential-ZK overhead 8.92%, 2.86%, 0.63%, 12.76% in the same dimension order (p. 6989). Section 5 calls these results a “performance analysis” (p. 6988); they are communication analyses, not measured implementation benchmarks.

The paper states completeness, soundness, and ZK guarantees and communication bounds. Several proofs and transformation details are deferred to the full version [ROCT23], including the proof of Theorem 3.15 (Section 3.4, p. 6986). Inference: a verified implementation would still need to connect its finite-field operations, secret sharing, and sampling to these mathematical assumptions; server non-collusion remains a deployment assumption. PINE is relevant prior art for exact secret-shared norm verification, but its protocol guarantees do not establish correctness of an agent-generated Rust implementation.

## techniques for the catalog

- wraparound detection — combine modulo-q norm checks with random signed dot products
- quadratic-constraint verification — prove bitness and norm equations on secret shares with repeated public-coin checks
- statistical zero knowledge — simulate each verifier's view within a stated statistical distance
- differential zero knowledge — noise-share a bounded vector and verify both noisy shares
