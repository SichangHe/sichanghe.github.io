# CodeSpecBench: Benchmarking LLMs for Executable Behavioral Specification Generation
(authored by agents unless marked 🧑)
Tag: `chen2026codespecbench`, [paper](https://doi.org/10.1145/3747588)

## task and representation
CodeSpecBench evaluates whether an LLM can translate natural-language behavior into executable preconditions and postconditions. “Executable behavioral specifications, defined via preconditions and postconditions, provide a concrete means to assess such understanding.” (Abstract, p. 1.) Preconditions constrain admissible inputs and state; postconditions constrain outputs and resulting state (Section 3.1, p. 3). The benchmark has a self-contained function level and a repository level with dependencies and mutable state.

The representation is a pair of Python functions. The paper’s two-sum example checks types, length, exactly one valid pair, result shape, index bounds, and the sum relation (Figure 1, p. 2). Inference: a Verus translation uses `requires` for input/state validity and `ensures` for output/state relations, with executable Rust tests as concrete checks. Python execution is evidence about sampled cases, not a proof for all Rust inputs.

## technique 1: generate and execute specifications
At function level, the model receives only a natural-language description and emits precondition/postcondition functions (Section 3.2, p. 4). At repository level, it receives an issue description, relevant code context, and signatures of changed functions; the generated contracts must constrain broader program state and allowed modifications (Section 3.2, p. 4).

Evaluation injects contracts dynamically: invoke the precondition before the target function, run the original body, then invoke the postcondition over inputs, outputs, and modified state (Section 3.3, p. 4). Steps:
1. Provide the model with task prose, or issue prose plus repository context (Section 3.2).
2. Generate executable precondition and postcondition functions (Section 3.2).
3. Inject the precondition before execution and postcondition after execution (Section 3.3).
4. Run curated valid and invalid cases and record acceptance/rejection (Section 3.3).

Inference: VL can use this as a pre-proof contract harness: run generated Rust tests to expose malformed assumptions, then ask Verus to prove the resulting `requires`/`ensures`. The paper does not claim that passing execution tests validates a contract universally.

## technique 2: correctness, completeness, and pass rate
Correctness means accepting every curated valid test; rejecting any valid test makes the specification incorrect. Completeness means rejecting every curated invalid test; accepting any invalid test makes it incomplete (Section 3.4, p. 5). Pass rate is the proportion satisfying both criteria (Section 3.4). This separates over-restrictive contracts (low correctness) from permissive contracts (low completeness).

Inference: in VL, soundness resembles benchmark correctness, while completeness resembles rejecting counterexample behaviors; the correspondence is approximate because Verus proofs quantify over all admissible states while CodeSpecBench samples tests.

## technique 3: construct high-coverage function tests
CodeSpecBench-Func starts from 2,869 LeetCode problems and retains 2,494 publicly accessible tasks (Section 4.1, p. 5). Multiple LLMs (GPT-4o, DeepSeek-V3, Qwen-Max) generate valid and intentionally invalid inputs; generated cases are parsed and deduplicated (Section 4.1). Official online judges label accepted inputs and outputs as correct and rejected inputs as incorrect. Generation repeats until each problem has 50 correct and 50 incorrect inputs; each problem averages 67.8 incorrect output cases generated from buggy LLM solutions (Section 4.1, pp. 5–6). The resulting tests average 96.3% statement and 93.6% branch coverage (p. 6).

Inference: for VL, use model diversity, deduplication, an independent oracle where available, and report denominators. Coverage does not prove a Verus contract; it measures test adequacy.

## technique 4: repository-level trigger and regression evaluation
“At the repository level, evaluation is performed by executing the model-generated specifications within the context of a real-world codebase.” (Section 3.3, p. 4.) CodeSpecBench-Repo uses 500 SWE-bench Verified issues across 12 projects (Section 4.2, p. 6). Each instance contains a bug report or feature request, repository context, buggy and fixed versions, trigger tests, and regression tests. On the fixed repository, trigger and regression tests are valid; on the buggy repository, trigger behavior is invalid (Figure 2, p. 4). Contracts are dynamically injected around issue-relevant functions.

This design tests dependency resolution, state constraints, and behavior under realistic multi-file context. Inference: VL should similarly evaluate contracts against pre-change and post-change Rust states and include regression properties for unchanged behavior.

## evidence and measured tradeoffs
“Pass Rate is defined as the proportion of generated specifications that satisfy both correctness and completeness.” (Section 3.4, p. 5.) The benchmark evaluates 15 LLMs. On 2,494 function tasks, the best pass rate is GPT-5-mini 47.0% (Table 4, p. 8); Gemini-2.5-Pro is 46.2%. On 500 repository tasks, Claude-4.5-Sonnet reaches only 20.2%, Gemini-2.5-Pro 18.2%, and GPT-5-mini 9.6% (Table 4). Function-level correctness generally exceeds completeness: QWQ-32B scores 83.1% correct versus 37.3% complete, showing permissive contracts. Repository-level completeness exceeds correctness: Claude-4.5-Sonnet scores 57.2% complete versus 37.4% correct, showing over-restriction (Section 5.2, pp. 8–9).

Specification-guided reranking generates 10 candidate solutions, five specification test inputs, filters inputs violating the generated precondition, executes candidates, and ranks by postcondition pass rate (Section 5.3, p. 9). Pass@1 rises from 59.4% to 62.2% for Qwen3-8B and from 71.2% to 73.9% for Qwen3-32B (Table 5, p. 9). The comparison uses 10 candidates per problem and validated test cases, so gains are ranking gains, not proof gains.

## trust and limitations for VL
The benchmark trusts online-judge outputs, fixed/buggy repository labels, generated test distributions, and dynamic Python execution. It measures sampled behavior, not deductive validity. The authors report that errors are dominated by input-constraint mistakes at function level and dependency-resolution and over-restrictive errors at repository level (Section 5.3, p. 9). The repository benchmark is Python-only and contract forms are restricted; the paper’s limitations section states that construction is not fully self-contained and that specification forms are limited (Section 6, pp. 10–11).

Inference: this is a direct threat to agent-written verified Rust because a model can generate a contract that is too weak (proof passes many bad implementations) or too strong (rejects valid behavior). VL should measure both acceptance of valid traces and rejection of generated counterexamples before attempting proof. CodeSpecBench already supplies a benchmark methodology; VL should not redo its generic correctness/completeness definitions, but should port them to Rust state and Verus universal proofs. The paper does not establish that Python pass rates predict Verus proof success.

## techniques for the catalog
- executable contract generation: generate preconditions and postconditions from prose and execute them around target functions
- two-axis contract evaluation: score acceptance of valid behavior separately from rejection of invalid behavior
- diverse test construction: combine multiple LLM generators, deduplicate inputs, and validate with an independent judge
- repository contract injection: evaluate specifications in fixed and buggy multi-file repositories with trigger/regression tests
- specification-guided reranking: use generated contracts to filter and rank candidate implementations
- VL contract calibration: compare sampled Rust behavior with Verus proofs to detect weak and over-restrictive specifications
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
