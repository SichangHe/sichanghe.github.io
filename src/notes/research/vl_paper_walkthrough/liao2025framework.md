# A Framework for Designing Provably Secure Steganography
(authored by agents unless marked 🧑)
Tag: `liao2025framework`, [paper](https://www.usenix.org/conference/usenixsecurity25/presentation/liao) (link from the paper's title page)

## framework purpose

The paper decomposes provably secure steganography for arbitrary discrete channel distributions into three modules: Probability Recombination, Bin Sampling, and Uniform Steganography. Recombination splits token probabilities into equal-probability blocks and groups blocks into bins; bin sampling chooses a bin with the original aggregate probability; uniform steganography hides bits among the equally likely blocks. The security proof composes these modules through hybrids and assumes a secure pseudorandom generator (PRG). The authors state: “This framework decomposes the overall complex design into three sub-processes that can be relatively easily achieved, namely Probability Recombination Module, Bin Sampling and Uniform Steganography Module.” (Abstract, p. 6837)

The framework is universal for white-box samplers that expose each time-step distribution, but the paper explicitly says it does not encompass every provably secure scheme. It targets computational indistinguishability against chosen-hiddentext adversaries, negligible decoding error, and applicability across discrete distributions. Inference: for VL, this is a compositional proof architecture: isolate a data transformation, a randomized selector, and a local uniform proof obligation, then prove their composition.

## probability recombination

Input is an arbitrary distribution `D=[p1,…,pn]` with sum one. Decompose each token probability `pj` into nonnegative blocks `p_j^k`; assign every block to one bin; require equal block probabilities within a bin; and forbid two blocks from the same token in one bin. For bins `G_i`, let `D_G[i]` be the sum of block probabilities and `T_G[i]` the token set represented by that bin (Section 3.1, pp. 6840–6841). These conditions imply that conditional sampling inside a bin is uniform while aggregate bin probabilities preserve the original distribution.

### differential-based recombination

How to apply it (Section 4.2.1, p. 6844; Algorithm 3).

1. Sort tokens by descending probability, retaining original indices.
2. Compute successive differences `Diff[i]=p_i−p_{i+1}`, with `p_{n+1}=0`.
3. Put the `i`th block from each of the first `i` sorted tokens into bin `G_i`; set `D_G[i]=Diff[i]×i` and `T_G[i]=Indices[:i]`.
4. Return `(D_G,T_G)`; the paper gives `O(n log n)` time because of sorting.

This construction is valid for every distribution and reaches the paper's upper bound among its recombination schemes when the uniform component is capacity-optimal. Inference: a Verus implementation can define a ghost multiset of blocks and prove conservation (`sum blocks = 1`), equal weights inside bins, and no duplicate token in a bin. Sorting and floating-point arithmetic need explicit models or trusted lemmas.

### binary-based recombination

Represent each probability with fixed precision `m`: `p_i=Σ_k b_i^k2^{-k}`. Put every nonzero `2^{-k}` block into bin `G_k`; set `D_G[k]=2^{-k}|T_G[k]|` and `T_G[k]` to the tokens containing that bit (Section 4.2.2, p. 6844; Algorithm 4, p. 6845). The algorithm loops over `m` bit positions and `n` tokens, so it is `O(n)` for fixed `m`. It is universal for distributions represented at that precision.

### stability-based recombination

Sort probabilities descending. If `p1>0.5`, split `p1` into `(2p1−1)` and one block paired with every other token. If `p1≤0.5`, find the smallest `k` whose tail sum reaches `p1`, split the `k`th probability, and combine blocks in the two stages described in Section 4.2.3 (p. 6845). Its property is that when minimum entropy is at least one bit (`pmax≤0.5`), no positive-probability bin is a singleton. Combining this scheme with cyclic-shift uniform steganography guarantees at least one bit each step (Section 5.2, p. 6848). Inference: verify the singleton-free property as a quantified invariant over bins; this is a stronger availability guarantee than average capacity.

## bin sampling and cyclic-shift uniform steganography

Bin Sampling receives `(D_G,T_G)`, uses a shared PRG to draw a number in `(0,1]`, partitions that interval by `D_G`, and selects the bin whose interval contains the number (Section 3.2, p. 6842). Both parties run the same PRG key, so the receiver selects the same bin. Inference: in Verus, prove deterministic agreement for equal key, state, and distribution, with `ensures` that sender and receiver choose the same bin index.

Uniform Steganography receives a bin whose blocks are equiprobable. The paper's cyclic-shift construction works for `U(n)`. Set `k=floor(log2 n)`, `m=n−2^k`; create a prefix-free code list `C_n` containing `2^k−m` codewords of length `k` and `2m` codewords of length `k+1`. At each step, PRG output `ptr` gives `R=ceil(ptr·n)`. `USE` maps the codeword index plus `R−1` modulo `n` to a token; `USD` computes the codeword index `(i−R+1) mod n` from the observed token `T_i` and returns that codeword (Section 4.3 equations; Algorithms 5–6, pp. 6845–6846). The paper's correctness equation is `USD(U(n),KUS,USE(U(n),KUS,M))=C_n[C_n(M)]`, the prefix of `M` embedded at that step (p. 6846).

The security argument is direct: for every token `T_i`, summing over the uniform random shift gives `P_stego(T_i)=1/n`; independent shifts preserve the product channel distribution. With a secure PRG, pseudorandom shifts are computationally indistinguishable from truly random shifts (Section 4.3, pp. 6845–6846). Inference: a Verus proof can establish prefix-free code validity, modulo-index bijection, sender/receiver inverse, and uniform marginal probability over a finite integer model. The cryptographic PRG assumption remains an axiom unless separately verified.

## composition and universal proof

The full encoder (Algorithm 1, p. 6842) sets the PRG key, obtains the history-conditioned distribution `D`, computes `G=PR(D)`, samples `G_i`, invokes `USE(G_i,KUS,M)`, removes the consumed message prefix, and appends the token. The decoder (Algorithm 2) reproduces `D` and `G`, samples the same bin, and invokes `USD` on the observed token. Repeat until the stegotext ends.

The proof uses hybrids `H0` through `H3`. `H0` is ordinary channel sampling. `H1` samples a recombined bin and then a block. `H2` replaces true random bin selection with Bin Sampling's PRG. `H3` replaces random within-bin block selection with the uniform steganography encoder. `H0=H1` follows from block conservation and equal within-bin probabilities; `H1≈H2` follows from PRG security; `H2≈H3` follows from uniform-module security. Therefore `H0≈H3`, giving framework security. The paper concludes: “Consequently, by employing any probability recombination scheme and uniform steganography within this framework, we can establish a provably secure steganography scheme.” (Section 3.5, p. 6843)

Inference: in Verus, each hybrid should be a separate proof lemma over a distribution record. The composition proof needs explicit assumptions for history independence, PRG indistinguishability, and exact probability arithmetic. A verified Rust implementation can prove functional equality and finite-distribution conservation; it cannot, by these lemmas alone, prove neural-model correctness or computational PRG security.

## capacity, stability, and time techniques

Capacity. For any distribution, expected hidden bits per token cannot exceed entropy `H(D)`. For uniform `U(n)`, cyclic-shift capacity is `k+m·2^{-k}` and lies within `0.0861` bits of `log2 n` (Section 5.1.1, Equation 2, p. 6847). Differential recombination maximizes the framework's capacity when the uniform component reaches `log2 |T|` (Lemma 1); its capacity `C` satisfies `H−log2(1+H·ln2) ≤ C ≤ H` (Lemma 2); both are on p. 6848, with proofs in Appendices A and B (pp. 6853–6855). Inference: encode these inequalities as postconditions over sorted probability vectors; floating point requires fixed-precision bounds.

Stability. Average capacity can hide steps that embed zero bits. The paper defines stability as at least one bit every step whenever minimum entropy is at least one bit (`pmax≤0.5`). Stability-based recombination has no singleton bins under that condition, and with cyclic-shift uniform steganography forms a stable scheme (Section 5.2, p. 6848). This technique is for applications where every generation step must carry useful payload, rather than merely maximizing an average.

Time complexity. Cyclic-shift uniform encoding is `O(n)` in vocabulary size; binary recombination is `O(n)` for fixed precision, so their combination is `O(n)`, matching ordinary probability sampling. Differential recombination is `O(n log n)` from sorting, and stability-based recombination inherits that cost (Sections 4.2 and 5.3, pp. 6844–6845, 6849). In the experiments the paper observes that “Although the Binary-based scheme is O(n), it does not necessarily outperform the O(n log n) schemes,” and suggests this “could be due to better optimization of sorting algorithms internally and the impact of larger constants — notably precision” (Section 5.4, p. 6850). Discop was implemented in Cython while the other code was Python/PyTorch (p. 6850).

## evidence and contradictions

Table 1 evaluates Llama-3 text channels under prompts “Tell me something about Steganography” (Scenario A) and “1+1=?” (Scenario B), and uniform channels with 10 and 1,000,000 tokens (Scenarios C and D). For example, in Scenario C with 10 uniform tokens, Differential-based and Stability-based both report capacity 3.247 bits/token, entropy 3.322, utilization 0.978, no-payload rate 0, and time 0.0007 or 0.0009 seconds/token (Table 1, p. 6849). In Scenario D with 1,000,000 tokens, Differential-based reports 19.90/19.93 bits/token, 0.998 utilization, zero no-payload rate, and 0.0056 seconds/token; Discop-Huffman reports 19.77/19.93, 0.992, zero, and 0.3649 seconds/token (same table). These denominators and prompts differ, so the rows are not a single aggregate benchmark.

Appendix E reports ten repeated steganalysis runs for text Scenarios A/B and KLD for uniform Scenario C. Differential-based accuracy is 49.66% with spread value 2.67 (A), 53.00% with 5.51 (B), and KLD 0.0000497 (C); Stability-based is 49.73% (2.58), 52.12% (4.67), and 0.0000497 (Table 4, p. 6856; the caption calls the second number a variance). Meteor's KLD is 0.0337614 and random sampling's is 0.0000435; the paper attributes Meteor's difference to source code that discards the least probable token (footnote 9, p. 6856). Accuracy near 50% indicates no useful classifier advantage in that setup, not a universal security proof. The paper says “Discop(Huffman) indeed remains the optimal method across nearly all experimental channels” (Section 5.4, p. 6850), while also saying that on uniform channels “our method performs markedly better.” Inference: the proposed schemes' better theoretical lower bound does not translate into the best measured capacity on the two text channels, so practical and theoretical rankings do not always coincide.

## trust, limits, and implications for VL

The paper proves composition conditional on a secure PRG, exact module properties, and synchronized white-box distributions. It measures capacity, no-payload rate, time, KLD, and classifier accuracy. It does not verify PRG construction, model probability outputs, floating-point rounding, tokenizer semantics, or implementation memory safety. It assumes the sender and receiver share keys, history, model, and channel state. The framework does not cover every provably secure scheme, and its own experiments are limited to two Llama-3 prompts and uniform channels of two sizes.

Inference: threat to agent-written verified Rust is moderate in the sampler and proof-composition layer. A verified implementation can make conservation, agreement, prefix decoding, and bounded arithmetic explicit, but the system remains dependent on unverified model/PRG interfaces and numerical assumptions. Existing work already gives universal recombination, hybrid security, cyclic-shift encoding, and capacity/stability optimization; VL should use those as specification patterns instead of rebuilding generic steganography. Inference: the useful new VL work is verifying concrete fixed-precision implementations and machine-checked composition assumptions.

## techniques for the catalog

- probability recombination — decompose arbitrary token probabilities into equal-weight blocks and group them into bins
- differential-based recombination — sort and difference probabilities to produce universal bins in `O(n log n)`
- binary-based recombination — group fixed-precision binary probability blocks in `O(n)` time
- stability-based recombination — avoid singleton bins under minimum-entropy conditions to guarantee payload each step
- bin sampling — sample a recombined bin according to its aggregate probability with a shared PRG
- cyclic-shift uniform steganography — use prefix-free codewords and a random cyclic shift for exact uniform marginals
- hybrid composition proof — reduce arbitrary-channel security to PRG security and uniform-module security
- capacity optimization — choose differential recombination and cyclic shifts to approach entropy
- stability optimization — combine singleton-free recombination with cyclic shifts for at least one bit per step
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We consider a scheme stable if it can guarantee the embedding of at least 1 bit for all distributions where the minimum entropy is greater than or equal to 1 bit."): read the whole paper text (Sections 1-8, appendices A-E) and checked every quotation, number, algorithm step, section and page reference against it, including Table 1 rows quoted and Table 4; changed the link to the publisher page from the title page, corrected page and section references (Algorithm 4, Section 4.2.3, capacity lemmas, Section 5.4 quote), the USD description, the time-complexity note on Cython versus sorting, the Table 4 spread notation, and marked the lower-bound remark as inference; did not check the appendix proofs line by line, Figures 1-7 beyond their captions, the Discop equivalence argument of Section 4.4, or the cited works.
