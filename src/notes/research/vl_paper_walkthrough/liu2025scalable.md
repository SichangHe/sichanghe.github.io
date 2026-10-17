# Scalable Collaborative zk-SNARK and Its Application to Fully Distributed Proof Delegation
(authored by agents unless marked 🧑)
Tag: `liu2025scalable`, [paper](https://www.usenix.org/conference/usenixsecurity25/presentation/liu-xuanming)

## scope and result

The paper constructs a collaborative zk-SNARK for proof delegation. A client computes and secret-shares a witness, then servers jointly execute the prover without learning that witness. The design targets fully distributed time and space and small communication. The security model is an honest majority with semi-honest servers: Sec. 3.1 (p. 2028) says that with packing factor k = O(N) the work is proven secure against at most t = N/2 − 2k corrupted servers; the implementation sets the packing factor k = N/8 (Sec. 6.1, p. 2036) and tolerates t = N/4 corrupted servers (footnote 1, p. 2028; Sec. 6.1). The central design choice is HyperPlonk++, a HyperPlonk variant whose permutation check is made MPC-friendly.

The paper states: “With 128 servers jointly generating a proof for a circuit of size 221 gates, the experiment demonstrates over 30× speedup and reduced RAM requirements compared to a local prover, while the witness is still private.” (Abstract, p. 2025). The experiments measure online execution only: “our efficiency analysis and experimental evaluation focus solely on online complexity” (Sec. 2.2, p. 2028). The authors report 5,000 lines of Rust built on mpc-net and arkworks, with up to 256 c7.large machines having 4 GB RAM each (Sec. 6.1, p. 2036).

## technique 1: packed secret sharing as the collaboration substrate

What it is. Packed (Shamir) secret sharing stores a vector of (k) secrets in one degree-(d) polynomial. A server receives one evaluation, and linear operations preserve sharing while coordinatewise multiplication adds polynomial degrees. Any d+1 shares reconstruct, and any d−k+1 shares are independent of the secret (Sec. 2.1, pp. 2027–2028). For its low-depth setting the paper concludes “our protocol is secure when N ≥ 2t + 4k” (Sec. 3.2, p. 2030), from the two conditions N > 2d + 2k − 2 and d ≥ t + k − 1.

When to use it. Use PSS when many equal-shape field operations can be SIMD-packed and the prover circuit has low multiplicative depth. It is unsuitable by itself for repeated PSS multiplication: degree reduction costs communication.

How to apply it. (1) Compute the extended witness and split it into vectors of (k) field elements. (2) Choose degree d ≥ k−1, create one sharing polynomial per vector, and send one evaluation to each server. (3) Perform linear combinations locally. (4) Multiply only while the resulting degree remains below N; the paper's products of two witness vectors and two public vectors have degree 2d + 2k − 2 (Sec. 3.2, p. 2030). (5) Convert a final single PSS into (k) ordinary Shamir sharings with the paper's (F_{PSS2SSS}) procedure before continuing scalar work. The sumcheck construction performs this conversion at round ℓ−s (ℓ variables, k = 2^s), then completes remaining rounds locally (Sec. 4.1, pp. 2031–2032).

Verus form. Inference: Verus can specify a pure function for packing and interpolation and prove linear-homomorphism lemmas over a finite-field type. Secret sharing and network delivery remain trusted runtime components unless modeled as abstract protocols; Verus does not provide privacy proofs automatically. Do not encode a proof function as executable Rust or use unsupported `modifies` syntax.

Evidence and limits. The paper's asymptotic per-server work for multilinear sumcheck is (O(2^\ell/N)), with total communication O(Nℓ), sublinear in 2^ℓ (Sec. 4.1, p. 2032). It assumes a semi-honest adversary and low degree. Malicious security is not achieved: the paper only conjectures that the protocol “can be extended to provide malicious security (with abort)” and leaves the concrete instantiation as future work (Sec. 7, p. 2038). Inference: a Verus implementation would need separate functional-correctness proofs and an external cryptographic argument for privacy and robustness.

## technique 2: collaborative multilinear sumcheck

What it is. Sumcheck proves (H=\sum_{x\in\{0,1\}^\ell}f(x)) while (f) remains secret-shared. Each server collaboratively computes the bookkeeping table used by the prover.

How to apply it. (1) Split the first-row hypercube into (n/k) PSS vectors. (2) For rounds (i=1\ldots \ell-s), use the received challenge (r_i) and compute each next-row entry by (Jx_{i+1,j}K=(1-r_i)Jx_{i,j}K+r_iJx_{i,j+n_i/(2k)}K), where n_i is the number of entries in row i and j runs over the n_i/(2k) packed vectors of the next row (Eq. 3, p. 2029). (3) Convert the remaining PSS to (k) SSS values. (4) Continue ordinary local sumcheck on those shares. For degree-(D) polynomials, evaluate the arithmetic circuit (h(g_1,\ldots,g_c)) at (D+1) points using dynamic programming; the paper requires the degree to satisfy D ≤ 4, with the most complex term a product of four polynomials, two encoding the private witness and two public inputs (Sec. 3.2, p. 2030; Sec. 4.1, p. 2032). The degree of the resulting PSS is 2d + 2k − 2, which must stay below N.

The paper says: “In each round, since f is multilinear, the sumcheck round polynomial fi can be fixed by two points, fi(0) and fi(1)” (Sec. 4.1, p. 2032). It then states that since k = O(N), each server holds only O(2^ℓ/N) PSS, so the workload is fully distributed. For zerocheck, multiply the polynomial by an equality polynomial and invoke the same sumcheck; each server locally constructs the equality polynomial's PSS (Sec. 4.1, p. 2032).

Verus form. Inference: represent each round polynomial as a `spec fn`, state the fold equation as an `ensures` clause, and prove that the claimed sum is preserved by induction over rounds. Keep challenge generation and finite-field arithmetic abstracted behind trusted specifications if their cryptographic implementation is outside the proof.

## technique 3: collaborative multilinear polynomial commitment

The paper instantiates multilinear PCS with PST instead of KZG. Commitments are a multi-scalar multiplication over the secret-shared hypercube. For opening at (u), PST divides successively by (x_i-u_i), producing quotient and remainder hypercubes. When f is multilinear, Eq. (4) (p. 2030) gives Q_i(b) = R_{i-1}(1,b) − R_{i-1}(0,b) and R_i(b) = (1−u_i)·R_{i-1}(0,b) + u_i·R_{i-1}(1,b), with R_0 := f.

Steps: (1) Prepare the trapdoor group elements in PSS during setup. (2) Invoke collaborative MSM for the commitment. (3) For each (i\le \ell-s), compute quotient and remainder PSS by subtraction and linear combination. (4) Convert at the boundary round to SSS. (5) Finish the remaining divisions locally and batch MSM the quotient commitments. The protocol has (O(2^\ell/N)) per-server work, (O(1)) online rounds, O(Nℓ) total communication, and O(Nℓ) preprocessing randomness (Sec. 4.2, pp. 2032–2033).

Verus form. Inference: prove the recurrence and that the final remainder equals (f(u)) with `lemma` functions and loop invariants over the division index. Group operations and discrete-log binding remain assumptions; Verus proves the algebraic implementation only.

## technique 4: public-input permutation check and mixed-mode protocols

Classic Plonk permutation checking compares secret witness values under a public permutation. The paper instead constructs the public permutation matrix (M), takes its multilinear extension, and checks (M A_V^T=A_V^T) through matrix multiplication. The verifier samples (r_1); the prover commits to (M'(x)=M(r_1,x)); sumcheck reduces the claim to (g(r_1)), (f(r_2)), and (M(r_1,r_2)), then a classic permutation check is run on public equality-polynomial values (Sec. 3.3, p. 2030; Sec. 5.1, p. 2034).

For arbitrary circuits, each server computes a 1/N part of the permuted equality hypercube and shares it with the others, costing O(2^ℓ/N) communication per server (Sec. 5.2, p. 2034). The paper conjectures that with an arbitrary circuit structure there is no way to compute these PSS with both fully distributed time and sublinear communication. For data-parallel circuits, pack equal positions across identical subcircuits: compute (y=\{eq(r_1[1:s'],b_1)\}), convert (y) to PSS, then multiply by the public scalar (c_{b_2}=eq(r_1[s'+1:\ell],\sigma'(b_2))). This needs no communication and O(2^ℓ/k) time and space per server (Sec. 5.3, pp. 2035–2036). The paper says this packing “can also be extended to other polynomials involved in the protocol”; the packing is claimed for circuits with 2^{s'} identical sub-circuits and k = 2^{s'} (Sec. 5.3, p. 2036).

Inference: Verus can prove the permutation-matrix identity and packing-index arithmetic, but privacy of the witness-to-public transformation needs a cryptographic proof outside ordinary functional verification.

## technique 5: layered distributed sumcheck and product tree

The product check builds an ((\ell+1))-variate polynomial whose layer zero is the input hypercube and whose layer one recursively multiplies tree children. Servers own non-contiguous subtrees, so the prior contiguous-segment distributed sumcheck cannot be used. The paper decomposes the sum into \(\ell-s+1\) subpolynomials, runs these sumchecks in parallel, aggregates their round polynomials at server (S_0), and then finishes the final (s) rounds centrally (Sec. 5.2, pp. 2034–2035). The resulting per-server workload is (O(2^\ell/N)), leader overhead (O(N\ell)), total communication (O(N\ell)), and proof size and verifier time (O(\ell)).

Inference: a Verus proof should define a tree-balance invariant and prove each fold preserves the represented product; distributed ownership and message authenticity require additional models.

## techniques for the catalog

- packed secret sharing — SIMD-pack witness vectors, preserve linear operations, and control multiplication degree
- collaborative sumcheck — compute bookkeeping folds over secret-shared multilinear tables and convert PSS to SSS at the boundary
- collaborative multilinear PCS — use PST recurrences and batched MSM for commitments and openings
- MPC-friendly permutation check — replace secret witness permutation with public matrix/equality checks
- layered distributed sumcheck — aggregate non-contiguous subtree sumchecks while preserving logarithmic proof size
- data-parallel packing — pack equal positions across repeated subcircuits to remove permutation-hypercube communication
