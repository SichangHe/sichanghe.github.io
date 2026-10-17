# Fast RS-IOP Multivariate Polynomial Commitments and Verifiable Secret Sharing
(authored by agents unless marked 🧑)
Tag: `zhang2024fast`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/zhang-zongyang)

## problem and claimed results

A polynomial commitment scheme (PCS) lets a prover commit to a polynomial and later prove evaluations. The paper targets multivariate polynomials and asynchronous verifiable secret sharing (AVSS), where a dealer distributes shares so that enough honest parties can reconstruct a secret without timing assumptions and despite up to t corrupted parties. Its contributions are PolyFRIM, an FRI-based multivariate PCS with linear prover complexity, a one-to-many extension, and FRISS, an AVSS scheme built from it. The abstract states: “We propose PolyFRIM, a fast RS-IOP-based multivariate PCS with optimal linear prover complexity, 5-25× faster than prior arts while ensuring competent proof size and verification.” (Abstract, p. 3187)

Inference: the claims are cryptographic arguments with pen-and-paper proofs (Appendices B–E), not machine-checked proofs. They depend on Reed–Solomon proximity results, Merkle trees from collision-resistant and non-invertible hash functions, random challenges, and a large field. The paper’s headline AVSS claim is: “FRISS, our new AVSS enabled by PolyFRIM (cf. [3]), exhibits a dealer complexity of O(n2 log n) for party number n, the same as Bingo [1].” (Sect. 1.1, p. 3188)

## technique: polynomial commitment and FRI foundation

A PCS has `Gen` (public parameters from a security parameter, degree bound, and number of variables), `Commit` (polynomial to commitment), `VerPoly` (checks an opening of the commitment), and `Eval`, an interactive argument that the committed polynomial evaluates to a claimed y at a point x (Definition 2.2, Sect. 2.1, p. 3191). FRI proves that a committed vector is δ-close to a Reed–Solomon codeword of a stated degree bound. Theorem 2.1 gives FRI soundness error ε_FRI = O(|L|/|F|) + negl(q, d/|L|), where the verifier makes q = O(λ) queries (Sect. 2.2, p. 3191).

How to use this foundation (FRI is Protocol 5 and FRI-PC is recalled in Appendix A, pp. 3200–3201):

1. Choose a finite field F, multiplicative coset L, degree bound d, and query count q = O(λ).
2. Evaluate the polynomial over L and commit to the vector with a Merkle tree.
3. Run FRI rounds: split f̂ as ĝ(X²) + X·ĥ(X²), receive a random α, fold to ĝ + αĥ, commit to it on the squared domain; send the last polynomial directly.
4. For each of q queries, the verifier samples β from L, checks Merkle openings, and checks that the pairs (±β^(2^(i−1)), f̂_{i−1}(±β^(2^(i−1)))) and (α_i, f̂_i(β^(2^i))) lie on a common line; it rejects if any check fails.
5. FRI-PC proves f̂(x) = y by batch-FRI on f̂ and (f̂(X) − y)/(X − x).

Verus form (Inference: the paper uses algebraic protocols, not Verus). Represent field elements with a verified modular-arithmetic type and define polynomial evaluation, domain membership, and Merkle-path checking as `spec fn`s. An executable verifier can have `requires` clauses for field modulus and path shape and `ensures` clauses stating that an accepted path reconstructs the committed leaf. `proof fn`s can prove local arithmetic and path concatenation. Verus can check a concrete verifier and a certificate’s internal consistency; it cannot prove FRI’s probabilistic soundness or the cryptographic collision resistance of the hash without an external mathematical model and assumptions.

## technique: rolling batch FRI

