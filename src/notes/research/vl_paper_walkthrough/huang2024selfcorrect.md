# Large Language Models Cannot Self-Correct Reasoning Yet
(authored by agents unless marked 🧑)
Tag: `huang2024selfcorrect`, [paper](https://arxiv.org/abs/2310.01798)

## scope and result

The paper states: “our findings indicate that LLMs struggle to self-correct their reasoning in this setting.” (Introduction, p. 1). It defines the studied setting as follows: “We term this setting intrinsic self-correction.” (Section 2, p. 2). The benchmarks are GSM8K (1,319 test questions), CommonSenseQA (1,221 development questions), and a 100-question HotpotQA set (Section 3.1, p. 3). Only GPT-3.5-Turbo uses the full evaluation sets; for the other models (GPT-4, GPT-4-Turbo, Llama-2) the authors "randomly sample 200 questions for each dataset (100 for HotpotQA)"; temperatures are 1 for GPT-3.5/GPT-4 and 0 for GPT-4-Turbo/Llama-2 (Section 3.1, p. 3).

## technique 1: three-step intrinsic self-correction loop

what it is and when to use

The loop asks a model for an initial answer, asks it to review that answer and produce feedback, then asks it to answer again using the feedback. Use it only when there is no external oracle, tool result, or human judgment. The authors call the three-step sequence a "three-step prompting strategy" (Section 3.1, p. 3); the paper applies it to math, commonsense and multi-hop question answering, not to proofs.

how to do it

1. Prompt the model to produce an initial answer. This is also the standard-prompting baseline (Section 3.1, p. 3).
2. Give the previous generation to the model and ask for feedback (Section 3.1, p. 3). One tested feedback prompt is: “Assume that this answer could be either correct or incorrect. Review the answer carefully and report any serious problems you find.” (Section 3.1, p. 3). The paper uses this as the default feedback prompt for GPT-4-Turbo and Llama-2, and tests two other feedback prompts (Tables 5 and 6, p. 5).
3. Prompt the model to answer the original question again with that feedback (Section 3.1, p. 3).
4. Optionally repeat the feedback-and-answer pair once; the paper uses at most two rounds. Without oracle labels the model itself decides whether to keep its previous answer. Two rounds therefore use five calls, whereas one round uses three calls (Section 3.1, p. 3; Tables 3–6, pp. 4–5).

what was measured

On the full GPT-3.5 evaluation, standard prompting scored 75.9, 75.8, and 26.0 on GSM8K, CommonSenseQA, and HotpotQA. One intrinsic round scored 75.1, 38.1, and 25.0; two rounds scored 74.7, 41.8, and 25.0 (Table 3, p. 4; denominators are 1,319, 1,221, and 100 questions as specified in Section 3.1). GPT-4, on 200-question samples (100 for HotpotQA), fell from 95.5/82.0/49.0 with one call to 91.5/79.5/49.0 after one round and 89.0/80.0/43.0 after two (Table 3, p. 4). GPT-4-Turbo on the 200-question GSM8K and CommonSenseQA samples fell from 91.5/84.0 to 88.0/81.5 after one round and 90.0/83.0 after two; Llama-2 fell from 62.0/64.0 to 43.5/37.5 and then 36.5/36.5 (Table 4, p. 5). These are percentages, not counts; the paper gives the sample sizes in Section 3.1. The paper reports one run per cell and no confidence intervals or repeated runs, so small differences (for example GPT-3.5 GSM8K 75.9 versus 75.1) should not be over-read.

The authors analyze answer transitions after two rounds. For GPT-3.5 on GSM8K, 74.7% of answers remain unchanged; among changed answers, correct answers are changed to incorrect more often than incorrect answers are repaired (8.8% correct to incorrect versus 7.6% incorrect to correct; Figure 1, p. 6). The paper explains: “The fundamental issue is that LLMs cannot properly judge the correctness of their reasoning.” (Section 3.3, p. 4). For GPT-3.5 on CommonSenseQA, 39.8% of answers go from correct to incorrect and 5.8% from incorrect to correct (Figure 1, p. 6). Figure 1 gives transition percentages as pie charts for GPT-3.5, GPT-4, GPT-4-Turbo, and Llama-2 on GSM8K and CommonSenseQA; some slice labels overlap in the figure. The paper omits this analysis for HotpotQA because the sample is small (footnote 1, p. 5).

Verus form (inference)

Inference: use the loop to propose a candidate Rust/Verus function and proof, but treat every revision as an untrusted candidate. The first prompt should include the complete specification, including preconditions, postconditions, arithmetic domains, and required output shape. The feedback prompt can ask the model to inspect the candidate against that specification, but it cannot establish correctness. The final candidate must pass `verus` and any executable tests; a failed verification result is external feedback, while a model's assertion that the proof is correct is not. Inference: keep the original candidate and revised candidate so that a regression (for example, a weakened `requires` or `ensures`) is detectable by review and by the verifier.

what it assumes and where it fails

The loop assumes the model can judge its own reasoning from its generated text. The measured results show that this assumption fails for these models, prompts, and reasoning datasets. The paper does not test Verus, Rust, or formal proof obligations. Inference: its negative result transfers only as a warning about model self-assessment, not as a theorem about every code-generation model or every task.

## technique 2: oracle-label self-correction as an upper-bound diagnostic

what it is and when to use

Following Kim et al. (2023) and Shinn et al. (2023), the authors use the ground-truth answer to decide whether to stop the self-correction loop, and obtain gains "consistent with the findings" of those papers. This is useful as a diagnostic upper bound: it measures what the loop can do when an oracle prevents a correct answer from being changed, but it is unavailable in deployment when the answer is unknown.

how to do it

1. Run the initial-generation, feedback, and revised-answer steps above (Section 3.1, p. 3).
2. Check each generated answer against the dataset's ground-truth label (Section 3.2, p. 4).
3. Stop if the answer is correct; otherwise continue the loop, up to the tested rounds (Section 3.2, p. 4).
4. Report the result separately from intrinsic self-correction, because the label supplied the correctness judgment (Section 3.2, p. 4); the paper says the oracle results "can only be regarded as indicative of an oracle’s performance" (Section 3.2, p. 4).

The paper reports GPT-3.5 standard versus oracle self-correction as 75.9→84.3 on GSM8K, 75.8→89.7 on CommonSenseQA, and 26.0→29.0 on HotpotQA. GPT-4 changes from 95.5→97.5, 82.0→85.5, and 49.0→59.0 (Table 2, p. 4). The GPT-3.5 denominators are the full benchmark sets; GPT-4 used 200-question samples (100 for HotpotQA) (Section 3.1). The authors caution: “If we are already in possession of the ground truth, there seems to be little reason to deploy LLMs for problem-solving.” (Section 3.2, p. 4).

Verus form (inference)

what remains trusted

The benchmark labels and the evaluator (exact match for HotpotQA; automatic answer extraction for the others) are trusted for the reported numbers. The paper does not claim that oracle-label performance predicts deployment performance; it explicitly separates the two settings.

## technique 3: equal-cost multi-agent debate versus self-consistency

what it is and when to use

Multi-agent debate asks several model instances to critique and debate candidate answers. The paper tests whether its apparent improvement is actually better than simply sampling several independent responses and selecting by majority vote (self-consistency). Use this comparison whenever a method makes multiple model calls.

how to do it

1. Use the exact multi-agent-debate prompt from Du et al. (Section 4, p. 7).
2. Instantiate three copies of `gpt-3.5-turbo-0301` and run two debate rounds (Section 4, p. 7).
3. Evaluate on the complete GSM8K test set, rather than the 100 examples used by the reproduced source experiment (Section 4, p. 7).
4. Run self-consistency with the same numbers of generated responses and choose the majority answer (Section 4, p. 7).
5. Compare debate and self-consistency at equal response counts, not only against one-call prompting (Section 4, p. 7).

Table 7 reports GSM8K accuracy: standard prompting, 1 response, 76.7; self-consistency, 3 responses, 82.5; debate round 1, 6 responses, 83.2; self-consistency, 6 responses, 85.3; debate round 2, 9 responses, 83.0; self-consistency, 9 responses, 88.2 (Table 7, p. 7). The denominator is the complete GSM8K test set (1,319 questions, Section 3.1); the model is `gpt-3.5-turbo-0301` for this experiment (Section 4, p. 7).

The authors conclude: “Furthermore, for self-consistency with an equivalent number of responses, multi-agent debate significantly underperforms simple self-consistency using majority voting.” (Section 4, p. 7). They interpret the apparent improvement as selection among generations rather than correction: “The observed improvement is evidently not attributed to ‘self-correction’, but rather to ‘self-consistency’.” (Section 4, p. 7).

Verus form (inference)

what it assumes and where it fails

The comparison assumes response count is a meaningful proxy for inference cost. The paper reports response counts but does not provide token, wall-clock, or dollar costs.

## technique 4: prompt-completeness control for self-correction evaluations

what it is and when to use

The paper identifies a confound: a feedback prompt may add task requirements omitted from the initial prompt. A fair evaluation places all easily stated requirements in the initial prompt, then compares self-correction against that stronger baseline.

how to do it

1. Identify constraints used to score the task (Section 5, p. 8).
2. Put those constraints directly in the initial-generation prompt. For the CommonGen-Hard example, the authors add: “Write a reasonable paragraph that includes *ALL* of the above concepts” (Section 5, p. 8; Figure 8, Appendix A, p. 17).
3. Keep the prior feedback-and-refine procedure unchanged (Section 5, p. 8).
4. Measure concept coverage for standard prompting and self-correction using the same metric and model (`gpt-3.5-turbo-0613`) (Section 5, p. 8).

Table 8 reports prior prompts/results of 44.0 standard and 67.0 self-correct, then 53.0 standard and 61.1 self-correct, and the authors' explicit initial prompt at 81.8 standard versus 75.1 after seven-call self-correction (Table 8, p. 8). The table's footnote marks the asterisked rows as "Prompts and results from Madaan et al. (2023)" and the paper does not explain the difference between the first two pairs of rows; the 81.8 row is the authors' own prompt, and the 75.1 row applies Madaan et al.'s self-correction prompt to the authors' responses. The denominator is the CommonGen-Hard evaluation used by that experiment, but the paper does not state its size in the cited section. Therefore these are reported percentages whose denominator the paper does not state.

Verus form (inference)

what it assumes and where it fails

This control applies when requirements can be stated before generation. The authors note that their paper focuses on reasoning and that self-correction may help other domains, such as style or safety alignment, where the model can assess the requested property more reliably (Section 7, p. 9). Inference: the result should not be generalized to externally checked formal verification without running the checker.

## proved, measured, and trusted

The paper measures model accuracy and answer-transition percentages under stated prompts, models, temperatures, datasets, and call counts. It does not prove a formal property of an LLM, Rust program, or Verus proof. Its evaluators trust benchmark labels, answer extraction, and the reported model APIs. Inference: the strongest evidence is the repeated drop across the tested intrinsic settings and the equal-response-count comparison against self-consistency.

The paper recommends external feedback when available. It says that “when the problem description clearly specifies the intended code execution behavior, e.g., with unit tests, the code executor serves as the perfect verifier to judge the correctness of predicted programs” (Section 6, p. 8), and separately describes error messages as informative feedback that "guides the LLMs to improve their responses".

## techniques for the catalog

- intrinsic self-correction loop: generate, critique, and regenerate, but evaluate without an external correctness label
- oracle-label diagnostic: use ground truth to stop a correction loop and report the result separately as an oracle upper bound
- equal-cost debate comparison: compare multi-agent debate with self-consistency at equal response counts
- prompt-completeness control: include all easily stated scoring requirements in the initial prompt before measuring feedback gains
- external-verifier repair: use executable checks, tools, or a verifier to produce feedback that model self-assessment cannot supply
