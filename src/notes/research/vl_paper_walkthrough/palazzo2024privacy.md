# Privacy-Preserving Data Aggregation with Public Verifiability Against Internal Adversaries
(authored by agents unless marked 🧑)
Tag: `palazzo2024privacy`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/palazzo)

## problem and model

The paper studies a single malicious aggregator colluding with at most k≤n−2 malicious users. At least two users remain honest-but-curious. It proposes mPVAS and three extensions: mPVAS+ (lower communication), mPVAS-IV (identify malicious users), and mPVAS-UD (planned user dropouts). The abstract states: “we propose mPVAS, the first publicly verifiable privacy-preserving data aggregation protocol that allows arbitrary collusion, without relying on trusted third parties during execution, where verification runs in constant time” (p. 6957). The collusion claim is subject to the bound on k. A trusted dealer sets up the system and leaves afterward. Dealer and aggregator channels with users and verifiers provide secrecy, authenticity, and integrity; users communicate through the aggregator. Base mPVAS assumes availability, including no intentional denial of service or unexpected dropouts (Section 2, p. 6958). Data poisoning is outside scope (Section 1, p. 6957; Section 5, p. 6960).

## technique 1: mPVAS aggregate signature

Inference: mPVAS suits a public check of a private sum when its setup, availability, and corruption assumptions hold. The construction uses type-3 bilinear pairings, two distinct hashes H(t) and H1(t), a secret exponent s Shamir-shared with threshold k+1, signing keys, and encryption keys used as masks. The paper's core idea is to “create commitment-like signatures of the inputs and wrap each signature under a common secret exponent s” (Section 5, p. 6960).

Setup: the trusted dealer samples s, creates n (k+1)-out-of-n shares [s]i, and distributes encryption keys whose total is zero. Each user samples ski and sends it to the dealer. The dealer gives verifiers the tuple `((g2^s)^(sum_i ski), g2^s)` and public parameters, then leaves (Section 5.1, pp. 6960–6961). Signing has four steps (Section 5.2, p. 6961):

1. user i sends `σ1_i,t = H(t)^ski * g1^xi,t` to the aggregator
2. the aggregator forwards it to a signing set Ui of k other users and sends Ui to user i; each signer j returns `H1(t)^ek_j,i * (σ1_i,t)^[s]*_j`, where `[s]*_j` is its share multiplied by the appropriate Lagrange coefficient
3. the aggregator multiplies the k partial signatures and sends the product to user i
4. user i multiplies that product by its own share contribution and unused encryption-key mask, then submits the final signature; the k+1 share contributions reconstruct s in the exponent

The aggregator multiplies all final signatures; the masks cancel. The paper states: “The aggregator sends σt to each verifier. Only at this point should the adjacent summation protocol reveal the sum of users’ inputs.” (Section 5.3, p. 6961). Given the sum x and signature σt, each verifier checks `e(H(t), vk1) * e(g1^x, vk2) = e(σt, g2)` (Section 5.4, p. 6961). For large plaintext spaces, mPVAS needs a separate summation protocol; for small spaces, the sum can instead be extracted by trying possible values in verification (Section 5, p. 6960).

Theorem 1 claims aggregator obliviousness and Theorem 2 claims aggregate unforgeability against Type-I and Type-II forgeries (p. 6962; Appendices A–B, pp. 6972–6974). Type-I means forging without receiving users' signatures for the round; Type-II means forging after receiving all signatures (Appendix B, p. 6973). The confidentiality proof uses the random-oracle model and SXDH. The unforgeability argument also invokes discrete-log and Co-CDH hardness.

Inference: a Verus model could express signature aggregation and verification algebra under explicit assumptions about groups, pairings, and cryptographic security. Proving bookkeeping or arithmetic in such a model would not by itself establish real-world confidentiality or unforgeability.

## technique 2: mPVAS+ divide users into groups

mPVAS+ reduces communication by randomly grouping users into groups of size c≤k. The dealer independently shares the same s within each group using c-out-of-c Shamir sharing. Shares from different groups cannot be combined. If c does not divide n, n mod c groups receive one additional user and their thresholds are adjusted. Signing uses the c−1 other group members; aggregation and verification remain unchanged (Section 6.1, p. 6962).

Unforgeability requires at least one honest user in every group and non-adaptive corruption. With adaptive corruption, security falls back to an mPVAS instance with k=c−1. The paper argues confidentiality still holds even if a fully corrupted group reveals s (Section 6.2, p. 6962).

Section 6.3 counts ways of corrupting k users and uses inclusion-exclusion to account for multiple fully corrupted groups. The denominator is the binomial coefficient “n choose k” (p. 6963). Equation (23) is exact when c divides n and an upper bound otherwise. Its example with n=50, 20% malicious users, and c=7 gives approximately 0.000841% probability of a fully malicious group (p. 6963). Table 2 reports communication of O(n) for the dealer, O(cn) for the aggregator, and O(c) per user; verifiers do not actively participate (p. 6966).

Inference: a Verus model could verify group membership and conditional reasoning from an assumed honest member per group. Establishing the probability bound would require a separate counting proof; group bookkeeping alone cannot establish real adversaries' behavior.

