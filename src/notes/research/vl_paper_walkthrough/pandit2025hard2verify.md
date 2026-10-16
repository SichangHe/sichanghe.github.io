# Hard2Verify: A Step-Level Verification Benchmark for Open-Ended Frontier Math
(authored by agents unless marked 🧑)
Tag: `pandit2025hard2verify`, [paper](https://arxiv.org/abs/2510.13744)

## scope and benchmark object

Pandit, Xu, Nguyen, Ming, Xiong, and Joty build Hard2Verify to test whether LLM verifiers can catch mistakes inside difficult, open-ended mathematical proofs. The abstract describes it as “a human-annotated, step-level verification benchmark produced with over 500 hours of human labor.” (Abstract, PDF p. 1.) The benchmark contains 80 recent Olympiad-level questions from 10 Olympiads, responses from GPT-5, Gemini 2.5 Pro, and Claude Sonnet 4, and 1,860 annotated steps across 200 responses. It supports three tasks: classify every step, classify an entire response, and identify the first erroneous step.

The key design choice is natural, frontier-level model output. The authors do not inject synthetic errors into a correct solution. They state: “We do not inject or edit an existing correct model-or human-written solution.” (Section 3.1, PDF p. 4.) They grade strictly: a step derived from a prior mistake is incorrect, with no error-carried-forward credit.

## technique 1: curate hard, open-ended questions

what it is and when to use it. Build verifier data from recent competition problems whose solutions require multi-step arguments and cannot be judged by final-answer matching. Use this when ordinary benchmarks are saturated or allow a verifier to memorize a question and answer.

how it is done. (1) Collect question statements and official solutions from IMO, Putnam, INMO, and similar competitions. (2) Restrict to recent (2024+) Olympiad-level problems. (3) Parse official PDFs with MathPix into LaTeX to preserve equations. (4) Exclude image-dependent questions. (5) Retain the resulting 80 problems from 10 Olympiads. These steps are in §3.2 (PDF p. 4).

evidence and limits. Table 1 reports 78.5% of Hard2Verify samples as open-ended, compared with 10.3% for ProcessBench. The 78.5% denominator is the benchmark’s question samples, while the 80 count is unique curated problems. The task remains mathematics-specific and requires expert annotation; it does not measure software or Rust verification directly.

Verus form. Inference: curate Verus tasks from real proof obligations and maintenance regressions, retaining source contracts and dependency versions. Replace “open-ended” with obligations whose correctness cannot be reduced to a known output string. A Verus compile/check result can supply labels for many steps, but specification adequacy still needs human review.

## technique 2: generate naturally occurring frontier responses

what it is and when to use it. Sample candidate proofs from strong models under the same prompt and decoding setup, then evaluate the errors that actually occur. This avoids training a verifier on artificial error patterns.

how it is done. (1) Prompt GPT-5 high, Gemini 2.5 Pro, and Claude Sonnet 4 Thinking to write exam-style, stepwise proofs. (2) Disable web search and code interpreters. (3) Generate one solution per question with a standardized prompt. (4) Filter degenerate outputs and responses with too few dense steps. (5) Keep 200 responses. The method is specified in §3.3 (PDF p. 4).

evidence and limits. The 200 responses are distributed as GPT-5 71, Gemini 57, and Claude 72 (Figure 2, PDF p. 3). These counts are response denominators; 1,860 is the step denominator. Model API settings and filtering affect the response distribution, so results are not a universal measure of all frontier models.

Verus form. Inference: sample generated Rust/Verus patches from the exact model and prompt used in production, run the checker, and preserve both accepted and rejected attempts. Do not inject arbitrary syntax errors if the goal is to estimate real failure modes; maintain a separate synthetic robustness set when desired.

## technique 3: strict expert step annotation

what it is and when to use it. Label each step as correct only when its mathematics and every invoked result are sufficiently supported and correctly applied. Propagate an earlier error: any later step derived from a wrong step is incorrect. Use this for training or evaluating process verifiers where a final correct answer can conceal invalid reasoning.

how it is done. (1) Give annotators official solutions and detailed instructions. (2) Pilot three responses, review disagreements, and refine guidelines. (3) Annotate batches with spot checks. (4) Conduct initial human annotation and three review rounds. (5) Mark every step and derive response labels from the step labels. The authors report “over 500 hours of manual human labor” and three rounds of independent agreement checks (Sections 1 and 3.4, PDF pp. 2 and 4).

evidence and limits. The final dataset has 1,080/1,860 (58%) correct steps and 780 incorrect steps (Section 3.5, PDF p. 5). At response level, Claude has only 4 entirely correct solutions out of 72 despite over 50% step accuracy; a response is correct only if all its steps are correct. The authors’ labels are expert judgments, not formal proof certificates, and “sufficiently supported” can depend on contest conventions.

Verus form. Inference: use Verus acceptance for machine labels on complete fragments, and human reviewers for whether contracts, assumptions, and external calls are adequate. For a multi-step verified Rust patch, label downstream proof edits invalid if they depend on an invalid earlier contract or lemma, even if an isolated solver query passes.

## technique 4: evaluate three complementary verifier tasks

what it is and when to use it. Separate process verification into step-level correctness, response-level correctness, and first-error identification (ErrorID). This reveals whether a model catches local mistakes, enforces whole-proof correctness, and locates the earliest failure.

how it is done. Step-Level prompts generative critics for yes/no per step; PRM scores become labels via a fixed threshold. Response-Level marks a response wrong if any step is wrong. ErrorID prompts for the first erroneous step or −1 for no error; for PRMs, choose the first step below threshold. Compute each task’s Balanced Accuracy=(TPR+TNR)/2 and Balanced F1=2TPR·TNR/(TPR+TNR). These definitions and aggregation levels are in §3.6 and §4.1 (PDF pp. 5–6).

evidence and limits. Table 2 reports GPT-5 Step-Level Balanced F1 85.83, Response-Level 89.52, and ErrorID 69.72. Qwen2.5-Math-PRM-72B reports 35.50, 64.91, and 37.28 for those same tasks. These are percentages on the 1,860-step/200-response benchmark; Step-Level aggregates steps, while the other two aggregate responses. A random verifier with 50% TPR and TNR scores 50.0 on both balanced metrics (footnote 4, PDF p. 7).

Verus form. Inference: report per-obligation and per-patch metrics separately. Balanced F1 prevents a verifier that labels every candidate “valid” from looking good when invalid proof edits are rare. ErrorID can map to the first failing Rust/Verus check, but diagnostics may be non-local, so retain the raw compiler output.

## technique 5: compare direct ErrorID prompting with derived labels

what it is and when to use it. Ask a verifier either to output the first error directly or to label every step and derive the first error from those labels. Test both because the better prompt depends on verifier capability.

how it is done. (1) Run the direct ErrorID prompt. (2) Run the Step-Level prompt. (3) Convert the step labels to the first index below the correctness threshold. (4) Compare Balanced Accuracy and Balanced F1 at response level. Table 3 reports both and Δ=Step-Level minus ErrorID.

evidence and limits. GPT-5 improves from ErrorID Balanced F1 69.72 to derived 75.66 (+5.94); Gemini 2.5 Pro improves 52.46 to 62.78 (+10.32); ByteDance Seed-OSS-36B falls 45.18 to 33.55 (−11.63). These denominators are the 200 responses, and the mixed signs support the authors’ advice to choose the prompt per verifier. Inference: a Verus repair tool should benchmark both direct diagnosis and per-obligation labeling rather than assume one interface dominates.

## technique 6: scale verifier inference compute sequentially

what it is and when to use it. Increase the verifier’s reasoning budget or output tokens for one judgment, rather than sampling many short judgments. Use when step verification is sequential and each step needs detailed inspection.

how it is done. (1) Evaluate gpt-oss-20B, gpt-oss-120B, and GPT-5 at low, medium, and high reasoning effort. (2) Keep the Step-Level task and measure Balanced F1. (3) Separately sample 32 low-effort responses, bootstrap best-of-N majority votes for N=4…16, repeat 10 trials, and compare with high-effort single responses. The procedure is in §5.1 (PDF p. 8).

evidence and limits. Sequential effort raises gpt-oss-20B from 59.69 (low) to 70.93 (high) and gpt-oss-120B from 61.46 to 74.64; GPT-5 also improves, with a reported 12.3% relative low-to-high gain (Figure 5, PDF p. 9). Parallel Best-of-N does not meaningfully improve over one low-effort response. The 10-trial bootstrap estimates variance for the parallel comparison; values are benchmark-level Balanced F1, not proof soundness.

Verus form. Inference: give a verifier more sequential time to inspect a contract, solver trace, and dependency context before asking for a label. Parallel votes can still be useful for independent triage, but only a final Verus run establishes acceptance. Record reasoning effort, model, timeout, and all vote aggregation choices.

## technique 7: test self-verification and solve-versus-verify asymmetry

what it is and when to use it. Split responses by their generating model, ask the same model to verify its own outputs, and compare its verification rate with its human-judged solve rate. This tests whether a model can be a useful critic of its own proof attempts.

how it is done. (1) Partition Hard2Verify into GPT-5, Gemini, and Claude response subsets. (2) Have each generator label every step of its own responses. (3) Compute TPR/TNR by response generator and compare with human labels. (4) For each response, compute the fraction of correctly generated steps and the fraction correctly verified. The paper reports this in §§5.2–5.3 (PDF pp. 9–10).

evidence and limits. GPT-5’s TPR varies from 95.85 on Claude-generated responses to 98.93 on Gemini-generated responses and 98.54 on GPT-5-generated responses; its TNR is 61.75, 24.86, and 25.13 respectively (Figure 6, PDF p. 9). The denominator is the annotated steps in each generator subset. Figure 7 reports verification rate generally above solve rate, but this is agreement with human labels, not a proof certificate. Inference: self-verification can be useful triage but should not be the sole acceptance gate for Verus code.

## technique 8: audit under-justified claims with human disagreement cases

what it is and when to use it. Inspect examples where a strong open model accepts a step that experts reject, then classify the missing generalization, case, or theorem conditions. Use this to expand verifier prompts and regression tests.

how it is done. (1) Select false-positive verifier labels. (2) Compare the model rationale with the expert annotation and official solution. (3) Record the exact unsupported claim or omitted branch. (4) Turn the failure into a targeted evaluation item. The paper’s case study gives an IMO 2023 Shortlist A6 polynomial-identity error and an IMO 2024 Shortlist A1 incomplete Weyl-theorem case analysis (§5.4, PDF p. 10).

evidence and limits. The cases show a verifier accepting a claim proved only at one input and a theorem invocation lacking the estimate and n choice. They are qualitative examples, not prevalence estimates. Inference: for Verus, analogous audits should target unjustified `assume`, overly strong `requires`, unchecked `external_body` dependencies, and missing environment conditions.

## what is proved, measured, and trusted

Hard2Verify measures agreement with expert labels, not formal theorem validity. Trusted elements include the curated official solutions, MathPix extraction, model prompts and decoding, human annotator judgments, PRM thresholds, and metric implementation. The benchmark’s own central finding is that weak verifiers label nearly every step correct: their TNR falls toward zero while TPR rises (Figure 4, PDF p. 7). This makes final-answer or pass-rate evaluation unsafe for open-ended proof processes.

Inference: the threat to VeruLaw is a high risk of accepting plausible but invalid intermediate proof edits when using an LLM critic as a gate. Verus’s checker can eliminate many such errors, but model-generated specifications, `external_body` assumptions, dependency contracts, and unchecked environment claims remain outside its kernel. VL should not redo Hard2Verify’s human math benchmark; it should adapt its three-task schema to verified Rust patches and publish machine-checkable labels plus human labels for specification adequacy.

## techniques for the catalog

- frontier-question curation: select recent open-ended problems whose answers cannot be checked by string match
- natural-response sampling: collect model errors without injecting synthetic mistakes
- strict step annotation: label every step and propagate prior errors to later steps
- three-task verifier evaluation: measure step, whole-response, and first-error performance
- prompt comparison: derive first-error indices from step labels and compare with direct ErrorID
- sequential compute scaling: spend more reasoning on each judgment and compare with parallel votes
- self-verification audit: compare a generator’s human-judged solve rate with its own verification rate
- disagreement audit: convert expert/model false positives into targeted verifier cases
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
