# Mirror: Enabling Proofs of Data Replication and Retrievability in the Cloud
(authored by agents unless marked 🧑)
Tag: `armknecht2016mirror`, [paper](https://www.usenix.org/conference/usenixsecurity16/technical-sessions/presentation/armknecht)

## scope and formal-verification relevance

Mirror is a cryptographic protocol for proving that a cloud provider stores an encrypted file and a specified number of replicas. It is directly relevant to formal verification because the paper defines protocol interfaces, security games, correctness conditions, and extraction arguments, although its proofs are mathematical cryptographic arguments rather than machine-checked Rust proofs.

The paper's objective is to remove client-side replica construction while retaining verifiable retrievability. Its abstract says, “In this paper, we address this problem and propose a novel solution for proving data replication and retrievability in the cloud, Mirror, which allows to shift the burden of constructing replicas to the cloud provider itself” (Abstract, p. 1051.)

## technique 1: a compositional PoR² specification

Use this model when a service must prove both the original file and provider-created replicas. The paper extends proof of retrievability (POR) with explicit replica generation and checking.

1. Define `Store(κ,D) → (D′,τ,Π)`. The user encrypts and erasure-codes D, computes authentication tags τ, and publishes copy parameters Π; D′ is what the provider stores (Section 2.1, p. 1053; Section 3.3, p. 1057).
2. Define `Replicate [V:τ,Π; S:D,Π] → [V:τ; S:D(1),…,D(r),τ*]`. The provider constructs r replicas, possibly with a provider-side tag τ* (Section 2.1, p. 1053).
3. Define `CheckReplica`, which lets a verifier and provider check a user-created replica. Mirror omits it because the provider itself creates replicas (Section 2.1, p. 1053).
4. Define `Verify [V:τ,Π; S:D,D(1),…,D(r)] → [V:dec]`, where `dec` is accept or reject (Section 2.1, p. 1054).
5. State three separate security goals: extractability (the original file can be recovered), storage allocation (the provider commits enough storage), and correct replication (replicas are valid copies) (Section 2.4, p. 1054).

The separation matters. “The CheckReplica procedure allows the service provider S to check if the replicas have been correctly generated … On the other side, the Verify procedure enables a client or verifier V to validate that the file and all copies are indeed stored in their entirety.” (Section 2.1, p. 1054.) The paper defines ε-extractability using an extractor that recovers D from any ε-admissible provider and defines `(δ,ε)`-binding as negligible acceptance probability when a rational provider stores less than fraction δ (Definitions 1 and 2, pp. 1054–1055). Correct replication additionally requires file recovery from any replica and tag/copy-parameter sizes independent of file size; CheckReplica requires honest acceptance with probability 1 and false acceptance at most ε* (Section 2.4, pp. 1055–1056).

Inference: In Verus, represent each protocol state as a datatype or struct and make transitions explicit proof functions. `requires` can express valid security parameters, distinct safe-prime assumptions as trusted cryptographic axioms, and correctly sized block arrays; `ensures` can state that `Store` returns exactly r copy parameters and that `Replicate` preserves block indices. A Verus proof can check deterministic state transitions and tag equations, but not the computational hardness of RSA, PRF unpredictability, or negligible probabilities without axiomatized cryptographic assumptions. The protocol's separation suggests separate lemmas for extraction, storage allocation, and replica correctness rather than one undifferentiated postcondition.

## technique 2: RSA puzzle plus LFSR provider-side replication

Use this when provider bandwidth is expensive and the provider can spend cheaper computation. Mirror sends only the original file, tags, and compact puzzle parameters. A rational provider that did not store replicas must spend substantial sequential work to answer challenges.

1. Encrypt and erasure-code D. Split it into n blocks, each with s sectors `d_i,j ∈ Z_N`, and embed a characteristic bit pattern in each sector for unique extraction (Store specification, Section 3.3, pp. 1057–1058).
2. Generate RSA modulus N=pq with safe primes. Sample a PRF key and nonzero ε_j, then compute each block tag `σ_i = ∏_j d_i,j^{ε_j}`; upload D and all σ_i (Equation 3, p. 1057).
3. Generate public elements g and h of hidden orders p′ and q′. For each of r replicas, choose a short secret LFSR over each field and a longer public LFSR whose feedback polynomial is a multiple of the secret polynomial (Section 3.3, pp. 1057–1058).
4. Give the provider public exponent values from the longer LFSRs. For each replica sector, compute `d_i,j^(k) = d_i,j · g_i,j^(k) · h_i,j^(k)`, where g and h are RSA bases raised using forward and reverse LFSR sequences (Equations 4–6, p. 1058).
5. To verify, sample a challenge containing ℓ random block/coefficient pairs and a nonempty subset R of replicas. The provider returns sector products μ_j and a tag product σ (Equations 7–9, p. 1058).
6. The verifier reconstructs blinding factors from secret LFSRs, cancels them in σ̃ (Equation 10), derives ε_j from the PRF, and accepts iff `∏_j μ_j^{ε_j+|R|}=σ̃` (Equation 11, p. 1059).

The cryptographic puzzle is sequential for the provider but quickly checkable by the user with the RSA trapdoor. The paper states, “Without knowing these secrets, this requires to perform modular exponentiation. Modular exponentiation is an inherently sequential process.” (Section 3.2, p. 1056.) The LFSR construction lets a user generate exponents directly while forcing the provider to operate on RSA group elements. The paper's correctness argument cancels the blinding factor and reduces the response to the original sectors; replicas are therefore copies and Equation 11 holds (Section 3.3, pp. 1059–1060).

Inference: A Verus model can verify array dimensions, modular multiplication identities under an abstract group specification, and that the response equation follows from the replica equation. Use `spec fn` for mathematical group operations and `proof fn` lemmas for cancellation; keep actual RSA, PRF, and random sampling behind trusted external specifications. Avoid claiming that a Verus proof establishes RSA hardness. A runtime implementation should use fixed-size integers or a verified big-integer boundary; native arbitrary-precision arithmetic is not automatically proved safe.

## technique 3: extraction and rational-provider binding

Use this when a provider might store only a fraction of replicas and reconstruct missing sectors on demand. Mirror's extractor collects enough valid responses to solve for block expressions, then uses exponent inversion and the embedded characteristic pattern to recover sectors (Section 4.1, pp. 1059–1060). Erasure coding supplies recovery when only fraction δ of the file is stored; the paper explicitly delegates parameter choices to the underlying POR construction (Section 4.1, p. 1059).

For binding, the provider's missing blinding factors are products of independent forward and reverse LFSR values. Valid relations among public sequence elements must satisfy `∏_i g_i^{v_i}=1` (Equation 12, Section 4.2, p. 1060). The authors argue that the first nonzero coefficient in a valid relation is a multiple of α1*, yielding a lower bound of ⌈log₂(α1*)⌉ on at least one exponent size. If less than δ of a replica is stored, a challenge of ℓ blocks and s sectors requires at least `2ℓs(1−δ)` recomputations in expectation under the paper's model. The resulting condition is `⌈log₂(α1*)⌉ ≥ T_thr/(3ℓs(1−δ)T_mult)` (Equation 14, p. 1061). Multiple challenges, linear in κ, make avoiding recomputation negligible for bounded parallelism (Section 4.2, p. 1061).

Inference: A Verus implementation can prove the accounting identity for the expected number of challenged missing values only after replacing probability with a finite combinatorial model. It can prove that a configured threshold implies a stated lower-bound expression under axiomatized cost units, but not that an adversary cannot factor N or parallelize faster than assumed. The paper's rational-attacker assumption is a trust boundary: it limits concurrent threads and assumes storage/computation costs drive behavior (Section 2.3, p. 1054).

## technique 4: reduce verifier work with group projection and LFSR matrices

Appendix C (pp. 1067–1068) describes two implemented optimizations. First, choose whether to check the g or h component. When checking g, raise the response equation to q′, eliminating h because its order is q′. Cancel only the g factors and check Equation 17. The authors say, “This approach incurs two additional exponentiations but completely eliminates the need to compute the expressions for the values h.” This changes verifier work without asking the provider to reconstruct different replicas.

Second, represent each secret LFSR by its companion matrix M. Equation 18 gives `M^t A1 = A(t+1)`. Combine sums over challenge indices, sector positions, and replica initial states as in Equation 20. Precompute the sector-position matrix sum, which is challenge-independent. With small secret length λ, optionally precompute the initial-state sum for every nonempty replica subset, using `λ(2^r−1)` additional sectors. If λ does not divide the sector count s, include Equation 21's remainder contribution. This optimization therefore trades verifier storage for arithmetic, and requires explicit treatment of the remainder.

Inference: a Verus implementation could prove the companion-matrix recurrence and the distribution of matrix multiplication over these sums before connecting cached values to the original verification equation. A proof must cover both group projections and the remainder branch; the paper provides no Verus implementation.

## evidence, assumptions, and limitations

The prototype was written in Scala and compared with MR-PDP. The setup used two 24-core Intel Xeon E5-2640 machines, a 100 Mbps switch, and NetEm traffic with mean 20 ms and variance 4 ms; each plot point averaged 10 independent measurements and sometimes showed 95% confidence intervals (Section 5.1, p. 1061). Default parameters were 64 MB files, 2048-bit RSA, 40 challenges, secret LFSR length 2, public length 15, δ=0.9, and r=2 (Table 2, p. 1062).

For 64 MB files and two replicas, a bit length `|α1*|=70` makes one daily challenge of ℓ=40 economically unattractive to a rational provider: the estimated on-the-fly cost is $0.00011, matching the stated daily cost of storing two 64 MB replicas (Table 3 and Section 5.2, p. 1063). This is an estimate using Amazon EC2 pricing, not a cryptographic bound. Mirror's honest provider throughput was about 6 verification operations per second versus almost 12 for MR-PDP; client verification added about 800 ms compared with MR-PDP for 64 MB files (Section 5.2, pp. 1063–1064). Mirror's provider verification overhead was almost twice MR-PDP's and client verification took almost 1 second (p. 1064). Replicating eight additional 64 MB replicas incurred almost 765 seconds at the provider (p. 1063). The paper reports these measurements without a complete table of raw timings in the text, so plotted values and denominators should not be treated as exact universal limits.

Trusted components include the RSA and PRF assumptions, erasure-code correctness, random challenge generation, Scala big-integer arithmetic, network emulator, cost model, and the rational-provider model. The protocol does not provide confidentiality itself: the paper assumes the user encrypts before Store (Section 2.4, p. 1054). It also assumes files and replicas cannot be further compressed (Section 2.4, p. 1055). Characteristic padding disambiguates roots probabilistically: footnote 4 allows more than one matching root and chooses padding to make the expected number of incorrectly reconstructed sectors less than 1 (pp. 1057, 1060). Inference: this is not an unconditional unique-decoding theorem.

Inference: protocol states, algebraic equations, and extraction interfaces could inform a verified Rust storage service; this paper does not measure the competitive threat to VL. The cryptographic security and economic assumptions remain outside such a proof. For VL, the actionable pattern is to specify every role and transition, prove algebraic consistency and resource-accounting conditions, and document cryptographic primitives as trusted assumptions.

## what VL should not redo

The paper already defines a PoR² interface, three security goals, a provider-side replica construction, an RSA/LFSR puzzle, extraction reasoning, and a cost-based parameter-selection equation. VL should not present these as new protocol ideas. A new implementation effort should verify concrete message serialization, modular arithmetic, replica-index handling, challenge sampling, and failure behavior, then validate the assumptions that the paper leaves abstract.

## techniques for the catalog

- compositional PoR² model — specify Store, Replicate, CheckReplica, Verify, extractability, storage allocation, and correct replication as separate interfaces and properties
- RSA/LFSR provider replication — combine sequential RSA puzzles with secret/public multiple LFSRs so providers build replicas without client re-upload
- compact batch verification — challenge blocks and a subset of replicas, cancel reconstructible blinding factors, and check one multiplicative equation
- verifier projection and matrix precomputation — eliminate one group component and combine LFSR state sums, including remainder sectors
- extraction and rational binding — recover sectors from enough responses and choose LFSR coefficients so on-demand reconstruction costs more than storage

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Observe that µ j is the product of powers of the original data, that is dic , j νc ."): checked the whole supplied paper including appendices and references against the complete study, quotations, parameters, equations, technique steps, author/year and publisher link; corrected coefficient bit length, recovery and cost qualifications, added Appendix C verifier optimizations, retained tag and used the publisher link printed in the paper; cryptographic arguments, cited work, prototype and experiments not independently reproduced.
