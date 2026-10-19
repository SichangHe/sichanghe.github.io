# An Empirical Evaluation of Pre-trained Large Language Models for Repairing Declarative Formal Specifications
(authored by agents unless marked 🧑)
Tag: `alhanahnah2025empirical`, [paper](https://arxiv.org/abs/2404.11050v2)

## what is measured

The paper evaluates LLM-based automatic repair of faulty Alloy declarative specifications. Alloy models contain signatures, relations, facts, predicates/functions, assertions, and `check`/`run` commands; the Alloy Analyzer verifies assertions and produces counterexamples or instances (Section 2.2, pp. 4–6). The pipeline assigns a Repair Agent to propose patches and optionally an Instructor Agent to turn analyzer reports into an adaptive prompt (Sections 3.1–3.2, pp. 7–10).

The abstract reports: "We designed 12 different repair settings, encompassing single-agent and dual-agent paradigms, utilizing various LLMs." (Abstract, p. 1). The supplied paper is arXiv:2404.11050v2, dated 12 June 2025 (p. 1). The evaluation describes 1,974 defective specifications from ARepair and Alloy4Fun, with up to six iterations per setting (Section 1, p. 3; Section 4.6, p. 16). Equation 1 defines Correct@k as the percentage of bugs repaired within k iterations; the results in Tables 5–7 count repaired specifications. Table 4 (p. 17) combines four LLMs, GPT-4-32k, GPT-4-Turbo, GPT-4o, and GPT-3.5-Turbo, with three feedback levels. GPT-4o is tested on a 357-model Alloy4Fun subset, while GPT-3.5-Turbo is tested on all 1,936 models reported in Table 6 (p. 19).

## technique: iterative Repair Agent with analyzer verification

what it is and when to use it

The model proposes a revised Alloy specification, the analyzer checks it, and the next prompt includes failure feedback (Section 3.1, pp. 7–8). Section 2.3 (pp. 6–7) defines underconstrained specifications as permitting unintended behavior and overconstrained specifications as excluding valid instances. Inference: This workflow is applicable when an analyzer can supply useful repair feedback.

how to do it

1. Send the faulty Alloy model with a zero-shot agent instruction and a tool instruction. The model is told to repair the model, use `run alloy analyzer`, and return the repaired specification through the tool's JSON fields (Section 3.2.1, p. 10; Table 1, p. 9).
2. Compare the proposed model with the original to detect repetition, then invoke the Alloy Analyzer on the proposal (Section 3.1, p. 8; Figure 1).
3. If the analyzer confirms the bug is fixed, terminate. Otherwise append feedback and continue while iterations remain (Section 3.1, p. 8).
4. Keep the Repair Agent's message context over iterations (Section 3.2.1, p. 10). The preliminary GPT-4-32k experiment used ten iterations and found diminishing returns after six, motivating the main six-iteration budget (Section 4.6, p. 16). Table 1's prompt nevertheless says five trials (p. 9).

The Repair Agent instruction requires: "The <FIXED SPECIFICATIONS> should be consistent (having instances) and all the assertions should be valid (no counterexample)." (Table 1, p. 9). The grade example adds a condition excluding the grader from the assignment's students, preventing a TA from grading their own work (Section 2.2, pp. 5–6).

Verus form (inference)

Inference: Apply the loop to Rust/Verus candidates by running Verus and feeding its diagnostics into the next prompt. Require successful verification and appropriate executable checks before accepting a repair. This paper does not evaluate Verus.

evidence, limits, and assumptions

On ARepair, Table 5 (p. 18) lists 64 defects across 38 specifications. GPT-4-Turbo and GPT-4o Auto-Feedback each repair 28 specifications; GPT-3.5-Turbo Auto-Feedback repairs 18 (47.4%). Its no-feedback condition repairs four (10.5%). The denominator for these repair percentages is 38 specifications, not 64 defects. Table 5 prints 73.4% for both 28-specification results. Inference: 28/38 rounds to 73.7%, so the printed percentage is inconsistent with the count. On Alloy4Fun, Table 6 (p. 19) reports 201/357 (56.3%) for GPT-4o Auto-Feedback and 278/1,936 (14.3%) for GPT-3.5-Turbo Auto-Feedback.

Section 3.3 (pp. 10–12) provides feedback for repeated original specifications, malformed tool responses, and analyzer failures. Inference: Passing the supplied assertions does not establish that those assertions fully encode the intended behavior.

## technique: dual-agent auto-feedback

what it is and when to use it

The Instructor sees the analyzer report and proposed specification but does not share the Repair Agent's context. It emits a repair instruction that is appended to the Repair Agent's next prompt (Section 3.2.2, p. 10). Inference: This separates patch generation from feedback construction.

how to do it

1. Run the Repair Agent and analyzer as in the single-agent loop (Sections 3.1–3.2.1).
2. Forward the analyzer report and proposed model to an Instructor whose persona is “Expert in Analyzing Alloy Analyzer reports” (Section 3.2.2, p. 10; Table 1, p. 9).
3. Have the Instructor state the required modifications in at most two sentences (Table 1, p. 9).
4. Append the generated instruction to the Repair Agent prompt and run the next iteration (Section 3.2.2, p. 10).

The paper describes the separation directly: "This agent does not share the same context or prompts with the Repair Agent." (Section 3.2.2, p. 10). Auto-feedback is the dual-agent condition; no-feedback and generic-feedback are single-agent conditions (Section 3.3, pp. 11–12).

Verus form (inference)

Inference: Use one agent to edit Verus code and a second to interpret verifier diagnostics. Preserve the original diagnostics so the generated advice can be checked against them. The Instructor's advice does not establish that a candidate verifies.

evidence, limits, and assumptions

Table 7 (p. 19) reports ARepair Correct@6. GPT-4o's no-feedback, generic-feedback, and auto-feedback percentages are printed as 63.2%, 71.1%, and 73.4%; GPT-4-Turbo's are 44.7%, 50.0%, and 73.4%. These use 38 specifications and inherit the percentage discrepancy above. Table 6 reports 206 GPT-4o generic-feedback repairs versus 201 auto-feedback repairs on the same 357-model subset, despite Section 5.1's claim that Auto-feedback consistently performs best. The table prints 55.7% for generic-feedback. Inference: 206/357 rounds to 57.7%, which exceeds the reported 56.3% auto-feedback result. Section 5.1 (p. 18) attributes comparable results to stochasticity and reports that rerunning five models repaired only with generic-feedback allowed auto-feedback to repair two. Inference: The results do not establish uniform dual-agent superiority.

## technique: graduated feedback levels

what it is and when to use it

No-feedback gives a fixed failure message, generic-feedback sends the analyzer report through a template, and auto-feedback asks the Instructor to construct repair guidance (Section 3.3, pp. 11–12). Inference: Comparing these conditions measures the effect of feedback content and, for auto-feedback, an additional agent.

how to do it

1. After each analyzer run, classify the report into the selected level (Section 3.3, pp. 10–12).
2. For no-feedback, append only “The proposed specification DID NOT fix the bug.” (Table 2, p. 11).
3. For generic-feedback, append the templated report containing analyzer errors, counterexamples, and instances (Table 2, p. 11).
4. For auto-feedback, pass the report and proposal to the Instructor and append its generated instruction (Section 3.3, pp. 11–12).
5. Continue the same six-iteration loop and compute Correct@6 for each condition (Section 4.6, p. 16).

The paper states: "We use a template to send the Alloy Analyzer report to LLM." (Section 3.3, p. 12). A parser attempts to extract Alloy text when the response violates the required JSON format; tool-fallback feedback is sent when extraction still fails (Section 3.3, p. 11).

Verus form (inference)

Inference: Map no-feedback to a Boolean verification result, generic-feedback to structured diagnostics and counterexample traces, and auto-feedback to a second summarizer. Keep all three conditions in the same harness so that only feedback content changes. Verify parser and JSON-schema handling in Rust; a malformed response should be an explicit error path, not silently accepted code.

evidence, limits, and assumptions

Table 4 (p. 17) varies model family and feedback level; auto-feedback also adds an agent. Temperature is 0.2 (Section 4.6, p. 16). Inference: Within-model comparisons hold model family fixed, but cannot separate the effect of generated feedback from that of adding the Instructor. No-feedback still uses the analyzer to decide whether a repair succeeds.

## technique: explicit protocol and tool-fallback handling

what it is and when to use it

The tool schema requires `request` and `specification` fields. Malformed or repeated outputs receive targeted feedback (Table 1, p. 9; Sections 3.2.1 and 3.3, pp. 10–11). Inference: Explicit response formats help connect generated text to an executable analyzer.

how to do it

1. Describe the analyzer tool and its JSON schema in the system prompt (Table 1, p. 9).
2. Attempt extraction with the parser built atop Langroid's JSON parser; request the correct format if extraction fails (Section 3.3, p. 11).
3. If the candidate equals the original faulty model, append the Repeated-spec message requesting a different candidate (Section 3.3, p. 11).
4. Run analyzer verification only on the extracted candidate and feed resulting errors back into the loop (Sections 3.1 and 3.3, pp. 8–11).

The repeated-spec guard says: "The proposed <FIXED SPECIFICATIONS> is IDENTICAL to the Alloy <Faulty SPECIFICATIONS> that I sent you." (Table 2, p. 11).

Verus form (inference)

Inference: Validate response fields before invoking Verus, compare the extracted candidate with the original source, and return an explicit error when parsing fails. Preserve the exact source submitted to verification.

evidence, limits, and assumptions

The parser limitation is explicit: "Nonetheless, the parser cannot handle all scenarios, resulting in the dispatch of this feedback to the LLM, soliciting adherence to the mandated JSON format." (Section 3.3, p. 11). Inference: A format instruction does not guarantee either successful extraction or a correct repair.

## technique: benchmark and cost measurement

what it is and when to use it

The paper measures repair success and iterations, categorizes failures, reports runtime and monetary costs, and compares generated SAT formula sizes (Sections 4–5, pp. 13–29). Inference: Keep these measurements separate because faster or smaller output need not be correct.

how to do it

1. Remove fix comments before repair. For uniqueness checking, remove block comments, collapse whitespace, and group whole specifications by MD5 hash; the authors report no duplicates among 38 ARepair and 1,936 Alloy4Fun files (Section 4.2, pp. 13–14). Tables 5–6 (pp. 18–19) give specification and defect counts.
2. Run the applicable LLM/feedback combinations for at most six iterations and compute Correct@6 using the specification denominator in the result tables (Section 4.6, p. 16). Preserve the 357-model GPT-4o sampling restriction for Alloy4Fun.
3. Record the iteration count of successful repairs and classify failed repairs by defect type and instruction compliance (Sections 5.2–5.3, pp. 23–28).
4. Record repair runtime and monetary costs based on token consumption (Section 5.4, pp. 28–29). Separately record generated propositional variables and clauses (Tables 8–9, pp. 20–21).

The paper reports: "The repair experiment on the Alloy4Fun benchmark leverages GPT-4o—the most cost-effective option among GPT-4-32k and GPT-4-Turbo—for a randomly sampled subset of 357 models" (Section 4.6, p. 16). This sampling must be retained when interpreting percentages.

Verus form (inference)

Inference: For Verus, stratify benchmarks by specification shape, solver time, ownership pattern, unsafe blocks, and proof obligation type. Report repaired obligations over the exact denominator, reruns per candidate, verifier version, and token/cpu cost. A pass should require machine-checked Verus verification plus tests or counterexample checks appropriate to the specification.

evidence, limits, and assumptions

The paper contains further inconsistencies. Section 4.1 (p. 13) says Alloy4Fun contains 1,938 models; Section 4.2 and Table 6 use 1,936. Section 4.6 (p. 16) describes 106,596 attempts as 1,974 models × three LLMs × three feedback levels × six iterations, while Table 4 lists four LLMs and the actual Alloy4Fun design restricts GPT-4o to a subset. Inference: This product is an iteration-budget calculation, not evidence of that many executed attempts.

Section 4.1 reports 28 single-line and ten multi-line ARepair specifications, whereas Section 5.2 (p. 24) describes Setting-6 as repairing 16 single-line and 12 multi-line bugs. Inference: Those categories cannot both count specifications consistently. Table 10 (p. 27) classifies unfixed outputs as overconstrained or underconstrained. Its procedure uses counterexample/instance status first, then comparison with ground truth (Section 5.3, pp. 26–27). Inference: A counterexample alone does not establish overconstraint; these labels should not be treated as independently verified semantic diagnoses. Formula size likewise does not establish correctness.

Section 6 (p. 30) identifies possible training-data leakage: "This raises the concern that the models might be memorizing existing repairs rather than generating novel solutions, which could limit their applicability to Alloy models they have not been trained on." The evaluation uses static Alloy models, excluding Alloy 6 mutable specifications and LTL features (Section 4.5, pp. 15–16).

## what remains trusted and product threat (inference)

Inference: Repair acceptance depends on the analyzer, its SAT translation and solver, supplied assertions and commands, and correct handling of candidate source and analyzer results. LLM advice is a proposed repair, not evidence of correctness. The study does not establish that the supplied assertions capture all user intent.

Inference: For VeruLaw, test a repair agent and a separate feedback agent while recording candidates, diagnostics, and verification results. A weak contract may permit verified code that misses the intended behavior. Specification review and counterexample testing could address that problem, but this paper does not evaluate those measures in Verus.

## what VL should not redo

Inference: Repeating the same Alloy comparisons would add little to this study. For VL, test whether feedback construction improves Verus repair while preserving the intended contracts. The Alloy results alone do not establish that transfer.

## techniques for the catalog

- iterative analyzer-verified repair — repeatedly generate a complete declarative patch, run the analyzer, and feed failures into the next prompt
- dual-agent auto-feedback — let an Instructor Agent convert analyzer reports into concise repair instructions for a separate Repair Agent
- graduated feedback levels — compare failure-only, templated, and LLM-generated feedback under a fixed repair loop
- protocol and fallback guards — enforce tool JSON, detect repeated candidates, and parse or reject malformed responses
- defect-stratified evaluation — report Correct@k, denominators, iterations, token cost, defect classes, and solver formula size separately
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This suggests that GPT-4o achieves more efficient and accurate repairs by leveraging simpler logical structures while maintaining correctness."): read the entire paper, including appendix and references, and the entire study; checked quotations, counts, denominators, techniques, section/page references, and the arXiv identifier; corrected the unrelated DOI, version year, repair counts, denominator claims, feedback procedure, and page references; exposed conflicting dataset totals, percentages, iteration totals, bug categories, and superiority claims; simplified unsupported Verus details and marked recommendations as Inference; did not rerun experiments, inspect implementation artifacts, or independently validate benchmark labels.
