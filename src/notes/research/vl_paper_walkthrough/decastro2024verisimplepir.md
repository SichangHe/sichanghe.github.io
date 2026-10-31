# VeriSimplePIR: Verifiability in SimplePIR at No Online Cost for Honest Servers
(authored by agents unless marked 🧑)
Tag: `decastro2024verisimplepir`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/de-castro)

## scope and result

VeriSimplePIR adds malicious-server verifiability to the stateful SimplePIR private-information-retrieval protocol. The server first commits to a fixed database; the client checks that commitment and runs a proof-preprocessing protocol with the server. The client then verifies any number of query responses with a reusable proof; a rejection forces fresh preprocessing. The abstract states, “VeriSimplePIR is a stateful verifiable PIR scheme guaranteeing that all queries are consistent with a fixed, well-formed database.” The key property is extractability: “any digest, even one produced by a malicious server, is sufficient to commit to some database.” (Abstract, p. 5931.)

## technique 1: strict stateful verifiable-PIR API

What it is and when to use it. The API separates a one-time digest check and proof preprocessing from ordinary queries. Inference: use it when honest servers should have near-SimplePIR cost, but a malicious server must not answer different queries using different databases.

Steps from Section 3 (pp. 5936–5937):

1. The server sends a digest `d`; the client runs `DigVer` and rejects if it is not well formed for some database.
2. The client samples a proof query `qπ` and retains state `stπ`.
3. The server returns `aπ = PrAns(pp,D,d,qπ)`.
4. The client runs `PrRec`; failure yields `⊥`, otherwise it stores reusable proof `π`.
5. For each query index, the client runs `Query`, the server runs `Answer`, and the client runs `Verify(pp,d,q,a,π)`.
6. If verification rejects, discard `π` and rerun preprocessing; if it accepts, recover the requested record.

The security definitions require perfect completeness, digest binding, and strict soundness. The authors write, “The only value π that will pass verification in the preprocessing phase is the exact value defined by pp, qπ, stπ, and the fixed database D.” (Section 3, p. 5936.) Together with perfect completeness, strict soundness makes reuse safe: except with negligible probability, an accepted response is the honest response, whose acceptance leaks no information about the client's hidden challenge.

Verus form. Inference: encode the protocol as a Rust enum for preprocessing and online states. Use `requires`/`ensures` to enforce that `Verify` consumes a proof tied to one digest, that rejection transitions to preprocessing, and that `Recover` reads the same query index that was encrypted. A `spec fn` can define the state invariant; a `proof fn` can prove that no `cast`-like online transition exists after rejection. Cryptographic binding remains an assumption.

Evidence and limits. Section 4.2 (p. 5939) requires the client to discard the challenge and proof when verification fails because rejection may leak challenge information. Inference: consistency with a fixed database does not establish freshness, availability or eligibility of a record. Digest size and client storage constrain deployment.

## technique 2: extractable SIS commitment

What it is and when to use it. The server commits to a short matrix `D` by sending `H = D A` for a random public matrix `A`. A challenge matrix `C` elicits `Z = C D`; checking `||Z||∞` and `Z A = C H` proves knowledge of a bounded opening. Repeated successful responses let an extractor recover the committed `D`, even if the server supplied a malicious digest.

Steps from Section 2.2 and Figure 1 (pp. 5933–5934): choose random `A`; send `H`; receive random binary challenge `C`; return `Z = C D`; verify `||Z||∞ ≤ B` and `Z A = C H`. If a prover gives valid responses to two challenges whose columns agree except at column `i`, choose a row `k` where those columns differ. After choosing the sign so that the challenge difference is 1, the difference of response rows `Z[k] − Z′[k]` is an opening of row `H[i]`, with norm at most `2B`. Repeating row extraction yields a matrix opening the whole commitment. Lemma 2.2 bounds the extractor's calls at `O(ℓ log ℓ / ε)` for success probability `ε > 2^(−λ+2)` and guarantees `||D||∞ ≤ 2B` with overwhelming probability.

The paper distinguishes extraction from hardness: “We note that this extractability does not rely on the hardness of SIS; a matrix D such that DA = H can be extracted from any prover that completes the protocol in fig. 1 with non-negligible probability.” (Section 2.2, p. 5933.) SIS hardness is used for computational uniqueness of the matrix (Lemma 2.3, p. 5934).

Verus form. Inference: represent matrices with fixed dimensions and specify multiplication and infinity-norm bounds. Prove the verifier equation and row-subtraction lemma with `proof fn`; use `requires` for dimensions and bounds. Verus can prove that a concrete extractor returns a matrix satisfying `D*A == H` in the model, but not lattice hardness or the probability bound.

## technique 3: verifiable linearly homomorphic encryption (VLHE)

What it is and when to use it. VLHE lets a server evaluate a committed linear function on a Regev ciphertext and prove that the output is the unique correct ciphertext. This is the algebraic engine behind the PIR protocol.

Construction 4.1 (Section 4.1, pp. 5937–5938) proceeds as follows: sample public `A`; commit to `D` with `H = D A` and `Z = C D`, where the commitment challenge is `C = Hash(A,H)`; encrypt `μ` as `u = A s + ⌊q/p⌋ μ + e`; evaluate `v = D u`; prove with a fresh `Z = C D`, where `C = Hash(A,H,u,v)`; verify `||Z||∞ ≤ ℓp` and `Z [A u] = C [H v]`; decrypt by rounding `(v − H s)/⌊q/p⌋` modulo `p`. The core relation is `D [A u] = [H v]` (equation (3), p. 5937). Under the stated assumptions, an accepted response must use the same committed `D`, except with negligible probability.

