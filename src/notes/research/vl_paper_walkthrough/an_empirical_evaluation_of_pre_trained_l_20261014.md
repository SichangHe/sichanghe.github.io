# An Empirical Evaluation of Pre-trained Large Language Models for Repairing Declarative Formal Specifications
(authored by agents unless marked 🧑)
Tag: `alhanahnah2024empirical`, [paper](https://doi.org/10.1145/3510003.3510203)

## what is measured

The paper evaluates LLM-based automatic repair of faulty Alloy declarative specifications. Alloy models contain signatures, relations, facts, predicates/functions, assertions, and `check`/`run` commands; the Alloy Analyzer verifies assertions and produces counterexamples or instances (Section 2.2, pp. 4–6). The pipeline assigns a Repair Agent to propose patches and optionally an Instructor Agent to turn analyzer reports into an adaptive prompt (Sections 3.1–3.2, pp. 7–10).

The abstract reports: "We designed 12 different repair settings, encompassing single-agent and dual-agent paradigms, utilizing various LLMs." (Abstract, p. 1). The evaluation covers 1,974 defective specifications from the ARepair and Alloy4Fun benchmarks; each setting allows up to six iterations (Section 1, p. 2; Section 4.6, p. 16). Correct@6 is the percentage of defects repaired within six iterations, `100 × successful defects / total defects` (Section 4.6, p. 16). Results compare GPT-4-32k, GPT-4-Turbo, GPT-4o, GPT-3.5-Turbo, and prior tools ARepair, ICEBAR, BeAFix, and ATR.

## technique: iterative Repair Agent with analyzer verification

what it is and when to use it

Use an iterative repair agent when a declarative specification can be executed by an analyzer that reports syntax errors, counterexamples, or satisfying instances. The model proposes a complete revised specification, the analyzer checks it, and the next prompt includes the failure feedback. This directly addresses underconstrained models (missing restrictions) and overconstrained models (forbidding intended behavior), the two defect classes defined in Section 2.3 (pp. 6–7).

how to do it

1. Send the faulty Alloy model with a zero-shot agent instruction and a tool instruction. The model is told to repair the model, use `run alloy analyzer`, and return the repaired specification through the tool's JSON fields (Section 3.2.1, pp. 9–10; Table 1, p. 9).
2. The Repair Agent compares the proposed model with the original to detect repetition, then invokes the Alloy Analyzer on the proposal (Section 3.1, pp. 7–9).
3. If the analyzer confirms the bug is fixed, terminate and record success. Otherwise append a feedback message and continue until the iteration budget is exhausted (Section 3.1, pp. 8–9).
4. Keep the agent's message context over iterations; the paper's preliminary experiment found diminishing returns after six iterations, so the main budget is six (Section 3.1, p. 7; Section 4.6, p. 16).

The Repair Agent instruction requires: "The <FIXED SPECIFICATIONS> should be consistent (having instances) and all the assertions should be valid (no counterexample)." (Table 1, p. 9). The grade example illustrates a semantic repair: adding `s ! in a.assigned_to` prevents a student who is a TA from grading their own assignment (Section 2.2, pp. 5–6).

Verus form (inference)

Inference: Represent the generated Rust/Verus candidate as source text parsed into a typed intermediate form. Run `cargo-verus`/Verus as the analyzer and feed diagnostics and counterexamples into the next generation prompt. Accept a candidate only after executable checks and Verus verification succeed. Use `requires` and `ensures` on verified functions, and loop `invariant` clauses for repair-state bookkeeping; do not use `lemma` as a keyword or call a `proof fn` at runtime. The LLM's text and analyzer output are untrusted until the Verus verifier checks the code.

evidence, limits, and assumptions

On the ARepair benchmark, Table 5 (p. 18) has 64 defects across 38 specifications. GPT-4-Turbo Auto-Feedback repairs 28/38 defects (73.4%), and GPT-4o Auto-Feedback also repairs 28/38 (73.4%); these percentages use the table's 38-defect denominator. GPT-3.5-Turbo Auto-Feedback repairs 4/38 (10.5%). On the Alloy4Fun benchmark, Table 6 (p. 19) evaluates a GPT-4o subset of 357 specifications and GPT-3.5-Turbo on all 1,936; the summary rows report 201/357 (56.3%) for GPT-4o Auto-Feedback and 278/1,936 (14.3%) for GPT-3.5-Turbo Auto-Feedback. The benchmark tables count defects, so a specification with multiple defects contributes multiple denominator units in ARepair; Alloy4Fun's parenthesized values identify the sampled 357 subset (Section 5.1, pp. 17–19).

The method assumes the analyzer's assertions correctly encode the intended behavior. A repair that passes the supplied assertions can still be semantically wrong when the specification is incomplete. The model may repeat the original text, violate the required JSON format, or fail to localize the defect; these are explicit feedback cases in Section 3.3 (pp. 10–12).

## technique: dual-agent auto-feedback

what it is and when to use it

Use a separate Instructor Agent when raw analyzer reports are too technical or when prompt construction should be adaptive. The Instructor sees the analyzer report and proposed specification but does not share the Repair Agent's context. It emits a concise repair instruction that is appended to the Repair Agent's next prompt (Section 3.2.2, p. 10).

how to do it

1. Run the Repair Agent and analyzer as in the single-agent loop (Sections 3.1–3.2.1).
2. Forward the analyzer report and proposed model to an Instructor whose persona is “Expert in Analyzing Alloy Analyzer reports” (Section 3.2.2, p. 10; Table 1, p. 9).
3. Have the Instructor state the required modifications in at most two sentences (Table 1, p. 9).
4. Append the generated instruction to the Repair Agent prompt and run the next iteration (Section 3.2.2, p. 10).

The paper describes the separation directly: "This agent does not share the same context or prompts with the Repair Agent." (Section 3.2.2, p. 10). Auto-feedback is the dual-agent condition; no-feedback and generic-feedback are single-agent conditions (Section 3.3, pp. 11–12).

Verus form (inference)

Inference: Use one agent to edit Verus code and a second to summarize verifier diagnostics and suggest changes. Keep the analyzer output as the authoritative machine artifact; the Instructor text only guides search. A Verus-side wrapper can prove that every candidate sent to the next iteration is the exact source that was checked, using a hash recorded in a verified state record. Do not treat an Instructor's claimed invariant as evidence until Verus checks it.

evidence, limits, and assumptions

Table 7 (p. 19) reports Correct@6 on the ARepair benchmark. For GPT-4o, single-agent no-feedback, generic-feedback, and dual-agent auto-feedback achieve 63.2%, 71.1%, and 73.4%, respectively; the denominator is the 38 defects in that benchmark summary. GPT-4-Turbo achieves 44.7%, 50.0%, and 73.4% in the same three conditions. The paper says Auto-feedback is strongest across evaluated LLMs, but generic feedback can match it on some Alloy4Fun samples because of stochasticity (Section 5.1, pp. 17–19). A dual agent adds inference calls and tokens and can propagate a misleading summary; the paper does not independently verify the Instructor's natural-language advice.

## technique: graduated feedback levels

what it is and when to use it

Use feedback levels to separate the value of analyzer information from the value of prompt engineering. No-feedback gives only a failure bit, generic-feedback gives a human-written summary of errors/counterexamples/instances, and auto-feedback delegates summary construction to the Instructor Agent (Section 3.3, pp. 10–12).

how to do it

1. After each analyzer run, classify the report into the selected level (Section 3.3, pp. 10–12).
2. For no-feedback, append only “The proposed specification DID NOT fix the bug.” (Table 2, p. 11).
3. For generic-feedback, append the templated report containing analyzer errors, counterexamples, and instances (Table 2, p. 11).
4. For auto-feedback, pass the report and proposal to the Instructor and append its generated instruction (Section 3.3, pp. 11–12).
5. Continue the same six-iteration loop and compute Correct@6 for each condition (Section 4.6, p. 16).

The paper calls generic feedback a template that summarizes "counterexamples, instances, and errors." (Section 3.3, p. 11). A parser fallback attempts to extract Alloy text when the model violates the required JSON format (Section 3.3, p. 10).

Verus form (inference)

Inference: Map no-feedback to a Boolean verification result, generic-feedback to structured diagnostics and counterexample traces, and auto-feedback to a second summarizer. Keep all three conditions in the same harness so that only feedback content changes. Verify parser and JSON-schema handling in Rust; a malformed response should be an explicit error path, not silently accepted code.

evidence, limits, and assumptions

The settings confound model family, feedback level, and agent count when compared across all 12 rows in Table 4 (p. 16). The paper's controlled comparisons in Table 7 reduce this confounding but still use stochastic LLMs at temperature 0.2 (Section 4.6, p. 16). The parser cannot handle all malformed responses, so tool-fallback messages are needed (Section 3.3, p. 10). No-feedback is a deliberately weak baseline and should not be interpreted as absence of analyzer information in practical repair.

## technique: explicit protocol and tool-fallback handling

what it is and when to use it

Use strict tool instructions and a fallback parser when an agent must return machine-consumable repaired specifications. The tool schema requires a request name and specification field; malformed or repeated outputs receive targeted feedback (Sections 3.2.1 and 3.3, pp. 9–11).

how to do it

1. Describe the analyzer tool and its JSON schema in the system prompt (Table 1, p. 9).
2. Reject responses that omit fields or fail the expected format; run the fallback parser when possible (Section 3.3, p. 10).
3. If the candidate equals the original faulty model, append the Repeated-spec message and require a different candidate (Section 3.3, p. 10).
4. Run analyzer verification only on the extracted candidate and feed resulting errors back into the loop (Sections 3.1 and 3.3, pp. 8–11).

The repeated-spec guard says: "The proposed <FIXED SPECIFICATIONS> is IDENTICAL to the Alloy <Faulty SPECIFICATIONS> that I sent you." (Table 2, p. 11).

Verus form (inference)

Inference: Define a Rust enum for tool responses and validate it before invoking Verus. Record the source hash and reject identical hashes before another attempt. Use `requires` on the executor that the parsed source is nonempty and differs from the prior candidate; use `ensures` that only parsed, verified source is returned as a successful repair. Keep fallback extraction outside the proof boundary unless its parser is itself verified.

evidence, limits, and assumptions

The paper reports fallback parsing as an implementation aid, not as a completeness guarantee. A response can remain unparseable, and the repair budget can be consumed without a valid proposal. Strict prompts improve protocol compliance but do not establish semantic correctness; analyzer verification remains the decisive check.

## technique: benchmark and cost measurement

what it is and when to use it

Use defect-stratified benchmarks and a fixed iteration metric to compare repair systems. The paper separates single-line and multi-line defects, underconstrained and overconstrained specifications, repair iterations, token use, and solver formula size (Sections 4–5, pp. 16–27).

how to do it

1. Assemble external defective models and record total specifications and defect counts; the ARepair set has 38 specifications and 64 defects, while Alloy4Fun has 1,936 specifications with a 357-specification GPT-4o sample (Tables 5–6, pp. 18–19).
2. Run each LLM/feedback combination for at most six iterations and compute Correct@6 using the stated denominator (Section 4.6, p. 16).
3. Record the iteration count of successful repairs and classify failed repairs by defect type and instruction compliance (Sections 5.2–5.3, pp. 23–28).
4. Measure token usage and generated propositional variables/clauses to expose cost and solver complexity (Sections 5.4 and Tables 8–9, pp. 28–30).

The paper reports: "The repair experiment on the Alloy4Fun benchmark leverages GPT-4o—the most cost-effective option among GPT-4-32k and GPT-4-Turbo—for a randomly sampled subset of 357 models" (Section 4.6, p. 16). This sampling must be retained when interpreting percentages.

Verus form (inference)

Inference: For Verus, stratify benchmarks by specification shape, solver time, ownership pattern, unsafe blocks, and proof obligation type. Report repaired obligations over the exact denominator, reruns per candidate, verifier version, and token/cpu cost. A pass should require machine-checked Verus verification plus tests or counterexample checks appropriate to the specification.

evidence, limits, and assumptions

The paper's reported totals are not all interchangeable: the ARepair tables count 64 defects, whereas the broad experiment description counts 1,974 defective models and up to 106,596 repair attempts (Section 4.6, p. 16). Alloy4Fun percentages use either 1,936 or the 357 sampled subset depending on the column (Table 6, p. 19). The authors note over 56% of unfixed issues are overconstrained across most settings (Table 10, p. 31), but the denominator is the set of unfixed issues, not all benchmark defects. Solver formula size is descriptive and does not prove repair quality.

## what remains trusted and product threat (inference)

Inference: The trusted base includes the Alloy Analyzer, its SAT translation and solver, benchmark assertions, parser/fallback code, LLM API behavior, and the correctness of defect labels. The study verifies Alloy candidates only against supplied assertions and commands; it does not establish that those assertions capture user intent.

Inference: For VeruLaw, this paper supports a practical architecture: one agent edits Rust/Verus, an independent agent summarizes verifier output, and a deterministic harness records every candidate, diagnostic, and proof result. The threat from agent-written verified Rust is high when specifications are weak or underconstrained: a model may produce code that Verus proves correct relative to an incomplete contract. Product gates should therefore include specification review, mutation or counterexample testing, and independent checks of trusted assumptions. The paper's strongest result is about repair workflow, not end-to-end assurance.

## what VL should not redo

The paper already evaluates single versus dual agents, no/generic/auto feedback, six-iteration budgets, four GPT-family models, two Alloy benchmarks, prior Alloy repair tools, failure categories, and token/solver-cost measures. Repeating the same Alloy experiment would add little. New work should test whether independent Verus diagnostics and counterexamples improve repair while preserving specification adequacy and trusted-kernel accounting.

## techniques for the catalog

- iterative analyzer-verified repair — repeatedly generate a complete declarative patch, run the analyzer, and feed failures into the next prompt
- dual-agent auto-feedback — let an Instructor Agent convert analyzer reports into concise repair instructions for a separate Repair Agent
- graduated feedback levels — compare failure-only, templated, and LLM-generated feedback under a fixed repair loop
- protocol and fallback guards — enforce tool JSON, detect repeated candidates, and parse or reject malformed responses
- defect-stratified evaluation — report Correct@k, denominators, iterations, token cost, defect classes, and solver formula size separately
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