HyperPlonk must check µ univariate polynomials of halving degree. Running FRI µ times separately costs O(n log n) prover but O(log³ n) verifier and communication; a batch FRI on one domain L_0 reduces those to O(log² n) but costs O(n² log n) prover “due to polynomial evaluations using FFT” (Sect. 3.1, p. 3192). Rolling batch FRI resolves this tension: in each round, the folded current polynomial is combined with the next tested polynomial, which has the same degree bound and domain, so µ FRIs become one. The authors state: “We propose rolling batch FRI (Protocol 1) to perform these µ low-degree tests with O(n log n) prover complexity and O(log2 n) verifier and communication complexities.” (Sect. 3.1, p. 3192)

How to apply Protocol 1 (p. 3193):

1. For each polynomial f̂_i and its domain L_i (L_{i+1} = squares of L_i), commit to f̂_i restricted to L_i; set the current polynomial f̂^(0) = f̂_0 (step 1).
2. In round i, decompose f̂^(i−1)(X) as ĝ_i(X²) + X·ĥ_i(X²) (step 3).
3. The verifier sends α_i from F; the prover forms p̂^(i)(X) = ĝ_i(X) + α_i ĥ_i(X) and commits to its evaluations on L_i; in the last round it sends p̂^(i)’s coefficients (steps 4–8).
4. Form the next current polynomial f̂^(i) = p̂^(i) + α_i²·f̂_i, reusing the same challenge squared (step 9).
5. Repeat q times: the verifier samples β from L_0, checks Merkle openings of f̂_i and p̂^(i) at ±β^(2^i), and checks that the three corresponding evaluation pairs lie on a common line (steps 10–13).
6. Accept only if all checks pass (step 14).

Theorem 3.1 gives soundness error ε_FRI = |L_0|/|F| + ((1+ρ)/2)^q + negl(λ) for δ ∈ (0, (1−ρ)/2] (p. 3192). Ordinary FRI soundness rests on correlated agreement over lines (u_0 + λu_1); here the tested vector combines three vectors, so the proof uses “generalized correlated agreement over span spaces” for u_0 + λu_1 + λ²u_2 (p. 3192; proof in Appendix C).

Verus form (Inference). Encode each round as an immutable ghost record containing domains, commitments, challenge values, and queried evaluations. Define `spec fn` predicates for a valid decomposition and common-line equation. A `proof fn` can show that each accepted round preserves the relation between the current polynomial and the committed vectors. An executable verifier can use `requires` for distinct domain points and field inverses, and `ensures` for acceptance implying every checked line equation. The probabilistic bound and random-oracle/hash assumptions remain outside the Verus proof.

## technique: PolyFRIM multivariate transformation

PolyFRIM first builds PC_m, an improved multilinear PCS (HyperPlonk with rolling batch FRI and a random masking polynomial), then reduces a µ-variate polynomial of degree d = 2^t − 1 to a multilinear polynomial with µ·t variables. Each original coordinate x_i becomes t coordinates x_{i,j} = x_i^(2^(j−1)). The paper says: “Any evaluation f˜(x1, . . . , xµ ) is equivalent to the evaluation f˜′(x1,1 , . . . , x1,t , . . . , xµ,1 , . . . , xµ,t ), where f˜′ is a µ · t-variate multilinear polynomial” (Sect. 3.3, p. 3194).

How to use it:

1. Set t = log(d+1) and construct the multilinear f̃′ and r̃′ from f̃ and the masking polynomial r̃ (`Commit_F`, p. 3194).
2. Commit with PC_m: Merkle-commit to f̂|L_0 and r̂|L_0; `VerPoly_m` checks the Merkle openings, decodes, and checks consistency with f̃ and r̃ (Sect. 3.2, p. 3193).
3. For an evaluation (`Eval_m`), send y = f̃(x) and y_r = r̃(x); receive a random α; set f̂_0 = f̂ + αr̂.
4. For each i, compute f̂_i = ĝ_{i−1} + x_i·ĥ_{i−1} from the even/odd decomposition of f̂_{i−1} and commit to it; the verifier computes f̂_µ = y + α·y_r itself (Eval_m step 3, pp. 3193–3194).
5. Run rolling batch FRI over the f̂_i (Eval_m step 4).
6. In q queries, check the Merkle openings and that the evaluation triples lie on two common lines, one for Equation (2) and one for the rolling batch FRI (Eval_m step 5, p. 3194).

