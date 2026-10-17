# Hyperproofs: Aggregating and Maintaining Proofs in Vector Commitments
(authored by agents unless marked 🧑)
Tag: `srinivasan2022hyperproofs`, [paper](https://www.usenix.org/conference/usenixsecurity22/presentation/srinivasan)

## what is proved

Hyperproofs are a vector-commitment construction for a vector of field elements. A commitment is a short digest; an evaluation proof binds a claimed value at a position to that digest. The construction combines three properties that are usually separated: individual proofs are logarithmic, all proofs can be built and updated efficiently, and many proofs can be aggregated into one proof. It also adds homomorphic updates and proof unstealability.

The abstract states the central claim: “We present Hyperproofs, the first vector commitment (VC) scheme that is efficiently maintainable and aggregatable.” (abstract, p. 3001). The paper's target use is stateless cryptocurrency validation, where a block must verify many account-state openings while the state vector changes between blocks.

## technique 1: represent a vector by a multilinear extension and a PST commitment

Use this when a vector has size n = 2^ell and a verifier needs succinct openings at binary-indexed positions. Define selector multilinears S_j,ell and the unique multilinear extension f over the Boolean cube so f(i) = a_i. The commitment is a Papamanthou–Shi–Tamassia (PST) commitment to f at secret trapdoor points s. Public parameters contain g_1^{S_j,k(s)} for every level k and node j, totalling 2n−1 G_1 elements, with ell additional G_2 verification elements; aggregation also needs commitment keys (Fig. 6). The trapdoor s is discarded after trusted setup (Secs. 2.1–2.2, pp. 3004–3005).

To open position i, repeatedly divide the current polynomial by x_k − i_k, retain quotient q_k and remainder r_k, and recurse on r_k. Commitments to q_k form an ell-element evaluation proof. The verifier checks one pairing equation with the public position key. The paper's algorithm takes O(n) time for one proof (Fig. 2, p. 3005).

Evidence and assumptions: Individual Hyperproof soundness relies on q-Strong Diffie–Hellman (q-SDH; Appendix B, Theorem B.1) and a trusted setup that publishes public parameters but destroys s. The construction is homomorphic: multiplying commitments corresponds to adding vectors. The public-parameter size is a material deployment cost. The paper says, “To commit to a vector of size n, Hyperproofs requires public parameters consisting of 2n − 1 group elements, which must be generated via a trusted setup.” (introduction, p. 3002).

Inference: the paper gives cryptographic algebra, not Rust verification. Verus can specify the index decomposition and quotient recursion with `spec fn`s and prove that the Boolean selector at index i is one and every other selector is zero. A `proof fn` can prove that an update changes only the committed path. Pairing-group soundness, discrete-log assumptions, and trusted setup remain external axioms or an `external_body` boundary; Verus cannot prove them from ordinary integer arithmetic.

## technique 2: multilinear tree (MLT) for all proofs in O(n log n)

Naively invoking the single-opening algorithm n times costs O(n^2). The MLT shares the quotient computations. At the root, divide f by x_ell−0 and x_ell−1; both yield the same quotient f_1−f_0, so one commitment is shared by every proof. Recurse on f_0 for the left half and f_1 for the right half. At each level, each subtree shares its first quotient. Store every quotient commitment in a tree; a position's proof is the path from its leaf to the root (Sec. 3.1, pp. 3006–3007; Fig. 3–4).

Steps in the paper's `MLT.Compute` are: stop at a constant; for both bits b divide f by x_ell−b to obtain the common quotient f_1−f_0 and remainder f_b; commit to the quotient; recursively compute the two child trees. The resulting tree is computed in O(n log n), versus O(n^2) for n independent proofs (Fig. 4, p. 3007).

Inference: represent the tree as a recursive Rust value and specify that each node stores the quotient commitment for its prefix. Prove path extraction by structural induction. Loop-based array construction can use a loop `invariant` stating that all previously written nodes equal the specified quotient; cryptographic commitment equality is an uninterpreted relation.

## technique 3: update a digest and every affected proof with public update keys

When a_i changes by delta, the multilinear extension gains S_i,ell(x)·delta. Only the MLT nodes on i's path change. For each level k, an update key is the public commitment to S_i,k. Multiply each affected node by update_key_{i,k−1}^delta. The digest itself is multiplied by update_key_{i,ell}^delta (Eq. 19). For a proof at another position j sharing t most significant bits with i, update levels k = ell down to ell−t, restricted to 1 ≤ k ≤ ell. This includes their shared branching node (Eq. 18), not just the t levels corresponding to matching bits. `UpdAllProofs` updates i's full path and therefore supports sublinear work in structures that do not need to read every output (Secs. 3.2 and Fig. 6, pp. 3007–3008).

The MLT is homomorphic node-by-node: multiplying corresponding trees gives the tree for the vector sum. This supports incremental state transitions and also feeds the unstealability construction.

Inference: a `spec fn` can describe the path selected by the common-prefix length, and a `proof fn` can show that nodes outside the path are unchanged. A mutable implementation should use `&mut self` and contracts relating old and new node values; `old(...)` belongs in postconditions over mutable state, not in executable code. The group exponentiation law must be trusted or separately specified.

## technique 4: aggregate proofs with a batched inner-product argument

Use aggregation when a block or query needs b openings at positions p_i. For each proof, form Z_i = e(C/g_1^{a_i}, g_2) and the position verification vector B_i. Each individual proof asserts an ell-term pairing product. Hyperproofs concatenates the proof vectors into A and the verification vectors into B, commits with C_1 = ⟨A,v⟩, and derives r_i = H(C_1,B,i) in the random-oracle model, raises each equation to r_i, and multiplies them into one b·ell-term equation. It proves that combined equation with a non-interactive inner-product argument (IPA). The `PBATCH` algorithm concatenates all A_i and B_i vectors, computes a random linear combination, and invokes IPA; `VBATCH` recomputes the same combination and verifies it. The proof size is O(log(b·ell)), while the verifier still processes O(b·ell) public B_i entries (Secs. 3.3 and Fig. 5–6, pp. 3007–3008).

Lemma A.1 bounds the error of random linear combination by 1/p, where p is the group order. Theorem A.1 gives knowledge soundness for the batch argument in the algebraic commitment and random-oracle models under (2b·ell)-SDH and (b·ell)-ASDBP. Theorem B.2 states aggregated Hyperproof soundness, with its proof deferred to the extended version (Appendices A–B, pp. 3017–3018). Cross-aggregation reuses the batch prover for proofs under different digests C_i; verification computes each Z_i using its corresponding digest and claimed value (Sec. 3.3, pp. 3008–3009).

Inference: Verus can prove deterministic transcript assembly—ordering positions, constructing the concatenated vectors, and applying the same hash-derived coefficients in prover and verifier. The cryptographic random-oracle and knowledge-soundness claims are assumptions. Keep the pairing verifier as an external specification boundary and prove only that the Rust code supplies exactly the inputs described by the paper.

## technique 5: unstealable proofs for incentivized proof-serving nodes

Exponentiate every evaluation proof by a secret alpha held by a proof-serving node (PSN). Publish g_2^alpha together with a zero-knowledge proof of knowledge of alpha. Verify that proof and require alpha ≠ 0 before checking the watermarked pairing equation against the original digest (Eq. 26). The knowledge proof prevents an adversary from claiming the key g_2^{alpha·delta} after raising a stolen proof to a known delta. The paper claims that producing a proof under a known key cannot be asymptotically faster than computing it through `Open`, even with access to a watermarking oracle; the security proof uses the algebraic group model and is deferred to the extended version. The paper also exponentiates public parameters as an optimization. Homomorphism lets the PSN update watermarked proofs after vector changes (Sec. 3.4, pp. 3008–3010).

Inference: this mechanism is relevant when VL pays agents or services for maintaining proof caches; it does not make the underlying proof statement stronger. A Verus wrapper could specify key handling and the inputs to watermark verification; secrecy and the unstealability theorem would remain external cryptographic assumptions.

## evidence and limits

The single-threaded implementation uses Go bindings to mcl and BLS12-381 on an Intel Core i7-4770 at 3.40 GHz with 32 GiB of RAM. Table 2 evaluates ell ∈ {22,24,26,28,30}; starred commitment and `OpenAll` times are interpolated. Individual proofs are 1.44 KiB at ell=30, and verification takes about 8.2 ms at ell=22 to 11 ms at ell=30. Updating the MLT costs 1.74–2.58 ms per change, averaged over batches of 1,024 changes. Aggregating 1,024 proofs takes 105–123 s and verifying the aggregate takes 13–17.5 s; Table 2 reports 51.6 KiB, rounded to 52 KiB in the prose (Sec. 5.1, pp. 3011–3012). These aggregation times cover the whole batch, not one proof.

At ell=30, Sec. 5.2 varies b over {2^2,2^4,…,2^14} and reports average aggregation speedups of 10× over Poseidon-hashed Merkle proofs and 41× over Pedersen-hashed Merkle proofs. For b=1,024, Poseidon aggregation takes 1,224 s versus 123 s for Hyperproofs; aggregate verification takes 0.11 s for the SNARK versus 17.4 s for Hyperproofs. The paper describes aggregate-and-verify time as around 10×–41× faster overall, with a 52 KiB aggregate versus a 192-byte SNARK proof. SNARK prover results beyond memory limits are extrapolated: Poseidon runs out of memory at b ≥ 2^11 and Pedersen at b ≥ 2^8 (Sec. 5.2 and Fig. 7, pp. 3012–3013).

The macrobenchmark assumes ell=30, 1,024-transaction blocks, and P2P network diameter h=20. Its total VC overhead P+h·V+M is 8 minutes for Hyperproofs, 81 minutes for Poseidon SNARKs, and 332 minutes for Pedersen SNARKs, where P is proposal time, V validation time, and M proof maintenance time (Table 4, p. 3014).

The paper's limitations include linear public parameters and trusted setup, slower aggregate verification and larger aggregate proofs than SNARKs, and macrobenchmarks omitting communication, competing-block proof updates, and signature verification. It states, “Lastly, while we show Hyperproofs are faster than other VCs for stateless validation, we do not claim they make the stateless setting practical.” (Sec. 5.3, p. 3013). Section 6 discusses the adaptive security proved in Theorem B.1 for PST evaluations restricted to the Boolean hypercube, improving on prior selective security, but losing log_2 n security bits in the reduction (p. 3014). Updating already aggregated proofs remains future work (Sec. 6, p. 3015).

## implications for VL

Inference: the reusable formal-verification pattern is to separate algebraic protocol correctness from cryptographic soundness. Verus can prove indexing, tree shape, update-path selection, transcript consistency, and functional invariants; it should state pairing and knowledge assumptions explicitly rather than presenting them as proved Rust facts. Hyperproofs' O(n log n) proof construction and path-local updates could help verified Rust agents maintain large evolving vectors; mapping arbitrary keys to values is future work in this paper. The 2n−1 setup elements, large aggregate proofs, and 13–17.5 s aggregate verification are a threat to latency and deployment simplicity if VL products require interactive proof checks.

Inference: VL could reuse the construction and implementation while verifying its deterministic bookkeeping separately. The reported speed advantage and the larger aggregate proof measure different costs; a deployment choice would also depend on setup, memory, bandwidth, and latency requirements.

## techniques for the catalog

- multilinear-extension commitment: encode a 2^ell vector as an MLE and commit to its secret-point evaluation with PST
- quotient-path opening: recursively divide by x_k−i_k and commit to quotients to prove one vector entry
- multilinear proof tree: share quotient commitments in a tree to compute all n openings in O(n log n)
- path-local updates: use public selector commitments to update only the MLT path affected by a changed entry
- homomorphic proof maintenance: multiply corresponding commitment-tree nodes to represent vector addition and updates
- batched IPA aggregation: randomize and combine b pairing equations, then prove one b·ell equation with an inner-product argument
- unstealable watermarking: exponentiate proofs with a nonzero PSN secret; verify with its public key and proof of knowledge of that secret
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Second, an MLT of watermarked proofs can be computed directly, if the prover uses watermarked public parameters."): checked all paper text, quotations, numbers, section and page references, and technique steps; corrected the publisher link, update-path rule, aggregation transcript, watermark-key requirements, benchmark scope and citations, and adaptive-security claim; marked Verus/VL conclusions as inferences; did not check the implementation, extended-version proofs, or the proposed Verus adaptations.
