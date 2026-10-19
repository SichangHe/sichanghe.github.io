# Can LLMs Write Correct TLA+ Specifications? Evaluating Natural-Language-to-TLA+ Generation
(authored by agents unless marked 🧑)
Tag: `bisharat2026can`, [paper](https://arxiv.org/abs/2606.05792)
## what is evaluated

The paper evaluates TLA+ specification generation from natural-language comments, alongside completion strategies that also expose reference specification text. The benchmark contains 205 specifications from 98 projects, with comments and optional TLC configurations. The dataset split is 143 training, 31 validation, and 31 test specifications; five test items lacking comments or configurations are excluded, leaving 26 usable tests (Section 3, pp. 3–4). The core experiment covers 25 open-weight models and four strategies: 650 runs per strategy, 2,600 total. Five proprietary models receive few-shot prompting only, adding 130 runs (Sections 1 and 3, pp. 2, 4).

SANY checks syntax with a 30-second timeout and accepts outputs reporting “Parsing completed.” Outputs that pass SANY are submitted to TLC with their configuration file (Section 3, p. 5). TLC checks reachable states in a finite instance; TLAPS, described as background, supports deductive reasoning for infinite-state specifications (Section 2, p. 2). The authors acknowledge that “TLC validation is bounded to finite-state instances, so errors that appear only with larger parameter values remain undetected” (Section 5, p. 11).

The headline rates require their denominators: among open-weight runs, few-shot has the highest aggregate SANY rate, 173/650 (26.6%), and progressive alone has TLC passes, 56/650 (8.6%) (Table 3, p. 5). These are strategy averages across models, not the best individual-model rates. Proprietary models also pass TLC under few-shot: GPT-5 achieves 7/26 (26.9%) and passes SANY on all 26 tests (Table 6, p. 6).

## technique 1: progressive prompting for structured specification synthesis

Progressive prompting uses three few-shot examples and instructional messages about specification structure. The method states: “Each message focuses on a different aspect: module declaration, state variables, operators, and temporal properties.” It then says: “This structure prepares the model before it receives the target comments.” The method does not specify the exact prompts or how outputs are carried between messages (Section 3, p. 4). The discussion describes sequential concerns as module structure, variable declarations, initial predicate, next-state relation, and temporal property (Section 5, p. 10).

The supported procedure is:
1. Use three training examples that pair comments with complete specifications, as in few-shot prompting (Section 3, p. 4).
2. Add instructional messages covering module declaration, state variables, operators, and temporal properties before the target comments (Section 3, p. 4).
3. Generate the target specification and run SANY, then TLC for outputs that pass SANY (Section 3, pp. 4–5).

Progressive produces 162/650 SANY passes (24.9%) and 56/650 TLC passes (8.6%). Its TLC counts include 14/26 for DeepSeek r1:8b, 12/26 for Qwen3:235b, 10/26 for Qwen3:30b, six for GPT-OSS-20b, and four for Phi-4-mini (Section 4.1, p. 5; Table 5, p. 6). The discussion recommends pairing progressive decomposition with a global consistency check because outputs can omit terminators or duplicate headers (Section 5, p. 10). This recommendation is future work, not a separately evaluated repair method.

Inference: For Verus, try staged generation of module structure, executable state, contracts, and proof lemmas. Run `cargo verus` on complete candidates and review whether the contracts express the intended requirements. An additional verifier run after each stage would be an adaptation, not a step established by this paper. A Verus proof and a finite TLC check provide different kinds of assurance.

## technique 2: completion prompting as a controlled baseline

Half-completion supplies comments, configuration, and the first 50% of a specification; the model generates the rest. Fill-in-middle supplies the first 30% and final 30%, separated by a `<FILL>` marker, and asks for the missing middle 40%. Neither uses few-shot examples (Section 3, p. 4). These strategies expose reference code, unlike generation from comments alone.

The paper describes splitting and supplying these regions, then uses the same formal validation pipeline. It also compares the generated target segment with the reference using BLEU, ROUGE-L, edit distance, exact match, and line accuracy (Section 3, pp. 4–5). The method does not specify whether the percentage boundaries are measured in lines, tokens, or characters.

Table 3 reports SANY passes of 80/650 (12.2%) for half-completion and 92/650 (14.2%) for fill-in-middle. Both have zero TLC passes. Mean BLEU and ROUGE-L are 0.062 ± 0.11 and 0.189 ± 0.19 for half-completion, versus 0.077 ± 0.13 and 0.213 ± 0.20 for fill-in-middle. Exact matches number zero and one, respectively (Table 3, p. 5). Infrastructure failures complicate interpretation of the zero TLC rates, as discussed below.

Inference: Use completion as a Verus baseline by keeping a known surrounding implementation and asking for a missing proof or specification region. Compare it with full generation under the same verifier and requirement review. Textual agreement with a reference does not establish that a contract captures the intended property.

## technique 3: formal validation and failure decomposition

The evaluation separates syntax parsing from finite model checking. It also distinguishes infrastructure failures from configuration exceptions: Table 4 labels Module Not Found as infrastructure and Config File Exception as genuine (Section 3, p. 5; Table 4, p. 6). For progressive, it reports 12 Module Not Found errors and 110 configuration exceptions, or 9.8% and 90.2% of the 122 failures tabulated there. For the other strategies, it reports infrastructure proportions of 97.2–99.2% (Table 4, p. 6).

Inference: These figures cannot be treated as a clean decomposition of semantic errors. Table 4's caption gives 455 progressive parsing errors, 122 TLC failures, and 56 passes, which sum to 633 rather than 650. Table 3 instead reports 162 progressive SANY passes, implying 488 parsing failures; 162 minus 56 leaves 106 SANY-passing runs without TLC passes, not 122. Table 4's displayed error rows also do not explain its 650-failure totals for the other strategies. The reported aggregate pass rates remain reportable, but the paper does not establish an internally consistent failure accounting or isolate semantic capability from infrastructure effects.

Inference: For a Verus evaluation, record compilation failures, proof failures, solver timeouts, and dependency or environment failures separately. Preserve the denominator, model, prompt strategy, tool version, and failed artifact for each run. Check that outcome counts sum to the number of runs before comparing methods. A successful proof checks the written specification; requirement review must still assess whether that specification is adequate.

## technique 4: hallucination taxonomy and proposed repair

The paper identifies five recurring categories: Unicode operator substitution; cross-language syntax injection; reasoning and formatting leakage; generation length miscalibration; and structural errors. Examples include Unicode replacements for ASCII operators, semicolons and backticks, `<think>` blocks, excessive or near-empty output, missing `====` terminators, and duplicate or missing `MODULE` headers (Section 4.4, pp. 8–10).

Table 11 distinguishes whole-file scans from SANY's first reported error. Semicolon scans find 82/650 progressive files (12.6%), 49/650 few-shot files (7.5%), 23/650 half-completion files (3.5%), and 22/650 fill-in-middle files (3.4%). The corresponding first-error counts are 25, 18, 11, and 10. Table 11's backtick first-error count is 28 for few-shot; the 5.9% rate uses 477 failed runs as its denominator, not all 650 outputs (Table 11, p. 9; Section 4.2, p. 7).

QwQ includes `<think>` blocks in all 26 half-completion outputs and all 26 fill-in-middle outputs. The paper reports over 243 progressive files without the module terminator. Mean output-to-target length ratios are 3.46× for half-completion and 2.24× for fill-in-middle, with an extreme of 9.84× (Section 4.4, pp. 9–10).

The discussion proposes grammar-constrained decoding, deterministic post-processing such as Unicode normalization and fence removal, and retrieval over verified TLA+ specifications (Section 5, p. 11). Table 11 notes that fill-in-middle already strips Markdown before validation (p. 9). The paper does not evaluate the proposed mitigations as a general repair pipeline.

Inference: For Verus, remove response formatting before verification, and retrieve examples with compatible APIs. Treat any edit to an expression, contract, or proof term as a candidate change requiring verification and requirement review. The paper's attribution of failure categories to training-data biases is an explanation offered by the authors; these experiments do not directly test those training-data causes.

## model selection findings

Model size does not consistently predict success. DeepSeek r1:8b has 14/26 progressive TLC passes versus zero for r1:70b. Qwen3:30b has 23/26 few-shot SANY passes versus 22/26 for Qwen3:235b (Table 5, p. 6). Code-specialized models perform poorly relative to leading general-purpose models; the authors attribute this to negative transfer from mainstream programming-language training (Section 4.3, p. 8).

Inference: Do not extend the size result to every metric or strategy. Table 5 gives DeepSeek r1:8b only one half-completion SANY pass versus three for r1:70b, and both have three fill-in-middle passes. It also gives both LLaMA 3.3 variants 18 progressive SANY passes, contradicting Section 4.3's claim that LLaMA 3.2:1b has the highest LLaMA rate with 12. Use the tabulated comparisons with these limits.

Inference: VL should choose models using proof outcomes on its own Verus tasks. Parameter count and code-specialization labels alone do not establish suitability. These TLA+ results motivate measuring that question rather than answering it for Verus.

## what is proved, trusted, and still missing

The authors run each model–specification pair once per strategy. They acknowledge incomplete measurement of stochastic variation, a community benchmark that may not represent industrial use, varying comment density, finite-state TLC bounds, and uncertain transfer to other formal languages (Section 5, p. 11).

Inference: Parser and finite model-checker outcomes do not independently establish faithful translation of natural-language requirements. Configuration choices, checked properties, bounds, and failures matter to interpreting each pass. For verified Rust, an adequate evaluation must assess the written contract as well as whether its proof succeeds. This paper supports experimenting with staged prompting and explicit outcome accounting; it does not demonstrate reliable autonomous Verus specification generation.

## techniques for the catalog

- progressive specification prompting — use three examples and structural instructions before target comments, then validate the generated module
- two-stage formal validation — parse first, then model-check accepted outputs, while distinguishing infrastructure and configuration failures
- completion baselines — compare half-completion and fill-in-middle with stated context proportions and target-segment metrics
- hallucination taxonomy — distinguish lexical, cross-language, reasoning, length, and structural failures; treat proposed repairs as unevaluated recommendations
- model selection by checked outcomes — compare models using per-strategy pass counts and explicit denominators

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Within DeepSeek R1, the 8B model achieves 14 TLC passes under Prog. while the 70B model achieves none."): checked the complete paper, study quotations, counts, denominators, section and page references, prompting descriptions, limitations, and paper identifier; corrected page references, separated open-weight and proprietary results, removed unsupported procedural details, and marked analytical conclusions as Inference; did not inspect released code or data, rerun experiments, or independently validate the authors' training-data explanations.
