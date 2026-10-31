# The Promise and Limits of LLMs in Constructing Proofs and Hints for Logic Problems in Intelligent Tutoring Systems
(authored by agents unless marked 🧑)
Tag: `tithi2025promise`, [paper](https://doi.org/10.1016/j.caeai.2025.100490)

## what the paper evaluates

The study evaluates four LLMs on propositional-logic proof construction and selects one for next-step hints. It uses 310 Symbolic Propositional Logic (SPL) problems and 48 Logic Tutor (LT) problems, with complete stepwise proofs and a structured solution in JSON requested (Section 3, p. 2). It also extracts student problem-solving states from all solution attempts to 18 problems each by 30 students in Fall 2024 and generates hints for 1,050 states (Section 3, p. 2; Section 4.2, p. 5). The abstract reports: “Results show that DeepSeek-V3 achieved superior performance with upto 86.7 % accuracy on stepwise proof construction” (Abstract, p. 1; the paper prints “upto”). Inference: this is evidence about propositional-logic tutoring prompts, not evidence that an LLM can write sound Verus proofs.

## technique 1: proof construction with controlled prompting

what it is: prompt an LLM with premises and a conclusion, require a complete step-by-step proof and structured JSON, and vary the prompt strategy. Models are Llama-3-70B-Instruct, Gemini-Pro, GPT-4o, and DeepSeek-V3, all at temperature 0.1 (Section 3.1, p. 3).

when to use it:

how to do it:
1. provide the premises and target conclusion
2. include output-format instructions for complete steps and JSON
3. choose one of the six prompt strategies below
4. split each dataset into 35% validation and 65% test with random seed 42
5. refine prompts on validation for accuracy and parser-error reduction until accuracy plateaus
6. freeze the prompt and run it only on the test set
7. use the tutor’s logic checker to verify each generated step

The paper says, “For each dataset, we split the data into validation (35 %) and test (65 %) sets using a fixed random seed (42) to ensure reproducibility.” (Section 3.2, p. 4). It also states: “The built-in logic checker in the logic tutor automatically verified the correctness of all LLM-generated proof steps and hints, ensuring relevance within the tutor context.” (Section 3.3, p. 4). Inference: this checker is the soundness boundary for the reported proof-step accuracy, not the LLM.

## technique 2: six prompt strategies

The following strategies are described in Section 3.1 (pp. 3–4) and Table 1 (p. 4). Each few-shot strategy uses the first two tutor examples (Section 3.2, p. 4; Appendix A, p. 7).

- zero-shot (ZS): request step-by-step solutions without examples
- few-shot plan-and-solve: provide two examples demonstrating decomposition into subgoals and address each subgoal in turn
- few-shot chain-of-thought (FS_CoT): provide examples demonstrating intermediate reasoning steps
- few-shot logical dual CoT (FS_L_DCoT): show direct and indirect proof paths and cross-verification
- few-shot bidirectional logical dual CoT (FS_BL_DCoT): combine premise-to-conclusion and conclusion-to-premise chaining
- few-shot tree-of-thought CoT (FS_ToT_CoT): include prompt examples in which three experts debate steps, acknowledge mistakes, and refine derivations; the described reasoning branches are pruned when an expert acknowledges a mistake

The paper defines plan-and-solve as a “problem decomposition–recomposition strategy” (Section 3.1, p. 3). It explains: “We added examples in the prompt where three experts collaboratively debated each step, acknowledged and corrected mistakes, and refined their step derivations.” (Section 3.1, p. 4). Inference: this is a prompting technique, not evidence of a separately implemented search controller. A Verus adaptation could generate candidate proofs and invoke Verus on each.

The proof benchmark contains 358 problems total (310 SPL + 48 LT). Table 3 reports per-dataset accuracy for each model and prompt; DeepSeek-V3 with FS_ToT_CoT reaches 85.0% on LT and 86.7% on SPL (Table 3, p. 5). The denominator is generated proof steps, not problems, and the paper does not print the step count for each cell. Inference: the percentage must not be interpreted as 86.7% of complete proofs.

## technique 3: rule-checked next-step hint generation

what it is: convert each student state into text, prompt DeepSeek-V3 with FS_CoT for a next step and conceptual explanation, then run the modified logic checker. The authors selected FS_CoT because it achieved comparable accuracy with simpler prompting than bidirectional dual CoT and tree-of-thought CoT. Their correctness criterion was: “A modified version of the LT logic checker was used to evaluate correctness, with any hint considered to be incorrect if the step was logically incorrect, the suggested step was already present in the student solution, or if the parent steps were not yet derived.” (Section 4.2, p. 5).

how to do it:
1. extract snapshots after each student step from interaction logs
2. convert the graphical state to natural language
3. include givens, conclusion, and current progress in the prompt (Fig. 3, p. 4)
4. generate a next-step hint plus conceptual explanation
5. check logical correctness, reject a repeated step, and require that parent steps already exist
6. mark it correct only when the checker accepts it
7. evaluate explanations for consistency, clarity, justification, and subgoaling

The study generated hints for all 1,050 states and reports 75% correct/accurate hints (Section 4.2, p. 5). The paper reports that hint accuracy declined across the training levels “from 87.9 % to 63.2 %” (Section 5, p. 6). Inference: these denominators are states at each level; the paper does not give their counts, so the percentages cannot be converted into counts. Hints averaged 4.5 unique hints per problem versus 3.0 for the tutor’s historical-data mechanism (Section 4.2, p. 5); the unit is unique hints per problem, not correctness.

## technique 4: rubric-based explanation review

what it is: two experts with 2–4 years of experience as teaching assistants and researchers in logic and ITS rate explanations on consistency, clarity, justification, and subgoaling; the rubric is refined with an instructor (Section 3.3, p. 4). Only 20% of generated explanations are human-rated (Section 6, p. 7).

when to use it: Inference: use these dimensions when a formally valid next step still needs pedagogical context. Analogous review of Verus proof explanations can assess readability, but cannot replace machine checking.

how to do it:
1. stratify unique solution states by problem and sample 20% per problem using seed 42 (Section 3.3, p. 5)
2. have two experts independently rate the 210 sampled explanations on each dimension from 1 to 4, where 4 is best
3. compute Spearman correlation and quadratic weighted Cohen’s kappa between the experts
4. apply an LLM grader with the same rubric to the sample and compare its scores with expert ratings (Section 4.3, p. 6)

Table 6 reports human–human Spearman correlations from 0.77 to 0.93 and quadratic weighted kappa from 0.79 to 0.92 (Section 4.3, p. 6). Human mean ratings were 3.90 for consistency, 3.09 for clarity, 2.24 for justification, and 1.66 for subgoaling (Table 6, p. 6). The authors qualify the sampling limitation: “The human evaluation of hint explanations covered only 20 % of the dataset, potentially limiting generalizability; and although we evaluated 4 criteria for hint explanations, other pedagogical elements may be important for human understanding and learning.” (Section 6, p. 7). Inference: explanation quality evidence is narrower than the 75% machine-checked hint accuracy.

## what stays trusted and what fails

The paper’s proof task measures single-step accuracy (Section 6, p. 7). It reports difficulty with negation and implication (Section 5, p. 6). It excludes o1 and DeepSeek-Reasoner because they were considered impractical for classroom deployment (Section 3.1, p. 3).

## techniques for the catalog

Inference: these are reusable adaptations of the paper’s methods.

- checker-first proof generation — prompt an LLM for structured steps and validate every step with a domain rule checker
- plan-and-solve prompting — decompose a proof into subgoals, solve them, and recombine the derivation
- dual and bidirectional reasoning — generate direct, indirect, forward, and backward proof paths for cross-checking
- tree-of-thought prompting — demonstrate multiple reasoning threads, their corrections, and abandoned paths in prompt examples
- state-conditioned hinting — convert a current proof state into text and generate a dependency-valid next step
- rubric explanation review — rate consistency, clarity, justification, and subgoaling separately from formal correctness