The random multilinear r̃ masks the evaluations: “To mask the evaluations on { f̂_i }i∈[µ] , the prover chooses a random µ-variate multilinear polynomial r̃(X1 , . . . , Xµ ), and sets f̂0 to be the univariate polynomial determined by f̃ + αr̃ instead of f̃ itself for α ←$ F from the verifier.” (Sect. 3.2, p. 3193) Theorem 3.2 states that PC_m is a PCS with a 2q-bound knowledge-leaking property (a verifier learns at most 2q evaluations and nothing else); Theorem 3.3 transfers this to PolyFRIM (both p. 3194). The PCS is not zero knowledge; the paper argues this weaker property suffices for AVSS (Sect. 2.1, p. 3191).

Complexity is O(µd^µ log d) for commitment, O(d^µ) for proving, and O(µ² log² d) for verification and communication (Sect. 3.3, p. 3194). Table 1 assumes a field with a large multiplicative coset and hash-based (Merkle) commitments (p. 3189).

Verus form (Inference). Model polynomials as ghost coefficient sequences and define evaluation and the multilinearization map with `spec fn`. Prove a transformation lemma with `ensures eval(f,x) == eval(transform(f), transformed_point(x))`. Use `requires` for degree and domain bounds and `proof fn` lemmas for even/odd decomposition. A Verus proof can validate deterministic algebraic identities over a modeled field, but does not establish the paper’s knowledge-leakage bound or the secrecy of random masking unless randomness, adversary views, and probability are formalized separately.

## technique: one-to-many proofs

A one-to-many PCS proves n² distinct evaluations of one bivariate polynomial, one per verifier, more cheaply than n² separate proofs. Repeating PolyFRIM for every verifier costs O(n³ log n), because each verifier’s evaluation vector and random challenges differ. The paper makes evaluation vectors “partially the same” and challenges “sharable”. It reports: “We extend PolyFRIM for (n, n)-degree bivariate polynomials to one-to-many proofs with O(n2 log n) prover complexity.” (Sect. 3.4, p. 3194)

How to apply it:

1. Reverse the order of each evaluation vector (from (x^(2^0), …, x^(2^(t−1))) to (x^(2^(t−1)), …, x^(2^0))); this is equivalent after reversing the coefficient vector.
2. Set (x_i, y_j) = (w_N^i, w_N^j), roots of unity with N = n = 2^t, so round k has only 2^k distinct values of x_i^(2^k) instead of n; evaluation-vector work becomes O(n² log n) (p. 3194).
3. Make challenges shared: in each round, commit the per-verifier challenges in a Merkle tree, use the root as the round’s challenge, and send each verifier its path from its own challenge to the root (pp. 3194–3195).
4. Build the proofs as a binary tree of polynomials forking from a single root f̂_0, so one computation serves all verifiers below it (Figure 1 and `Eval_otm.Open`, p. 3195).
5. Each verifier checks Merkle paths for commitments and aggregated challenges, then runs `Eval_F.Verify` (`Eval_otm.Verify`, p. 3196).

Theorem 3.4 states that `Eval_otm` is a non-interactive argument; its Fiat–Shamir variant relies on ZXH+22’s proof [36, Theorem 4] (p. 3196). Per-party verifier and communication cost stays O(log² n).

Verus form (Inference). Represent the pair-to-point map as a `spec fn` and prove injectivity for distinct required pairs. Use `requires` to require the root-of-unity domain and `ensures` to show that each verifier’s proof opens the same committed polynomial at its assigned point. Ghost caches can represent shared intermediate commitments; proof functions can establish that reusing a cache is equivalent to recomputation. Verus can verify indexing and reuse correctness, not the communication-complexity asymptotic claim by itself.

## technique: FRISS asynchronous verifiable secret sharing

