# Let’s Reason Formally: Natural-Formal Hybrid Reasoning Enhances LLM’s Math Capability
(authored by agents unless marked 🧑)
Tag: `wang2025reasonformally`, [paper](https://arxiv.org/abs/2505.23703)

## scope and result

Wang et al. propose NL-FL HybridReasoning (NFL-HR), a pipeline that uses a formal-language (FL) reasoner to improve natural-language (NL) mathematical question answering. Its stages are NL-FL Problem Alignment, FL Reasoner Problem Solving with Mixed Problem Input, and Answer Extraction (Fig. 1, p. 2). The input problem asks for an unknown answer; the formal counterpart asks for an existence proof. The extracted answer is not formally verified. Appendix E states, “In this work, we do not integrate the verifiability of FL as a direct mechanism for NL output validation, but as the foundation of the unique formal reasoning capability of the FL reasoner.” (p. 13).

The main experiment uses Qwen3-8B for NL processing, Kimina-Autoformalizer for autoformalization, and Kimina-Prover-Preview-7B as the FL reasoner (§3.2, pp. 5–6). Evaluation uses pass@16: generate 16 answers per question and count a question correct if any answer matches the reference (§3.1.2, p. 5). On AMC (83 questions), NFL-HR reaches 84.34% versus 79.52% for the NL baseline, a 4.82 percentage-point increase. On MATH-500 (500 questions), it reaches 89.80% versus 85.20%, a 4.60-point increase (Table 1, p. 6). The complete evaluation consumes approximately 200 A6000 GPU-hours, with a maximum generation length of 8,192 tokens per query (§3.2, p. 6). These are paper-reported results; the study does not reproduce them.

## technique: QA-to-existence alignment

What it is. A QA prompt asks for a value, but a theorem prover needs a goal. NFL-HR uses few-shot prompting to rewrite the QA problem as an NL existence problem before formalization. Instead of inserting a guessed answer, it asks for the existence of the desired object or representation (§2.1.1, p. 3). The authors explain, “Instead of providing a specific value, this type of problem focuses on establishing the existence of the solution, thus removing the ambiguity.” (§2.1.1, p. 3).

How to apply it. (1) Supply the general LLM with paired QA and existence examples. (2) Supply the target QA problem. (3) Request the existence reformulation in a Markdown code block. The examples cover polar coordinates, a series representation, and a function-value sum (Appendix H.1, pp. 16–17). The prompt concludes, “Based on the above examples, translate the QA problem into an existing problem, then put it in a markdown code block as in the examples.” (p. 17; “existing” is the paper’s wording). Qwen3-8B uses Long CoT thinking mode for this translation (§3.2, p. 5).

Verus form. Inference: preserve the unknown quantity as a witness to construct or an existential specification, rather than putting a guessed value into the contract. Review whether the resulting specification retains the original quantities, constraints, and requested relationship. This is a proposed transfer to Verus, not an evaluated technique in the paper.

Evidence and limits. Without existence alignment, pass@16 falls to 77.11% on AMC and 88.20% on MATH-500, versus 84.34% and 89.80% for NFL-HR (Table 4, p. 7). This ablation also changes the prover’s input: it receives only the autoformalized statement, and answer extraction uses only the FL reasoning segment (§3.6.1, p. 7). Inference: this ablation changes more than the reformulation alone. In a separate experiment, replacing autoformalization and the FL prover with an NL solver of the existence problem yields 53.01% on AMC and 70.20% on MATH-500 (Appendix C.1, Table 6, p. 12).

## technique: autoformalization into a Lean theorem

What it is. Kimina-Autoformalizer converts the NL existence problem into a Lean4 statement (§2.1.2, p. 4). Figure 4 illustrates an existential theorem about a least positive matrix-norm bound. The authors state, “The autoformalization process effectively mitigates the format gap between NL and FL problems, enabling the FL reasoner to indirectly address the QA problem in NL systematically.” (§2.1.2, p. 4).

How to apply it. (1) Pass the reformulated existence problem to the autoformalizer with a mathematics/Lean4 system prompt. (2) Supply an intended theorem name. (3) Request the formal statement. The template begins, “Please combine the following theorems into a more advanced theorem.” (Appendix H.2, p. 17). The example autoformalizer output imports `Mathlib` and ends with `by sorry`, leaving the proof for the next model (Appendix I.2, pp. 22–23).

Evidence and limits. Appendix D reports the autoformalizer’s 66% one-shot accuracy on a 1,000-problem human-curated test set and over 90% Lean4 compilation success, citing the Kimina work (pp. 12–13). These are not NFL-HR’s translation-accuracy measurements on AMC or MATH-500. The case study reports that its example statement compiles despite unnecessary formal-goal elements (§3.7, p. 7). Inference: compilation alone cannot establish that an automatically generated statement faithfully expresses the original problem.

Verus form. Inference: a translator could emit Rust types and Verus assumptions, postconditions, and proof obligations. Review the contract against the question before treating a successful Verus proof as evidence for the requested property. The paper supplies no Verus translation or evaluation.

## technique: mixed NL and FL input to a formal reasoner

What it is. The prover receives the original QA problem and the formal existence statement together. It outputs a Long CoT trace and an FL proof (§2.2, p. 4). The authors report, “During the FL prover’s reasoning process, we observed that it initially resolves the NL question included in the prompt before generating the corresponding FL proof.” (§2.2, p. 4).

How to apply it. (1) Put the original NL question under the problem label. (2) Put the Lean existence theorem under the formal-statement label and repeat the NL question in a Lean comment. (3) Ask the prover to solve the problem step by step in Lean4. (4) Retain the Long CoT trace for answer extraction. The prompt imports `Mathlib` and `Aesop`, opens namespaces, and sets `maxHeartbeats 0` (Appendix H.3, p. 17). The detailed example supplies a statement ending in `by sorry`; the prover constructs a witness and a proof (Appendix I.3, pp. 23–26). The framework does not use proof-checker feedback to validate the extracted NL answer (Appendix E, p. 13).

Evidence and limits. The authors select 23 MATH-500 problems and 7 AMC problems solved by NFL-HR but not the NL baseline in the main experiment. On those selected subsets, NFL-HR solves all items at pass@16, while the NL baseline solves none even at pass@64 (§3.4, Table 2, p. 6). Inference: these results concern the selected subsets and finite sampling budgets; they do not prove that NL reasoning cannot solve the problems. Replacing the expert prover with Qwen3-8B yields 80.72% on AMC and 88.33% on MATH-500 (Table 4, p. 7).

Verus form. Inference: give a generator both the original request and a formal contract when asking for verified Rust. Check their agreement separately: proof success establishes the formal contract, while correspondence to the NL request needs its own review.

## technique: answer extraction and fallback

What it is. A general LLM reads the original question and the prover’s Long CoT trace, then returns an NL answer in `\boxed{}` format (§2.3, Fig. 6, p. 5). Qwen3-8B runs without thinking mode for this stage, but may still produce ordinary CoT reasoning (§§2.3 and 3.2, p. 5). The prompt says, “Find the answer to the following question in the provided long CoT content.” (Appendix H.4, p. 17). It requests a boxed answer, not an answer without explanation; Appendix I.4 shows explanatory calculations before the boxed result (pp. 26–27).

How to apply it. (1) Supply the original question. (2) Supply the prover’s Long CoT content. (3) Request the answer in the specified format. NFL-HR also randomly drops some FL outputs and lets the NL model answer directly (§2.3, p. 5). Appendix F motivates this policy with unsuitable existence formulations, degree/radian inconsistencies, and possible autoformalization failures (p. 13). It does not specify a drop rate or a deterministic failure-detection rule.

Evidence and limits. Table 3 reports averages of 6,310.35 generated tokens for NFL-HR and 5,458.42 for Qwen3-8B across AMC and MATH-500 under pass@16 (p. 7). Inference: subtracting these averages gives 851.93 additional tokens. Appendix C.3 extends the framework to the first sub-question of each of 200 PhysReason-mini problems, replacing images with supplied captions; pass@16 is 26.50% for NFL-HR versus 22.50% for Qwen3-8B (p. 12). Inference: these results do not establish extraction soundness.

Verus form. Inference: extraction could propose a typed answer that is then checked against the intended Verus contract. A fallback without that check would need to be distinguished from a verified result. This adds validation that NFL-HR itself does not provide.

## what is proved, trusted and already done

The paper evaluates a Lean-based reasoning pipeline, not a Verus implementation. Its stated limitation is that “the verifiability of FL is not properly used in the framework” (Limitations, p. 9). The case study reports successful verification of its example proof (§3.7, p. 7), but Appendix E explicitly leaves direct validation or correction of NL answers to future work (p. 13). Inference: translations, extracted answers, and direct NL fallback outputs cannot be treated as formally validated merely because an FL reasoner participated.

Related work includes Lean theorem proving, autoformalization, proof-assistant feedback during training, and formal answer selection (§4.2, p. 8). Inference: a Verus adaptation should distinguish its contribution from these existing uses of formal methods. For agent-written verified Rust, a remaining risk is proving a contract that omits part of the original request.

## techniques for the catalog

- QA-to-existence alignment: reformulate unknown-answer questions as existence or representation proof problems before formalization
- autoformalization: translate the NL existence problem into a Lean4 statement for a formal reasoner
- mixed NL/FL reasoning: give the prover the original QA problem and the formal existence statement together
- answer extraction with fallback: extract a boxed NL answer from the prover’s reasoning, or randomly drop FL output and answer directly with the NL model
