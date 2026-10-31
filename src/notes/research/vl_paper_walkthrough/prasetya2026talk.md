# Talk is Cheap, Logic is Hard: Benchmarking LLMs on Post-Condition Formalization
(authored by agents unless marked 🧑)
Tag: `prasetya2026talk`, [paper](https://www.semanticscholar.org/paper/bef4f98fbaca4ecda5252d8c50e1a4b29aaa616e)

## scope and definitions

Prasetya, Kifetew, and Prandi test whether an LLM can turn a natural-language program description into full executable preconditions and postconditions. A full postcondition accepts every output of a correct implementation and rejects every wrong output; a partial one accepts some wrong outputs too (section 3.1, p. 3). The distinction matters because “a partial post-condition is also weaker in detecting errors.” (introduction, p. 2)

The benchmark has 24 models (7 proprietary, 17 open), 40 fresh HEx tasks, ten samples per model/task, 162 manually written precondition tests and 603 postcondition tests, plus 1,383 generated precondition and 1,662 generated postcondition tests (sections 5.2–5.4, pp. 7–9). The authors state: “None of the 24 LLMs can solve all pre- and post-condition tasks (within the tried ten attempts).” (conclusion, p. 18)

## technique 1: prompt decomposition into English then executable predicate

when to use it

Use this when the input is informal prose and the target contract is a Boolean function rather than a single assertion. The two-stage prompt makes the semantic extraction inspectable.

steps from the paper

1. Give the model the natural-language description and several input/output examples; do not include implementation code (section 4.1, p. 5)
2. Ask it first to state the postcondition in English (section 4.1, p. 5)
3. Ask it to encode that statement as a Python function with a fixed signature returning `bool` (Figure 1, p. 5)
4. Repeat the identical prompt ten times per task and extract code from any explanatory text, repairing indentation uniformly (sections 4.1 and 5.4, pp. 5, 8)

The prompt's required shape is quoted in Figure 1: “Then, code this post-condition as a Python function with the header shown below, where the parameter r represents P’s return value.” (p. 5)

Verus form

Inference: preserve the two stages in comments or a specification function, then express the executable contract as `requires` and `ensures` on a Rust function. For example, a sorted-list contract can use `ensures` with a quantified predicate over indices; a proof helper can be a `proof fn` with its own `requires`/`ensures`. Verus specifications are not Python Boolean functions and are erased, so a runtime checker is needed if the predicate must execute in production.

Evidence and limits

The fixed prompt avoids model-specific tuning but may understate each model's best ability. The paper says code is omitted deliberately because it studies inference from descriptions (section 4.1, p. 5). A specification can be syntactically valid yet semantically incomplete; all validation is test-based because full equivalence is undecidable and many conditions exceed automated theorem provers (section 4.1, p. 5).

## technique 2: negative tests through mutation-guided generation

when to use it

Use this to detect weak contracts that accept faulty outputs. Positive tests alone only show that a candidate accepts correct behavior.

steps from the paper

1. Run Pynguin on the reference program `F` to generate input tests (section 4.2, p. 6)
2. Evaluate the reference precondition on each input; classify rejected inputs as negative and accepted inputs as positive (section 4.2, p. 6)
3. Execute `F` on positive inputs and pair each output with its input; these are positive postcondition tests (section 4.2, p. 6)
4. Generate mutants `F_j` with Poodle and rerun Pynguin (section 4.2, p. 6)
5. When a mutant output is rejected by the reference postcondition, add that output/input pair as a negative postcondition test (section 4.2, p. 6)
6. Accept an LLM precondition only when it agrees with the reference on every `T_pre` input, and accept a postcondition only when it agrees on every `(output,input)` in `T_post` (section 4.2, p. 5)

The paper emphasizes: “It is important that the test suites in the study include negative tests (they do) to avoid accepting proposals that are too weak.” (section 4.2, p. 5)

Verus form

Inference: make negative examples explicit in proof lemmas. A `proof fn` can show that a deliberately wrong output violates the `ensures` predicate; `assert` can check the counterexample. Mutation execution and test generation remain an external harness. Verus can prove universal properties only when the data structure and quantifiers are modeled in supported specifications.

Evidence and limits

Manual suites obtain 100% branch coverage, but branch coverage does not imply contract completeness (section 5.4, p. 8). The authors report that automatically generated tests exposed proposals accepted by manual tests; for Claude 3.7, 32 of 333 manually valid solutions (9.6%) became invalid after generated tests (section 6.5, p. 17). The denominator is the 333 Claude solutions judged valid by manual tests, not all model outputs.

## technique 3: evaluate near-correctness, not only accept@1

what it is

`accept@1` is the fraction of ten sampled solutions that pass all tests. The paper supplements it with mean passing tests, error rate, false-positive rate, false-negative rate, and difficulty metrics (section 5.5, pp. 8–10). This distinguishes a contract failing one subtle test from malformed code or a contract that accepts wrong behavior.

how to apply it

1. Run each candidate on all positive and negative tests
2. Record the fraction of tests passed, whether execution errors, and the TP/TN/FP/FN class for each test (section 5.5, pp. 9–10)
3. Aggregate per task and model over ten replicas; compute `accept@1` as correct replicas divided by ten (section 5.4–5.5, p. 9)
4. Stratify tasks by cyclomatic complexity and semantic class: simple (`S`), quantified (`Q`), nested quantified (`QQ`), and non-quantifiable (`NQ`) (sections 3.2 and 5.1, pp. 4, 7)

The paper's headline result is Claude 3.7 average combined accept@1 of 0.78; the best open models Gemma3 and Athene each average 0.47 (conclusion, p. 18). These denominators are the combined pre/post tasks in HEx, with ten attempts per task; they are averages, not percentages of the 40 tasks alone.

Verus form

Inference: use verifier pass/fail as a hard metric, but retain proof-obligation coverage, counterexample count, and repair iterations. A proof that passes can still encode an under-specified `ensures`; test-based FP/FN analysis is useful for validating the specification against an independent reference.

## what is proved, trusted, and left open

Inference: threat to agent-written verified Rust is high for specification generation. A Verus proof establishes the written predicate, while this study shows language descriptions routinely yield near-correct but incomplete predicates; negative tests and independent reference contracts are therefore required. The paper does not evaluate Rust, Verus, solver proofs, or environmental assumptions, so transfer is an inference rather than a measured result.

## techniques for the catalog

- two-stage contract prompting: extract an English condition, then emit a fixed-signature Boolean function from prose and examples
- mutation-guided negative tests: mutate the reference implementation so wrong outputs become postcondition counterexamples
- graded contract metrics: report full-test acceptance, test fraction, execution errors, and FP/FN rates by task difficulty
