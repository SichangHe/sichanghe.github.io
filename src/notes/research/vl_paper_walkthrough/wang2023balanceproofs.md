# BalanceProofs: Maintainable Vector Commitments with Fast Aggregation
(authored by agents unless marked 🧑)
Tag: `wang2023balanceproofs`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/wang-weijie)

## object and security goal
BalanceProofs is a compiler that converts a suitable non-maintainable vector commitment (VC) into one supporting sublinear updates while preserving aggregation. A VC commits to vector `m`, opens values at indices, and lets a verifier check claimed values. Soundness means that an efficient adversary cannot produce two accepted openings under the same commitment that disagree at an overlapping index, except with negligible probability (Definition 2.3, p. 4412). The paper describes its compiler: “In this section, we introduce BalanceProofs, which can be viewed as a compiler that takes as input a vector commitment VC that is not maintainable and outputs a maintainable vector commitment VC′.” (Section 3, p. 4413). Theorem 3.1 assumes a correct and sound input VC and preserves both properties (p. 4414).

## technique 1: lazy-update compiler with proof logs
what it is and when to use it
The compiler stores initial proofs plus a short update list. A query replays the list on one proof; periodically all proofs are recomputed. This yields amortized sublinear update-all work. Inference: use it when the base VC meets the following requirements but lacks efficient update-all.

how to do it
1. Require base `VC.OpenAll` time T = o(n√n), `VC.UpdProof` time P = o(√n), and efficient aggregation. For practical efficiency the paper stresses natural aggregation, meaning aggregation without a black-box argument system (Section 3, p. 4413).
2. At commit, run base `Commit`, compute all initial proofs with `OpenAll`, and initialize an empty list L of size √n (Algorithm in Section 3.1).
3. To open index i, if L is empty return π_i; otherwise apply each `(j,δ_j)` in L through `VC.UpdProof` to π_i and return the latest proof (Section 3.1).
4. Update the vector and commitment. In `UpdAllProofs`, append `(i,δ)` while `|L|<√n`; otherwise call `OpenAll` on the current vector to refresh all proofs and clear L (Section 3.1, p. 4414).
5. Delegate aggregation, verification, commitment update, and individual proof update to the base VC (Section 3.1).

Verus form
Inference: model a commitment and proof as opaque byte arrays with a specification-level relation `vc_verify`; model L as a bounded sequence of updates. A Verus function can prove that applying each logged update in order yields the same claimed vector as applying updates directly, using loop invariants over the log index. Cryptographic binding and pairing equations remain trusted primitives unless separately verified. Inference: use `requires` for valid indices and bounded log length and `ensures` that a returned proof verifies under the updated commitment.

evidence and limits
Theorem 3.1 gives update-all time T/√n and open time P√n, both o(n), while other complexities equal the base VC (p. 4414). Before deamortization, the update-all bound is amortized. For aSVC, update-all is O(√n log n) and querying is O(√n) (Section 3, p. 4413). The soundness argument states: “For soundness, note that the commitment, final proofs, and verification algorithm are all the same in both VC and VC′.” (Theorem 3.1 proof, p. 4414). Inference: this reduction does not establish correctness of a concrete pairing implementation.

## technique 2: deamortized update-all
what it is and when to use it
Calling `OpenAll` every √n updates creates an Ω(n) worst-case operation. The paper spreads its T work over √n later updates.

how to do it
1. Maintain L of size 2√n (Section 3.2, p. 4414).
2. During updates u1…u√n, append updates and answer queries by replaying the log. Preserve the vector snapshot m containing those first √n updates.
3. For each update u_j, j=√n+1…2√n, append it and execute sequential block T_{j−√n} of `OpenAll` on that snapshot.
4. After u2√n, all proofs for the earlier vector are refreshed; discard the first √n log entries and repeat.
Each block takes T/√n time, giving worst-case O(√n log n) updates for aSVC (Section 3.2, p. 4414). The implementation divides loops into smaller loops and uses operation counters to suspend and resume expensive work (Section 5, p. 4419).

Verus form
Inference: track the snapshot version represented by stored proofs, the later updates requiring replay, and the snapshot being rebuilt. Prove that switching to rebuilt proofs removes exactly the log prefix they incorporate. Establish that each recomputation block runs once. Treat cryptographic recomputation as an external function with an assumed specification until its implementation is verified.

## technique 3: bucketing and natural aggregation
what it is and when to use it
Partition the vector into p buckets, maintain bucket and individual proofs, and aggregate individual proofs within buckets. This reduces update work by increasing proof size (Sections 4.1–4.2, pp. 4415–4417).

how to do it
1. Partition indices [0,n) into p equal parts P_i and view m as subvectors (Section 4.1, p. 4415).
2. Compute a KZG bucket proof Π_i for each subvector and individual proof π_i,j for each element.
3. To open j, return (Π_i, π_i,j) and verify the pairing equation given in Section 4.1.
4. Update all p bucket proofs in O(p), and update individual proofs only in the changed bucket using the compiler log.
5. Aggregate proofs inside each bucket; across f buckets, provide f bucket proofs and f individual batch proofs, totaling 2f group elements (Figure 1 and Section 4.1, p. 4415).
6. Balance O(p) bucket updates against O(√(n/p) log(n/p)) individual-proof updates. Setting p=n^(1/3) gives O(n^(1/3) log n) update time (Introduction, p. 4410; Section 4.1, p. 4416).
The basic construction needs O(np) public update parameters for updates outside a bucket. Its space-efficient replacement uses a bivariate polynomial φ(x,y), with degrees below p and n/p respectively, and O(n) public parameters. Each bucket uses the same local index set. The commitment is g^{φ(α,β)} for secret, uniformly chosen α and β (Section 4.2, p. 4416).

