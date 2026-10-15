# Hierarchical Attention Generates Better Proofs
(authored by agents unless marked 🧑)
Tag: `chen2025hierarchical`, [paper](https://doi.org/10.5281/zenodo.8016386)

## technique and structure
This paper fine-tunes a theorem-proving language model with an attention regularizer derived from Lean proof-state structure. It identifies five levels: context T0, case T1, type T2, instance T3, and goal T4, ordered context ≺ case ≺ type ≺ instance ≺ goal (Section 3.1, pp.3–4). The authors state: "Our approach constructs a hierarchical tree from the input token sequence, assigning levels to tokens and guiding information flow based on these levels." (Section 1, p.2).

The intended use is proof generation where the model must preserve dependencies between definitions and goals. Higher-level tokens may attend to the same or lower levels, while lower-level tokens are restricted from higher-level information (Section 1). Same-level flow is unrestricted; lower-to-higher flow is guided; higher-to-lower is limited (Section 4.1, Equation 1).

## applying hierarchical attention
Steps from the paper:
1. Parse each Lean theorem text into level sets T0…T4 (Algorithm 1 and Algorithm 2, Appendix A.5).
2. For every token ti record level(ti) in {0,1,2,3,4}; initialize an attention mask M and flow loss (Algorithm 1).
3. At transformer layer l, set αl = 1 − l/L, allowing stronger regularization in early layers and more flexibility later (Section 3.2; Equation 2).
4. Set Mij=1 when level(ti) ≤ level(tj), allowing upward or horizontal flow, and Mij=0 otherwise (Algorithm 1).
5. Penalize invalid attention with ReLU(attl(ti,tj)(1−Mij)); sum over layers and tokens and divide by |T| (Equation 2).
6. Train with L = LLM + λLflow, where λ controls constraint strength (Equation 3).

Algorithm 2 uses string patterns: a turnstile marks a goal, lines beginning with “case” mark case analysis, “Type” plus a colon marks a type declaration, and a colon without Type or turnstile marks an instance; multiline statements inherit the previous level (Appendix A.5). The paper explicitly says, "The parser maintains context across multi-line statements by inheriting the level of previous lines" (Appendix A.5, p.14).

Verus form (Inference): map Rust/Verus specification regions to analogous levels: module context, branch/case facts, type declarations, concrete instances, and the current postcondition goal. Implement the mask and loss in the proof-generation model, not in Verus. The parser's Lean tokens and turnstile tests do not carry over; Verus syntax needs its own robust parser. The verifier remains the authority for the generated `proof fn`.

## search and evaluation technique
The trained model is Pythia-2.8B fine-tuned for three epochs on 169,530 LeanDojo Benchmark 4 training samples, with 3,606 validation samples, eight NVIDIA A800 GPUs, effective batch size 32, learning rate 1e−5, and random seed 42 (Appendix A.1, p.13). Evaluation uses miniF2F test/validation and ProofNet test/validation. Best-first search keeps a priority queue of states ranked by cumulative log probability, expands the highest-scoring state, and samples S tactics; single-pass sampling runs K independent trajectories (Appendix A.2).

The shared budget is K×T with T=100 expansion steps; for best-first K=N×S, while single-pass sets S=1 (Appendix A.2). Proof success means completion within N valid tactics. Pass@K is the fraction of benchmark problems with a valid proof in K attempts; complexity compares only theorems both methods prove, using Ravg, the ratio of average generated proof steps, and Diff, the fraction of successful proofs with different lengths (Section 5.1).

At K=64 with best-first search on miniF2F test, baseline pass is 29.51% and the method is 31.56%; on miniF2F validation, 31.56% versus 34.02% (Tables 1–2). These are percentages over the corresponding benchmark sets; the tables do not print item denominators. On miniF2F test, the paper summarizes a 2.05 percentage-point pass increase and 23.81% proof-complexity reduction; on ProofNet test it reports a 1.69-point increase and 16.50% reduction (Section 5.2). The abstract reports the same headline: "our method improves proof success rates by 2.05% on miniF2F and 1.69% on ProofNet." The wording calls these percent improvements, while the tables show percentage-point differences; this is a terminology inconsistency.

For concise proofs, miniF2F test K=64 has baseline average 2.10 steps, ours 1.60, Ravg 0.76, with Diff 8.11%; miniF2F validation has 3.11 versus 2.00, Ravg 0.64, Diff 12.68% (Tables 1–2). Diff's denominator is all successful proofs in which both methods succeed; it is not the full benchmark. On ProofNet test K=64, pass is 13.56% baseline versus 15.25% ours, with Ravg 0.84 and Diff 26.09% (Table 5). Single-pass miniF2F test K=64 is 23.36% versus 27.87%, a 4.51-point gain (Table 3).

## ablations, evidence, and limits
The layer-wise adaptation ablation at K=64 shows miniF2F test pass 30.74% without adaptation and 31.56% with it; ProofNet test is 14.69% versus 15.25% (Table 10). Uniform constraints often produce lower Ravg but lower pass, supporting gradual relaxation in deeper layers. Fine-grained five levels beat coarse T1–T3 merging: miniF2F validation pass 34.02% versus 32.38%; ProofNet validation 11.86% versus 11.30% (Table 11). Explicit textual tags perform worse than both baseline and hierarchical attention (Table 12), so simply adding `<goal>` markers is not equivalent to controlling attention.

Attention analysis averages patterns over all LeanDojo Benchmark 4 test samples. In constrained layers, invalid higher-to-lower flow falls to near zero; guided flow into goal is 68.7%, while type and instance levels receive 77.7% and 71.0% from lower levels (Section 5.3). In unconstrained layers invalid flow remains 0.5–3.2%, and goal receives 84.5% lower-level attention. These measurements show the mask shapes attention, not that every generated proof is semantically correct; Lean checking supplies proof validity.

What is proved or measured: Lean's kernel checks successful generated proofs; pass@K measures benchmark completion; Ravg measures length only on jointly successful theorems. Trusted assumptions include Lean libraries, benchmark statements, parser heuristics, Pythia training, search scores, and that shorter proofs are preferable. Inference: a Verus adaptation could reduce search branching around contracts and invariants, but hierarchy can encode a mistaken specification and cannot prove Rust behavior by itself. Threat to VL is low to medium: it improves proposal efficiency, while the fundamental trust boundary remains Verus verification. Existing work already has Lean proof search and attention regularization; VL should reuse the hierarchy idea and retest its parser on Verus syntax rather than reproduce Lean experiments.

## techniques for the catalog
- five-level proof hierarchy — classify context, case, type, instance, and goal tokens with a partial order
- masked hierarchical attention — allow same/lower-level access and penalize forbidden downward flow
- layer-wise flow loss — use αl = 1 − l/L and combine flow loss with cross-entropy
- hierarchy-aware proof search — evaluate regularized models with best-first or single-pass tactic sampling
- structural parser — infer levels from theorem syntax and preserve levels across multiline statements
Checked 2026-10-15 against paper chen2025hierarchical: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
