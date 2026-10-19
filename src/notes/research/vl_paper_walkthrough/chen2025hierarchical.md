# Hierarchical Attention Generates Better Proofs
(authored by agents unless marked 🧑)
Tag: `chen2025hierarchical`, [paper](https://arxiv.org/abs/2504.19188)

## technique and structure
This paper fine-tunes a theorem-proving language model with an attention regularizer derived from Lean proof-state structure. It identifies five levels: context T0, case T1, type T2, instance T3, and goal T4, ordered context ≺ case ≺ type ≺ instance ≺ goal (Section 3.1, p.3). The authors state: "Our approach constructs a hierarchical tree from the input token sequence, assigning levels to tokens and guiding information flow based on these levels." (Section 1, p.2).

Higher-level tokens may attend to the same or lower levels, while lower-level tokens are discouraged from attending to higher levels. The paper describes the intended restriction as: "Tokens at lower levels are restricted from accessing higher-level information." (Section 1, p.2). Same-level information flow is unrestricted; lower-to-higher flow is guided; higher-to-lower flow is limited (Section 4.1, Equation 1, p.4). Here attl(ti,tj) denotes information flowing from ti to tj, affecting tj's embedding (Section 3.2, p.4). The binary mask selects attention to penalize in the training loss; Algorithm 1 does not specify hard removal of those attention values.

## applying hierarchical attention
Steps from the paper:
1. Initialize context segments, extract the Lean4 code block, and classify its lines into levels T0…T4 (Algorithms 1–2, pp.4,15).
2. Record each segment's position and level, assign tokens their levels, and initialize the binary mask M and flow loss (Algorithms 1–2).
3. At layer l, set αl = 1 − l/L, giving stronger regularization in earlier layers (Section 3.2; Equation 2).
4. Set Mij=1 when level(ti) ≤ level(tj), allowing upward or horizontal flow, and Mij=0 otherwise (Algorithm 1).
5. Sum αl × ReLU(attl(ti,tj)(1−Mij)) over layers and token pairs, then divide by |T|, the number of input tokens (Equation 2).
6. Train with L = LLM + λLflow, where LLM is cross-entropy and λ controls constraint strength (Equation 3).

Algorithm 2 checks these patterns in order: a turnstile marks a goal; a line starting with `case` marks case analysis; `Type` plus a colon marks a type declaration; a colon without `Type` or turnstile marks an instance. Other lines retain the current level, initially context. The authors explain: "The parser maintains context across multi-line statements by inheriting the level of previous lines when appropriate, ensuring accurate hierarchical structure capture with minimal computational overhead." (Appendix A.5, p.14; Algorithm 2, p.15).

Inference: a Verus adaptation could map specification regions to module context, branch/case facts, type declarations, concrete instances, and the current postcondition goal. Implement the mask and loss in the proof-generation model. The Lean parser's string patterns need replacement for Verus syntax, and generated `proof fn` code still needs Verus verification. The paper does not test this adaptation.

## search and evaluation technique
The model is Pythia-2.8B fine-tuned for three epochs on 169,530 LeanDojo Benchmark 4 training samples, with 3,606 validation samples, eight NVIDIA A800 GPUs, effective batch size 32, learning rate 1e−5, and random seed 42 (Appendix A.1, p.13). The paper states: "We train the model for 3 epochs on 8 NVIDIA A800 GPUs using DeepSpeed with ZeRO-3 optimization, taking approximately 40 hours." Evaluation uses miniF2F test/validation and ProofNet test/validation (Section 5.1, p.5).

Section 5.1 defines a budget K×T with T=100 expansion iterations and K=N×S. For best-first search, N is the number of parallel search attempts and S is the number of tactics per expansion; for single-pass sampling, N is the number of attempts per problem and S=1. Appendix A.2 describes a priority queue ranked by cumulative log probability for best-first search and K parallel attempts for single-pass sampling (p.13). However, it also says, "The search succeeds when reaching a state with no remaining goals within N expansions." For single-pass sampling it says, "A proof succeeds if it completes within N valid tactics." Inference: these uses of N conflict with Section 5.1's definition, so the paper does not consistently specify the search-depth limit.

The paper names pass@K accuracy and proof complexity as its metrics (Section 5.2, pp.5–6). Its prose describes K both as sampling attempts and as N×S tactic samples per expansion. Complexity is proof-step count. Tcom contains only theorems both methods prove with different proof lengths. Equation 5 defines Ravg as the mean over Tcom of C(t,ours)/C(t,baseline), not a ratio of average lengths. The authors specify: "Note that we only consider theorems where both methods succeed but generate proofs of different lengths, as this provides a meaningful comparison of the proof conciseness." Diff is the percentage of these length-disagreeing theorems among all theorems both methods prove (p.6).

At K=64 with best-first search, miniF2F test pass is 29.51% baseline versus 31.56% with hierarchical attention; validation is 31.56% versus 34.02% (Tables 1–2, p.6). ProofNet test is 13.56% versus 15.25% (Table 5, p.7). The abstract states: "Experiments demonstrate that our method improves proof success rates by 2.05% on miniF2F and 1.69% on ProofNet while reducing proof complexity by 23.81% and 16.50% respectively." Inference: the reported pass differences are 2.05 and 1.69 percentage points, although the authors write percent improvements.

For the length-disagreeing, jointly successful subset at K=64, miniF2F test reports complexity 2.10 steps baseline versus 1.60 ours, Ravg 0.76, and Diff 8.11%; validation reports 3.11 versus 2.00, Ravg 0.64, and Diff 12.68% (Tables 1–2). ProofNet test reports 2.00 versus 1.67 steps, Ravg 0.84, and Diff 26.09% (Table 5). These complexity results exclude equal-length and unsuccessful cases. Single-pass miniF2F test pass at K=64 is 23.36% versus 27.87% (Table 3, p.6).

## ablations, evidence, and limits
Without versus with layer-wise adaptation at K=64, miniF2F test pass is 30.74% versus 31.56%; ProofNet test is 14.69% versus 15.25% (Table 10, Appendix A.3.1, p.13). The authors state: "Without adaptation, where hierarchical constraints are applied uniformly across layers, the model achieves better proof complexity ratios across three benchmarks but lower pass rates." Table 10 shows lower Ravg without adaptation on two splits, higher on one, and equal on one; that sentence overstates the table's support for better complexity.

Fine-grained five levels beat merging T1–T3 in pass rate on all four splits: for example, miniF2F validation is 34.02% versus 32.38%, and ProofNet validation is 11.86% versus 11.30% (Table 11, Appendix A.3.2, p.14). Complexity effects vary. Explicit textual tags perform worse than baseline and hierarchical attention on all four splits (Table 12, Appendix A.4, p.14). The authors conclude: "These results indicate that simply annotating data with explicit level tags is ineffective and potentially detrimental for theorem proving." Inference: this experiment does not establish that every possible tagging method would fail.

Figure 3 averages attention patterns over all LeanDojo Benchmark 4 test samples (p.8). Section 5.3 reports near-zero invalid higher-to-lower flow in constrained layers; guided flow into goal is 68.7%, while type and instance receive 77.7% and 71.0% from lower levels. Unconstrained layers retain 0.5–3.2% invalid flow, with 84.5% lower-level attention into goal (pp.7–8). The authors write: "Rather than merely responding to external constraints, the model appears to have internalized the hierarchical structure, as evidenced by the preservation of desired attention patterns in unconstrained layers." Inference: attention measurements support a change in information flow, but do not establish semantic correctness of every generated proof.

The Limitations section identifies Lean-specific semantics, a fixed hierarchy, and lack of evaluation on advanced models such as DeepSeek-Prover and InternLM-Math (p.9): "Our approach has three main limitations: (1) the hierarchy definition is specific to Lean’s semantics and may require adaptation for other proof languages, (2) the fixed hierarchy structure may limit dynamic reasoning patterns, and (3) data constraints prevented evaluation on advanced models like DeepSeek-Prover (Xin et al., 2024) and InternLM-Math (Ying et al., 2024b)."

## techniques for the catalog
- five-level proof hierarchy — classify context, case, type, instance, and goal tokens with a partial order
- hierarchical attention penalty — penalize higher-to-lower information flow using a binary mask in the loss
- layer-wise flow loss — weight the penalty by αl = 1 − l/L and combine it with cross-entropy
- proof-search evaluation — evaluate regularized models with best-first or single-pass tactic sampling
- structural parser — infer levels from theorem syntax and preserve levels across multiline statements
