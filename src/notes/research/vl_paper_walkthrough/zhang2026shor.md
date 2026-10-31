# Building Shor’s Algorithm in Lean: An Agentic Formalization of Quantum Attacks on RSA-2048 and P-256
(authored by agents unless marked 🧑)
Tag: `zhang2026shor`, [paper](http://arxiv.org/abs/2607.14082v1)

## what is formalized

Zhang, Zhao, Yao, and Wang describe a Lean development of Shor-style attacks on RSA-2048 and P-256. The library combines number-theoretic reductions, probability bounds, reversible arithmetic, quantum circuits, classical recovery, and logical resource formulas. The abstract states, “Our formalization develops the mathematical foundations for analyzing quantum attacks in two cryptographic settings: a 2048-bit modulus in the RSA-2048 and the standardized elliptic curve over a 256-bit prime field (P-256).” (Abstract, p. 1).

The application claims are Theorem 1 and Theorem 2. Theorem 1 says that, assuming an RSA-2048 modulus with unknown distinct prime factors, an algorithm returns one factor with probability at least 2/3 using 6.19×10^3 logical qubits, 8.1×10^9 Toffoli gates, 6.42×10^9 maximal circuit depth, and 3.69×10^4 classical arithmetic operations (Section 2.1, p. 3; Table 1, p. 3). Theorem 2 says that, assuming a P-256 public point `Q = [m]P`, an algorithm returns `m` with probability at least 2/3 using 2.33×10^3 logical qubits, 1.26×10^11 Toffoli gates, 1.16×10^11 maximal Toffoli depth, and seven classical operations (Section 2.2, p. 4; Table 2, p. 5).

These are logical-circuit resources and omit noise, error correction, scheduling, and physical resources (Section 2, p. 2). The paper’s own conclusion identifies important gaps: “A complete execution beginning from a 2048-bit modulus or a P-256 public point remains to be constructed for each application.” (Section 6, p. 12). The RSA theorem combines independently supplied certificates: an assumed success bound, source resource numbers, and a classical-operation count. The paper also acknowledges that its RSA source reports measurement depth while the theorem labels the tripled value maximal circuit depth, so the relationship requires another argument (Section 4.3, p. 8).

## technique: supervised agentic formalization with stable provenance

Use this when agents write proof code from scientific sources but humans must validate the claim-to-code connection. The paper defines the division of work as follows: “Agentic formalization is a workflow in which software agents conduct substantive source research and proof development, human review examines the mathematical claims and their alignment with cited sources, and machine checking verifies the resulting formal proofs.” (Section 3.1, p. 4).

The workflow is:

1. Authors choose a scientific question and the sources that support it
2. Agents retrieve source passages and split each claim into mathematical and computational obligations
3. Agents write Lean declarations and proofs
4. The Lean kernel checks proof terms under imported definitions and assumptions
5. Authors inspect assumptions and compare the checked theorem with the source
6. Authors review manuscript wording before accepting a change
7. Store accepted declarations, source locations, review decisions, and manuscript claims as reusable artifacts
8. Give each theorem a stable name and module location so later agents can retrieve its dependencies and assumptions

The paper says this organization lets reviewers trace manuscript prose to a theorem and from that theorem to its definitions (Section 3.1, p. 5). Table 3 compares prior systems by end-to-end scope, success probability, quantum and classical resources, gate-level construction, and oracle assumptions. The authors mark their Lean row complete in every category, but the text then qualifies terminal RSA and P-256 claims with imported certificates and integration tasks (Section 3.2, pp. 5–6).

Inference: In Verus, source passages and product requirements should be stored beside Rust/Verus declarations, dependency versions, review decisions, and failed proof attempts. Stable names can support retrieval, but they do not establish that an `ensures` clause matches a requirement. A final machine check should be paired with a source-fidelity review.

## technique: order-finding reduction with validated continued fractions

Use this for integer factoring when a unit modulo `N` has a useful even multiplicative order. For `N = pq`, choose `a`; if `gcd(a,N)>1`, that gcd is already a factor. Otherwise recover the least positive `r` with `a^r ≡ 1 (mod N)`. A good base has `gcd(a,N)=1`, even `r`, and `a^(r/2) ≠ −1 (mod N)`; the paper states that at least half of units modulo a product of two distinct odd primes are good (Section 4.1, p. 6).

Algorithm 1 (p. 6) gives an executable schedule:

1. Prepare a `t`-qubit phase register in `|0⟩` and a work register in `|1⟩`
2. Apply Hadamard to every phase qubit
3. For each phase bit `i`, controlled on that bit, multiply the work register by `a^(2^i) mod N`
4. Apply the inverse quantum Fourier transform
5. Measure `j` from `0` through `2^t−1`
6. Inspect continued-fraction convergents of `j/2^t` in increasing denominator order
7. Return the first positive `r'` satisfying `a^r' ≡ 1 (mod N)`, or failure

The register-size condition is `N^2 ≤ 2^t < 2N^2`, and the paper derives a one-sample lower bound `φ(r)/(3r)` by summing outcomes whose numerators are coprime to `r` (Section 4.1, p. 6). Continued-fraction validation matters: a measured multiple of the order or an invalid candidate is rejected by modular exponentiation.

Inference: A Verus analogue would model a state transition from a public input, maintain an invariant connecting a candidate period to modular exponentiation, and prove postconditions for the returned factor. Verus cannot model quantum amplitudes automatically; probability and circuit behavior would need explicit mathematical specifications and trusted libraries. The paper does not provide such a Rust encoding.

## technique: reversible arithmetic by compute, use, and uncompute

Use this when an arithmetic subroutine must preserve inputs and clear scratch state so coherent branches do not retain which-path information. The desired modular-exponentiation map is `|x⟩|y⟩|0⟩ ↦ |x⟩|a^x y mod N⟩|0⟩` (Section 4.2, p. 7). Algorithm 2 (p. 7) is:

1. Classically precompute `u_i = a^(2^i) mod N`
2. For each exponent bit `x_i`, controlled-multiply the target by `u_i` modulo `N`
3. Uncompute every temporary value produced by that controlled multiplier
4. Return the unchanged exponent, transformed target, and clean work register

A modular addition computes an ordinary sum, conditionally subtracts `N` when needed, then reverses the comparison to erase its decision flag. A constant modular multiplication accumulates controlled additions; multiplication by the inverse constant runs backward after swapping registers to erase the old value (Section 4.2, pp. 7–8). Resource composition is explicit: sequential circuits add Toffoli counts and depth while taking maximum workspace; parallel circuits add workspace and take maximum depth (Section 5.2, p. 9).

Inference: For Verus, the analogue is a function contract that preserves source operands, specifies the target update modulo a bound, and proves that ghost scratch state is restored. Use `requires` for canonical ranges and nonzero denominators, `ensures` for the arithmetic relation and unchanged inputs, and `lemma` proofs for modular identities. This inference uses Verus constructs documented in the local Verus reference; quantum reversibility itself does not transfer.

## technique: Ekerå–Håstad short-discrete-log route and explicit certificate boundaries

Use this alternate RSA route when a short logarithm can expose `p+q`. Algorithm 3 (p. 8) takes a public modulus `N`, random unit `g`, and width `m`:

1. Compute `y = g^((N+1)/2) mod N`
2. Prepare exponent registers of widths `2m` and `m`
3. Coherently compute `g^(e1) y^(−e2) mod N`
4. Fourier transform and measure a frequency pair
5. Use lattice post-processing to recover `d` with `0<d<2^m` and verify `g^d ≡ y (mod N)`
6. Compute `Δ = d^2 − 4N`; fail unless `Δ` is a nonnegative square
7. Return `(d+√Δ)/2` and `(d−√Δ)/2`

The paper imports a source claim of more than 99% classical recovery conditional on a correct short-logarithm run, then assumes each factoring attempt fails with probability at most one half and that three attempts are independent. The resulting failure bound is `1/8`, hence success at least `7/8`, which exceeds the theorem’s stated `2/3` target (Section 4.3, p. 8). However, the authors state that deriving the one-half rate from the one-sample order-finding bound requires an explicit sample count and would increase quantum cost; they also say the 36,906 classical-operation budget is not yet derived from Algorithm 3 (Section 4.3, p. 8).

## technique: P-256 discrete-log recovery through reversible field and curve layers

The P-256 branch works in a cyclic subgroup generated by `P`, with `Q=[m]P`. Algorithm 4 (p. 9) prepares a uniform superposition over `(k,ℓ)`, computes `[k]P+[ℓ]Q`, measures the group register, applies inverse Fourier transforms, and measures `(u,v)`. It fails when `u=0`; otherwise it returns `v u^−1 mod r`. For prime `r`, every nonzero `u` is invertible. The formal proof establishes correctness for a valid linear relation `v ≡ mu (mod r)` and treats outcome probability separately (Sections 5.1 and 5.4, pp. 8, 11).

The circuit is built in layers. Canonical field elements are integers `0≤x<p`; reversible addition, subtraction, Montgomery multiplication, squaring, inversion, and division preserve inputs and clean ancillas (Section 5.2, p. 9). Affine point addition uses a slope, coordinate updates, and branch handling for identity, inverse points, doubling, and exceptional denominators (Section 5.3, p. 10). Fixed-base scalar multiplication precomputes `[2^i]P` and performs controlled additions for scalar bits; each step records its pre/post accumulator relation and must satisfy the generic affine condition, even when the control bit is zero (Section 5.3, p. 10). Algorithm 6 (p. 11) applies the same schedule for `P` and `Q`, erasing slope and arithmetic scratch after every controlled addition.

The resource tuple is 2,330 logical qubits, 1.26×10^11 Toffoli gates, and 1.16×10^11 maximal Toffoli depth, with seven classical operations counted only after a certified measurement output (Sections 2.2 and 5.4, pp. 4, 11). The paper says measurement weights, circuit correctness, and resource equalities enter as separate premises; deriving them from one concrete execution remains an integration task (Section 5.4, p. 11).

Inference: A Verus encoding would use datatype invariants for canonical field elements, `requires` clauses for nonzero denominators and valid curve points, `ensures` clauses for point-operation equations, and `lemma` proofs to compose scalar steps. It could verify deterministic arithmetic and resource counters, but probability distributions and quantum state evolution require a separately specified model.

## techniques for the catalog

- supervised agentic formalization — let agents research and draft proofs, require human source review, and use the kernel as final proof checker
- validated order finding — recover a modular period with phase estimation, continued fractions, and modular-power validation
- reversible compute/uncompute — preserve inputs, update targets, and reverse temporary arithmetic to clean ancillas
- certificate-separated resource claims — keep probability, circuit correctness, resource counts, and classical recovery as explicit linked premises
- layered elliptic-curve verification — prove field arithmetic, point formulas, controlled additions, scalar schedules, and recovery separately
- assumption-boundary reporting — distinguish machine-checked propositions from imported source numbers and unconstructed end-to-end executions
