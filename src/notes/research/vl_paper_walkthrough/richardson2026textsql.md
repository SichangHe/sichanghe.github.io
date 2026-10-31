# What Predicts Correctness in Text-to-SQL? A Selective-Prediction Study
(authored by agents unless marked 🧑)
Tag: `richardson2026textsql`, [paper](https://arxiv.org/abs/2607.06799)

## what is measured

The paper compares signals that predict whether a generated SQL query executes to the same result as a human reference query. It evaluates BIRD (800 questions over 8 databases) and Spider multi-table development queries (490 questions over 20 databases), with GPT-4o-mini and GPT-4.1-mini generators. For each question, eight temperature-0.7 samples produce a modal query. Correctness is execution-grounded; the modal-query accuracy is 0.451 on BIRD for GPT-4o-mini and 0.522 for GPT-4.1-mini (Section 3, PDF p. 3).

Signals include string, structural and execution self-consistency, schema relevance, executability, log probability and separate LLM judges. The main metric is tie-robust AUROC with 2,000 paired bootstrap resamples. A cross-fit logistic combiner is fit on one split and evaluated on a disjoint split. Calibration uses expected calibration error (ECE); selective prediction uses a risk–coverage frontier with thresholds chosen on a calibration half and evaluated on a disjoint test half (Section 3, PDF p. 3).

The paper states, “We do not regenerate, but rather ask how well a signal predicts correctness so a system can answer or abstain” (Section 2, PDF p. 2).

## technique 1: establish a black-box correctness ceiling

what it is: calculate agreement-based and model-internal scores before adding a verifier. The strongest BIRD black-box signal is the largest cluster of identical queries; structural and result-set clusters, schema relevance, executability and mean sequence log probability are also measured.

how to do it:
1. Sample eight SQL queries for each question and select the modal query (Section 3, PDF p. 3)
2. Compute string self-consistency as the largest identical-query cluster; canonicalize query structures for structural consistency; cluster result sets for execution consistency (Section 3, PDF p. 3)
3. Compute schema relevance from average embedding similarity between the question and used tables/columns; record whether the query executes and returns rows (Section 3, PDF p. 3)
4. Record the modal query's mean sequence log probability (Section 3, PDF p. 3)
5. Rank correct above incorrect queries by each score and report AUROC with paired intervals (Sections 3 and 4.1, PDF p. 3; paired interval for log probability versus string self-consistency, PDF p. 4)

Evidence: on the BIRD slice, AUROCs are 0.675 string self-consistency, 0.619 structural, 0.613 execution, 0.553 schema relevance, 0.500 executability (chance) and 0.669 log probability (Table 1, PDF p. 3). The paper states, “The black-box statistical signals occupy a narrow band, roughly 0.61–0.68 auroc, with string self-consistency the strongest at 0.675” (Section 4.1, PDF p. 3). The paired difference between log probability and string self-consistency is −0.006 with 95% CI [−0.028, +0.017], not significant (Section 4.1, PDF p. 4). The denominator for Table 1 is the 800-question BIRD slice; feature subsets in Table 7 have their own `n` and can overlap.

Inference: for Verus code, analogous cheap signals include agreement among sampled annotations, repeated invariant shapes, compilation success and verifier diagnostics. They should be treated as a measured baseline, not evidence that a proof is semantically correct. Verus must still check executable Rust against its `requires`/`ensures` contract.

## technique 2: use a reasoning verifier as a correctness score

what it is: show a separate LLM the natural-language question, evidence, schema and candidate SQL, and ask whether the SQL correctly answers the question. The verifier scores the candidate's logic rather than only its surface agreement.

how to do it:
1. Provide question, evidence, schema and generated SQL in a fixed prompt (Section 3, PDF p. 3)
2. Ask GPT-4o-mini or GPT-4o for YES/NO first-token probabilities; ask Claude-Sonnet-4.6 for a verbalized 0–100 probability because it does not expose token log probabilities (Section 3, PDF p. 3)
3. Use the score to rank correct versus incorrect candidates and compare against self-consistency with paired bootstrap intervals (Section 4.2, PDF p. 4)
4. Keep the verifier separate from generation when measuring prediction; the paper does not regenerate queries in this selective-prediction experiment (Section 2, PDF p. 2)

Evidence: verifier AUROC is 0.724 for GPT-4o-mini, 0.770 for GPT-4o and 0.776 for Claude-Sonnet-4.6, all above string self-consistency 0.675 with paired intervals excluding zero (Table 2, PDF p. 4). On Spider, GPT-4o reaches 0.712 versus 0.618 string self-consistency across 490 questions (Section 4.3, PDF p. 5). With GPT-4.1-mini generation, GPT-4o-mini verification reaches 0.677 versus 0.641 self-consistency; the combined improvement is +0.033 [0.007,0.061] (Table 3, PDF p. 4). On Spider, the weaker GPT-4o-mini judge is above the ceiling but not significantly so (0.669, paired CI [−0.013, +0.114]) (Section 4.3, PDF p. 5).

Inference: a Verus deployment can use an independent model to rank candidate proofs or predict whether a candidate is likely to pass, but the prediction is only triage. The mechanical form is an external Rust orchestrator invoking `verus`; acceptance still requires Verus to prove the unchanged contract. A verifier model's `ensures` suggestion is not itself a proof.

## technique 3: ensemble independent judges and calibrate the score

what it is: combine non-redundant judges from different providers with cross-fit logistic calibration. The paper reports, “Judges from different providers make different errors, so a two-provider ensemble reaches 0.82 auroc with a well-calibrated probability (expected calibration error 0.03).” (Abstract, PDF p. 1)

how to do it:
1. Collect GPT-4o and Claude scores on the same candidate set; measure their error correlation (Section 4.3, PDF p. 4)
2. Fit the logistic combiner on one split and score on a disjoint split so no test candidate trains its own score (Section 3, PDF p. 3)
3. Report AUROC, paired confidence interval and ECE for the ensemble and each judge (Section 4.5, PDF p. 6; ECE in Table 5, PDF p. 7)
4. Use the cross-fit ensemble directly as an estimate of P(correct); the raw self-consistency and raw verifier probabilities are over-confident (Section 4.5, PDF p. 6)

Evidence: GPT-4o and Claude scores correlate only `r = 0.43`; the cross-fit ensemble reaches 0.822 AUROC and improves over GPT-4o by +0.052 [0.032,0.073], with ECE 0.031 (Section 4.5, PDF p. 6; Table 5, PDF p. 7). Raw GPT-4o and Claude ECE values are 0.319 and 0.210, versus 0.212 for string self-consistency (Table 5, PDF p. 7).

## technique 4: selective prediction with abstention

what it is: choose a threshold on a calibration set and answer only when the predicted correctness probability is high enough. The risk–coverage frontier reports error among answered candidates as coverage changes.

how to do it:
1. Split questions in half; choose the threshold on the calibration half and evaluate coverage/risk on the disjoint test half (Section 4.5, PDF p. 6)
2. For each target risk, retain candidates above the threshold and report answered fraction (coverage) and errors among them (selective risk) (Section 3, PDF p. 3; Table 6, PDF p. 7)
3. Also compute the distribution-free Bonferroni-over-grid certificate with δ=0.1, and treat it as a conservative lower bound (Section 4.5, PDF p. 7)
4. Report “none (no valid subset)” when no threshold meets the target, as the paper does for self-consistency at every target risk (Table 6, PDF p. 7)

Evidence: at target risk 0.30, the ensemble answers 27% of questions with held-out selective risk 0.24; self-consistency has no valid low-risk subset (Section 4.5, PDF p. 6; Table 6, PDF p. 7). The table also gives 9% coverage at 14% risk for target 0.20 and 58% at 38% for target 0.40. The paper says the certificate “fires only at the loosest target,” certifying the all-signals score at α = 0.40 with 16% coverage and 22% risk (Section 4.5, PDF p. 7).

Inference: for agent-written Verus, abstention can route low-confidence proofs to more sampling, a stronger verifier or human review. A candidate is answerable only after `verus` succeeds; the risk score governs triage before or after verification, while the contract's semantic intent remains an assumption.

## technique 5: compare trained verifier transfer with a frozen reasoning judge

what it is: train cheaper verifiers on labeled `(question, evidence, schema, SQL) → correct` examples, then test leave-one-database-out (LODO) transfer. The comparison distinguishes schema-specific fitting from reasoning that transfers across unseen databases.

how to do it:
1. Fine-tune a feature classifier, ModernBERT encoder, and LoRA generative judges on 6,400 execution-labeled pairs (Section 4.4, PDF p. 5)
2. Hold one database out, train on the remainder, score the held-out database, repeat for every database, and macro-average transfer AUROC (Section 4.4, PDF p. 5)
3. Compare with a frozen GPT-4o judge evaluated zero-shot on the same held-out schemas (Table 4, PDF p. 5)
4. Test added schema diversity, rationale distillation, scaling and cross-benchmark training as transfer interventions (Section 4.4, PDF pp. 5–6; Appendix A, PDF p. 10)

Evidence: in-distribution AUROC is 0.768 feature, 0.785 encoder, 0.766 Qwen2.5-1.5B LoRA and 0.798 Qwen2.5-7B LoRA; LODO transfer is only 0.661, 0.670, 0.659 and 0.662. Frozen GPT-4o reaches 0.710 macro-averaged transfer and 0.770 pooled (Table 4, PDF p. 5). Scaling 1.5B→7B improves in-domain but not LODO transfer (Section 4.4, PDF p. 5). The paper's scope is database transfer; these denominators are macro averages across held-out databases, not the 800-question total.

## techniques for the catalog

- black-box correctness ceiling — measure agreement, executability and log-probability signals before adding a verifier
- reasoning verifier score — ask an independent model to judge candidate logic using full task context
- cross-provider ensemble calibration — combine non-redundant judges with cross-fit logistic calibration and ECE
- selective abstention frontier — choose thresholds on held-out calibration data and abstain when predicted risk is too high
- leave-one-project-out transfer — test trained verifier generalization on unseen schemas or codebases against a frozen judge