FRISS uses a (t,t)-degree bivariate polynomial f(X,Y) with f(z,0) = s and n = 3t+1 parties; it follows eAVSS with PolyFRIM in place of KZG. The dealer commits to f and a random masking polynomial r, creates n² evaluation proofs with one-to-many PolyFRIM, broadcasts commitments, and sends each party its univariate share f̂(w_N^i,Y), its masking share, and evaluations with proofs. Because FRI-based PCSs lack homomorphism, the dealer sends each party the evaluations and proofs it will forward, and all per-party commitments derive from one commitment to f, which keeps them consistent (Sect. 4, p. 3196). Messages are Commit and Share (dealer), Echo and Ready (sharing), and Rec_strong and Rec_weak (reconstruction). The paper summarizes the sharing check: “Honest party Pi first checks the correctness of Ci∗ , then checks if the received evaluations are valid by Evalotm .Verify.” (Sect. 4, p. 3197)

How to apply it:

1. Dealer samples f and r with f(z,0) = s, commits to both, and opens all n² evaluations with `Eval_otm.Open` (Algorithm 2, p. 3196).
2. Dealer broadcasts the commitments and sends each party its share, masking share, evaluations, and proofs.
3. A recipient checks its commitment C_i∗ and every evaluation proof; if all pass, it sets `honest_dealer = 1` and sends Echo messages with the evaluations and proofs.
4. On 2t+1 valid Echo messages and `honest_dealer = 1`, send Ready; on t+1 Ready messages, send Ready if not yet sent; on 2t+1 Ready messages, wait for t+1 valid Echo messages and interpolate the share (Algorithm 3, p. 3197).
5. During reconstruction, a party with `honest_dealer = 1` sends Rec_strong with f̂_i(0) and a proof; others send Rec_weak without a proof. With t+1 valid proofs, interpolate f̂(X,0); otherwise decode (e.g., Berlekamp–Welch) when `|decode_set| + 2|valid_rec| ≥ 3t+1` (Algorithm 4, p. 3197).

Theorem 4.1 states that FRISS is an (n,t)-AVSS scheme as in Definition 2.4: liveness, agreement, correctness, and secrecy, for n ≥ 3t+1 (Definition 2.4, p. 3192; Theorem 4.1, p. 3197; proof in Appendix E). Secrecy comes from PolyFRIM’s 2q-bound knowledge leaking “by setting threshold t = p + 2q for p corrupted parties” (Sect. 4, p. 3196). Complexity is O(n² log n) dealer computation, O(n log² n) per-party computation, and O(n² log² n) total communication (p. 3197).

Verus form (Inference). Model each party’s protocol state and message as Rust enums, with ghost sets for Echo and Ready messages. Use `requires` for n ≥ 3t+1, authenticated channels, and valid polynomial domains; use `ensures` for state transitions that restrict `valid_rec` to verified evaluations. Loop `invariant`s can maintain that valid sets contain only verified messages and that reconstruction interpolation uses distinct points. `proof fn`s can establish deterministic interpolation and Reed–Solomon decoding conditions. Asynchronous delivery, Byzantine scheduling, secrecy, and probabilistic masking remain assumptions unless a full adversarial semantics is formalized.

## empirical evidence and limits

The implementation is about 1,600 Rust lines for PolyFRIM and 1,800 for FRISS, run on an AMD Ryzen 3900X with 80 GB RAM and Ubuntu 22.04 LTS, without parallelization, averaging 10 executions (Sect. 5, p. 3197). The field is F_{p²} with p = 2^61 − 1; for all FRI-based schemes the code rate is 1/8 and the query repetition number is 34, “providing 100 bits of security [6, Conjecture 8.4]” (pp. 3197–3198). The hash is blake3.