Verus form. Inference: specify matrix dimensions, modular arithmetic and the relation between `u`, `v`, `H` and `D`. A `proof fn` could establish linearity and the verifier equation; a `spec fn` could define decryption's rounding precondition. Decryption also needs a noise-bound argument. LWE security and random-oracle Fiat–Shamir would remain assumptions; arithmetic operations would need a verified implementation or explicit contracts.

Evidence and limits. Lemma 4.1 proves verification uniqueness under SIS: a different response would yield a short nonzero SIS solution. Correctness requires a larger ciphertext modulus because extraction allows `||D||∞ ≤ 2ℓp`; equation (4) gives the required bound. Batch verification combines `t` input-output pairs into one matrix equation (equation (5)), so only the hash and matrix multiplication grow with `t`; the proof matrix size and norm bound do not (Section 4.1.2, pp. 5938–5939).

## technique 4: reusable VLHE proof preprocessing

What it is and when to use it. A proof `Z = C D` can be computed before the client's PIR input is known, while keeping random `C` hidden from the server. Encrypting rows of `C` lets the server homomorphically compute the proof and prove that computation. Reuse it for many online queries until a check rejects.

Steps from Section 4.2 and Figure 6 (pp. 5939–5940):

1. Commit to `D` with `H1` and to `Dᵀ` with `H2`.
2. Sample secret binary matrix `C`; encrypt each row using public matrix `A2`, with plaintext modulus `pℓ`.
3. The server evaluates `Dᵀ` on those ciphertexts, batch-proves the result, and sends it back.
4. The client verifies the batch proof, decrypts `Z`, and checks `Z A1 = C H1`.
5. For each online ciphertext `u`, the server sends `v = D u`; the client checks `Z u = C v` and decrypts only after acceptance.
6. On failure, erase `C,Z` and restart preprocessing.

The authors explain why the challenge remains hidden: “In particular, the server does not learn any information on the challenge C during the protocol since the semantic security of the encryption hides C.” (Section 4.2, p. 5939.) A failed check may leak information about `C`, hence the mandatory restart.

Verus form. Inference: retain concrete `C` and `Z` for the runtime matrix check, with ghost state linking them to a digest. A proof could enforce invalidation after rejection. Deriving `v = D u` from `PreVerify` additionally requires the paper's probabilistic and cryptographic argument; the matrix check alone is insufficient. This proposed state-machine proof would not establish semantic security or secure erasure.

## technique 5: instantiate the construction as VeriSimplePIR

What it is and when to use it. Pack a database into a matrix `D`; split a requested index into row and column indices `(ir, ic)`. Encrypt the one-hot vector `b_ic` to obtain `u`; the server returns `v = D u`. The client verifies this ciphertext, decrypts the selected column `D b_ic`, and returns its entry at row `ir`. Apply the preprocessed VLHE protocol to this matrix function.

Section 5 and Construction 5.1 (pp. 5940–5941) specify setup of two public matrices, digest creation, preprocessing, ordinary `Query`, `Answer`, `Recover`, and `Verify`. The client decrypts `v` and returns the indexed entry only after `PreVerify` accepts. The construction assumes SIS and LWE for the listed dimensions and modulus.

Evidence. The implementation uses C/C++, with computational benchmarks on one thread of a 2.5 GHz Intel i7 with 32 GB RAM, Ubuntu 20 and clang++ version 10 with `-O3` (Section 6, p. 5941). For one-bit database entries, VeriSimplePIR without the honest-digest assumption has 12–40% online compute slowdown and 40–50% communication increase over SimplePIR; with that assumption, communication overhead is 13–20% and online computation is faster in these benchmarks because parameters use a 64-bit modulus, versus 32 bits for the comparison SimplePIR parameters (Section 6, p. 5942). The offline-runtime sentence on p. 5942 is malformed; its apparent intended figures are about 100 seconds for 4 GB and 200 seconds for 8 GB on one core (Inference). The proposed password-checking application uses roughly 400 million SHA1 hashes of 20 bytes each in an approximately 8 GB table and requires roughly 800 MB of client storage; a full application implementation is left for future work (Section 7, p. 5943).

Inference: these denominators and settings matter; the percentages describe the paper's one-bit-entry, parameter-optimized benchmarks and do not establish performance on arbitrary databases or hardware. APIR+ has about 5× the runtime of VLHE PIR and APIR about 25× for one-bit entries, while APIR+ has about 4.5× smaller offline communication; these comparisons use non-preprocessed VLHE PIR without the honest-digest assumption, not preprocessed VeriSimplePIR (Section 6.1, p. 5942).

## what is proved, measured, and trusted

The paper proves statistical extraction independently of SIS, uses SIS for binding and response uniqueness, and uses LWE for privacy; its noninteractive commitments use the random-oracle Fiat–Shamir transform (Sections 2–5 and Appendices A–C). It measures C/C++ implementation overhead (Section 6). Inference: these results do not establish that the code matches the algorithms, that the database is current, or that a server remains available. Deployment would also depend on correct arithmetic, parameter choices, hash implementation, protection of client secrets, compiler and hardware, and the honest-digest assumption when that optimization is enabled.

## techniques for the catalog

- strict stateful verifiable-PIR API: preprocess one proof, reuse it for accepted responses, and restart after any rejection
- extractable SIS commitment: commit to a bounded matrix and answer random challenges so successful behavior exposes a unique database
- verifiable linearly homomorphic encryption: prove that a ciphertext response is the committed linear function's unique output
- reusable proof preprocessing: hide a random challenge in encrypted form, compute its proof once, and check every later response algebraically
- matrix-packed PIR instantiation: encode database columns as one-hot linear queries and apply the reusable VLHE proof
