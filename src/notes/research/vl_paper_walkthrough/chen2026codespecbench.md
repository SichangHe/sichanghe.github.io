# CodeSpecBench: Benchmarking LLMs for Executable Behavioral Specification Generation
(authored by agents unless marked 🧑)
Tag: `chen2026codespecbench`, [paper](https://arxiv.org/abs/2604.12268)

## task and representation
CodeSpecBench evaluates whether an LLM can translate natural-language behavior into executable preconditions and postconditions. “Executable behavioral specifications, defined via preconditions and postconditions, provide a concrete means to assess such understanding.” (Abstract, p. 1.) Preconditions constrain admissible inputs and state; postconditions constrain outputs and resulting state (Section 3.1, pp. 3–4). The benchmark has a self-contained function level and a repository level with dependencies and mutable state.

The function-level representation is a pair of Python functions; repository-level tasks require a set of preconditions and postconditions for issue-relevant functions (Section 3.2, p. 4). The paper’s two-sum example checks types, length, exactly one valid pair, result shape, index bounds, and the sum relation (Figure 1, p. 2). Inference: a Verus translation uses `requires` for input/state validity and `ensures` for output/state relations, with executable Rust tests as concrete checks. Inference: Python execution provides evidence about sampled cases, not a proof for all Rust inputs.

## technique 1: generate and execute specifications
At function level, the model receives only a natural-language description and emits precondition/postcondition functions (Section 3.2, p. 4). At repository level, it receives an issue description, relevant code context, and signatures of changed functions; the generated contracts must constrain broader program state and allowed modifications (Section 3.2, p. 4).

Evaluation injects contracts dynamically: invoke the precondition before the target function, run the original body, then invoke the postcondition over inputs, outputs, and modified state (Section 3.3, p. 5). Steps:
1. Provide the model with task prose, or issue prose plus repository context (Section 3.2).
2. Generate executable precondition and postcondition functions (Section 3.2).
3. For repository tasks, generate a root `conftest.py` whose `pytest_sessionstart` hook wraps the target function, calling the precondition before it and the postcondition after it returns (Section 3.3, p. 5; Appendix C, p. 17).
4. Execute function specifications against curated correct/incorrect cases, or run repository tests with the injected specifications, and record acceptance/rejection (Section 3.3, p. 5).

Appendix C (p. 17) describes two repository exceptions: Django uses `tests/runtests.py`, so the generated contents are appended to `setup_run_tests` after removing `import pytest`; SymPy switches from `bin/test` to pytest and updates test-output parsing. Appendix I.3.2 (p. 24) states that repository context uses SWE-bench Verified’s Oracle setting: the exact files modified by the ground-truth patch.

Inference: VL can use this as a pre-proof contract harness: run generated Rust tests to expose malformed assumptions, then ask Verus to prove the resulting `requires`/`ensures`. The paper does not claim that passing execution tests validates a contract universally.

## technique 2: correctness, completeness, and pass rate
Correctness means accepting every curated valid test; rejecting any valid test makes the specification incorrect. Completeness means rejecting every curated invalid test; accepting any invalid test makes it incomplete (Section 3.4, p. 5). Pass rate is the proportion satisfying both criteria (Section 3.4). Inference: these criteria distinguish contracts that reject valid cases from contracts that accept invalid cases within the test suite.

Inference: VL could apply these two test-based criteria to generated contracts alongside Verus proofs. Passing sampled tests would not establish that a contract captures the intended behavior for every admissible state.

## technique 3: construct high-coverage function tests
CodeSpecBench-Func starts from 2,869 LeetCode problems and retains 2,494 publicly accessible tasks (Section 4.1, p. 5). Multiple LLMs (GPT-4o, DeepSeek-V3, Qwen-Max) generate valid and intentionally invalid inputs; generated cases are parsed and deduplicated (Section 4.1). The official online judge labels accepted inputs as correct, supplies their reference outputs, and labels rejected inputs as incorrect. Generation repeats until both correct and incorrect input counts reach 50, although the paper notes that valid inputs are inherently limited for some problems. These produce separate precondition tests and correct input–output pairs for postcondition tests. Qwen3-8B, Qwen3-32B, and GPT-5-mini are prompted to generate 10 candidate solutions; executing them on the correct inputs and retaining outputs that disagree with the reference yields an average of 67.8 incorrect output cases per problem (Section 4.1, p. 6). The resulting tests average 96.3% statement and 93.6% branch coverage (p. 6).

Inference: for VL, use model diversity, deduplication, an independent oracle where available, and report denominators. Coverage does not prove a Verus contract; it measures test adequacy.

## technique 4: repository-level trigger and regression evaluation
“At the repository level, evaluation is performed by executing the model-generated specifications within the context of a real-world codebase.” (Section 3.3, p. 5.) CodeSpecBench-Repo uses 500 SWE-bench Verified issues across 12 projects (Section 4.2, p. 6). Each instance contains a bug report or feature request, repository context, buggy and fixed versions, trigger tests, and regression tests. On the fixed repository, trigger and regression tests are valid; on the buggy repository, trigger behavior is invalid (Figure 2, p. 4). Contracts are dynamically injected around issue-relevant functions. The evaluation adopts UTBoost’s augmented test cases to address insufficient coverage (Section 4.2, p. 7).

The task requires reasoning about repository structure, module dependencies, and execution behavior (Section 4.2, p. 6). Inference: VL should similarly evaluate contracts against pre-change and post-change Rust states and include regression properties for unchanged behavior.

## evidence and measured tradeoffs
“Pass Rate is defined as the proportion of generated specifications that satisfy both correctness and completeness.” (Section 3.4, p. 5.) The benchmark evaluates 15 LLMs. On 2,494 function tasks, the best pass rate is GPT-5-mini 47.0% (Table 4, p. 8); Gemini-2.5-Pro is 46.2%. On 500 repository tasks, Claude-4.5-Sonnet reaches only 20.2%, Gemini-2.5-Pro 18.2%, and GPT-5-mini 9.6% (Table 4). Function-level correctness generally exceeds completeness: QWQ-32B scores 83.1% correct versus 37.3% complete; the authors interpret this pattern as permissive specifications. Repository-level completeness exceeds correctness: Claude-4.5-Sonnet scores 57.2% complete versus 37.4% correct; the authors interpret this pattern as overly restrictive or flawed specifications (Section 5.2, pp. 8–9).

Specification-guided reranking generates 10 candidate solutions plus a specification and five test inputs per problem. It filters out inputs violating the generated precondition, executes candidates on the remaining inputs, and ranks solutions by the fraction of these tests that pass the generated postcondition. The baseline randomly selects k candidates; reranking selects the top k. Solution correctness is assessed against all validated correct input–output cases (Section 5.3, p. 9). Pass@1 rises from 59.4% to 62.2% for Qwen3-8B and from 71.2% to 73.9% for Qwen3-32B (Table 5, p. 9). Inference: these gains measure improved candidate selection, not deductive proof success.

## trust and limitations for VL
Inference: the evaluation depends on online-judge labels and outputs, fixed/buggy repository labels, generated test distributions, and dynamic Python execution. Appendix K (p. 25) explicitly limits its guarantees: “a specification may pass all tests yet still be unsound or incomplete for untested behaviors.” The authors report that errors are dominated by input-constraint mistakes at function level and dependency-resolution and over-restrictive errors at repository level (Section 5.3, p. 9). Appendix K (p. 25) states that construction depends on the external online judge and that specification forms are restricted to executable Python preconditions and postconditions.

Inference: this suggests a possible failure mode for agent-written verified Rust because a model could generate a contract that is too weak (admits incorrect behavior) or too strong (rejects valid behavior). VL should measure both acceptance of valid traces and rejection of generated counterexamples before attempting proof. CodeSpecBench already supplies a benchmark methodology; VL should not redo its generic correctness/completeness definitions, but should port them to Rust state and Verus universal proofs. Inference: these Python results do not establish how well the approach would work with Verus.

## techniques for the catalog
- executable contract generation: generate preconditions and postconditions from prose and execute them around target functions
- two-axis contract evaluation: score acceptance of valid behavior separately from rejection of invalid behavior
- diverse test construction: combine multiple LLM generators, deduplicate inputs, and validate with an independent judge
- repository contract injection: evaluate specifications in fixed and buggy multi-file repositories with trigger/regression tests
- specification-guided reranking: use generated contracts to filter and rank candidate implementations
- Inference: VL contract calibration could compare sampled Rust behavior with Verus proofs to detect weak and over-restrictive specifications
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Both models exhibit high proportions of Type and Range Violations (48–54% combined), indicating that many failures stem from incorrectly specified input constraints rather than flawed algorithmic reasoning."): checked the whole paper, quotations, numbers, section/page references, and technique steps; corrected the paper link, references, test-construction details, repository injection details, and inference labels; did not reproduce experiments or inspect the released code.
