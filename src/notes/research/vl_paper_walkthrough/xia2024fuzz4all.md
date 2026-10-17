# Fuzz4All: Universal Fuzzing with Large Language Models
(authored by agents unless marked 🧑)
Tag: `xia2024fuzz4all`, [paper](https://doi.org/10.1145/3597503.3639121)

## what the paper establishes

Inference: Fuzz4All treats an LLM as a language-agnostic input generator and mutator for systems under test (SUTs) that consume programming or formal languages. The abstract states: “This paper presents Fuzz4All, the first fuzzer that is universal in the sense that it can target many different input languages and many different features of these languages.” (Abstract, p. 1)

The evaluation covers nine SUTs taking six languages: C, C++, SMT2, Go, Java, and Python (Abstract, p. 1; Table 1, p. 7). Fuzz4All detected 98 bugs, of which 64 were confirmed by developers as previously unknown; Table 5 splits the 98 into 64 confirmed unknown, 26 confirmed known, 6 pending, and 2 won't fix (§5.4 and Table 5, p. 10). Inference: These are testing results, not proofs of SUT correctness.

## technique: black-box autoprompting

What it is and when to use it. Autoprompting distills arbitrary user input (documentation, example code, or specifications) into a concise prompt for the generation LLM. The paper says: “The input to Fuzz4All are user-provided documents describing the SUT, and optionally, specific features of the SUT to focus on” (§1, p. 2). Use it when the user input is long, redundant, or partially irrelevant (§3, p. 3). Inference: It also fits a new feature for which no hand-written grammar exists.

How to do it.

1. Provide `userInput` and an integer `numSamples` (Algorithm 1, p. 4); user input may be technical documentation, example code, specifications, or combinations of these (§3.1, p. 4).
2. Give the distillation LLM (GPT4 in the paper) the instruction: “Please summarize the above information in a concise manner to describe the usage and functionality of the target” (§3.1.1, p. 4).
3. Generate one candidate with greedy sampling at temperature 0, then sample candidates at temperature 1 until `numSamples` candidates exist (Algorithm 1 and §3.1.1, p. 4).
4. For each candidate, have the generation LLM produce multiple code snippets and score the candidate by the number of unique generated snippets that are valid, i.e., accepted by the SUT; the default score is the sum of `isValid(c, SUT)` over generated snippets `c` (§3.1.1, p. 5). The implementation samples four candidate prompts and generates 30 fuzzing inputs for each (§4.1, p. 6).
5. Select the highest-scoring candidate as the initial input prompt (Algorithm 1, line 7). In the paper's `std::expected` example, cppreference documentation of 498 words becomes a prompt of 214 words that groups similar member functions together (§3.1.2 and Figure 2, p. 5).

Verus form. Inference: For Verus code, use this as a test-input generator around a verified Rust component: provide the API specification and examples to the LLM, generate candidate Rust callers or serialized inputs, and run `cargo verus` plus a runtime oracle. The generated prompt is outside the proof; Verus constructs (`requires`, `ensures`, `invariant`, `assert`, `proof fn`) remain in the manually verified implementation. Inference: Candidate validity should mean compiling and satisfying the intended preconditions, while validity alone does not establish a Verus proof.

Evidence and limits. The ablation compares no input, raw prompt, and autoprompt across six languages, with the generation strategy fixed to `generate-new` (§5.3.1, p. 9; Table 4, p. 10). Autoprompt has the highest coverage of the three in every language: for example C 182,530 versus 137,204 (raw prompt) and 127,261 (no input), and Qiskit 32,691 versus 31,922 and 31,701. Ablation runs use a budget of 10,000 generated inputs, repeated four times (§4.3, p. 7). Inference: These are line-coverage counts, not percentages and not proof success rates. The paper names as a threat that the distillation LLM used “to generate the initial inputs” may “hallucinate”, i.e., produce made-up or inaccurate information (§6, p. 11). Inference: This is a trust assumption for any generated verification harness.

## technique: example-and-strategy fuzzing loop

What it is and when to use it. Sampling repeatedly with the same prompt yields the same or similar snippets (§3.2, p. 5), so each iteration appends a previously generated valid input as an example plus one of three instructions: `generate-new`, `mutate-existing`, or `semantic-equiv`. The paper states: “The main fuzzing loop is repeated until the algorithm has exhausted the fuzzing budget.” (§3.2.1, p. 6)

How to do it.

1. Initialize `genStrats` with the three strategies and generate a first batch from `inputPrompt + generate-new` (Algorithm 2, p. 5; §3.2.1, p. 6).
2. Pass every generated input to the SUT and the oracle; record reported bugs (Algorithm 2, lines 4 and 9).
3. Until the time budget is exhausted, pick an example at random from the valid inputs of the previous batch and pick one of the three strategies at random (§3.2.1, p. 6).
4. Query the generation LLM with `inputPrompt + example + instruction`; pass the resulting batch to the SUT and the oracle again.
5. Return the accumulated bugs. Figure 3's SMT2 example shows a new formula, a mutation that swaps a variable's type and adds computation, and a semantically equivalent variant that adds a syntax tag (`:named`); this input crashed the SMT solver, a real bug that developers confirmed and fixed (§3.2.2 and Figure 3, p. 6).

Verus form. Inference: Keep a corpus of verified or compile-valid Rust snippets, choose one as `example`, and ask for a new caller or state transition under the same Verus specification. Re-run verification after each batch; use `assert` or a `proof fn` to check semantic relations when the generated variant is intended to preserve behavior. Inference: `semantic-equiv` requires a Verus lemma stating equivalence; the LLM's instruction is not evidence of equivalence.

Evidence and limits. RQ1 campaigns last 24 hours (autoprompting included) and are repeated five times; the metric is line coverage (§4.3, p. 7). In Table 2 (p. 8), Fuzz4All improves over the best baseline by 18.8% (GCC: 198,927 versus GrayC's 167,453), 26.5% (G++: 210,743 versus YARPGen's 166,614), 24.9% (CVC5: 57,674 versus TypeFuzz's 46,174), 13.7% (Go: 43,317 versus go-fuzz's 38,024), 60.9% (javac: 16,552 versus Hephaestus's 10,285), and 75.6% (Qiskit: 34,988 versus MorphQ's 19,929), an average of 36.8% (§5.1.1, p. 8). Fuzz4All generated 43.0% fewer inputs than the baselines and had lower validity (56.0% average reduction); the paper attributes the higher coverage to more diverse programs (§5.1.2, p. 8). In the ablation, 8.0% of inputs are repeated without examples versus 4.7% with the full approach (§5.3.2, p. 10).

## technique: targeted fuzzing from feature documents

What it is and when to use it. Supply documentation of one feature (a library, API, keyword, or theory) instead of general SUT documentation. The paper targets three features per language (§5.2, p. 9) and measures hit rate, the percentage of inputs that use the target feature, checked with simple regular expressions (§4.3, p. 7).

How to do it.

1. Select a target feature (for example C `typedef`, the SMT `Array` theory, or the Qiskit `switch` API).
2. Give documentation of that feature as the user input (§5.2, p. 9). Inference: Autoprompting and the fuzzing loop run as in general fuzzing.
3. Count generated inputs that use the target feature and record SUT coverage (Table 3 and §5.2, p. 9).

Evidence and limits. Targeted runs reach an average hit rate of 83.0%; general fuzzing has an average 96.0% reduction in hit rate for the selected features, while achieving the highest overall coverage (§5.2, p. 9). Qiskit's general campaign has a 0% hit rate for all three recently added APIs, while targeted campaigns reach 71.76%, 75.97%, and 54.79% (Table 3, p. 9). Inference: A Verus project can target a specific invariant, API, or panic path by documenting it, but hit rate only shows syntactic occurrence; a Verus proof still must establish the relevant postcondition.

## technique: user-defined bug oracle

What it is and when to use it. Fuzz4All separates input generation from bug judgment. The paper states: “The oracle is custom for each SUT, and it can be fully defined and customized by the user.” (§3.2.3, p. 6)

How to do it. Define `Oracle(fuzzingInputs, SUT)`, pass each input to the SUT, and add a report whenever the oracle identifies unexpected behavior (Algorithm 2, p. 5; §3.2.1, p. 6). For C compilers, the paper suggests a differential oracle comparing behavior under different optimization levels; the paper itself focuses on crashes due to segmentation faults and internal assertion failures (§3.2.3, p. 6). Unless otherwise mentioned, experiments use unexpected compiler crashes; Qiskit uses two crash oracles borrowed from MorphQ: transpiling at different optimization levels, and exporting to QASM and reading back (§4.2 and §4.2.5, p. 7).

Verus form. Inference: Use successful Verus verification as one oracle, compile failures as another, and runtime differential tests for behaviors outside the specification. Inference: A failed proof is evidence about the candidate or specification, not automatically a soundness bug.

## what is proved, trusted, and relevant to VL

Inference: The paper proves no theorem about LLM-generated programs. It measures coverage, feature hit rate, validity, and bug reports with fixed model checkpoints (gpt-4-0613 and StarCoder, §4.1, p. 6), five repeated 24-hour campaigns for RQ1, and four repetitions for the ablation (§4.3, p. 7). Inference: Trusted components include GPT4 distillation, StarCoder generation, the SUTs, their compilers/runtimes, the oracle implementations, and line-coverage instrumentation. The paper's internal threat is its own implementation; its external threats are the choice of evaluation targets, data shift for the fixed StarCoder checkpoint, and distillation-LLM hallucination (§6, p. 11).

Inference: For VeruLaw, the transferable pattern is an inexpensive generator plus a small trusted checker: use documentation-driven generation to explore verifier APIs and adversarial specifications, then let Verus's checked proof and independent runtime oracle decide acceptance. LLM hallucination, invalid-input rates, GPU cost, and semantic-equivalence claims are product threats; they require deterministic replay, pinned model versions, and proof checking before generated artifacts enter a trusted build.

Inference: Existing compiler and solver fuzzers already provide high-volume generation, differential testing, mutation, and coverage feedback; VL should reuse their oracle and corpus ideas rather than rebuild language-specific generators. The paper's novelty is broad LLM-driven generation and prompt evolution, not a new proof calculus.

## techniques for the catalog

- black-box autoprompting — distill arbitrary documentation into candidate prompts and select the one whose generated snippets have the highest validity score
- example-and-strategy fuzzing loop — repeatedly append a valid prior input plus generate-new, mutate-existing, or semantic-equiv instructions under a time budget
- targeted documentation fuzzing — focus generation on a feature by supplying that feature's documentation and measuring hit rate
- user-defined oracle — execute generated inputs and classify crashes, assertion failures, differential mismatches, or other SUT-specific unexpected behavior
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "In spite of the lower validity rate and number of fuzzing inputs, Fuzz4All generates much more diverse programs compared to traditional fuzzing tools, as evidenced by the high coverage obtained"): read the paper text from first to last line and checked every quotation, number, section and page reference, and technique step against it; changed wrong page references (§3.1, §3.1.1 scoring, §3.1.2, §3.2.1, §5.2, §5.3.1, §5.3.2), the abstract quote's location, example selection (from the previous batch's valid inputs), the experiment oracles (crashes; Qiskit's two MorphQ oracles), the repetition counts (five for RQ1, four for the ablation), the source of the 8.0%/4.7% repetition figures (text, not Table 4), and relabeled paper facts versus Inference; did not check the PDF figures beyond the text extraction, the cited references, or the artifact.
