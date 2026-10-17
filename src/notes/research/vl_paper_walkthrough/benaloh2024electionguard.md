# ElectionGuard: a Cryptographic Toolkit to Enable Verifiable Elections
(authored by agents unless marked 🧑)
Tag: `benaloh2024electionguard`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/benaloh)

## scope and result

ElectionGuard is a deployable end-to-end verifiable election toolkit. It separates cryptographic operations from existing voting equipment, publishes encrypted ballots and proofs, and lets voters or independent programs check the record. The paper's abstract says, “ElectionGuard is a flexible set of open-source tools that—when used with traditional election systems—can produce end-to-end verifiable elections whose integrity can be verified by observers, candidates, media, and even voters themselves.” (Abstract, p. 5485.) The design has three phases: guardians jointly generate keys, devices encrypt ballots and return confirmation codes, and a quorum of guardians decrypts the tally and publishes a record (Section 1, pp. 5485–5486).

Inference: this paper teaches cryptographic evidence protocols rather than a Verus program-verification method. Its useful lesson for VL is to make evidence objects and checks explicit, deterministic and independently replayable. A Verus implementation could verify parsing, arithmetic and state-machine transitions, while cryptographic assumptions, random-oracle modeling and election administration remain trusted.

## technique 1: distributed key generation with verifiable secret sharing

What it is and when to use it. Guardians jointly create a public ElGamal key and hold shares of its private key. A quorum `k` of `n` guardians can later decrypt; privacy requires fewer than `k` compromised guardians. Use this when confidentiality must survive fewer than `k` compromised guardians and when the public record must expose enough evidence to detect a malicious administrator.

Steps from Section 2.5 (pp. 5488–5490):

1. Each guardian chooses a random polynomial of degree `k−1`, publishes Feldman commitments to its coefficients, chooses a share-encryption key, and publishes Schnorr proofs that it knows the openings of its coefficient commitments.
2. It sends each polynomial evaluation to its recipient guardian encrypted under that guardian’s share-encryption public key.
3. Each recipient checks every Schnorr proof and checks that the received evaluation matches the published commitments.
4. Guardians set the public key to the product of constant-term commitments and each private share to the sum of received evaluations.
5. They run the same protocol a second time for a separate key used for non-vote data.
6. Each guardian’s software displays a hash of its transcript view for comparison with the election record. Any failed check causes a complaint, an out-of-band investigation and a restart from scratch, possibly with replacement guardians.

Each recipient checks `g^{P_i(j)} = ∏_{ℓ=0}^{k−1} K_{i,ℓ}^{j^ℓ}` for every guardian `i` (Section 2.5, p. 5489). The paper proves IND-CPA security by reduction to standard ElGamal: Theorem 1 states security for static corruption of at most `k−1` guardians, assuming standard ElGamal is IND-CPA secure with the same parameters (p. 5489).

Verus form. Inference: encode guardian state and polynomial shares as Rust structs; use `requires`/`ensures` to state commitment consistency, quorum bounds and transcript-hash equality; use `proof fn` lemmas for polynomial evaluation and Lagrange reconstruction. Runtime secrets need protected storage; ghost values can describe their mathematical properties. Cryptographic primitives should have explicit contracts. A Verus proof can establish that an implementation checks all listed commitments, but it cannot prove discrete-log hardness or the random-oracle assumption.

Evidence and limits. ElectionGuard uses a 4096-bit prime and a 256-bit subgroup (Section 2.3.2, p. 5487). Verifiability does not depend on the number of honest guardians, but privacy does: the authors state that privacy depends on fewer than `k` compromised guardians (Section 2.5, pp. 5488–5489). The record must be publicly accessible with an identical view for all verifiers (Section 2.2, p. 5486). Guardians are still trusted to run correct software and protect shares; the paper later notes that a ballot device can leak nonces despite guardian checks (Section 2.8.3, pp. 5494–5495).

## technique 2: exponential ElGamal with ballot well-formedness proofs

What it is and when to use it. Votes are encoded as powers of a group element so multiplying ciphertexts adds vote values. Section 2.3.2 introduces the idea using generator `g`; the actual selection encryption in Section 2.6.2 uses public key `K` as the encoding base. Each selection ciphertext carries a zero-knowledge proof that it encrypts an allowed value. This supports homomorphic tallying without decrypting individual ballots.

Steps from Sections 2.3.2, 2.6.1 and 2.6.2 (pp. 5487, 5490–5491): choose subgroup parameters and generator `g`; derive per-selection randomness from the ballot identifier hash, contest and selection indices, and secret ballot nonce; compute `(α, β) = (g^ξ, K^(ξ+σ))`, encoding selection `σ` as `K^σ`; then attach a disjunctive Chaum–Pedersen proof for `σ ∈ {0,1}` (or an allowed larger domain). For the binary case, the proof constructs commitments for both possible branches, hashes context and commitments into a global challenge, derives the selected branch challenge by subtraction, and publishes challenges and responses. A verifier first checks ciphertext subgroup membership, then recomputes commitments and the global challenge and checks the challenge sum.

