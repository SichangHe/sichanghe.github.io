# Beyond Code Generation: Assessing Code LLM Maturity with Postconditions
(authored by agents unless marked 🧑)
Tag: `he2024beyond`, [paper](https://arxiv.org/abs/2407.14118)

## purpose and benchmark

He, Zhai, and Pan propose evaluating code LLMs by generating formal postconditions from code context and natural-language descriptions. They argue that ordinary code-generation benchmarks miss capabilities needed for code understanding and specification writing: “Postcondition generation requires LLMs to not only understand the semantics of the code and the accompanying natural language description but also to generate precise and unambiguous postconditions in programming languages.” (Introduction, pp. 1–2). They augment EvalPlus, whose 164 problems include code context, a signature, comments, a canonical solution, and legal test inputs (Section 5.1, p. 6): “In total, we compiled 1,293 buggy code mutants, averaging approximately 8 bugs per problem.”

The paper defines Coverage@k as “the probability of obtaining at least one correct postcondition in a sample of k responses” and Correct Postcondition Count (CPC) as “the total number of problems for which the LLM has generated entirely correct postconditions” (Section 5.1, p. 6). Bug Detection Rate (BDR) is “the percentage of buggy code mutants that are accurately identified by the postconditions”; Bug Coverage Rate (BCR) is “the proportion of test problems where the LLM-generated postconditions collectively identify all present bugs” (Section 5.1, p. 7). Inference: these denominators must stay separate when adapting the evaluation to Verus; success on sampled inputs does not establish universal correctness.

## technique 1: postcondition taxonomy and maturity levels

What it is. Table 1 (p. 3) lists ten categories: Type, NULL, Boundary, Equality, Arithmetic Bounds, Boolean Condition, String Format, Container Element, Container Property, and Other. Table 2 (p. 4) maps Level 1 to type and NULL checks, Level 2 to boundaries, arithmetic bounds, Boolean conditions, and container properties, Level 3 to container elements and equality, and Level 4 to all types. Section 4.1 describes Level 0 as lacking fundamental understanding and says of Level 4: “Achieving Level 4 indicates the LLM’s ability to handle the full range of postcondition types with complete accuracy and precision.” (p. 5).

How to apply it. Section 3 says: “In particular, type, NULL, boundary, and equality postconditions can be applied to all variables.” Other categories depend on variable types (p. 3). Inference: use the taxonomy to organize candidate checks and report results per category; use the maturity mapping as the authors’ proposed interpretation of those results. The paper does not specify numerical thresholds for assigning maturity levels.

Verus form. Inference: express output properties as `ensures` clauses over Rust values, with helper `spec fn`s where needed. Rust types may already enforce some type checks, and optional values need predicates appropriate to their representation. Input assumptions belong in `requires`; an output postcondition should not be moved there. A Level 4 result on this benchmark would not establish complete specifications for stateful or concurrent Rust.

Evidence. Table 4 (p. 8) reports Gemma-v1.1-7b-it results for 164 Type, NULL, Boundary, and Equality problems, 56 Arithmetic Bounds problems, 28 Boolean Conditions problems, 30 String Format problems, and 50 problems for each container category. Boundary C@5 is 100.00% with CPC 164; Equality C@5 is 34.15% with CPC 56. Boolean Conditions C@1 is 41.43%, while CPC is 22 out of 28. Inference: CPC counts and C@1 probabilities must not be substituted for each other.

## technique 2: few-shot postcondition prompting

What it is. Section 4.3 (p. 5) states: “The prompt consists of five components: an instruction, guidelines, detailed response format, few-shot examples, and a natural language description of the targeted program.” Appendix A’s template (Figure 3, p. 15) says: “When writing the postconditions, only use the function's input parameters and a hypothetical return value variable, which we will assume is stored in a variable named return_val.”

How to apply it. Figure 3 supplies code context, a function stub, and a comment; limits external calls to pure functions from the language’s functional subset; and requests a fenced list of assertions. Its third guideline says: “Avoid using logical operators "and" in the assertion. Simplify the expression by breaking it down into smaller, more manageable parts.” Section 5.1 (p. 7) compares zero-, one-, and three-shot prompts: “For each problem in the EvalPlus dataset, we generated responses five times per prompt for each LLM model.” The sampling temperature is 0.7. The paper does not describe deduplicating generated assertions.

Verus form. Inference: replace `return_val` with the Rust result variable in an `ensures` clause, and use `spec fn`s or existing Verus specifications for helpers. Rust-specific examples would be needed for ownership, borrows, and quantified collections.

Evidence. For Gemma-7b-it, Table 3 (p. 7) reports C@1 of 47.44%, 98.54%, and 99.76% for zero-, one-, and three-shot generation. Their CPC values are 117, 164, and 164, respectively, over 164 problems. Inference: the zero-shot CPC count 117/164 is not the reported C@1 of 47.44%; neither metric establishes a verifier-checked universal contract.

## technique 3: category-based decomposition

What it is. Section 4.2 (p. 5) says: “For each postcondition category, we use a more specific prompt that explicitly instructs the LLMs to generate postconditions of that particular category.” Section 4.4 (p. 6) requests Type, NULL, Boundary, and Equality for every program and selects arithmetic, Boolean, string, and container checks according to variable types. Specialized prompts retain the five components while changing guidelines and examples.

How to apply it. Generate category-specific responses, extract assertions, and filter for the requested category. Appendix B (p. 16) describes keyword matching followed by human review: “Then, we conduct manual judgment on the results to make them more in line with our expectations.” Table 5 lists category keywords. Section 5.1 (p. 7) combines category outputs and also evaluates a combination with three-shot outputs: “Lastly, we also combine the results of 3-shots and category-based generation for further evaluation.”

Verus form. Inference: generate candidate `ensures` clauses per category, check them with Verus, and review whether they cover the intended behavior. Individually provable clauses can still omit required behavior.

Evidence. Table 3 (p. 7) reports category-based BCR of 18.90%, 31.72%, and 29.88%, and BDR of 60.23%, 72.31%, and 75.56%, for Gemma-7b-it, Gemma-v1.1-7b-it, and Mistral-7B-Instruct, respectively. The combined three-shot plus category-based approach reaches BCR 34.15% for Gemma-v1.1-7b-it and BDR 77.42% for Mistral-7B-Instruct. BCR uses 164 problems; overall BDR uses 1,293 mutants. Section 5.4’s category-based BDR upper bound of 77.42% conflicts with Table 3, where that value belongs to the combined approach; these figures follow the table.

## technique 4: mutation-based completeness evaluation

What it is. Section 5.1 (p. 6) uses Gemma-7b-it and Mistral-7B-Instruct-v0.2 at temperature 0.9 to insert bugs: “Each problem underwent at least 50 iterations of bug insertion, retaining only those mutants that failed the test sets.” It then says: “Subsequently, we removed duplicates among the failing mutants that exhibited identical failures across the same test cases.” The retained set contains 1,293 buggy mutants. Inference: matching observed failures does not establish semantic equivalence between mutants.

How to apply it. Reproduce the bug-insertion, failing-mutant selection, and failure-pattern deduplication procedure; evaluate generated postconditions using BCR and BDR as defined in Section 5.1. Inference: an adaptation can test candidate postconditions against canonical and mutant implementations on legal inputs, treating a concrete violation by a mutant as a detection. The paper does not fully specify this execution procedure or a deductive verification procedure.

Verus form. Inference: mutate Rust implementations while preserving input assumptions and check the candidates with Verus. A failed proof alone does not establish a behavioral violation; distinguish confirmed mutant violations from proof failures that remain unresolved.

Evidence and limits. The paper’s limitations (p. 9) say its taxonomy “may not cover all possible scenarios and edge cases encountered in real-world programming tasks, limiting generalizability”; its approach “relies heavily on few-shot examples”; and “evaluations are limited to a selection of open-sourced LLMs”. Inference: mutation scores depend on mutant diversity and cannot establish that a specification covers all intended behavior.

## what is proved, measured, and trusted

The reported evaluation measures generated postcondition correctness and mutant detection through C@k, CPC, BCR, and BDR (Section 5.1, pp. 6–7). Section 5.2 states that three-shot and category-based generation produced “at least one correct postcondition for each problem in EvalPlus” (p. 7). Table 3 reports CPC 164 for both approaches across all three models and leaves category-based C@k entries blank. Inference: those statements are compatible; CPC 164 does not assert that every sampled response is correct. The paper does not present deductive proofs of generated postconditions. Inference: reproducing the results depends on the canonical solutions, legal tests, handwritten examples, mutant selection, and manual category filtering.

## implications for VL

Inference: VL can reuse the taxonomy, category-specific prompts, assertion format, and mutation metrics as a specification-generation benchmark. Verus acceptance should be a separate prerequisite check, and specification completeness still needs review. The best combined BCR is 34.15% over 164 problems, and the best combined BDR is 77.42% over 1,293 mutants (Table 3, p. 7). Inference: these results support evaluating specification strength separately from whether any correct condition was generated. The paper does not evaluate Verus or establish results for Rust ownership, concurrency, unsafe code, or external effects. A VL adaptation should measure those additional capabilities explicitly.

## techniques for the catalog

- postcondition taxonomy — classify assertions into ten categories and interpret results with the proposed maturity levels
- few-shot assertion prompting — provide instruction, rules, format, examples, and target descriptions, then sample assertion responses
- category decomposition — request applicable categories separately, filter with keywords and manual review, and combine outputs
- mutation completeness — generate failing mutants and report per-problem all-bug coverage and per-mutant detection
- denominator-separated metrics — keep C@k probabilities, CPC problem counts, BCR over problems, and BDR over mutants distinct

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This suggests that the model may need multiple attempts to generate correct postconditions for these categories."): checked the entire paper, study quotations, numbers, method descriptions, section and page references, and catalog; corrected the paper link, metric denominators, category-based BDR, limitations page, unsupported method details, and Verus inferences; did not reproduce experiments, inspect repository code, or validate Verus adaptations.
