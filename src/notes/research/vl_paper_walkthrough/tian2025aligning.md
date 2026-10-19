# Aligning Requirement for Large Language Model’s Code Generation
(authored by agents unless marked 🧑)
Tag: `tian2025aligning`, [paper](https://doi.org/10.1145/3744916.3764572)

## problem and pipeline

This paper proposes Specine, a specification-alignment workflow for LLM code generation. It extracts a structured description of generated code and uses that description to revise the input specification before another code-generation attempt. The abstract states: “Its key idea is to identify misaligned input specifications, lift LLM-perceived specifications, and align them to enhance the code generation performance of LLMs.” (Abstract, PDF p. 1.)

Specine has three components: misalignment identification uses a coder and tester; specification lifting uses a lifter; specification alignment uses an aligner before regenerating code (Approach §3, PDF pp. 3–5). The motivating Codeforces example has two query types. GPT-4o-mini’s initial code and PairCoder’s repaired code remain logically wrong; adding the “purpose” of the two query types to the aligned specification yields a correct implementation (Motivating Example §2, PDF pp. 2–3).

The evaluation uses four LLMs (DeepSeek-Coder-v1.5, Qwen2.5-Coder, GPT-4o-mini, Gemini-1.5-Flash) and five benchmarks (APPS, APPS-Eval, CodeContests-Raw, CodeContests, xCodeEval). APPS and xCodeEval use 300 sampled problems each; CodeContests variants use 165 test problems (Evaluation Design §4.1, PDF pp. 5–6). All models use max tokens 1024 and temperature 0.8; the maximum iteration count is ten; generated prose is removed by a code sanitizer (Implementation §4.4, PDF p. 6).

## technique 1: identify misalignment with independent tests

What it is. Decide whether to pay for alignment only when initial code appears to misunderstand the input requirement. The coder generates code; an independent tester generates basic, edge, and large-scale test cases from the input specification without seeing the code (Approach §3.1, PDF pp. 3–4).

How to do it, from the paper.

1. Prompt the coder with the input specification and generate initial code (Approach §3.1).
2. Prompt a separate tester with the specification alone to produce JSON test cases covering basic, edge, and large-scale behavior (Approach §3.1, PDF p. 4).
3. Combine specification-provided public tests with tester-generated tests. If the code fails any test, mark the specification as potentially misaligned and activate lifting and alignment; if it passes all tests, return it as final (Approach §3.1, PDF p. 4).
4. Preserve public-test priority because generated tests can be wrong. For each iteration, compare primary public-test pass ratio first and generated-test pass ratio only when the primary ratios tie (Approach §3.3, PDF p. 5).

The paper acknowledges the limitation: “We acknowledge that the LLM-generated test cases may contain partial inaccuracies and cannot guarantee complete correctness.” (Approach §3.1, PDF p. 4.) The trigger is explicit: “If the code fails to pass all test cases, the input specification is deemed misaligned, activating the subsequent components for specification alignment.” (Approach §3.1, PDF p. 4.)

Inference: In Verus, the tester analogue should be an independent contract-obligation generator or property-based harness, while Verus compilation and proof checking provide a stronger executable signal. Do not let generated tests override trusted requirements or proof failures. The paper’s trigger is test failure, not a formal proof obligation, so this transfer is an inference.

## technique 2: lift code into a perceived-specification DSL

What it is. Convert low-level generated code into a structured representation of what the LLM appears to believe, making omissions and conceptual substitutions comparable with the original requirement. The paper explains: “To effectively bridge this semantic gap, we design a specification lifting component that explicitly extracts the LLM-perceived specification from the generated code.” (Approach §3.2, PDF p. 4.)

How to do it, from the paper.

1. Define a requirement DSL with seven fields: Problem Background, Functional Requirements, Input Requirements, Output Requirements, Test Case Examples, External APIs, and Additional Explanation (Approach §3.2, PDF p. 4).
2. Give the lifter the initial code, DSL definition, and instruction to analyze the code exclusively and translate it into the DSL (Approach §3.2, PDF p. 4).
3. Parse the generated DSL into a structured lifted specification (Approach §3.2, PDF p. 4).
4. Compare lifted fields against the input specification to identify missing or changed purpose, inputs, outputs, concepts, examples, and constraints (Approach §3.3, PDF pp. 4–5).

Inference: In Verus, the lifted representation can include inferred state representation, preconditions, postconditions, loop invariants, overflow assumptions, and which lemmas the code appears to rely on. A lifter-generated contract is evidence about model intent, not a trusted specification. The paper does not define Verus syntax or prove the lifter correct.

In the motivating example, direct alignment instructions fail, while lifting helps: “explicitly extracting the LLM-perceived specification (i.e., lifted specification in Figure 1) enables the subsequent generation of correct code.” (Motivating Example §2, PDF p. 3.)

## technique 3: rule-based specification alignment

What it is. Ask an aligner agent to compare the original and lifted specifications, choose one or more predefined requirement ingredients, and append aligned content. The ten rules are Specification Background, Specification Purpose, Key Concepts, Input Requirements, Output Requirements, Examples with Explanations, Edge/Corner Cases, APIs, Error Handling Requirements, and Hints or Tips. Edge/Corner Cases introduces three additional LLM-generated tests; Hints or Tips supplies optional implementation suggestions (Approach §3.3, PDF pp. 4–5).

How to do it, from the paper.

1. Prompt the aligner with the input specification, lifted specification, all ten rule definitions, and the instruction: “Analyze the input specification and the lifted specification to identify misalignment or omissions. Select one or more ingredients from the ten alignment rules to improve the input specification.” (Approach §3.3, PDF p. 5).
2. Generate aligned ingredients and append them to form an aligned specification (Approach §3.3).
3. Regenerate code from the aligned specification (Approach §3.3).
4. Keep the new ingredients only when the hierarchical pass ratio improves; otherwise remove ineffective rules (Approach §3.3, PDF p. 5).
5. Stop early if the code passes all public and generated tests; otherwise stop at the maximum N iterations and return the code with the highest hierarchical pass ratio (Approach §3.3, PDF p. 5).

The hierarchical score first compares public-test pass ratio, then generated-test pass ratio only on ties; this avoids letting noisy generated tests outweigh guaranteed public cases (Approach §3.3). The paper’s case study reports initial private-test pass ratio 0%, 77.56% after Specification Purpose, 80.00% after Input Requirements, no improvement in intervening iterations, and 100.00% after Hints or Tips at iteration six (Discussion §6.1, PDF p. 9).

Inference: For Verus, rules can add domain background, contract purpose, type and ownership constraints, input/output bounds, edge cases, API assumptions, error behavior, and proof hints. Keep a candidate contract only when Verus verification and independently trusted tests improve; a rule’s textual plausibility is not evidence. Use normal Verus constructs such as `requires`, `ensures`, `invariant`, `assert`, and `proof fn` where appropriate; this paper itself supplies no Verus form.

## evidence, ablations, and cost

Across 20 subjects (4 LLMs × 5 benchmarks), the paper reports average relative improvements over the ten baselines ranging from 29.60%–93.55% in Pass@1 and 27.95%–79.12% in AvgPassRatio on average; Wilcoxon tests report all p-values below 2.40 × 10−7 (Results §5.1, PDF p. 6). For example, Table 1 gives Gemini-1.5-Flash Specine Pass@1/AvgPassRatio of 65.33%/78.15% on APPS (300 tasks), 29.33%/65.91% on APPS-Eval (300), 44.85%/56.96% on CodeContests-Raw (165), 36.36%/54.34% on CodeContests (165), and 38.67%/58.42% on xCodeEval (300) (Table 1, PDF p. 7). Pass@1 is the percentage of problems whose code passes all private tests; AvgPassRatio averages each problem’s private-test pass ratio (§4.2, PDF p. 6).

The iteration study evaluates N = 1…10 across all 20 subjects. Specine’s average Pass@1 improvement from N=1 to N=10 is 47.97%, versus 13.27%–45.40% for other baselines; its AvgPassRatio improvement is 37.02%, versus 9.97%–35.87% (Results §5.2, PDF p. 8). Additional iterations increase cost, and the authors explicitly describe an effectiveness–compute tradeoff.

Ablation Table 2 uses all 20 subjects. The paper reports full Specine’s average relative improvements over each variant, rather than the percentage loss from removing a component: 17.59% Pass@1 and 25.12% AvgPassRatio over the variant without public tests (Specine_w/oPTC); 12.41% and 11.84% over the variant without the tester (Specine_w/oT); 14.75% and 12.95% over the variant replacing lifting with test-execution feedback (Specine_wTF); 20.94% and 16.49% over the variant replacing the aligner with random rule selection (Specine_w/oA); and 34.57% and 28.75% over the variant without predefined alignment rules (Specine_w/oAR). The paper states: “Specine demonstrates superior performance compared to Specine𝑤𝑇 𝐹 , achieving average improvements of 14.75% and 12.95% in terms of Pass@1 and AvgPassRatio, respectively.” All variant-comparison p-values are below 1.77 × 10−7 (Results §5.3, PDF pp. 8–9; Table 2, PDF p. 9).

The authors’ manual analysis of 60 failures found 23 caused by poor generated tests and 25 by incorrect aligner-rule application; 12 involved inaccurate lifted specifications (Discussion §6.1, PDF pp. 9–10). Generated-test accuracy is only 60.17%–72.92% on average across models and benchmarks (Discussion §6.3, PDF p. 10). Inference: These results support treating tester, lifter, and aligner outputs as fallible signals.

## what is proved, measured, and relevant to VL

Specine measures private-test correctness (Pass@1 and AvgPassRatio), time and token overhead, iteration behavior, and component ablations. Inference: The reported test results establish neither specification equivalence nor soundness of lifted requirements; generated-test accuracy is assessed empirically. The authors repeat Specine’s experiments three times across 20 subjects; standard deviations are 0.008 for Pass@1 and 0.022 for AvgPassRatio, and all cross-run Wilcoxon p-values exceed 0.55 (Threats to Validity §7, PDF p. 11).

Inference: VL should not redo the generic result that explicit requirement repair can improve ordinary code generation. It should adapt the lift-and-align loop to Verus contract synthesis, but make Verus proof checking and trusted domain specifications acceptance criteria. Inference: the threat to agent-written verified Rust is high when a model’s perceived contract silently omits an invariant; it is reduced when the lifted contract is reviewed, aligned against the original requirement, and then checked by Verus plus independent tests. Inference: The reported failure counts support independently checking generated tests and alignment outputs.

## techniques for the catalog

- misalignment identification — use independent public and generated tests to decide whether deeper specification repair is needed
- specification lifting — translate generated code into a structured DSL of perceived requirements for comparison
- rule-based alignment — add selected background, purpose, input, output, examples, edge, API, error, and hint ingredients
- hierarchical iterative search — retain aligned specifications only when trusted public-test ratio, then secondary ratio, improves
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "For the specification lifting component, existing agent-based code generation techniques typically rely on the coarse-grained execution results of test cases as feedback to repair incorrect code."): checked the full paper, quotations, numbers, references, technique steps, tag, and DOI; corrected the test-failure trigger, page references, ablation percentage direction and variant name, iteration stopping rule, and inference labels; did not reproduce experiments or inspect source code or datasets.
