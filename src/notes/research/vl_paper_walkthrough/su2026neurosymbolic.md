# Neuro-Symbolic Verification on Instruction Following of LLMs
(authored by agents unless marked 🧑)
Tag: `su2026neurosymbolic`, [paper](https://arxiv.org/abs/2601.17789)

## problem and claimed contribution
The paper introduces NSVIF, a verifier for whether an LLM output follows the instruction that prompted it. It represents an instruction as constraints, separates constraints that can be checked symbolically from those requiring semantic judgment, and solves their Boolean composition with an SMT solver. The input is an arbitrary pair ⟨I,O⟩ and the output is SAT or UNSAT plus an explanation. The paper’s central formulation is: “N SVIF formulates the instruction following verification problem as a Constraint-Satisfaction Problem or CSP.” (Section 3.1, p. 3.)

The intended use is per-step checking in an agent workflow. The paper states, “N SVIF can serve as a per-step verifier to ensure every output from the LLM follows the instruction issued by the agent.” (Section 3.3, p. 5.) Its benchmark, VIFBENCH, contains 820 instruction/output/result tuples, with 391 SAT outputs (47.68%) and 429 UNSAT outputs (52.32%) (Section 4.2, p. 6; Appendix A.2, p. 14).

## technique 1: decompose an instruction into a first-order constraint formula
Use this when one prompt contains several requirements whose interactions matter. The method is:

1. Give an instruction I and output O to the formulation agent (Section 3.2, p. 4).
2. Extract each requirement as a constraint and write a one-sentence summary for it (Section 3.2, p. 4).
3. Determine relations among constraints and encode them as a first-order-logic formula using NOT, AND, OR, implication, and equivalence (Sections 3.1–3.2, pp. 3–4).
4. Produce a Z3 program encoding that formula (Section 3.2, p. 4).
5. Define `verify(I,O) = SAT` when `O |= f(C)` and UNSAT otherwise (Section 3.1, p. 3).

The paper explains why decomposition matters: “N SVIF’s divide-and-conquer strategy makes it significantly more effective than verifying the entirety of the instruction.” (Section 3.1, p. 3.)

Inference: in Verus, the analogous design is to represent each requirement as a predicate over a state or result, combine predicates with Boolean expressions in `requires`/`ensures`, and prove the conjunction with Verus’s SMT-backed verification. A natural-language parser and arbitrary first-order formula generator are outside Verus; they remain trusted front-end code. Verus does not use Z3 programs as an application-level artifact, so the generated Rust proof obligation is the carried-over part, while dynamic text interpretation is not.

Evidence: On VIFBENCH, the full NSVIF with GPT-4.1 achieved F1 94.8%, precision 94.2%, recall 95.4%, and Pass@1 95.0%, versus the LLM-as-judge baseline’s F1 69.1%, precision 52.9%, recall 99.5%, and Pass@1 57.4% (Table 2, p. 6). The denominator is the 820 benchmark entries; Table 2 reports percentages only (the false-positive and false-negative counts are in Table 4, p. 7). The gain is not uniform: with GPT-4o-mini, NSVIF scored F1 37.3% against the baseline’s 66.6%, and the paper calls this unexpected, attributing it to misclassification of constraints as logic or semantic (misclassified constraints in 508 of 820 instructions) and to weak checker code (Section 5.2, p. 7). With DeepSeek-R1 the gain was 7.00 points (83.9% vs 76.9%) (Table 2, p. 6).

Assumptions and failures: the paper says CSP “does not differentiate soft constraints and hard constraints” and that “unsatisfiable instructions could lead to infinite retries or task failures” (Section 8, p. 9). Inference: SAT checking is therefore only useful when the instruction itself is satisfiable. Formula extraction can hallucinate a constraint: one of 18 false negatives was caused by “the formulation agent incorrectly extracting constraints” (Section 5.3, p. 8).

## technique 2: classify each constraint and generate an executable checker
Use this when constraints mix objective lexical/structural rules with subjective semantic requirements. The paper’s sequence is:

1. For each extracted constraint, classify it as logic or semantic, using the original ⟨I,O⟩, summary, and Z3 program (Section 3.2, p. 4).
2. Generate a checking plan containing the summary and type, checker inputs and outputs, and expected behavior (Section 3.2, p. 4).
3. For a logic constraint, generate Python code using the plan, then execute the generated programs and save the results to files (Section 3.2, p. 4).
4. The generated code can fail (for example, runtime exceptions); the paper allows self-reflections, three by default, and when the budget is exhausted the LLM evaluates the constraint directly, treating the logic constraint as a semantic one (Section 3.2, p. 4).
5. For a semantic constraint, prompt an LLM judge with a short constraint-specific prompt (Section 3.2, p. 4).
6. Aggregate all individual constraint results and execute the Z3 program to produce the sat/unsat verdict with an explanation (Section 3.2, p. 4; Figure 1, p. 3).

The paper’s distinction is explicit: “A logic constraint can be encoded using symbolic rules, regular expressions, or executable code.” and “A semantic constraint is hard to be verified by logic reasoning but requires semantic analysis using neural approaches.” (Section 3.1, p. 3.)

Inference: for Verus, use executable Rust/spec predicates for logic constraints such as lengths, membership, ordering, and uniqueness, and prove their postconditions. Semantic constraints such as tone or topic do not become Verus facts unless a separately trusted classifier has a formally specified contract; that classifier’s result would be an assumption. Generated Python checkers cannot be inserted into a Verus proof without replacing them by Rust code and proving the relevant contract.

Evidence: the ablation N SVIF-NEU, which removes logic reasoning and directly asks an LLM to check every constraint, scored F1 84.0%, precision 80.9%, recall 87.5%, and Pass@1 84.1% on the same 820 entries, while full NSVIF scored 94.8%, 94.2%, 95.4%, and 95.0% (Table 3, p. 7). With GPT-4.1, full NSVIF had 23 false positives (2.80% of 820) and 18 false negatives (2.20% of 820); N SVIF-NEU had 81 (9.88%) and 49 (5.98%) (Table 4, p. 7). The paper attributes all 23 false positives to GPT-4.1 hallucinating and modifying the output when invoking the checker. It attributes 12 of the 18 false negatives to wrong results on semantic constraints, four to checker-generation failure and fallback to LLM-as-a-judge, one to incorrect constraint extraction, and one to hallucination similar to the false positives (Section 5.3, p. 8).

Limitations: semantic results depend on the judging model and inference parameters; the paper says they “are not absolute but with regard to the semantic analysis.” (Section 3.1, p. 3.) The generated checker can be wrong even when it runs, and fallback turns an objective check into an LLM judgment.

## technique 3: synthesize a mixed-constraint benchmark with labeled outputs
Use this to evaluate a verifier rather than a generator. The method is:

1. Select constraint types from instruction-tuning datasets and instruction-following benchmarks; the result is eight logic and two semantic types (Section 4.1, p. 5).
2. For complexity C (the number of constraints, 2 to 10), choose C constraint types, take GPT-4.1-generated values for each, and compute the Cartesian product of the values; if the product exceeds 100 combinations, keep the first 100 (Appendix A.2, p. 13).
3. Concatenate values using per-type prompt templates, with at least one logic and one semantic constraint per instruction (Section 4.1, p. 5; Appendix A.1–A.2, pp. 12–13).
4. Generate SAT outputs with GPT-4.1, feeding checker error messages back until the Python checkers pass; generate UNSAT outputs by mutating the instruction (omitting one logic constraint) and re-prompting until the output violates a constraint. The re-generation budget for both is 5, after which the output is kept as-is (Appendix A.2, pp. 13–14).
5. Check semantic constraints by sampling 10% of the outputs of each complexity group and discussing compliance among the authors (Appendix A.2, p. 13).
6. Store fine-grained violated-constraint labels and evaluate F1, precision, recall, and Pass@1 (Section 4.2, p. 6; Section 5, pp. 6–7).

The paper reports, “Among the 820 data points in V IF B ENCH, 391 (47.68%) of them have sat outputs and 429 (52.32%) have unsat outputs.” (Section 4.2, p. 6.)

Inference: a Verus-oriented benchmark should replace natural-language tone/topic labels with machine-checkable Rust properties, retain mixed constraints, and publish denominators and raw verdict counts so proof failures cannot hide behind a single aggregate score.

What is proved or trusted: the benchmark’s logic labels come from Python checker programs and its semantic labels from sampled inspection and author discussion (Appendix A.2, p. 13); outputs that exhaust the re-generation budget are kept as-is (Appendix A.2, p. 14). Inference: none of this is a mathematical proof of label correctness. NSVIF’s SMT result is trusted conditional on the generated formula, checker code, semantic judge, model API, and Z3 implementation. The paper limits VIFBENCH to English writing tasks and lists multilingual instructions, information retrieval, general question answering, and planning as not covered (Section 8, p. 9).

## technique 4: verifier feedback loop for iterative repair
Use this when an agent can regenerate an output after receiving violated-constraint details. The paper’s travel-agent example uses GPT-4.1 to produce a plan, runs NSVIF, reports each violated constraint, and asks for a revised plan until SAT (Section 5.4, p. 8). In the example, the first plan uses “Italian beef sandwich” for Chicago and fails the vegetarian constraint; the revised plan uses mushroom pizza and is SAT (Figure 5, p. 8).

The paper selected nine VIFBENCH instructions (2 to 10 constraints) that GPT-4.1 had failed to follow; with NSVIF feedback every output became SAT in fewer than five iterations, and five of nine (55.6%) were corrected in fewer than three iterations (Section 5.4, p. 8). With boolean-only feedback (a single unsat result) and a budget of up to 15 iterations, three of nine instructions did not reach SAT, one required 11 iterations, and the remaining five took fewer than three iterations (Section 5.4, p. 8). The sample is nine instructions, so these counts are anecdotal.

Inference: in Verus, expose failing postconditions or counterexample values to the code-generating agent, then regenerate proof annotations and rerun `verus`; do not treat a SAT label as a proof unless the Rust verifier checks the exact artifact. This loop assumes the repair model preserves the original task and that each iteration is independently verified.

## contradictions and numbers
The headline Table 2 comparison uses the same 820-entry VIFBENCH set, but the table does not state raw confusion-matrix counts; Table 4 gives them for GPT-4.1. The 2.80% and 2.20% rates in Table 4 correspond exactly to 23/820 and 18/820. The paper calls the 820 entries “data points” in Section 4.2 and “instruction-output pairs” in Appendix A.2; these are the same denominator. The paper’s “up to 25.7% increase” (Section 5.1, p. 7; Table 2, p. 6) is the difference between GPT-4.1 F1 values 94.8% and 69.1% (25.7 percentage points), not a relative percentage increase. With GPT-4o-mini the sign reverses (37.3% vs 66.6%).

## techniques for the catalog
- constraint decomposition: translate an instruction into per-requirement predicates and a first-order Boolean formula, then solve SAT/UNSAT
- mixed checker generation: classify constraints, generate executable checkers for logic rules, and use model judgments only for semantic rules
- labeled verifier benchmark: synthesize mixed-constraint SAT/UNSAT examples with fine-grained violated-constraint labels and explicit denominators
- verification feedback loop: feed violated constraints back to an LLM and iterate generation until an independently checked SAT result
