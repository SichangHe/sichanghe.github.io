# Hard2Verify: A Step-Level Verification Benchmark for Open-Ended Frontier Math
(authored by agents unless marked 🧑)
Tag: `pandit2025hard2verify`, [paper](https://arxiv.org/abs/2510.13744)

## scope and benchmark object

Pandit, Xu, Nguyen, Ming, Xiong, and Joty build Hard2Verify to test whether LLM verifiers can catch mistakes inside difficult, open-ended mathematical proofs. The abstract describes it as “a human-annotated, step-level verification benchmark produced with over 500 hours of human labor.” (Abstract, PDF p. 1.) The benchmark contains 80 recent Olympiad-level questions from 10 Olympiads, responses from GPT-5, Gemini 2.5 Pro, and Claude Sonnet 4, and 1,860 annotated steps across 200 responses. It supports three tasks: classify every step, classify an entire response, and identify the first erroneous step.

The key design choice is natural, frontier-level model output. The authors do not inject synthetic errors into a correct solution. They state: “We do not inject or edit an existing correct model-or human-written solution.” (Section 3.1, PDF p. 4.) They grade strictly: a step derived from a prior mistake is incorrect, with no error-carried-forward credit.

## technique 1: curate hard, open-ended questions

what it is and when to use it. Inference: Build verifier data from recent competition problems whose solutions require multi-step arguments and cannot be judged by final-answer matching. Use this when ordinary benchmarks are saturated or allow a verifier to memorize a question and answer.

how it is done. (1) Collect question statements and official solutions from IMO, Putnam, INMO, and similar competitions. (2) Focus on recently available Olympiad-level problems; Appendix A (PDF p. 16) includes the IMO 2023 shortlist, made public in July 2024. (3) Parse official PDFs with MathPix into LaTeX to preserve equations. (4) Exclude image-dependent questions. (5) Retain the resulting 80 problems from 10 Olympiads. These steps are in §3.2 (PDF p. 4).

evidence and limits. Table 1 reports 78.5% of Hard2Verify samples as open-ended, compared with 10.3% for ProcessBench. The authors describe this as “78.5% of our samples being open-ended” (§1, PDF p. 2); they do not explicitly identify the denominator there. The 80 count is curated problems. Inference: these mathematics results do not directly establish performance on software or Rust verification.

Verus form. Inference: curate Verus tasks from real proof obligations and maintenance regressions, retaining source contracts and dependency versions. Replace “open-ended” with obligations whose correctness cannot be reduced to a known output string. A Verus compile/check result can supply labels for many steps, but specification adequacy still needs human review.

## technique 2: generate naturally occurring frontier responses

what it is and when to use it. Inference: Sample candidate proofs from strong models under the same prompt and decoding setup, then evaluate the errors that actually occur. This avoids training a verifier on artificial error patterns.

how it is done. (1) Prompt GPT-5 high, Gemini 2.5 Pro, and Claude Sonnet 4 Thinking to write exam-style, stepwise proofs. (2) Disable web search and code interpreters. (3) Generate one solution per question with a standardized prompt. (4) Filter degenerate outputs and responses with too few dense steps. (5) Keep 200 responses. The method is specified in §3.3 (PDF p. 4).

evidence and limits. The 200 responses are distributed as GPT-5 71, Gemini 57, and Claude 72 (Figure 2, PDF p. 3). These counts are response denominators; 1,860 is the step denominator. Inference: model API settings and filtering limit generalization to other response distributions.

Verus form. Inference: sample generated Rust/Verus patches from the exact model and prompt used in production, run the checker, and preserve both accepted and rejected attempts. Do not inject arbitrary syntax errors if the goal is to estimate real failure modes; maintain a separate synthetic robustness set when desired.

## technique 3: strict expert step annotation

what it is and when to use it. Inference: Label each step as correct only when its mathematics and every invoked result are sufficiently supported and correctly applied. Propagate an earlier error: any later step derived from a wrong step is incorrect. Use this for training or evaluating process verifiers where a final correct answer can conceal invalid reasoning.

how it is done. (1) Give annotators official solutions and detailed instructions. (2) Pilot three responses, review disagreements, and refine guidelines. (3) Annotate batches with spot checks. (4) Conduct initial human annotation and three review rounds. (5) Mark every step and derive response labels from the step labels. The authors report “over 500 hours of manual human labor” (§3.4, PDF p. 5). Appendix D specifies 52 annotators, 35 with at least a graduate degree in mathematics or related fields, and an initial annotation round followed by three review rounds (PDF p. 19).

evidence and limits. The final dataset has 1,080/1,860 (58%) correct steps and 780 incorrect steps (Section 3.5, PDF p. 5). At response level, Claude has only 4 entirely correct solutions out of 72 despite over 50% step accuracy; a response is correct only if all its steps are correct. Inference: expert labels do not constitute formal proof certificates; their interpretation depends on the annotation guidelines.

Verus form. Inference: use Verus acceptance for machine labels on complete fragments, and human reviewers for whether contracts, assumptions, and external calls are adequate. For a multi-step verified Rust patch, label downstream proof edits invalid if they depend on an invalid earlier contract or lemma, even if an isolated solver query passes.

## technique 4: evaluate three complementary verifier tasks

what it is and when to use it. Inference: Separate process verification into step-level correctness, response-level correctness, and first-error identification (ErrorID). This reveals whether a model catches local mistakes, enforces whole-proof correctness, and locates the earliest failure.

how it is done. Step-Level prompts generative critics for yes/no per step; PRM scores become labels via a fixed threshold. Response-Level marks a response wrong if any step is wrong. ErrorID prompts for the first erroneous step or −1 for no error; for PRMs, choose the first step below threshold. TPR is accuracy on human-labeled correct samples; TNR is accuracy on human-labeled incorrect samples (for ErrorID, this requires identifying the first erroneous step). Compute each task’s Balanced Accuracy=(TPR+TNR)/2 and Balanced F1=2TPR·TNR/(TPR+TNR). These definitions and aggregation levels are in §3.6 and §4.1 (PDF pp. 5–6).

evidence and limits. Table 2 reports GPT-5 Step-Level Balanced F1 85.83, Response-Level 89.52, and ErrorID 69.72. Qwen2.5-Math-PRM-72B reports 35.50, 64.91, and 37.28 for those same tasks. These are percentage scores. Step-Level aggregates steps, while the other two tasks aggregate responses (§4.1, PDF p. 6). Appendix E.1 tunes PRM thresholds on 100 fixed, randomly selected responses, sweeping 0.1–0.9 in increments of 0.05 and selecting using the harmonic mean of the three task-specific Balanced F1 scores (PDF p. 21). The paper does not explicitly state the per-model evaluation denominators after this tuning. A random verifier with 50% TPR and TNR scores 50.0 on both balanced metrics (footnote 4, PDF p. 7).

Verus form. Inference: report per-obligation and per-patch metrics separately. Balanced F1 prevents a verifier that labels every candidate “valid” from looking good when invalid proof edits are rare. ErrorID can map to the first failing Rust/Verus check, but diagnostics may be non-local, so retain the raw compiler output.

## technique 5: compare direct ErrorID prompting with derived labels

what it is and when to use it. Inference: Ask a verifier either to output the first error directly or to label every step and derive the first error from those labels. Test both because the better prompt depends on verifier capability.

how it is done. (1) Run the direct ErrorID prompt. (2) Run the Step-Level prompt. (3) Take the first step labeled incorrect, or −1 if none is incorrect. (4) Compare Balanced Accuracy and Balanced F1 at response level. Table 3 reports both and Δ=Step-Level minus ErrorID.

evidence and limits. GPT-5 improves from ErrorID Balanced F1 69.72 to derived 75.66 (+5.94); Gemini 2.5 Pro improves 52.46 to 62.78 (+10.32); ByteDance Seed-OSS-36B falls 45.18 to 33.55 (−11.63). The authors advise: “we advise practitioners to determine the better prompting setup on a per-verifier basis” (§4.3, PDF p. 8). Inference: a Verus repair tool should benchmark both direct diagnosis and per-obligation labeling rather than assume one interface dominates.

## technique 6: scale verifier inference compute sequentially

what it is and when to use it. Inference: Increase the verifier’s reasoning budget or output tokens for one judgment, rather than sampling many short judgments. The authors offer the sequential nature of verification as an intuitive explanation for their results (§5.1, PDF p. 9).

how it is done. (1) Evaluate gpt-oss-20B, gpt-oss-120B, and GPT-5 at low, medium, and high reasoning effort. (2) Keep the Step-Level task and measure Balanced F1. (3) For gpt-oss-20B, separately sample 32 low-effort verifier outputs per benchmark response. For each N=4…16, sample N outputs with replacement, take a majority vote per step with arbitrary tie-breaking, and repeat for 10 trials. Report the mean and standard deviation and compare with single outputs at low and high effort. The procedure is in §5.1 (PDF pp. 8–9).

evidence and limits. Sequential effort raises gpt-oss-20B from 59.69 (low) to 70.93 (high) and gpt-oss-120B from 61.46 to 74.64; GPT-5 also improves, with a reported 12.3% relative low-to-high gain (Figure 5, PDF p. 9). For gpt-oss-20B in this experiment, parallel Best-of-N does not meaningfully improve over one low-effort response. The 10-trial bootstrap estimates variance for the parallel comparison; values are benchmark-level Balanced F1, not proof soundness.

Verus form. Inference: give a verifier more sequential time to inspect a contract, solver trace, and dependency context before asking for a label. Parallel votes can still be useful for independent triage, but only a final Verus run establishes acceptance. Record reasoning effort, model, timeout, and all vote aggregation choices.

## technique 7: test self-verification and solve-versus-verify asymmetry

what it is and when to use it. Inference: Split responses by their generating model, ask the same model to verify its own outputs, and compare its verification rate with its human-judged solve rate. This tests whether a model can be a useful critic of its own proof attempts.

how it is done. (1) For §5.2, evaluate all three frontier verifiers on responses from all three generators and compute step-level TPR/TNR by generator (Figure 6, PDF p. 9; discussion, PDF p. 10). (2) For §5.3, partition responses by generator and have each generator verify its own responses. (3) For each response, compare the fraction of correctly generated steps, judged by humans, with the fraction of correctly verified steps, measured by agreement with humans (Figure 7 and §5.3, PDF p. 10).

evidence and limits. GPT-5’s TPR is 94.32 on Claude-generated responses, 92.14 on Gemini-generated responses, and 96.20 on GPT-5-generated responses; its TNR is 80.50, 74.03, and 79.40 respectively (Figure 6, PDF p. 9). TPR uses human-labeled correct steps within each generator subset; TNR uses human-labeled incorrect steps. Figure 7 reports verification rate generally above solve rate, measuring agreement with human labels. Inference: this is not a proof certificate; self-verification can be useful triage but should not be the sole prerequisite check for accepting Verus code.

## technique 8: audit under-justified claims with human disagreement cases

what it is and when to use it. Inference: Inspect examples where a strong open model accepts a step that experts reject, then classify the missing generalization, case, or theorem conditions. Use this to expand verifier prompts and regression tests.

how it is done. The authors inspect ByteDance Seed-OSS-36B outputs and compare accepted claims with human annotations. Their examples are an IMO 2023 Shortlist A6 polynomial-identity error and an IMO 2024 Shortlist A1 incomplete Weyl-theorem case analysis (§5.4, PDF pp. 10–11). Inference: record the unsupported claim or omitted branch and turn it into a targeted evaluation item.

evidence and limits. The cases show a verifier accepting a claim proved only at one input and a theorem invocation lacking the estimate and n choice. Inference: these qualitative examples do not establish error prevalence. For Verus, analogous audits should target unjustified `assume`, overly strong `requires`, unchecked `external_body` dependencies, and missing environment conditions.

## what is proved, measured, and trusted

Inference: Hard2Verify measures agreement with expert labels, not formal theorem validity. Trusted elements include the curated official solutions, MathPix extraction, model prompts and decoding, human annotator judgments, PRM thresholds, and metric implementation. The benchmark’s own central finding is that weak verifiers label nearly every step correct: their TNR falls toward zero while TPR rises (Figure 4, PDF p. 8). Inference: final-answer accuracy alone cannot establish the validity of intermediate reasoning.

## techniques for the catalog

Inference: the following labels summarize the techniques above.

- frontier-question curation: select recent open-ended problems whose answers cannot be checked by string match
- natural-response sampling: collect model errors without injecting synthetic mistakes
- strict step annotation: label every step and propagate prior errors to steps that depend on them
- three-task verifier evaluation: measure step, whole-response, and first-error performance
- prompt comparison: derive first-error indices from step labels and compare with direct ErrorID
- sequential compute scaling: spend more reasoning on each judgment and compare with parallel votes
- self-verification audit: compare a generator’s human-judged solve rate with its own verification rate
- disagreement audit: convert expert/model false positives into targeted verifier cases