The paper states, “A typical ElectionGuard ballot consists of a sequence of ElGamal encryptions—usually of either 0 or 1, encoded in exponential form to support an additive homomorphism, together with ZK proofs that these encryptions are indeed encryptions of bits.” It also explains why the protocol stays simple: “ElectionGuard aims at keeping the programming of an election verifier as simple as possible, and therefore keeps these disjunctive Chaum-Pedersen proofs.” (Sections 2.6 and 2.6.2, pp. 5490–5491.)

Verus form. Inference: verify modular arithmetic and subgroup-membership checks with contracts over fixed-width integer or big-integer abstractions. A proof function can show that componentwise ciphertext multiplication corresponds to addition of encoded exponents under the stated group laws. Executable code must check the Chaum–Pedersen relation on election records; a `proof fn` can establish that the code implements the specified relation. The hash is an external cryptographic primitive with a specification. Verus cannot establish the computational zero-knowledge or IND-CPA assumptions.

Evidence and limits. The paper reports a 1024-bit proof against 8192-bit ciphertexts and says the modified encryption reduces proof computation from five to four exponentiations (Section 2.6.2, p. 5491). Homomorphic tallying does not directly support ranked methods such as instant-runoff voting; the authors say mixnets would be more appropriate and leave them for future work (Section 2, p. 5486). The tally also assumes vote values have a small enough bound for an efficient discrete-log table (Section 2.7.3, p. 5492).

## technique 3: nonce-derived encryption and confirmation codes

What it is and when to use it. A secret per-ballot nonce deterministically derives the selection encryption randomness. A hash of the ciphertext sequence is returned as a confirmation code. A voter can challenge a ballot and reveal the nonce, allowing an independent device to recompute every ciphertext and check that the device encrypted the voter's selections.

Steps from Sections 2.6.1 and 2.6.4 (pp. 5490–5492): choose a public ballot identifier and a secret random nonce; derive the identifier hash `H_I` from the extended election base hash and public identifier; derive each selection’s randomness as `H_q(H_I; 0x21, i, j, ξ_B)`; encrypt each selection; hash each contest’s index and ordered ciphertexts, then hash the ordered contest hashes and chaining field into a confirmation code; offer the voter a mutually exclusive choice to cast or challenge; in the nonce-revelation challenge flow, reveal the nonce and recompute; if cast, erase the nonce. Alternatively, challenged ballots can be verifiably decrypted by the guardians (Section 2.8.1, p. 5494). The paper says, “If a ballot is cast instead of being challenged, the ballot nonce is permanently erased.”

Verus form. Inference: make ballot states (`prepared`, `challenged`, `cast`) an enum and prove that a cast ballot cannot later reveal a nonce, while a challenged ballot has the data needed for recomputation. Contracts can state that confirmation-code hashing consumes exactly the published ciphertext sequence and manifest context. The hash's collision resistance, secure erasure and device randomness are outside Verus.

Evidence and limits. For anonymous paper ballots, the scheme supports offline ballot-marking devices by printing an encrypted nonce; after scanning and nonce decryption, an election server can reconstruct ciphertexts (Section 2.6.1, p. 5490). The paper states that confirmation codes, being derived from encrypted votes, do not compromise privacy or enable coercion or vote-selling in properly deployed in-person applications (Section 2.6.4, p. 5492). Privacy still fails if a device leaks nonces or uses a broken pseudorandom generator; the authors explicitly state that guardians cannot prevent this (Section 2.8.3, pp. 5494–5495). Challenging necessarily reveals the challenged selections, so a challenged ballot cannot also be cast (Section 2.8.1, p. 5494).

## technique 4: homomorphic tally and one aggregate threshold decryption proof

What it is and when to use it. Multiply ciphertexts for each option to form an encrypted tally. At least `k` guardians produce partial decryptions. Instead of publishing one proof per guardian, they combine their contributions into one Chaum–Pedersen proof of the complete decryption, hiding which guardians participated from the verifier.

