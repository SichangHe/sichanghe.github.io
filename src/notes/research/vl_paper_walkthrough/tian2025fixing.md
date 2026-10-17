# Fixing Large Language Models' Specification Misunderstanding for Better Code Generation
(authored by agents unless marked 🧑)
Tag: `tian2025fixing`, [paper](https://arxiv.org/abs/2309.16120)


## scope and result

The paper introduces µFiX (Misunderstanding FiXing), a prompting pipeline for code generation. Its target is a mismatch between a natural-language programming specification and the interpretation used by an LLM. The pipeline first improves the interpretation before code generation, then uses execution feedback to repair the remaining mismatch. The authors state: “In this work, we propose a novel prompting technique, called µFiX, to improve the code generation performance of LLMs by devising both sophisticated thought-eliciting prompting and feedback-based prompting and making the first exploration on their synergy.” (Abstract, p. 1)

The paper's worked example (HumanEval #84, Figure 1, p. 3) has the specification “Given a positive integer N, return the total sum of its digits in binary” and the test `solve(1000) == "1"`. The initial understanding sums the digits of 1000's binary form (6), while the adjusted understanding sums the decimal digits (1 + 0 + 0 + 0) and converts that sum to binary. The authors note that “the initial understanding is incorrect even though the expected output shown in the understanding is correct” because the output is leaked by the test (Section III-B, p. 4).

## technique: test-case-driven understanding repair

what it is

µFiX makes test cases part of specification interpretation. It elicits a structured explanation of each test, checks that explanation by hiding the expected output, and asks the LLM to repair an explanation that predicts a different output. The paper divides this phase into “initial understanding generation, correctness checking of the understanding, and misunderstanding fixing.” (Section III-B, p. 4)

when to use it

Use it when a specification contains executable examples or when reliable examples can be generated. The authors note that test cases are prevalent in practice, including in HumanEval and APPS (Section I, p. 2). For a specification without tests, their µFiXwoT variant has the LLM generate three tests first. The paper reports that in some cases where µFiXwoT underperformed µFiX, the generated tests “covered only one branch mentioned in the specification or even contained errors” (Section VI-B, p. 10).

how to do it

1. Give the specification and tests to the LLM with a fixed format: “Let's analyze the test case step by step. You MUST follow the format: "The input is <?>. The output is <?>. Analysis: <?>. Therefore, the expected output is <?>."” (Figure 3, p. 5). The model fills in the input, output, analysis, and expected output.
2. Check the explanation independently of its copied answer. Mask the expected output and ask the model to infer it from its own analysis: “Based on the initial understanding, please provide the expected output for the test case. You MUST follow the format: "Therefore, the expected output is <?>."” (Figure 4, p. 5). In the example, the inferred output is "110" rather than "1". The authors explain: “If the inferred output differs from the expected output, it indicates an incorrect specification understanding.” (Section III-B, p. 4)
3. On a mismatch, prompt a refinement, for example: “The above understanding is incorrect. Please provide the correct analysis...” (Section III-B, p. 4). Repeat until the check passes or the number of refinements reaches the threshold `N`. The paper says passing “cannot guarantee that LLMs completely understand the programming specification” because specifications carry few tests (Section III-B, p. 4).
4. Insert the refined explanation into the original specification and ask for the implementation, with the additional instruction “Please implement the function in a markdown-style code block (pay attention to the specification understanding)” (Section III-C, p. 4).

verus form

Inference: represent each example as a Verus executable test or a proof lemma whose `ensures` states the expected result. Keep the production function executable and give it a contract, for example `requires 0 <= n <= 10000` and `ensures |result| == 1` only when that is the actual requirement. Use a `proof fn` to establish arithmetic facts about the example, and use `assert` or `assert forall|...|` in proof code to expose the intended computation. Verus cannot check an LLM's natural-language “understanding”; the check must become a mathematical postcondition or a test harness. Do not use `ensures` on a `spec fn`, and do not call proof functions at run time. The paper's prompt iteration therefore transfers as an external orchestration loop that edits contracts or proof text, while the final acceptance signal is Verus verification rather than test-output agreement.

what shows it works

The evaluation uses ChatGPT (gpt-3.5-turbo-0613) and DeepSeek-Coder (6.7B-Instruct) on six benchmarks: HumanEval, HumanEval+, HumanEval-ET, MBPP-ET, APPS, and APPS-ET, comparing 15 prompting baselines (Sections IV-A, IV-B, IV-D, pp. 6–7). Table I reports ChatGPT µFiX Pass@1 values of 90.24%, 80.49%, 79.88%, 69.10%, 35.67%, and 10.33% in those six columns (Table I, p. 8). Pass@1 is the percentage of problems whose single generated program passes all evaluation tests (Section IV-C, p. 6). The problem sets are 164 HumanEval problems (also used by HumanEval+ and HumanEval-ET), 974 MBPP-ET problems, and 300 problems randomly sampled from the APPS test data (also used for APPS-ET) (Section IV-B, p. 6). Table II reports DeepSeek-Coder values of 83.54%, 78.66%, 75.00%, 63.35%, 14.00%, and 5.00% on the same six benchmarks (Table II, p. 8). The paper reports “the average improvement of µFiX over all 15 compared techniques is 35.62%∼80.11% in terms of Pass@1” across all subjects (Section I, p. 2).

Ablations isolate the two phases. On ChatGPT and the same six benchmarks, µFiX improves over µFiXwoF (feedback phase removed) by an average 10.25% Pass@1 and 9.65% AvgPassRatio; over µFiXSR (its feedback phase replaced by Self-repair) by 5.26% and 5.40%; over µFiXSCoT (its thought-eliciting phase replaced by SCoT) by 12.03% and 10.74%; and over µFiXwoS (self-improvement removed) by 17.15% and 10.72% (Section V-B, p. 8). Wilcoxon signed-rank tests report all p-values below 1.39e-4 for the variant comparisons (Section V-B, p. 9).

The default thresholds are `N=1` refinement and `M=1` adjustment, with decoding temperature `T=0.7`. Setting `N=M=2` raises average Pass@1 by 4.46% and AvgPassRatio by 4.03% across both LLMs and six benchmarks, but takes 44.54% more time and 40.94% more tokens (Section V-C, p. 9). Using all available specification tests (the default, labelled “3+”), ChatGPT µFiX reaches 90.24% Pass@1 on HumanEval, 80.49% on HumanEval+, and 79.88% on HumanEval-ET; with one test those values are 82.32%, 75.61%, and 73.17% (Table V, p. 10). With three LLM-generated tests in place of specification tests, µFiXwoT exceeds SCoT+Self-repair by 5.61% Pass@1 and 5.64% AvgPassRatio on those three benchmarks (Section VI-B, p. 10).

## technique: execution-feedback understanding adjustment

what it is

The second phase addresses the gap between the explanation given to the model and the interpretation it actually uses to generate code. If generated code fails the specification tests, µFiX summarizes that code, compares the summary with the refined explanation, and adjusts the explanation before generating new code. The abstract says: “µFiX further fixes the specification understanding towards the direction reducing the gap between the provided understanding (from the first phase) and the actual understanding implicitly utilized by LLMs for code generation” (Abstract, p. 1).

how to do it

1. Generate code from the refined understanding and execute the specification's tests; this phase runs only if the code fails them (Sections III-A and III-C, p. 4).
2. On failure, estimate the understanding the LLM actually used by code summarization: the Summarization Prompt gives the generated code and the tests and asks for the same test-analysis format; the output is called the “summarized understanding” (Section III-C, p. 5; Figure 5, p. 6).
3. Compare the summarized understanding with the refined understanding. In the paper's example the comparison “implies that LLMs just capture some keywords (e.g., digits, binary, and sum) but fail to understand the logic among keywords” (Section III-C, p. 5).
4. Ask the LLM to rewrite the refined understanding so that it reduces the gap, e.g. by highlighting content the summary missed (Section III-C, p. 5). The Adjustment Prompt contains the refined understanding, the generated code, the test execution result, the summarized understanding, and the instruction “Given the correct <Refined Understanding>, the <Initial Code> is generated incorrectly, leading to an incorrect <Summarized Understanding>. Please regenerate a more accurate analysis of the test case for generating correct code.” (Figure 5, p. 6)
5. Generate new code with the adjusted understanding and repeat until the code passes the tests or the number of adjustments reaches the threshold `M` (Section III-C, p. 5). The paper says “both fixing components are not simple regeneration” and that they “provide counter-factual evidence (e.g., historical incorrect cases and their explanations) as feedback to LLMs” (Section III-C, p. 5).

verus form

Inference: compile the summarized behavior into a candidate contract or lemma, then ask Verus to verify the implementation against the original contract. A failed verification obligation, counterexample, or failing executable test supplies the feedback. The repair loop can edit the contract explanation, add a missing invariant, or add a proof lemma; each change must still be checked by Verus. Code summarization is not a sound semantic extractor, so it is only a heuristic diagnosis. The trusted result is the verifier's proof of the unchanged specification, not agreement between two LLM-generated descriptions.

what shows it works and limits

µFiX averages 22.75 seconds and 3.44K tokens per programming task, versus 20.61 seconds and 3.31K tokens for SCoT+Self-repair and 5.78 seconds and 0.29K tokens for zero-shot (Section VI-A, p. 9). The authors state that checking understanding is not sound: “Achieving optimality in semantic analysis is generally undecidable.” and “there does not exist a decision procedure to check if an LLM correctly understands a specification” (Section VI-D, p. 10). Their actual check is test execution on the downstream generated code (Section VI-D, pp. 10–11). The threats they list include generalizability, LLM randomness, and untuned prompt wording (Section VII, p. 11); test quality is discussed in Section VI-B (p. 10). Three repeated runs on HumanEval, HumanEval+, and HumanEval-ET produced Pass@1 standard deviations of 0.009 for µFiX and 0.021 for SCoT+Self-repair (Section VII, p. 11). Inference: this reduces but does not remove sampling uncertainty.

## what is proved, trusted, and relevant to VL

The paper measures generated-code test success; it does not prove semantic equivalence to an informal specification. Inference: the test suite, LLM, prompt templates, code execution environment, benchmark labels, and the implementation of the prompting controller are trusted. The test checker can miss behavior outside its examples, and generated tests can encode the same misunderstanding they are meant to detect. For VeruLaw, the closest reusable idea is a staged repair controller that turns concrete counterexamples into clarified contracts and proof obligations before asking an agent to write Rust. A Verus proof gives stronger evidence than µFiX's test pass, but it still assumes the contract states the intended requirement and that external bodies and libraries have suitable specifications. The paper's benchmark gains therefore indicate a useful interaction pattern, not evidence that agent-written verified Rust is safe by itself.

## techniques for the catalog

- test-case-driven understanding repair — elicit a structured test explanation, mask and re-infer the expected output, then refine mismatches up to `N`
- execution-feedback understanding adjustment — summarize failing code, compare it with the refined explanation, adjust the explanation, and regenerate up to `M`
- test generation fallback — generate three tests when a specification has none, while treating test quality and branch coverage as limitations
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Due to the limited computational resource and evaluation time cost, we selected ChatGPT as the representative LLM for the ablation study, as it achieves the best effectiveness with µFiX (in Tables I and II)."): read all 930 lines of the paper text; checked every quotation, number, table value, section and page reference, and technique step. Changed: removed "(Misunderstanding FiXing)" that was inserted inside the abstract quote; moved the 35.62%–80.11% figure from "Abstract" to Section I, p. 2; corrected page numbers (implementation instruction p. 4, counter-factual sentence p. 5, ablation p-values p. 9, Section V-C p. 9, Figure 5 p. 6); replaced the claim that every denominator is the full benchmark with the actual problem counts (APPS uses 300 sampled problems); fixed adjustment step 4, which said the understanding is adjusted toward the summarized behavior, whereas the paper's prompt treats the summary as incorrect and regenerates a more accurate analysis; replaced the paraphrased worked example with the specification's words; added the µFiXSCoT ablation; marked own conclusions "Inference:". Not checked: the Verus statements (they are the author's inference, not from the paper), the project homepage results, and the venue/year in the tag (the paper text gives only arXiv v3, 19 Dec 2024).
