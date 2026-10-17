# When Does Verification Pay Off? A Closer Look at LLMs as Solution Verifiers
(authored by agents unless marked 🧑)
Tag: `lu2025verification`, [paper](http://arxiv.org/abs/2512.02304v2)

## question and setup
Lu et al. study when an LLM verifier improves an LLM solver through rejection sampling. They evaluate 37 models from seven families on nine tasks: 3SAT, Sudoku, Matrix Multiplication, AIME, GSM8K, CSQA, GPQA, and MMLU STEM and social sciences (introduction, p. 2; section 4, p. 5). The models range from 0.5B to 72B parameters; 21 are post-trained (Llama3, Qwen2.5, Qwen3, DeepSeek-R1 families), and the paper “additionally” evaluates 12 base models from Qwen2.5-Base and Qwen3-Base for the post-training comparison (section 4, p. 5). Inference: Table 1 (Appendix B, p. 25) also lists four Llama3-Base models, which is how the total reaches 37 (21 + 12 + 4). Solvers and verifiers generate chain-of-thought, use temperature 0.7, top-p 0.9, and maximum output length 8192; outputs without a boxed answer are discarded (section 4, p. 5).

The formal objects are a dataset `D` of problems and correct solutions, a solver `S : X → Y`, and a verifier `V : X × Y → {0,1}` (section 3.1, p. 4). Verification settings are self-verification (same model), intra-family verification (another model in the same family), and cross-family verification (a model from a different family) (section 3.3, pp. 4–5). The paper says: “The solver and verifier are the same model, so the model verifies its own solutions.” (section 3.3, p. 5).

## technique: verifier gain
Use verifier gain to estimate whether a solver–verifier pair will improve accepted-answer accuracy. Accuracy alone evaluates the verifier in isolation, while gain evaluates the combined rejection-sampling system. The paper defines `Gain(S,V;D) = Precision(S,V;D) − SolverAcc(S;D)` (Equation 1, section 3.2, p. 4), where precision is the fraction of accepted solutions that are correct.

Steps:

1. Measure solver accuracy over the dataset (section 3.2, p. 4).
2. Run the verifier on solver outputs and measure precision, true-positive rate, false-positive rate, and false-negative rate (section 3.2, p. 4). Appendix A (p. 16) gives precision as `SolverAcc · TPR / (SolverAcc · TPR + (1 − SolverAcc) · FPR)`.
3. Subtract solver accuracy from verifier precision to obtain verifier gain (Equation 1).
4. Use the gain as an asymptotic bound: with repeated sampling until acceptance, accepted-answer correctness converges to verifier precision, assuming the solver has nonzero probability of producing a correct solution (section 3.2, p. 4).

The paper calls this “a simple, yet useful, metric because it quantifies the improvement in correctness induced by filtering with the verifier.” (section 3.2, p. 4). In the validation experiment, all 12 × 12 solver–verifier pairs from a 12-model subset of the post-trained models (the three smallest from each of the four post-training families) are tested: for each problem the solver generates solutions until the verifier labels one correct, up to ten attempts, and the final attempt is kept if none is accepted (section 5.1, p. 5). Pearson correlation between verifier gain and empirical rejection-sampling gain is 0.796 at three attempts (slope 0.221) and 0.892 at ten attempts (slope 0.405); each point is one pair averaged across datasets (section 5.1, Figure 2, p. 6). The paper reports correlations, not confidence intervals.

Inference: For Verus, the analogous quantity is the difference between the baseline rate of compilable, specification-satisfying programs and the rate after proof-guided filtering. The acceptance predicate should be Verus checking, not an LLM judgment. This is an inference because the paper studies LLM outputs, not Rust proofs.

## technique: choose verifier family by dissimilarity
Use cross-family verification when the solver and verifier otherwise share a bias toward similar reasoning traces. The paper reports that verifier gain decreases as solution distributions become more similar and explains: “Higher similarity between solver and verifier solution distributions increases the verifier’s tendency to accept incorrect solver outputs, reducing verifier gain.” (section 5.3, p. 8).

Steps:

1. Generate solver and verifier solutions for the same problems (section 5.3, p. 8).
2. Embed solutions with `sentence-transformers/all-mpnet-base-v2` (section 5.3, p. 8).
3. Compute average cosine similarity for each solver–verifier pair (section 5.3, p. 8).
4. Partition pairs into intra-family and cross-family settings, excluding self-verification (section 3.3, p. 5; section 5.3, p. 8).
5. Compare similarity with false-positive rate, false-negative rate, and verifier gain (Figure 5, p. 8).

The cross-family analysis contains 108 pairs (12 solvers × 9 verifiers); the intra-family analysis contains 24 pairs (12 solvers × 2 same-family verifiers) (section 5.3, p. 8). The authors report that cross-family gains decrease significantly as similarity increases, while intra-family gains are too small for a strong correlation. For cross-family pairs Figure 5 reports r = 0.613 for FPR and r = −0.257 for gain; for intra-family pairs r = 0.033 for gain (Figure 5, p. 8). The paper says it replicates the analysis with log-likelihood as an alternative similarity metric “with the same directional findings”, but prefers cosine similarity because log-likelihood also reflects intrinsic predictability (section 5.3, pp. 8–9). Appendix H (p. 22) normalizes log-likelihood by solver; there the intra-family gain slope is +0.043 (r = 0.131, Figure 11), so the intra-family gain direction is not the same as in the cosine analysis, though the effect is weak.

Inference: A Verus pipeline should separate proof generation and proof review models, or at least vary prompts and proof-search strategies, then measure whether the reviewer catches counterexamples that the generator accepts. Embedding similarity is a triage signal, not a soundness argument.

## technique: compare self, intra-family, and cross-family regimes
Use the three-regime partition to diagnose whether a verifier’s apparent strength comes from genuine checking or shared model habits. Compute each verifier metric within each partition and average over the pairs in that partition (section 3.3, p. 5). The paper finds cross-family verification “is often more beneficial than intra-family verification or self-verification” (introduction, p. 2).

The authors benchmark all 37 models on all nine datasets. Solver accuracy increases with model capacity, and the paper reports that “as models become stronger, whether through increased scale, post-training, or simply higher solver accuracy, they become less effective as self-verifiers and more effective as cross-family verifiers” (introduction, p. 2; section 5.2, pp. 6–7). Its Figure 3 (p. 6) shows self-verification yielding “the smallest gains” (section 5.2, p. 7). The authors hypothesize that Qwen3 and DeepSeek gain little from self-verification because they already self-verify while solving: keyword scanning (Appendix G, p. 22) finds spontaneous self-verification in 96% (Qwen3) and 73% (DeepSeek) of outputs versus 1–2% for Llama3 and Qwen2.5 (section 5.2, p. 7). This is a hypothesis supported by a keyword count, not a causal test. Inference: For VL, report verifier results separately for the same model, same model family, and independent model family; combining them hides correlated failures.

## technique: account for reasoning post-training
Use base/post-trained pairs to test whether reasoning training improves verification as well as solving. The authors compare Qwen2.5-Base with Qwen2.5 and Qwen3-Base with Qwen3, since other families are “either too weak (Llama3-Base) or lack base models (DeepSeek)”; both Qwen families use GRPO for reasoning post-training, so the analysis “primarily concerns its effects” (section 5.4, p. 9).

Steps:

1. Measure solver accuracy before and after post-training on the same datasets (section 5.4, p. 9).
2. Compute verifier false-positive rate, false-negative rate, and verifier gain in self, intra-family, and cross-family settings (section 5.4, Figure 6, p. 9).
3. Average metrics over models, solvers, and datasets within each family and setting (section 5.4, p. 9).
4. Compare the changes rather than treating solver accuracy as a proxy for verification quality (section 5.4, p. 9).

The paper says Qwen2.5 solvers “improve by 8.2% on average” and Qwen3 solvers “show a striking 35.4% gain”, averaged across model families and datasets (section 5.4, p. 9). Inference: Figure 12 (Appendix I, p. 24) gives 0.386 to 0.468 and 0.435 to 0.789, so these are percentage-point changes in accuracy. For both Qwen families, “post-training increases FPR and reduces verifier gain in self-verification, despite improvements in FNR”; Qwen3 post-trained verifiers also show higher FPRs and lower gains in intra-family verification, while both families, “especially Qwen3, show substantial improvements in cross-family verification” (section 5.4, p. 9). The authors conclude: “Reasoning post-training significantly improves problem-solving but can reduce self- and intra-family verification gains, while boosting cross-family verification performance.” (section 5.4, p. 9).

Inference: Verus proof-generation fine-tuning should be evaluated independently from proof-review quality. A model that writes more proofs may become a worse reviewer of its own proof style.

## technique: classify tasks by verifiability
Use task-level analysis before investing in verifier scaling. The authors recompute verifier metrics for each task, average over verifier models, and correlate them with solver accuracy (section 5.5, pp. 9–10). They find that solver and verifier accuracy correlate strongly, but self-verification gain has essentially no correlation with solver accuracy (r = −0.050); the paper says a “clear positive relationship emerges during intra-family and cross-family verification” and calls AIME an outlier (section 5.5, pp. 9–10). Inference: Figure 7 (p. 10) reports r = 0.877 for intra-family gain but only r = 0.112 for cross-family gain, so the cross-family relationship is weak in the figure's own statistic.

Tasks with logical or structured checks—3SAT and Sudoku—and mathematical tasks—GSM8K and AIME—“exhibit a higher ratio of verifier accuracy to solver accuracy and deliver higher gains across all settings” (section 5.5, p. 10); in Figure 7 the self-verification gains of all tasks are close to zero. The paper explains that Sudoku and 3SAT require exponential solving time but polynomial-time verification, whereas matrix multiplication has no comparable shortcut (section 5.5, p. 10). Knowledge-recall tasks such as CSQA, GPQA, and MMLU require nearly the same knowledge to verify as to solve (section 5.5, p. 10). The paper’s checklist says: “Check whether the task is easier to verify than to solve.” (section 6, p. 11).

Inference: For VL, prioritize properties with executable counterexample checks—memory safety, arithmetic invariants, and protocol state transitions—before properties whose truth depends on undocumented external facts. This is an engineering inference from the paper’s task distinction.

## evidence, trusted parts, and limits
The empirical evidence is model-, prompt-, dataset-, and sampling-setting specific. It relies on ground-truth labels (introduction, p. 2), chain-of-thought prompts, boxed-answer filtering, and vLLM inference on H200 GPUs (section 4, p. 5). Inference: the paper gives no formal soundness guarantee for an LLM verifier. In related work it cites others for verifier limitations: “potentially producing false positives (Stroebl et al., 2024), eliminating valid reasoning paths (Yu et al., 2025), and failing to select the right solution (Brown et al., 2024)” (section 2, p. 3).

The paper states the asymptotic rejection-sampling relationship (accepted-answer correctness converges to precision) under the nonzero-correct-solution assumption (section 3.2, p. 4) without a formal proof in the text, and shows an empirical correlation of verifier gain with measured gains (section 5.1). Inference: what remains trusted includes model outputs, embedding choices, benchmark labels, and the assumption that the sampled candidates represent deployment behavior. The paper’s future-work paragraph names multi-turn settings, which it does not evaluate (section 6, p. 11).

Inference: The threat to agent-written verified Rust is indirect and moderate. The work can guide which model should review generated proofs and how to detect correlated review failures, but it cannot replace Verus’s checker or establish a Rust specification. VL should reuse verifier gain, cross-family evaluation, and task verifiability triage; it should not redo this paper’s nine-benchmark model sweep unless model families or deployment conditions change.

## techniques for the catalog
- verifier gain — subtract solver accuracy from verifier precision to estimate rejection-sampling improvement
- rejection-sampling validation — compare gain with empirical accuracy when resampling until acceptance, up to three or ten attempts
- family partitioning — separate self, intra-family, and cross-family verifier settings
- distribution similarity — embed outputs and correlate cosine similarity with false positives and gain
- post-training audit — compare base and reasoning-post-trained models on solver and verifier metrics
- task verifiability triage — favor tasks with cheap correctness checks over knowledge-recall tasks
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Sudoku and 3SAT require exponential solving time but allow polynomial-time verification, whereas verifying a matrix product offers no such shortcut."): I read the whole paper text (sections 1-6, references, Appendices A-I, Tables 1-2) and the study, and viewed the rendered Figure 7 page; I checked every quotation, number, section and page reference and technique step. Changes: model counts (the 21 + 12 split omitted four Llama3-Base models); resampling protocol and attempt wording; verifier-gain step 2 now gives the Appendix A precision formula; added similarity correlations and the log-likelihood caveat (intra-family gain slope +0.043); added the spontaneous self-verification evidence (96%, 73%, 1-2%) as a hypothesis; fixed a truncated quote (missing "performance"); fixed page references for the Section 6 checklist and future work (p. 11, not p. 10); marked the percentage-point reading of the 8.2% and 35.4% figures as Inference; added the weak cross-family gain correlation in Figure 7 (r = 0.112); changed "What is proved" to what the paper states without a formal proof; related-work limitations are now attributed to cited papers. Not checked: the cited prior work (Song et al. 2025 and others), the exact Figure 6 bar values (the text extraction is ambiguous, so I used none), benchmark and model-release details outside the paper, and the Inference paragraphs about Verus and VL, which are the study author's own judgments.
