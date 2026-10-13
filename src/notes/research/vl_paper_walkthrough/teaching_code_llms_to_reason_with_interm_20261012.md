# Teaching Code LLMs to Reason with Intermediate Formal Specifications
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and central result

This paper studies executable checkpoint specifications: Boolean assertions inserted at meaningful internal program points, rather than only preconditions or final postconditions. It introduces SPEC CODER, a verification-guided fine-tuning pipeline, and HumanExec, a benchmark of Codeforces problems with reference solutions, test suites, and human buggy submissions. The paper's premise is operational: an assertion is useful when it holds on correct executions and rejects behavior-changing executions that reach the same checkpoint. The authors state the criterion explicitly: “A checkpoint specification is useful only when it satisfies two properties: it should hold on correct executions, and it should reject faulty executions that reach the same checkpoint.” (Section II-C, p. 3.)

The model is trained from accepted annotated programs, not trusted merely because an LLM produced plausible text. On HumanExec, SPEC CODER raises average inline correctness from 0.4778 to 0.6306, completeness from 0.2112 to 0.7459, and executable validity from 0.8387 to 0.9667 across Qwen2.5-Coder 7B/14B/32B. It also improves correctness checking and top-ranked repair. These are execution- and mutant-based measurements, not proofs of universal program correctness.

## technique 1: use executable intermediate checkpoints instead of only postconditions

### what it is

An end-to-end postcondition summarizes the final state but can miss an incorrect intermediate algorithm. A checkpoint assertion is placed after preprocessing, inside a loop, or before a helper call and constrains variables in scope at that point. In the interval-merging example, the assertion `all(intervals[i][0] <= intervals[i+1][0] ...)` detects sorting by end rather than start before the merge loop. Natural language such as “the intervals should be sorted” cannot be executed.

The paper models a program as `{Pre} S0 {Step1} S1 ... {Stepn} Sn {Post}`. Each `Stepi` has a Boolean predicate over its runtime state. Assertions are evaluated on concrete traces, making them usable for verification, consistency checking, fault localization, and repair.

### when to use it

Use a checkpoint where the algorithm establishes a semantic commitment: a normalized data structure, loop invariant, accumulated summary, ordering relation, or helper precondition. Avoid assertions that are unreachable, tautological (`assert True`), dependent on out-of-scope variables, or stronger than correct behavior.

### how to apply it

1. Identify a state transition whose correctness is necessary for the final result.
2. List only variables available at that program point.
3. Write a side-effect-free Boolean predicate over those variables.
4. Execute it on every reference trace reaching the point; reject it if any reached evaluation fails.
5. Execute it on faulty traces that can reach the same point; retain it only if it rejects a useful fraction of them.
6. Keep the implementation unchanged after deleting assertion comments.

### Verus form (inference)

The direct Verus analogue is a loop `invariant` or a ghost `assert`/`assert forall` lemma at a program boundary. Verus checks symbolic paths rather than concrete test traces, so checkpoints can become universally quantified proof obligations. The benchmark's runtime filtering remains useful for generating candidate invariants and counterexamples, but acceptance must ultimately be a Verus proof. Checkpoint assertions can also be emitted as `ensures` on helper functions to make intermediate commitments modular.

### evidence and limits