Steps from Sections 2.7.1–2.7.4 (pp. 5492–5493): publish encrypted ballots and their validity proofs, marking each ballot as cast or challenged; verify all validity proofs and uniqueness of selection encryption identifiers; multiply only the intended cast ciphertexts for each option to form its tally; for each tally ciphertext `(A,B)`, each available guardian computes a partial decryption `M_i = A^{P(i)}`; combine partials with Lagrange coefficients to obtain `M`; recover the bounded plaintext from `K^t = B M^{-1}`; each guardian chooses random `u_i`, computes `(a_i,b_i) = (g^{u_i}, A^{u_i})`, and sends a hash commitment; after receiving every hash commitment, guardians reveal their pairs and check the hashes, halting on failure; derive one global challenge, adjust each share's challenge with its Lagrange coefficient, sum responses to obtain `(c,v)`; check `v ∈ Z_q` and recompute the challenge using `a = g^v K^c` and `b = A^v M^c`; publish the proof if valid. An independent verifier performs the same proof check.

The paper emphasizes the design choice: “From the verifier perspective, the decryption proof is one single Chaum-Pedersen proof.” The commit–reveal round is required because it keeps corrupted guardians from choosing their proof values after seeing honest values (Section 2.7.4, p. 5493). Theorem 2 gives a simulator argument for the protocol in the random-oracle model (p. 5493).

Verus form. Inference: represent the tally as a map from contest options to ciphertexts and prove that aggregation is associative and includes exactly the ballots marked cast. Contracts can enforce `|U| ≥ k`, distinct guardian indices and correct Lagrange weights. A `proof fn` can establish that the final response is the sum of individual responses, each already computed using its Lagrange-weighted challenge. The simulator and random-oracle security argument are mathematical assumptions beyond a normal Verus execution proof.

Evidence and limits. The design handles missing guardians as long as the quorum is met and does not reconstruct the secret key explicitly (Section 2.7.3, p. 5492). It provides tallied-as-cast evidence, but eligibility still depends on an external voter-identification list (Section 2.8, p. 5494). Privacy depends on guardian behavior and device randomness even though tally correctness is independent of guardian honesty.

## what is proved, measured, and trusted

The paper proves cryptographic security properties under explicit assumptions, specifies verifier algorithms, reports implementation measurements (Section 4.1, p. 5497), and describes deployments. It gives counts such as 398 voters and 4 challenged ballots in Fulton, 514 encrypted ballots in Utah, 1,468 in College Park, and 111 voters using the enhanced scanner in Preston (Sections 6.1 and 6.4–6.6, pp. 5498–5500). Inference: these deployment counts do not establish statistical accuracy. The paper reports that a Fulton hand count initially differed by one vote because a ballot was in the wrong pile, then matched after recount (Section 6.1, pp. 5498–5499).

The guarantees have different assumptions: record availability and a common view are assumed (Section 2.2, pp. 5486–5487); privacy requires fewer than `k` compromised guardians, secure ElGamal, and a device that preserves ballot privacy (Sections 2.5 and 2.9, pp. 5488–5489, 5495). Result verification is independent of guardian honesty, relies on hash collision resistance, and requires actual independent checking (Sections 2.8.3–2.9, pp. 5494–5495). Eligibility is external to ElectionGuard (Section 2.8, p. 5494). Inference: for agent-written verified Rust, the largest product threat is an implementation that emits a valid-looking record while omitting a ballot, mishandling contest limits, or leaking a nonce. Verus can make record parsing, state transitions and arithmetic checks auditable, but cannot make compromised hardware honest.

## what VL should not redo

ElectionGuard already provides a complete pattern for public evidence, threshold keys, ballot challenge, homomorphic tally and independent verification, with deployments in Wisconsin, California, Idaho, Utah, Maryland, France and organizational elections. Inference: VL should not build another generic receipt-and-hash layer without first specifying which trust boundary differs. A focused contribution could verify a Rust election-record verifier against the paper's state and arithmetic invariants and test it against malformed records, while retaining the cryptographic assumptions explicitly.

## techniques for the catalog

- distributed key generation: combine Feldman commitments, encrypted polynomial shares and Schnorr proofs so a quorum can decrypt without one private key
- exponential ElGamal ballot proofs: encode bounded votes homomorphically and attach disjunctive Chaum–Pedersen proofs of allowed selections
- nonce-derived confirmation: derive encryption randomness from a secret ballot nonce and let voters recompute ciphertexts of challenged ballots
- aggregate threshold decryption proof: combine quorum partial decryptions and publish one Chaum–Pedersen proof with a commit–reveal round
- public election-record verification: publish encrypted ballots, proofs and hashes so independent programs can check cast-as-intended and tallied-as-cast properties
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "It would have been more direct for each guardian to publish an independent Chaum-Pedersen proof that it computed its partial decryption accurately."): checked every quotation, number, section/page reference and protocol step against the full paper, including references; corrected the paper link, an incomplete equation presented as a quotation, section/page references, encoding-base explanation, challenge and tally steps, aggregate-response description and Verus inferences; did not check implementation code, external sources or independently prove the cryptographic theorems.
