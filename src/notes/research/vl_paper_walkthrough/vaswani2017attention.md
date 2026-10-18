# Attention Is All You Need
(authored by agents unless marked 🧑)
Tag: `vaswani2017attention`, [paper](https://arxiv.org/abs/1706.03762)

## scope and relevance

The paper introduces the Transformer for sequence transduction. Its abstract states: “We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.” (abstract, PDF p. 1.) The evaluation is machine translation and English constituency parsing, not program verification. Inference: the verification relevance is architectural: a proof-search agent can use global attention, masking, and a verifier-backed action loop, but this paper provides no formal proof of its neural network or of a theorem prover.

The authors report 28.4 BLEU on WMT 2014 English–German (abstract, PDF p. 1; Section 6.1, PDF p. 8: “Training took 3.5 days on 8 P100 GPUs.”) and 41.8 BLEU on English–French (abstract, PDF p. 1; Table 2, PDF p. 8; the prose of Section 6.1 says 41.0, see below).

## technique 1: scaled dot-product attention

What it is. The paper defines an attention function as a weighted sum of values, with weights obtained from query-key compatibility (Section 3.2, PDF pp. 3-4). It names the concrete algorithm: “We call our particular attention "Scaled Dot-Product Attention".” (Section 3.2.1, PDF p. 4.) Given query matrix Q, key matrix K, and value matrix V, it computes `softmax(QK^T / sqrt(d_k)) V` (Equation 1, Section 3.2.1, PDF p. 4).

When to use it. Use it when each proof-state token or graph element must retrieve information from all other elements in one layer. The paper says dot-product attention is faster and more space-efficient than additive attention in practice because optimized matrix multiplication implements it (Section 3.2.1, PDF p. 4). The paper reports that “additive attention outperforms dot product attention without scaling for larger values of dk” and says: “We suspect that for large values of dk , the dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients” (Section 3.2.1, PDF p. 4); footnote 4 illustrates why the dot products grow, assuming independent components of mean 0 and variance 1 (PDF p. 4). This is the authors' suspicion, not a tested result.

How to apply it.

1. Pack all queries into Q and all keys and values into K and V (Section 3.2.1, PDF p. 4).
2. Compute every query-key dot product and divide by `sqrt(d_k)` (Equation 1, PDF p. 4).
3. Apply softmax across keys to obtain weights, then multiply by V (Equation 1, PDF p. 4).
4. For decoder self-attention, mask illegal future positions by setting their softmax inputs to negative infinity (Section 3.2.3, PDF p. 5).

Verus form (inference). Treat a verified implementation as a Rust matrix routine with preconditions for dimensions and finite numeric representation. Specify a mathematical `spec fn` for the matrix result and prove the executable loop or library call refines it. Floating-point softmax needs an explicit approximation or fixed-point model; a proof over real-valued `sqrt` and `exp` does not automatically verify the machine implementation. Inference: a proof-search service can use attention for proposal ranking while Verus separately proves the generated Rust artifact; model output itself is not a proof.

## technique 2: multi-head attention

What it is. The authors project Q, K, and V into several learned subspaces, run attention in parallel, concatenate the results, and apply an output projection. Their exact definition is “MultiHead(Q, K, V) = Concat(head1, ..., headh)W^O where headi = Attention(QW_i^Q, KW_i^K, VW_i^V)” (Section 3.2.2, PDF p. 5; the paper writes the sub- and superscripts as W_i^Q etc.). The base Transformer uses eight heads with `d_k = d_v = d_model / h = 64` and `d_model = 512` (Section 3.2.2, PDF p. 5).

When to use it. Use multiple heads when different relations should be attended to simultaneously. The paper says this “allows the model to jointly attend to information from different representation subspaces at different positions” (Section 3.2.2, PDF p. 5). Inference: for formal-verification agents, heads could specialize in syntax, hypotheses, counterexamples, or API context, but specialization is a hypothesis rather than a guarantee.

How to apply it.

1. Choose `h`, `d_model`, `d_k`, and `d_v` so the total cost remains comparable to one full-dimensional attention (Section 3.2.2, PDF p. 5).
2. Learn one projection matrix each for Q, K, and V per head.
3. Run scaled dot-product attention independently for all heads.
4. Concatenate head outputs and multiply by `W^O` (Section 3.2.2, PDF p. 5).

Verus form (inference). Verify each projection's shape and the concatenation index mapping as pure arithmetic lemmas, then prove that the executable tensor loops implement the specification. Rust ownership controls buffers but does not prove learned weights or numerical quality. Inference: the practical boundary is to verify data movement and dimension safety, while treating trained parameters and the inference library as trusted inputs unless separately verified.

## technique 3: encoder-decoder stack with residual normalization

What it is. The encoder has six identical layers; each layer contains multi-head self-attention and a position-wise feed-forward network. The decoder has the same two sublayers plus encoder-decoder attention (Section 3.1, PDF p. 3). Each sublayer is wrapped as `LayerNorm(x + Sublayer(x))` (Section 3.1, PDF p. 3). Decoder self-attention is masked so position i sees only outputs before i (Section 3.1, PDF p. 3).

How to apply it.

1. Embed input tokens into vectors of dimension 512 and add positional encodings (Sections 3.1 and 3.5, PDF pp. 3, 6).
2. Apply six encoder layers; in each, run self-attention, add the residual, normalize, then run the feed-forward sublayer and again add and normalize (Section 3.1, PDF p. 3).
3. Apply six decoder layers; use masked self-attention, encoder-decoder attention over encoder outputs, and the same residual/normalization pattern (Section 3.1, PDF p. 3).
4. Use the pre-softmax linear map and softmax to produce next-token probabilities (Section 3.4, PDF p. 5).

Verus form (inference). Model a layer as a pure functional transformation and prove shape preservation and masking properties. A contract can state that output position i depends only on prefix positions, but proving that property requires a relational specification over sequences, not merely bounds checks. Inference: this causal contract is the part most directly reusable for an agent that must not inspect future proof actions.

## technique 4: position-wise feed-forward and positional encoding

The feed-forward network is two linear transformations with ReLU: “FFN(x) = max(0, xW1 + b1)W2 + b2” (Equation 2, Section 3.3, PDF p. 5). It is applied independently and identically at each position, with `d_model = 512` and inner dimension `d_ff = 2048` (Section 3.3, PDF p. 5).

Because there is no recurrence or convolution, the paper adds sinusoidal positional encodings to token embeddings. The formulas are `PE(pos,2i)=sin(pos/10000^(2i/d_model))` and `PE(pos,2i+1)=cos(pos/10000^(2i/d_model))` (Section 3.5, PDF p. 6). The authors also tried learned positional embeddings and found nearly identical results on their development setting (Table 3 row E, PDF p. 9).

Inference: a verified agent can encode token positions as explicit indices and prove that each output carries its intended position, but numerical equivalence between trigonometric formulas and a Rust implementation needs a separate approximation contract.

## technique 5: training and decoding protocol

The paper trains on WMT 2014, batches about 25,000 source and 25,000 target tokens, and uses Adam with `β1=0.9`, `β2=0.98`, `epsilon=10^-9` (Sections 5.1–5.3, PDF p. 7). Its learning-rate schedule is linear warmup for 4,000 steps followed by inverse-square-root decay (Equation 3, Section 5.3, PDF p. 7). It applies residual dropout at rate 0.1 for the base model and label smoothing of 0.1 (Section 5.4, PDF pp. 7-8).

For translation inference, the paper averages the last five checkpoints for base models and the last 20 for big models, then uses beam size 4 and length penalty 0.6 (Section 6.1, PDF p. 8). For parsing, it uses beam size 21 and length penalty 0.3 (Section 6.3, PDF p. 10).

## techniques for the catalog

- scaled dot-product attention — compute `softmax(QK^T/sqrt(d_k))V` and mask illegal decoder positions
- multi-head attention — project Q/K/V into learned subspaces, attend in parallel, concatenate, and project
- residual normalized Transformer stack — compose masked decoder and encoder attention with residual additions and LayerNorm
- position-wise feed-forward — apply two shared linear maps with ReLU independently at every sequence position
- sinusoidal positional encoding — add fixed sine/cosine vectors so a recurrence-free model retains order
- beam-search decoding — average checkpoints and select outputs with a specified beam size and length penalty
