# SparSamp: Efficient Provably Secure Steganography Based on Sparse Sampling
(authored by agents unless marked 🧑)
Tag: `wang2025sparsamp`, [paper](https://www.usenix.org/conference/usenixsecurity25/presentation/wang-yaofei)

## purpose and claim

SparSamp is a message-embedding sampler for generative text, image, and audio models. It combines a message chunk with a pseudorandom number, samples from the model's unchanged probability distribution, and progressively reduces the set of message candidates that could have produced the observed token. The sender and receiver share the model, context, PRNG, and key (Figure 6, p. 6824). The paper's central claims are distribution preservation and constant additional work per sampling step. It says: “SparSamp preserves the original probability distribution of the generative model, thus ensuring security.” (Abstract, p. 6817)

The method is a steganographic coding algorithm, not a formal verification system. Its security proof assumes a pseudorandom generator and finite numerical precision; its experiments evaluate speed, capacity, KLD, decoding, token ambiguity, and steganalysis. Inference: the relevant lesson for VL is how to specify and prove preservation of a distributional invariant while keeping the implementation's state transitions executable.

## baseline sampling and message-derived randomness

What it is. At step `i`, the model gives a token distribution `P_i` in the model's default order. Ordinary sampling (Algorithm 1) maps `r_i ∈ [0,1)` to a token and its cumulative interval `SE_i=[cuml−P_i(k),cuml]`. For an `l_m`-bit message chunk `m`, `bin2num(m)=bin2dec(m)/2^{l_m}`. SparSamp forms an MRN (message-derived random number) `r_i(m)=[r_i+bin2num(m)] mod 1` and samples `P_i` with that MRN (Equations 2–4, p. 6821).

How to apply it.

1. Generate `r_i` from the shared PRNG and compute `P_i=G(C_i)` from the current context (Algorithm 3, p. 6825).
2. Split the message into `l_m`-bit chunks; when starting a chunk (when `N_m=1`), set its candidate count `N_m=2^{l_m}` and index `k_m=bin2dec(chunk)` (Algorithm 3, p. 6825).
3. Compute `r_m=(k_m/N_m+r) mod 1` and sample the token and interval `SE` (Equations 4–5 and Algorithm 3, pp. 6821, 6822, 6825).
4. Append the token to the stego output and context, carrying `(N_m,k_m)` across EOS if the message was not fully embedded (Section 3.4 and Algorithm 3, pp. 6824–6825).
5. On extraction, reproduce the same context and PRNG, get `SE` of each received token, and run the reverse computation of Algorithm 4 to recover each chunk (Algorithm 4, p. 6825).

The paper's security theorem states: “For any polynomial-time distinguisher A , it is computationally infeasible to distinguish between samples drawn from Pi using ri and using ri (m).” (Theorem 1, p. 6826) Its proof treats the PRNG output as indistinguishable from uniform, bounds the probability of each `h`-bit random-number value, and observes that the summed absolute difference between the distributions of `r_i(m)` and `r_i` is negligible. The paper says: “Given that the only difference between the stego and the cover is the random variable used during the sampling process, and the distributions of ri (m) and ri are computationally indistinguishable, it follows that the stego and cover distributions are also computationally indistinguishable.” (Proof 1, p. 6826)

Inference: in Verus, model a sampler state containing the context, PRNG state, `N_m`, `k_m`, and a ghost distribution. Prove that message addition is a permutation of the finite random-number domain and that sampling returns an interval consistent with `P_i`; use `requires` for synchronized state and precision bounds and `ensures` for equal output distributions. This is an inference because the paper uses a cryptographic proof, not Verus.

## sparse sampling and ambiguity elimination

The problem is decoding ambiguity: different MRNs can fall in the same token interval, so the receiver cannot tell which message chunk was used. The paper says: “To narrow this range, we record all MRNs that sample the same token as the eMRN and use these recorded MRNs for subsequent sampling steps.” (Section 3.2, p. 6822) The number of candidates is `N_m`; the embedded index is `k_m ∈ [0,N_m)`, and `bin2num(m)=k_m/N_m` (Equation 5, Section 3.2, p. 6822).

Apply the sparse update as follows.

1. Sample with the current MRN and record `SE_i=[SE_i(0),SE_i(1)]`.
2. Compute `temp0=ceil((SE_i(0)-r_i)N_m)` and `temp1=ceil((SE_i(1)-r_i)N_m)` (Algorithm 2, p. 6823).
3. If `k_m+r_iN_m≥N_m`, set `k_m=k_m−N_m−temp0`; otherwise set `k_m=k_m−temp0`.
4. Set `N_m=temp1−temp0`; the distance between adjacent MRNs is now `1/N_m`.
5. Continue with a fresh PRNG value. When `N_m=1`, the chunk is uniquely determined; the next chunk starts with `N_m=2^{l_m}` (Algorithms 2–4, pp. 6823, 6825).

Figure 5's example starts with message `111`, `r_i=0.575`, `N_m=8`, `k_m=7`; the eMRN `0.450` samples token `c`, which the oMRNs of `110` and `000` also sample. It updates to `N_m=3`, `k_m=1`; the next eMRN `0.087` samples only token `a`, making `111` uniquely decodable (Section 3.2 and Figure 5, pp. 6822–6823). Inference: a Verus proof can establish that `0≤k_m<N_m` is preserved and that `N_m` decreases to one under the algorithm's finite interval partition, using `invariant` and a `decreases` measure. It must model floating-point rounding explicitly or treat the numeric kernel as trusted.

## constant-time homogenization

Updating `N_m` and `k_m` by comparing and counting candidates gets slower for longer chunks (Section 3.3, p. 6823). SparSamp computes the same candidate count and index from the sampled interval using the two ceiling operations above. The paper states: “SparSamp introduces only O(1) additional time complexity in each sampling step.” (Section 3.3, p. 6823)

Use the two `ceil` calculations, one conditional subtraction, and one assignment to update `(N_m,k_m)`; the paper says SparSamp eliminates “the need for sorting or combining probability distributions” (Section 3.4, p. 6824). Inference: this update is a constant number of arithmetic operations independent of vocabulary size; a Verus postcondition can bound the number of loop-free arithmetic steps in the update function, but the cost of the neural-model call and of Algorithm 1's scan over `P_i` is outside the `O(1)` claim, which is additional work over ordinary sampling.

## resumable generation and token ambiguity

Algorithm 3 continues ordinary sampling after the complete message is embedded and keeps model EOS behavior unchanged. If EOS appears before the message is fully embedded, the unembedded message and `(N_m,k_m)` carry over to the next conversation round. Algorithm 4 stores past `temp0` and `N_m` values and, when `N_m=1`, computes `k_m` backward through them to emit a chunk (Section 3.4 and Algorithms 3–4, pp. 6824–6825).

LLM byte-pair encoding is not prefix-free, so token ambiguity (TA) may occur, and decoding relies on the receiver's token path matching the sender's exactly (Section 3.5, p. 6824). The paper names two disambiguating methods that keep the distribution: BackCheck (backtracking with checkpoints) and SyncPool. The paper says SyncPool “does not affect the complexity of generation and decoding but diminishes the embedding rate”, while BackCheck “inserts checkpoints at each segment of the message” and “requires repeated backtracking to identify the correct token path during extraction” (Section 3.5, p. 6825). When the decoding token path differs from the embedding path, Algorithm 4 can reach `N_m=0`, which lets the receiver infer the approximate TA location before the message is extracted (Section 3.5, p. 6825). Inference: in Verus, token-path uniqueness should be a precondition of a simple extractor; a verified backtracking extractor needs a ghost set of candidate paths and a proof that each checkpoint narrows it without dropping the sender path.

## theorem assumptions and evaluation

The security proof assumes a deterministic polynomial-time PRNG whose output is computationally indistinguishable from uniform, `h`-bit precision for the pseudorandom numbers, and `h` constant and independent of the security parameter `λ`. Under these assumptions, Equation 8 gives the sum over the `2^h` grid values of `|Pr[r_i(m)=a]−Pr[r_i=a]|` as `2^{h+1}·ε(λ)`, which is negligible (Proof 1, p. 6826). Inference: the paper does not prove properties of the neural model, floating-point implementation, tokenizer, or receiver synchronization.

The main GPT-2 experiment varies `l_m` at `p=1.00`. Table 2 reports 100% decoding accuracy for `l_m` from 2 through 1023 and 0% for `l_m≥1024`; the paper attributes the 1023 maximum to double-precision limits and evaluates these sentences without TA (Sections 4.1, 4.3 and Table 2, pp. 6827–6828). Utilization rises from 27.5% (`l_m=2`) to 99.5% (`l_m=1023`); embedding speed peaks at 755.4 bits/s for `l_m=64`, and decoding speed is 715.6 bits/s there (Table 2, p. 6828).

Table 3 compares GPT-2 sampling at `p=0.80,0.95,1.00`. SparSamp's average token sampling times are `1.53E−04`, `1.57E−04`, and `7.21E−04` seconds/token; generation speeds are 125.8, 130.6, and 132.3 tokens/s (Table 3, p. 6828). Table 4 reports SparSamp embedding rates 3.60, 5.16, and 5.98 bits/token and utilization 95.3%, 94.9%, and 97.4% at those p values; embedding speeds are 461.7, 628.2, and 755.4 bits/s (Table 4, p. 6828).

Security measurements use 10,000 cover/stego text pairs at `p=0.95` and three deep-learning steganalysis methods (Section 4.6, p. 6829). Detection error `P_E` is 49.63% (FCN), 50.09% (R-BiLSTM-C), and 49.58% (BiLSTM-Dense) (Table 6, p. 6830). Table 5 reports average and maximum KLD of `0/0` for SparSamp at all three p values (Table 5, p. 6828). Inference: this is an empirical measurement for the tested GPT-2 setup, not a proof for all models.

Across additional models, Table 7 reports Qwen-2.5 at 117.2 bits/s, 3.31 bits/token, 95.8% utilization; Llama-3 at 90.1 bits/s, 2.66 bits/token, 96.6%; DDPM at 5,046.8 bits/s, 2.33 bits/token, 98.5%; and WaveRNN at 9,223.4 bits/s, 4.83 bits/token, 96.5% (Table 7, p. 6830).

Token-ambiguity tests embed 64-bit messages at a time and generate 10,000 pairs of stego texts. Table 8 gives TA occurrence rates per 64-bit embedding of 2.49% (GPT-2), 0.67% (Qwen-2.5), and 3.81% (Llama-3); SparSamp detects TA in 79.3%, 73.2%, and 65.4% of cases, respectively, versus 0% for AC (Table 8, p. 6830). The paper says: “We verified that for every 60-bit embedding, only 4 bits of the checkpoint are needed to backtrack to the correct path thus enabling accurate extraction based on SaprSamp.” (Section 4.8, p. 6830)

## trust, limits, and implications for VL

The work proves a computational indistinguishability theorem conditional on PRNG and precision assumptions. It measures speed, capacity, KLD, decoding, and neural steganalysis. Inference: it does not verify the model, tokenizer, PRNG, floating-point arithmetic, or shared-state synchronization, and TA, EOS truncation, finite precision, and model changes can break extraction. Figure 6 requires the sender and receiver to share the key, and the paper says: “In the future, we hope to further extend SparSamp to realize robust PSS and build public-key PSS.” (Section 5, p. 6831)

Inference: threat to agent-written verified Rust is moderate for covert-channel and distribution-preservation components: an agent can implement a compact state machine whose key invariant is mathematically clear, but synchronization, floating-point edge cases, tokenizer ambiguity, and PRNG assumptions create substantial unverified surface. Existing work already covers message-driven sampling, sparse candidate narrowing, constant-overhead updates, and checkpoint-based disambiguation; VL should reuse these invariants and focus on verified finite-precision arithmetic and state synchronization rather than redo generic steganographic coding.

## techniques for the catalog

- message-derived random sampling — add a fixed-size message fraction to each PRNG sample modulo one and sample the unchanged model distribution
- sparse sampling — shrink colliding message candidates using the sampled token interval until one remains
- constant-overhead candidate update — compute candidate count and index with two ceiling operations on the sampled interval
- resumable embedding and extraction — carry candidate state across EOS and conversation boundaries
- token-ambiguity detection — detect `N_m=0` and locate the approximate TA position before extraction completes
- BackCheck integration — use segment checkpoints and backtracking to recover the sender's token path
- distribution-preservation proof — reduce stego/cover indistinguishability to PRNG indistinguishability and finite-precision bounds
Checked 2026-10-16 against the full paper by a Claude agent (mid-paper quote: "In typical generation processes, sampling time constitutes only a tiny fraction of the total time, approximately 0.02 of the inference time."): checked every quotation, number, table, section and page reference, and algorithm step against the paper text; changed the link to the USENIX presentation page given in the paper text, corrected page numbers (Theorem 1, Algorithms 3–4, Tables 2–3 and 6–8, Section 4.8), the section of the O(1) quote (3.3, not 3.2), the proof's bound (summed absolute difference, not total variation), the misnamed Example 1, and Table 8's subject (SparSamp detection, not BackCheck); deleted unsupported claims (the SyncPool mechanism description, the denominators sentence for Table 7, the information-theoretic label for the claim); marked own conclusions "Inference:"; did not check the PDF figures' graphics or the referenced artifact.
