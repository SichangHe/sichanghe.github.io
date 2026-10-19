# Imbuing Large Language Models with Bidirectional Logic for Robust Chain Repair
(authored by agents unless marked 🧑)
Tag: `cheng2026imbuing`, [paper](https://arxiv.org/abs/2606.05030)

## what the paper does

Cheng, Dai, Sun, and Lukasiewicz introduce Teleological Reasoning Infilling (TRI), a model and inference loop for repairing a failed reasoning segment between a verified prefix premise P and a verified downstream milestone S. The abstract calls the central task “given a verified prefix premise P, a verified downstream milestone S, and the original query Q, the model must synthesise the logical bridge M that connects P to S rigorously and completely” (Abstract, p.1). A causal draft model proposes a full trace; a deterministic verifier identifies the first failing step; TRI regenerates only that bridge and leaves verified context intact.

## technique 1: Prefix-Suffix-Middle sequence architecture

what it is: reorder the context so a decoder-only transformer sees the future milestone before it generates the bridge. Add three distinct sentinels and train on X = Q ⊕ ⟨teleo_premise⟩ ⊕ P ⊕ ⟨teleo_milestone⟩ ⊕ S ⊕ ⟨teleo_bridge⟩ ⊕ M (Equation 1, Section 3.2, p.6). Causal attention then permits every bridge token to attend to both P and S without changing self-attention.

how to apply it:
1. split a verified reasoning trace into query Q, prefix P, bridge M, and future milestone S
2. insert one distinct sentinel immediately before each of P, S, and M
3. place S before the bridge in the serialized training sequence
4. compute cross-entropy only over M, keeping Q/P/S as static context
5. at inference, supply Q/P/S and autoregressively generate M

The paper's Definition 1 requires P and S to be independently verified and says P⊕M⊕S must be a complete sound argument confirmed by deterministic V (Section 3.1, p.6). Inference: serialize a failed Rust proof as a verified prefix, a target postcondition/milestone, and a missing proof block; prompt an LLM to generate the bridge, then compile and verify it with Verus. The paper's PSM model is machine-learning infrastructure; Verus remains the acceptance checker.

## technique 2: verified-triple SFT and verifier-grounded DPO

what it is: train only on gaps whose endpoints are symbolically verified, then preference-optimize with a deterministic verifier rather than an LLM judge.

SFT steps (Section 3.4, pp.8–9):
1. parse MATH and Lean-Workbook traces into K atomic steps
2. sample a contiguous span [k1,k2] with k2−k1 ∈ [2,6], as specified in Section 3.4
3. set P to the step before the gap, S to the step after, and M to the removed steps
4. verify P and S independently with the Python evaluator or Lean 4 kernel
5. retain only passing quadruples (Q,P,S,M)

Appendix C.4 (p.25) specifies a Qwen2.5-72B base checkpoint and approximately 780,000 training quadruples: 450,000 from MATH training traces and 330,000 from Lean-Workbook formalisation exercises, trained for three epochs. Inference: the inclusive definition M=sk1◦···◦sk2 makes the stated sampling rule cover three to seven steps, whereas Appendix A.5 (p.21) says “restrict gap spans to [2, 6] steps”; the paper does not reconcile these descriptions. MATH steps are equation-bearing transformations separated by double newlines; Lean steps are AST tactics such as `rw`, `simp`, `apply`, and `intro` (Section 3.4, p.8). Section 3.4 states that training uses MATH training subsets and Lean-Workbook formalisation exercises, while evaluation uses MATH test problems and Lean-Workbook competition problems; this partitioning was not independently audited.

DPO steps (Section 3.4, pp.8–9; Appendix C.4, p.25):
1. sample four candidate bridges per quadruple with nucleus sampling (p=0.95, temperature 1.0)
2. run each candidate through V
3. label chosen only when P⊕M̂⊕S compiles/executes and V confirms a complete deductive chain
4. label rejected when symbolic verification fails
5. optimize DPO against the SFT reference policy with β=0.1 for one epoch; approximately 312,000 preference pairs result (Appendix C, p.25)

Rejected samples cover compilation/execution errors (~18%), logical gaps (~41%), variable hallucination (~14%), and near-misses (~27%) (Section 3.4, p.9). The paper says, “We explicitly reject LLM-based evaluation” because neural judges can be sycophantic and miss formal errors (Section 3.4, p.8). It also states: “Training proceeds in two stages: supervised fine-tuning (SFT) followed by DPO with a symbolic oracle.” (Section 3.4, p.8). Inference: use Verus compile/verify as V, retain only candidate proof blocks that close the target obligation, and construct DPO pairs from Verus-verified versus rejected completions. The generated proof block is checked by the external verifier before acceptance; TRI does not evaluate this Verus adaptation.

## technique 3: dual-system surgical repair

what it is: use a causal draft model for exploration and TRI for localized repair. Algorithm 1 (p.9) is:
1. T ← Mdraft(Q)
2. run V(T), obtaining first failure index k
3. if success, return T
4. while verification fails and B>0, extract P=T[1:k−1]
5. scan the suffix for the next independently verifiable milestone S
6. serialize PSM context and generate bridge M with MTRI
7. reconstruct T=P⊕M⊕S⊕T[after S]
8. re-run V, decrement the token budget by |M|, and repeat while verification fails and budget remains; return the current trace, which may still fail verification

ExtractMilestone (Algorithm 2, Appendix B, p.22) scans at most Wmax subsequent steps and returns the first step passing V; experiments use Wmax=8. If none passes, the causal draft model regenerates the entire suffix conditioned on P, without bidirectional anchoring (Appendix B). Section 5 additionally caps evaluation at three repair iterations; Algorithm 1 itself gives only the verification and budget stopping conditions. No milestone occurs in 6.8% of MATH Level-5 repair attempts, 4.2% of HumanEval-Fix, and 11.3% of Lean-Workbook attempts (Appendix B, p.22). Mean bridge lengths are 3.2, 2.8, and 4.1 steps respectively; verifier calls average 4.1 (MATH) to 9.7 (Lean-Workbook); these checks consume under 3% of total inference wall-clock time (p.22).

Inference: map k to the first failed Verus obligation, use the last verified proof state as P, and choose a later assertion/ensures goal that Verus can check as S. Regenerate only the proof segment and rerun Verus. If no later state is independently checkable, regenerate the suffix or ask for a fresh proof. This is an inference because TRI itself targets Python and Lean rather than Verus.

## measurements, ablations, and assumptions

Evaluation runs greedy decoding with a 4,096-token budget on all 5,000 MATH test problems, 492 HumanEval-Fix instances, and 2,500 Lean-Workbook test problems; TRI allows at most three repair iterations (Section 5, p.10). Table 2 reports TRI Full MATH accuracies L1–L5 of 97.6, 95.4, 89.3, 74.7, and 53.7%; HumanEval-Fix Pass@1 74.9%; Lean-Workbook PCR 57.1%; and 1,268 mean tokens/problem (Table 2, p.10). The comparison denominators are the full benchmark sets above. Table 2 reports gains over the strongest baseline for each metric of +6.4 percentage points at MATH L5, +8.1 on HumanEval-Fix, and +5.9 PCR points on Lean-Workbook. Its 31.2% token reduction compares 1,268 tokens with the 1,842-token Qwen2.5-72B + CoT baseline. Tok/Prob counts draft and TRI generation; verifier calls are separate (Table 2 caption, p.10). Inference: the equal-budget description is inconsistent with Table 2 reporting 29,472 tokens/problem for Qwen CoT-SC despite Section 5 (p.10) stating “The token budget was set to 4,096 tokens per problem for all methods”; these figures do not establish an internally consistent comparison under equal token budgets.

Under budget B=1,000/2,000/4,000 tokens, TRI Full reaches MATH L5 42.3/49.8/53.7%; at 25% and 50% seeded fault rates it reaches 52.1% and 44.6% accuracy, with repair success rate 73.8%, mean 1.4 iterations, 1.2 TRI calls, and 4.8 verifier calls (Table 3, p.12). These fault-rate experiments seed exactly one masked intermediate step in the stated fraction of Level-5 problems (Section 5.1, p.12). Inference: they do not estimate naturally occurring bug prevalence.

Table 4 ablations identify verifier grounding as critical: replacing Lean/Python verification with a GPT-4o judge lowers MATH L5 from 53.7% to 46.2%, HumanEval-Fix from 74.9% to 64.1%, and Lean PCR from 57.1% to 45.3% (Table 4, p.13; Section 5.2, pp.13–14). Removing DPO yields 49.8% MATH L5; removing the repair loop yields 52.7%; standard FIM ordering yields 50.9%. Selecting the second or third verifiable milestone lowers MATH L5 to 52.4% and 50.8%; random selection gives 51.6% (Table 4, p.13; Section 5.2, pp.13–14).

Proposition 1 gives the PSM attention-reachability argument in Section 3.3 (pp.7–8). Appendix A (pp.17–21) states topological-consistency, expressiveness, and optimization claims, assuming a Lipschitz logical scorer in embedding space, a verifier matching a scorer threshold, bounded model capacity, and verified training data. Remark 1 (p.18) limits the theory to distributional bridge quality rather than pointwise guarantees for discrete outputs. Inference: the theoretical claims do not establish universal correctness of generated bridges; acceptance depends on the particular verifier and what it checks. The proofs were read but not independently validated.

## techniques for the catalog

- PSM bidirectional conditioning — reorder query, verified prefix, milestone, and bridge with three sentinels so a causal decoder sees both endpoints
- verified-gap SFT — train on contiguous trace gaps whose endpoints independently pass a symbolic verifier
- verifier-grounded DPO — form preference pairs from deterministic proof acceptance and rejection, avoiding LLM judges
- surgical dual-system repair — locate the first failed step, infill only its bridge, splice it back, and reverify
- bounded milestone scan — select the first later step that passes the verifier, with suffix-regeneration fallback
- bridge-token budgeting — decrement the remaining budget by generated bridge length; evaluation additionally limits repair iterations
