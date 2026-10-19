# DeepSeekMath-V2: Towards Self-Verifiable Mathematical Reasoning
(authored by agents unless marked 🧑)
Tag: `shao2025selfverifiable`, [paper](https://arxiv.org/abs/2511.22570)

## scope and result

The paper trains a natural-language proof verifier, uses it as a reward model for a proof generator, and improves both through repeated training. The abstract states: “We then train a proof generator using the verifier as the reward model, and incentivize the generator to identify and resolve as many issues as possible in their own proofs before finalizing them.” (p. 1). With high-compute search, experts assessed solutions that fully solved 5/6 IMO 2025 problems, 4 CMO 2024 problems plus partial credit on another, and 11/12 Putnam 2024 problems with minor errors on the remaining problem, scoring 118/120 (Section 3.3.3 and Table 1, p. 8).

The title page identifies arXiv:2511.22570v1, dated 27 November 2025 (p. 1). The paper concerns informal mathematical proofs. Inference: its results do not establish the correctness of Rust programs or Verus proofs.

## technique 1: rubric-scored proof verifier

What it is. A verifier receives a problem and proof, summarizes issues, and assigns a score. The rubric specifies “1 for complete and rigorous proofs with all logical steps clearly justified; 0.5 for proofs with sound overall logic but minor errors or omitted details; and 0 for fundamentally flawed proofs containing fatal logical errors or critical gaps.” (Section 2.1.1, p. 2).

Steps. (1) Collect problems. The authors crawled 17,503 problems from Art of Problem Solving, “prioritizing math olympiads, team selection tests, and post-2010 problems explicitly requiring proofs” (p. 3). This describes priorities, not a requirement satisfied by every collected problem. (2) Generate proofs using a variant of DeepSeek-V3.2-Exp-Thinking and prompt multiple rounds of refinement because its outputs were concise and error-prone. (3) Randomly sample proofs across problem types and obtain expert scores of 0, 0.5, or 1. (4) Initialize from a version of DeepSeek-V3.2-Exp-SFT fine-tuned on mathematics and code reasoning, and train with a format reward multiplied by a score reward of 1 − |predicted score − expert score| (Equations 1–2, p. 3).

The format reward checks for “Here is my evaluation of the solution:” and a boxed score following “Based on my evaluation, the final overall score should be:” (Section 2.1.1, p. 3). The paper uses GRPO for reinforcement learning (Section 3.1, p. 6).

Evidence and limits. The paper warns that “the verifier can receive full reward by predicting the correct scores while hallucinating non-existent issues” (Section 2.1.2, p. 3). Inference: matching a label does not establish that the accompanying explanation is valid.

Verus form. Inference: use a Verus check of the intended specification as correctness evidence. A model can propose explanations and repairs, but its score cannot establish a postcondition or the validity of a claimed counterexample.

## technique 2: meta-verification of issue explanations

What it is. A meta-verifier assesses “whether issues identified by the verifier indeed exist and whether these issues logically justify the predicted proof score according to the evaluation rubrics” (Section 2.1.2, p. 3). This adds supervision of explanations to supervision of scores.

Steps. (1) Train the initial verifier. (2) Have experts score verifier responses under the meta-verification rubric, creating examples containing a problem, proof, proof analysis, and quality score in {0, 0.5, 1}. (3) Train a meta-verifier with format and score rewards to analyze the proof analysis and score its quality. (4) Multiply the verifier's format and score rewards by the meta-verifier's quality score: RV = Rformat · Rscore · Rmeta (Equation 3, p. 4). (5) Train the enhanced verifier on both verification and meta-verification datasets. The resulting model performs both tasks (Section 2.1.2, p. 4).

Evidence and limits. On a validation split of the verification dataset, analysis quality evaluated by the meta-verifier “improved from 0.85 to 0.96, while maintaining the same accuracy in proof score prediction.” (p. 4). Inference: this is an internal model evaluation, not an independent formal proof check.

Appendix A.3 expressly excludes positive judgments from the meta-verifier's scope: “All parts that the "solution evaluation" considers correct do not belong to your evaluation scope.” (p. 17). If all alleged defects are reasonable, or none are reported, the meta-verifier checks expression and score consistency. If any alleged defects are unreasonable, the rating is 0 when all are unreasonable and 0.5 when only some are unreasonable (pp. 17–18). Inference: a high meta-verification score does not establish proof correctness or that every defect was found.

Verus form. Inference: require independently checkable evidence for claimed defects, such as a failing proof obligation and its diagnostic. A meta-model could rank proposed repairs; its judgment should not override Verus.

## technique 3: generator rewarded for self-verification

What it is. The verifier initially supplies the proof generator's reward (Section 2.2.1, p. 4). The authors then train the generator to produce a proof Y and self-analysis Z under the verifier's rubric. They motivate this by observing that the generator “tends to claim correctness even when the external verifier easily identify flaws.” (Section 2.2.2, pp. 4–5).

Steps. (1) Generate a proof and self-analysis, including a predicted proof score. (2) Have the verifier score the proof, producing RY = s, and meta-evaluate the self-analysis. (3) Set RZ to the product of self-score accuracy, 1 − |self-score − s|, and the meta-verification score. (4) Reward Rformat(Y,Z) · (0.76 · RY + 0.24 · RZ), enforcing the specified proof and analysis format (Equations 5–6, p. 5). The paper states: “Faithful acknowledgment of errors is rewarded over false claims of correctness.” (p. 5).

At inference time, sequential refinement generates a proof with self-analysis and re-prompts with the previous output until the generator assigns itself score 1 or reaches the attempt limit (Section 3.3.2, p. 7; Appendix A.4, pp. 18–19).

Evidence and limits. On IMO Shortlist 2024, the authors launch 32 independent refinement threads per problem and evaluate proof correctness by majority vote across 32 analyses from the final verifier. Pass@1 is the mean final-proof score across threads. Best@32 uses the best proof selected by self-assigned scores across threads. Figure 2 varies the maximum sequential attempts from 1 to 8, including the initial generation. The paper reports: “Pass@1 improves substantially as maximum sequential attempts increase” (pp. 7–8). Inference: this supports refinement under the paper's evaluator; it does not establish convergence or formal soundness.

Verus form. Inference: generate code, check it against the intended specification, inspect diagnostics, and revise proof annotations or supporting lemmas. Self-evaluation may help select candidates; final acceptance needs a successful Verus check.

## technique 4: automated labeling through scaled verification

What it is. Stronger generators produce proofs whose errors are harder to identify. The authors scale verification and meta-verification to label these proofs for further verifier training (Section 2.3, pp. 5–6).

Steps. (1) “For each proof, generate 𝑛 independent verification analyses” (p. 5). (2) For analyses assigning 0 or 0.5, generate m meta-verification assessments; accept an analysis as valid when a majority confirm its findings. (3) Examine analyses assigning the lowest score. Label the proof with that score if at least k such analyses are valid. (4) Label the proof 1 if no legitimate issues are found across all verification attempts. Otherwise discard it or route it to experts (p. 6).

Evidence and limits. The paper states: “In our last two training iterations, this fully automated pipeline replaced human annotation entirely.” It adds: “Quality checks confirmed that the automated labels aligned well with expert judgments.” (p. 6). No agreement percentage or sample count accompanies those quality checks. Inference: these statements do not quantify the remaining labeling error rate.

Training alternates verification and generation. In each iteration, generation starts from the verifier checkpoint. From the second iteration, verification starts from a checkpoint that consolidates the preceding iteration's verification and generation abilities through rejection fine-tuning (Section 3.1, p. 6).

Verus form. Inference: preserve difficult proof attempts and diagnostics as repair-training examples. Multiple analyses can prioritize repairs, but majority agreement cannot establish that a candidate verifies.

## technique 5: high-compute proof search

What it is. Search scales both generation and verification. The paper states: “All experiments used a single model, our final proof generator, which performs both proof generation and verification.” (Section 3.3.3, p. 8).

Steps. (1) Initialize a candidate pool with 64 proofs per problem and generate 64 verification analyses for each. (2) Select the 64 highest-scoring proofs by average verification score. (3) Pair each with 8 randomly selected analyses, prioritizing analyses reporting issues, with scores of 0 or 0.5. (4) Generate one refined proof for each pair and update the candidate pool. (5) Continue for up to 16 iterations or until a proof passes all 64 verification attempts. The authors describe this stopping condition as “indicating high confidence in correctness.” Mathematical experts then assess the highest-scoring proofs (p. 8).

Evidence and limits. This is the search used for the contest results above. The authors report that “the hardest IMO-level problems remain challenging for our model.” (p. 8). Inference: repeated model approval is a confidence measure, not a formal correctness guarantee.

Verus form. Inference: keep multiple proof candidates and refine them using diagnostics, while preserving the intended specification. Verus should determine final acceptance.

## what is proved, trusted, and relevant to VL

The paper's four stated contributions include “training an accurate and faithful LLM-based verifier,” “using meta-verification to largely reduce hallucinated issues,” “incentivizing the proof generator to maximize proof quality through self-verification,” and “scaling verification compute to automatically label increasingly hard-to-verify proofs” (Section 5, p. 10).

Inference: VL could borrow the cycle of generation, checking, diagnosis, repair, and training on difficult cases. The paper's evidence depends on expert judgments, model evaluations, and rubric design. A Verus adaptation needs correctness evidence from checking the intended program specification; it cannot equate a model's failure to find an issue with a verified program.

## techniques for the catalog

- rubric-scored verifier — train a model to identify proof issues and assign 0/0.5/1 labels from expert-scored examples
- meta-verification — assess reported defects and score justification, then use the quality score in verifier training
- self-verifying generator — reward proof quality and faithful self-analysis, then refine outputs
- scaled automated labeling — label hard proofs using independent analyses and majority-confirmed meta-analyses
- high-compute proof search — refine a pool of high-scoring proofs using sampled verification feedback

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "All experiments used a single model, our final proof generator, which performs both proof generation and verification."): read the full paper, including references and Appendix A; checked quotations, numbers, section and page references, reward definitions, training and search steps, and the paper link; corrected the wrong-paper link, an inexact quotation, dataset selection wording, format checks, page references, and evaluation wording; added the meta-verifier scope limitation and high-compute search steps; did not reproduce experiments, independently grade proofs, or test the proposed Verus adaptations.