## technique 3: mPVAS-IV find malicious users

mPVAS-IV identifies users who send malformed signatures. The aggregator remains malicious regarding confidentiality and unforgeability but acts honestly regarding availability. The adjacent summation scheme must provide availability and verified commitments to users' inputs (Section 7, p. 6963). Identified users are removed and the protocol restarts from scratch; at most k restarts are needed if malicious users are exposed one at a time (p. 6964).

Setup adds commitments to signing keys and group elements encoding shares and masks. Before ordinary signing, the adjacent scheme supplies Pedersen commitments C(xi,t) to ensure consistency between the schemes. Without an adjacent scheme, committed inputs need range proofs instead (Section 7.1, p. 6964).

After signing, each user checks its final signature for tampering using equation (24). A report triggers checks of all corresponding partial signatures using equations (25)–(29). The aggregator expels users whose partial signatures fail. If none fails, it marks the reporting user malicious. The protocol then restarts without those users (p. 6964).

Verification first runs ordinary mPVAS. If it fails, the aggregator checks each user's final signature by removing mask terms and requesting two zero-knowledge equality proofs: one links the signing key to its setup commitment; the other links the input to C(xi,t) (equations (30)–(34), pp. 6964–6965). Standalone use additionally requires an input range proof, for example a Bulletproof, to keep sum extraction tractable (p. 6965). Theorems 5–6 claim aggregator obliviousness and aggregate unforgeability (Section 7.2, p. 6965; Appendix C, p. 6974).

Inference: a Verus state machine could check removal and restart bookkeeping, conditional on sound validation predicates. Transcript privacy and cryptographic soundness would require their own models and arguments.

## technique 4: mPVAS-UD recovery keys for dropouts

mPVAS-UD lets users announce rounds they will skip by supplying recovery material beforehand. The paper states: “mPVAS-UD works as long as at least k + 2 users do not drop out of the protocol.” (Section 8, p. 6965). Setup additionally supplies masking-factor values EK_j to verifiers. For each skipped round τ, user i sends `rk_i,τ = e(H(τ)^(-ski), g2^s)` through the aggregator to verifiers. The aggregator may combine recovery keys before forwarding them (Section 8.1, p. 6965).

Verification uses the sum over remaining users. Equation (37) multiplies the ordinary left-hand side by dropped users' recovery keys and divides the right-hand side by a pairing involving the product of remaining users' EK_i values (p. 6966). Thus it compensates for both missing signing-key contributions and masks that no longer cancel.

Combining mPVAS-UD with mPVAS-IV requires a zero-knowledge proof tying each recovery key's ski to the setup commitment (equation (36), p. 6965). Combining it with mPVAS+ requires c-out-of-c′ sharing, c′≥c, allowing at most c′−c dropouts per group (p. 6965). Theorems 7–8 claim aggregator obliviousness and aggregate unforgeability (p. 6966; Appendices D–E, p. 6974).

Inference: a Verus model could track announced dropout rounds, remaining identities, and recovery-equation bookkeeping. This would require explicit assumptions about recovery-key validity and delivery.

## evidence, limits, and product relevance

Table 2 reports communication of O(n) for the dealer, O(kn) for the aggregator, and O(k) per user in mPVAS, mPVAS-IV, and mPVAS-UD. mPVAS+ replaces k with c. The verifier column is a dash: verifiers do not actively participate; it does not report their computation cost (Section 9.1, p. 6966).

The Charm proof-of-concept uses MNT224, reported as providing 112 bits of security, on a Threadripper 7970X with 256GB RAM. Execution is sequential on one core, without special optimizations, and message delivery is assumed instantaneous (Section 9.2, p. 6967). For n=1000 and k=30% of users, a single mPVAS user takes around 0.36 seconds. Base verification computes three pairings regardless of n (Section 9.3, p. 6967). mPVAS+ experiments choose group sizes 5–14 to keep fully corrupted-group probability at most 10^−5 (Section 9.4, p. 6967). mPVAS-IV identification adds substantial cost when malformed signatures are reported (Section 9.5, p. 6968).

Dropout verification is different: “the verifier’s runtime is linear in the number of remaining users because it must compute the product of the masking factors EK j for every remaining user j” (Section 9.6, p. 6968). With 1000 users and 10% dropouts, the reported runtime is below 0.0165 seconds (p. 6969). Inference: these computation-only prototype results do not establish network latency or production throughput.

The paper presents correctness and confidentiality/unforgeability arguments under its assumptions. Base availability is assumed; mPVAS-IV handles malformed user messages under the stronger availability condition on the aggregator, and mPVAS-UD handles announced absences.

## techniques for the catalog

- aggregate signature over a private sum — Shamir-share a secret exponent, sign masked inputs, multiply signatures, and verify a pairing equation
- grouped secret sharing — reduce interaction within random groups while bounding the probability of a fully malicious group
- malicious-user identification — combine commitments, signature checks, and zero-knowledge equality proofs to remove culprits and restart
- dropout recovery keys — compensate for announced absences and uncancelled masks in public verification