For multivariate polynomial sizes 2^5 through 2^20, PolyFRIM at size 2^20 takes 4.4 s to prove, “6×, 10×, and 25× faster than Virgo, HyperPlonk, and Bulletproofs, respectively” (Fig. 2 and Sect. 5.1, p. 3198). The authors implemented HyperPlonk themselves and it ran out of memory at size 2^19. PolyFRIM’s verifier time and proof size are less than 50% and 10% worse than Virgo’s. One-to-many tests, on univariate polynomials (Figure 3), report 0.07 s for 2^12 proofs and 49.4 s for 2^20 proofs, prover time 25–100× faster than AMT and 4–7× faster than ZXH+22 (Sect. 5.2, p. 3198). Inference: these are measurements for the stated hardware, parameters, and implementations, not general bounds over PCS designs.

For AVSS, Figure 4 compares only the PCS work of dealer and per-party for n = 3t+1 and degree-t polynomials. FRISS dealer time is 4–800× faster than eAVSS and HAVEN-1/2, and per-party time is 0.5–1.2× that of eAVSS and HAVEN-1; Bingo shifts proof generation to parties, so FRISS is 10× slower for the dealer but 10× faster for parties (Sect. 5.3, p. 3199). The paper states “We omit PCS-irrelevant parts (e.g., broadcast/encryption)”, so this is a PCS-focused measurement.

Inference: the theorems are proved under the stated definitions; what remains trusted includes finite-field arithmetic, Merkle hash collision resistance and non-invertibility, the random-oracle model for Merkle extractability, the Fiat–Shamir variant from [36], the proximity-gap conjecture behind the 100-bit parameter choice, implementation correctness, and authenticated private asynchronous channels with reliable broadcast. A Verus implementation could reduce bugs in message-state transitions and polynomial bookkeeping, but it would not replace the cryptographic reductions or establish that the implementation’s field and hash libraries meet the abstract model.

Inference: the threat to agent-written verified Rust is high where generated code handles cryptographic transcripts, roots of unity, interpolation, or Byzantine message sets. A contract can prove index bounds and that accepted proofs satisfy encoded equations while still proving the wrong field, domain, or secrecy statement. VL should reuse this paper’s explicit transcript types, threshold predicates, and proof-carrying state transitions. It should not redo the already demonstrated rolling FRI, one-to-many reuse, or FRISS asymptotic claims without a new security model or independently measured implementation.

## techniques for the catalog

- FRI low-degree testing — use Merkle openings and recursive degree reduction to prove a vector is close to a Reed–Solomon codeword
- rolling batch FRI — fold the current polynomial and combine it with the next tested polynomial of the same degree so many low-degree tests share one FRI
- multivariate-to-multilinear PCS — transform a degree-d multivariate polynomial into a multilinear one by repeated squaring of coordinates and mask evaluations with a random polynomial
- one-to-many PolyFRIM — use root-of-unity evaluation points and Merkle-aggregated shared challenges to prove n² bivariate evaluations in O(n² log n)
- FRISS AVSS — distribute proof-carrying bivariate shares with Echo/Ready and reconstruct by interpolation or Reed–Solomon decoding
Checked 2026-10-16 against the full paper by a Claude agent (mid-paper quote: "This enables the prover to save the computation overhead by reusing procedures as much as possible."): what I checked: every quotation, number, theorem, protocol step, and section/page reference against the paper text, and the O(n² log n) batch-FRI formula against the PDF image; what I changed: fixed two misquotes ("of" missing, "variable" for "variate"), replaced a garbled Algorithm 3 quote, corrected pages (Theorems 3.2–3.3 p. 3194; Algorithms 3–4, Theorem 4.1, FRISS complexity p. 3197; Sect. 5.3 p. 3199), corrected Protocol 1 step 9 (α_i² not a second challenge), N = n = 2^t, x_{i,j} = x_i^(2^(j−1)) (not Boolean), the shared-challenge mechanism, Ready amplification and strong/weak message rules, rewrote the FRI steps and HyperPlonk tension, added the t = p + 2q secrecy threshold, marked analysis as Inference, and set the link to the publisher page from the paper text; what I did not check: the appendix proofs' correctness, the figures' plotted values beyond the text, and the Verus sketches (agent inference).