Base prompting produces syntactically valid but weak assertions. Qwen2.5-Coder-32B has 0.8989 executable validity, 0.6313 correctness, and only 0.2604 completeness before fine-tuning (Table I, p. 3; the paper's Table II and text give 0.2640 for the same model). A valid assertion is therefore not sufficient evidence. Test coverage bounds what faults can be rejected; a mutant that does not reach a checkpoint is excluded from its completeness denominator.

## technique 2: construct supervision from validated references and non-trivial mutants

### what it is

SPEC CODER's data-construction pipeline has four stages: select a reference program that passes its tests, generate behavior-changing mutants, obtain candidate checkpoints through multi-turn refinement, and retain only annotations meeting correctness and completeness thresholds. This makes the teacher's output an execution-validated target.

### how to apply it

1. Select a problem, reference implementation, and test suite with more than 30 tests; discard references that fail any test.
2. Prompt a model for one-line mutants preserving syntax while changing a condition, update, helper call, or necessary statement.
3. Execute every mutant on the same suite. Keep only mutants that pass at least one and fail at least one test; deduplicate equal pass/fail patterns.
4. Split train/validation/test at the problem level before mutant generation, preventing derivative leakage.
5. Give a teacher model the problem, reference program, tests, and retained mutants.
6. Instrument each proposed assertion at its original location. Record syntax errors, undefined variables, unsafe effects, reachability, reference failures, and mutant rejections.
7. Keep an annotated program only if every assertion is reached and meets the correctness threshold, every assertion with eligible mutants meets completeness, and at least one assertion has a non-empty mutant set.

The paper's default thresholds are α = 1.0 for correctness and β = 0.9 for completeness. Acceptance also requires “at least one assertion has a non-empty eligible mutant set.” (Algorithm 1, p. 4.)

### Verus form (inference)

Use compiling, test-passing Rust functions as references, then generate mutants after splitting datasets by problem. Mutants can alter arithmetic, branch conditions, ownership operations, or loop updates while preserving compilation. Runtime tests can filter candidate invariants, but the final training target should include Verus-checked proofs or obligations. Problem-level separation is essential because mutating a function after the split can still leak its structure into training.

### evidence and limits

The training-data selection requires a test suite with more than 30 tests; this is a separate dataset from HumanExec, whose Codeforces tasks have 48–279 tests (mean 79.53). A reference that passes all tests is treated as trusted for data construction; the paper does not prove that it is correct for all inputs. Mutant quality depends on the teacher and test suite, and equivalent mutants are only filtered operationally.

## technique 3: multi-turn Explore–Submit refinement with executable feedback

### what it is

At each turn, a teacher model either explores candidate checkpoints or submits an annotated program. The execution verifier reports syntax, reachability, correctness, and mutant rejection. Explore uses feedback to revise; Submit also applies the acceptance thresholds. Assertions that mutate state, perform I/O, randomness, dynamic evaluation, or otherwise use unsafe operations are rejected. The target executable code must remain byte-equivalent after removing assertion comments.

### how to apply it

1. Start with the reference source and problem statement.
2. Ask for candidate assertion locations and predicates.
3. Instrument assertions with a trace wrapper at their original location.
4. Run reference tests and eligible mutants, computing per-assertion scores.
5. Feed the model the failing assertion, reachability, and surviving/rejected mutant counts.
6. Preserve assertions that are correct and discriminative; repair false, unreachable, or weak assertions.
7. Submit only when all assertion-level conditions pass, or mark the trajectory unsuccessful after a fixed turn limit.

Correctness is the fraction of tests that reach the checkpoint for which every reached evaluation is true. Completeness is the fraction of eligible mutants rejected on a reached execution. The eligible set requires the mutant's changed line to precede the checkpoint and both to co-reach on some reference execution. Aggregating correctness per test rather than per raw evaluation prevents a long-running test from dominating the score.

### Verus form (inference)

Use Verus diagnostics as the feedback channel: failed invariants, counterexample states, trigger failures, and ownership errors. An Explore phase can propose candidate `invariant` clauses; Submit can run `verus` and require proof success plus unchanged executable behavior. A fixed turn limit and explicit rejection of unsafe ghost/executable mixing prevent endless or unsound repair. Runtime mutants can identify missing cases before formal proof.

### evidence and limits

The process is a data-generation procedure, not an inference-time proof guarantee. The authors do not train students to reproduce exploratory dialogue; only accepted annotated programs become instruction-response targets. If no candidate passes within the maximum turns, the trajectory contributes no accepted supervision.

## technique 4: train two specification-aware tasks

### what it is

Accepted annotations produce two supervised tasks. Specification generation takes a problem and existing program (reference or mutant) and inserts checkpoints. Code generation takes only the problem and produces a complete solution with checkpoints. The target is an annotated program, not a dialogue. The loss is ordinary autoregressive language modeling over target tokens.

### how to apply it

1. Convert each accepted reference annotation to `(problem, reference) → annotated reference`.
2. Insert the same accepted checkpoints into each retained mutant to create `(problem, mutant) → annotated mutant`; the assertions describe intended behavior and may fail on the mutant.
3. Add `(problem) → annotated reference` examples for complete code generation.
4. Fine-tune a code model on the union of specification and code tasks.
5. (Study's addition, not the paper's.) At inference, strip or execute assertions according to the desired checking workflow.

### Verus form (inference)

The first task maps to adding Verus contracts or proof blocks to existing Rust. The second maps to generating a complete verified Rust function from a specification. Training targets should include compilable Verus syntax and proof obligations, with a post-generation verifier gate. The paper's shared goal—code plus intermediate specifications—fits VL's agent workflow, but Verus proof scripts are more solver-sensitive than Python assertions.

### evidence and limits

The authors train Qwen2.5-Coder 7B, 14B, and 32B against zero-shot versions of the same backbones. Fine-tuning improves assertion quality, but the data is derived from LeetCode-style references and filtered mutants; it does not establish performance on arbitrary software.

## technique 5: evaluate validity, correctness, completeness, and downstream use separately

### what it is

The benchmark separates three properties. Validity asks whether an assertion can be safely instrumented and executed. Correctness asks whether it holds on the reference program. Completeness asks whether it rejects behavior-changing mutants reaching the same checkpoint. Downstream tasks then test correctness classification and repair using HumanExec's human-written buggy submissions.

### evidence

On inline checkpoints, SPEC CODER changes the three backbone averages from 0.4778 to 0.6306 correctness, 0.2112 to 0.7459 completeness, and 0.8387 to 0.9667 validity. The 14B model reaches 0.6468 correctness, 0.7713 completeness, and 1.0000 validity; the 32B model reaches 0.8098, 0.6843, and 0.9973. Average checkpoint quality rises from 68.6% to 87.1%, and the non-trivial assertion rate from 39.3% to 83.4%. Postconditions improve too, but inline completeness gains are larger.

For correctness checking, MCC improves from 0.236 to 0.307 (7B), 0.283 to 0.384 (14B), and 0.394 to 0.493 (32B) with AssertChecker evidence. Chain-of-thought alone reduces MCC for all three models. For repair, SPEC CODER has the best Pass@1: 0.140, 0.241, and 0.283 for 7B, 14B, and 32B. Average pass rate is 0.578 versus 0.547 for vanilla and 0.544 for HoarePrompt, but SpecRover's is 0.582; the 14B and 32B models improve over vanilla.

### Verus form (inference)

Use separate metrics for compiling assertions, proof validity, counterexample rejection, and repair. A Verus benchmark should report denominators, per-assertion reachability, and whether a candidate contract is weaker or stronger than the original. Correctness classification should consume actual failed proof obligations or counterexamples, not only model explanations. Repair should be evaluated with `verus` plus independent functional tests.

## what is proved, measured, and trusted

Measured: execution-level checkpoint quality, model likelihood on held-out assertions, correctness classification, and repair success on HumanExec. The paper does not prove that SPEC CODER's assertions are universally complete, nor that passing a finite suite implies program correctness. Trusted elements include reference solutions, test suites, mutant construction, execution instrumentation, model training, and the test oracle. Completeness is explicitly operational and only covers eligible mutants.

## failure modes and accounting

Base models often produce syntax-invalid, trivial, unreachable, or too-strong assertions. A tautology such as `len(intervals) >= 0` accepts faulty and correct traces; an assertion that intervals are already non-overlapping can reject correct inputs. The paper's strongest gains target discriminative completeness, not universal proof. HumanExec contains 150 tasks, 48–279 tests per task (mean 79.53, median 70), and a mean of 53.19 retained mutants (median 44). These denominators matter when interpreting percentages.

The model can overfit accepted annotation style; fine-tuning does not guarantee understanding. The paper reports no proof that mutants cover all fault classes, and held-out evaluation uses execution rather than a theorem prover. The benchmark is competitive-programming Python-style code, so its syntax and state visibility differ from Rust/Verus.

## reuse boundary for VL

VL should reuse the checkpoint concept, mutant-guided data construction, multi-turn verifier feedback, and separate validity/correctness/completeness metrics. A Verus agent can generate candidate invariants at loop boundaries, run the verifier, retain only proof-valid and behavior-preserving targets, and train or prompt against those examples. The distinction between “holds on correct traces” and “rejects faulty traces” is a useful guard against vacuous specifications.

VL should not copy the execution-only acceptance rule as formal assurance. Verus proofs must cover all inputs under their preconditions, and Rust ownership introduces obligations absent from the benchmark. A VL benchmark needs Rust-specific mutants, proof-success denominators, contract-drift checks, and explicit treatment of unsafe code and external functions.

## product risk assessment (inference)

The paper is a direct warning against one-shot specification generation. Base models can write plausible assertions, yet completeness is only 0.2640 for the largest model before training. Verification-guided training substantially improves intermediate evidence, but still relies on trusted tests, mutants, and reference code. For agent-written verified Rust, the threat is moderate to high in invariant and contract authoring; the opportunity is a product loop that generates, proves, mutates, diagnoses, and repairs. It does not eliminate the need for Verus proof checking or semantic review.

## techniques for the catalog

- executable checkpoint specifications — place Boolean obligations at internal states so traces expose algorithmic commitments before final output
- mutant-guided supervision — retain syntax-preserving mutants that pass some tests and fail others, then train on assertions that reject them
- Explore–Submit refinement — iteratively execute candidate assertions on references and mutants, using localized feedback before acceptance
- dual specification/code training — fine-tune separate insertion and complete-program tasks over accepted annotated programs
- four-way specification evaluation — measure executable validity, reference correctness, eligible-mutant completeness, and downstream repair separately
- evidence-driven repair — feed violated checkpoint assertions to correctness checkers and repair agents as machine-checkable local evidence

Audited 2026-10-12 against the paper: checked every number (Tables I-IV averages recomputed, HumanExec statistics, thresholds), page references, both quotations, technique steps against Section III and Algorithm 1, and Verus forms (marked inference, sound). Changed: Table I completeness 0.2640 to 0.2604 with the paper's own discrepancy noted; one quotation made verbatim (has, not receiving) and its page 5 to 4; the 30-test rule no longer conflated with HumanExec; correctness denominator; unmarked inference step 5 labelled; SpecRover's higher average pass rate added; removed an unsupported closing sentence and the leftover study-status section.