Verus form
Inference: represent bucket assignment as an integer division specification and prove index-to-bucket consistency. An aggregation wrapper can ensure that every requested index and value is covered by the appropriate bucket proof. Verifying that bookkeeping does not establish the security of polynomial commitments.

## technique 4: two-layer and halved batch proofs
Section 4.2's halving optimization combines f bucket proofs into one, retaining the f individual batch proofs. The paper states: “In this section we propose a simple optimization that reduces the size of the batch proof from 2 f group elements to f + 1 group elements.” (p. 4417).

The two-layer scheme adds a partition into t small buckets inside each of p large buckets and uses a three-variable polynomial (Section 4.3, p. 4418; Appendix A, p. 4424).

1. Maintain p first-layer bucket proofs and t second-layer bucket proofs per large bucket, plus individual proofs in each of the pt small buckets.
2. For an update, refresh all p first-layer proofs and the t second-layer proofs in the affected large bucket. Apply the compiler inside the affected small bucket of size n/(pt).
3. Total update time is O(p+t+√(n/(pt)) log(n/(pt))). Choose p=t=n^(1/4), obtaining O(n^(1/4) log n) update time and O(n^(1/4)) query time.
4. Return three group elements for an individual opening. Aggregate individual proofs within each small bucket and combine the required bucket proofs. Apply halving to batch bucket proofs at both levels (Appendix C, Lemma C.3, p. 4425).

Theorem 4.1 gives O(n) public parameters, a one-element commitment, O(√n) batch proof size, and O(k log² k) aggregation and aggregate verification for k opened indices. More than two bucket layers further reduce update time but increase aggregate proof size (Section 4.3, p. 4418).
Inference: a Verus implementation should expose each layer as a separately specified transformation and prove that flattening preserves the index/value relation; polynomial identities and discrete-log security remain trusted.

## evidence, trusted boundary, and implications
The paper implements basic and two-layer BalanceProofs in Go using aSVC and BLS12-381. Experiments use an AWS EC2 m5d.4xlarge with a 2.50 GHz Xeon Platinum 8259CL and 64 GB RAM. The paper specifies: “We only utilize a single CPU core in our experiments, but all of our algorithms are parallelizable.” (Section 5, p. 4418). Results average repeated runs.

For n=2^30 and aggregation of 1024 proofs, basic BalanceProofs takes 135.7 s to update all proofs, 0.77 s to query, 0.41 s to aggregate, and 0.42 s to verify an aggregate. Individual and aggregate proofs are 48 bytes (Table 2, p. 4419). Two-layer bucketing takes 18.96 ms to update all proofs, 19.41 ms to query, 8.41 ms to aggregate, and 106 ms to verify an aggregate. Its individual proofs are 144 bytes; aggregate proofs are 99 KB before halving and 51 KB after halving (Table 3, p. 4419). The table values are more precise than the introductory claim of at most 18 ms for updates. The implementation adjusts bucket counts by a constant factor to balance actual costs, increasing the possible aggregate proof size (Section 5, p. 4419).

The abstract reports up to 1000× faster aggregation and up to 100× faster aggregate verification than Hyperproofs (p. 4409). Section 5.2 reports Hyperproofs aggregation at 90–110 s and verification at 13–17 s for 1024 proofs and 2^20≤n≤2^30 (p. 4420). These comparisons concern the evaluated implementations and parameters. Table 1 gives basic update-all O(√n log n), query O(√n), constant-size aggregate proofs, and O(k log² k) aggregate verification. Two-layer update-all is O(n^(1/4) log n), query O(n^(1/4)), and aggregate proof size O(min{k,√n}) (p. 4411). Here n is vector length and k is the number of opened indices.

The stateless-blockchain experiment estimates VC overhead as P+20V+M, where P is block proposal, V block validation, and M proof maintenance. For n=2^30 and 1024 transactions, two-layer bucketing takes P=1.82 s, V=0.19 s, and M=38.72 s, totaling about 45 s versus about 8 minutes for Hyperproofs (Section 5.3, Table 4, p. 4421). Inference: this overhead model does not measure an entire deployed blockchain.

The compiler theorem preserves input correctness and soundness. For two-layer bucketing, Appendix C proves individual and batch opening soundness under q-SBDH, the q-Strong Bilinear Diffie-Hellman assumption defined in Appendix B (pp. 4424–4426). Inference: an implementation must trust the cryptographic library and the setup's secret values remaining unavailable to adversaries unless those concerns are separately established. Useful proposed Verus proof targets are index consistency, ordered log replay, snapshot transitions, and complete aggregation coverage; these are not results reported by the paper.

## techniques for the catalog
- lazy proof-update compiler — store updates in a bounded log and replay them on queried proofs
- deamortized refresh — split `OpenAll` into sequential blocks executed over later updates
- bucketed commitments — partition indices, maintain bucket and individual proofs, and aggregate within buckets
- space-efficient bucketing and halving — use a bivariate polynomial and reduce 2f proof elements to f+1
- two-layer bucketing — use a three-variable polynomial, two bucket layers, and a compiler log per small bucket
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "We only utilize a single CPU core in our experiments, but all of our algorithms are parallelizable."): read the complete paper including appendices and checked every study quotation, number, section/page reference, and technique step; corrected soundness, quotations and references, snapshot handling, bivariate versus three-variable bucketing, asymptotic costs, measured results, security assumptions, and the publisher link; marked proposed Verus applications as inferences; did not reproduce experiments, inspect implementation code, or independently validate the security reductions.
