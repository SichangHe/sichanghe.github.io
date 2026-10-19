# Adversarial Agent Collaboration for Correctness Improvements of C to Safe Rust Translation
(authored by agents unless marked 🧑)
Tag: `li2025actor`, [paper](http://arxiv.org/abs/2510.03879v3)

## problem and method

ACToR wraps a C-to-Rust translator in an adversarial loop. A translator agent proposes safe Rust; a discriminator treats the original C executable as an oracle, searches for inputs producing different behavior, and feeds those tests back for repair. The paper defines the goal as agreement on every input that is memory-safe in C, while ordinary translation checks only a small seed set. It says, “the resulting Rust code frequently diverges from the C source on inputs absent from the test suite used during translation” (Abstract, p. 1). Inference: this is differential testing, not a proof of equivalence or of absence of Rust defects.

## technique 1: append-only translator–discriminator loop

When to use it. Inference: use the loop when a deterministic C program can be run as an executable oracle and a safe Rust translation can be compiled and tested. The evaluation assumes “single-threaded C programs that have deterministic behaviors across different executions” (Section 4.1, p. 5).

Steps from Section 3.2 (p. 4):

1. Start with C program `c`, seed tests `T0`, translator `F`, and discriminator `D`.
2. Ask `F` for an initial Rust translation `rs′` that passes every test in `T0`.
3. Give `c` and `rs′` to `D`. It uses static inspection, manual tests, and a customizable differential fuzzer to emit tests on which outputs disagree.
4. Validate the discriminator's batch: tests must be well formed, execute successfully on C, and expose C/Rust mismatches. Retry within a fixed limit, then append the batch to the persistent set `T`. Algorithm 1 requires at least one mismatch in a batch and appends the batch even after the retry limit is reached (Appendix A, pp. 14–15); the implementation description and prompt ask for mismatches on every new test (Appendix B, p. 15; Figure 7, p. 17).
5. Ask `F` to update `rs′` using safe Rust so it passes the enlarged `T`. Retry within the fixed retry limit; if tests still fail, retain the latest translation and continue.
6. Repeat until `MAX_ITER`, returning `rs′` and all accumulated tests.

The authors state, “The two agents work in turn, iteratively improving the translation, with the discriminator pushing the translator to fix newly exposed mismatches.” (Section 3.2, p. 4) The figure caption describes the operational effect: “The Translator and the Discriminator agents update the translation and the tests in turn to iteratively improve the correctness of the translated program.” (Figure 1, p. 2) The validator checks compilation, absence of unsafe constructs, and all current tests (Appendix B, p. 15). The intended edit permissions are Rust source for the translator and tests for the discriminator, with C and build scripts read-only (Section 3.2, p. 5). These restrictions are implemented by restoring disallowed changes after each iteration: “This is enforced indirectly: after each iteration, any file outside the agent’s allowed edit set is reverted to its prior content.” (Appendix B, p. 15)

Verus form. Inference: use differential tests as counterexamples while proving a Rust implementation’s explicit contract in Verus. A Verus function can state `requires` for the valid input domain and `ensures` for output and state correspondence; loop `invariant` clauses capture preservation. Correspondence between that contract and C behavior needs separate justification, as do assumptions about any FFI. ACToR’s test set cannot prove this correspondence.

Evidence. The micro benchmark has 6 programs and at least 60 validation tests each; the macro benchmark has 57 BSD utility programs, 27,268 total lines, and 702 functions (Table 2 and Section 4.1, p. 5). With Claude Code and Sonnet 4.5, ten iterations increased average hidden-test pass rate from 89.2% to 98.2% (Section 4.2, p. 7). Across seven agent/model configurations, the loop improved correctness; GLM-4.7's `join` run used the last completed iteration because ten iterations could not finish within 48 hours (Appendix F, p. 17). With C2SaferRust’s seven-program set, pass rate rose from 76.3% to 92.9%, but this experiment allowed existing unsafe code: “the translator agent may keep existing unsafe code but is instructed not to introduce additional unsafe lines.” (Section 4.3, p. 9)

Limits. The loop can retain a translation that still fails tests after retries (Section 3.2, p. 4). Inference: these test suites sample behavior and do not prove equivalence on all safe inputs; a Verus proof would need a separate specification. The paper does not directly support library translation (Section 4.4, p. 9).

## technique 2: differential fuzzer construction

The discriminator customizes a differential fuzzer to each program’s input space (Section 3.2, p. 4). The unified test runner runs C and Rust on identical inputs and compares outputs; JSON test records include setup and cleanup commands, output redirection, and regular expressions to normalize trivial differences such as path names (Section 4.1, pp. 5–6). Fuzzer construction is enabled by default; ACToR-NoFuzz removes it for ablation (Section 3.2, p. 4).

Apply it by defining a common test runner, letting the discriminator generate three distinguishing tests per iteration, validating them, then appending tests before translation repair. Validation also compares two C binaries built with different compilation configurations to filter unrelated nondeterminism: “The discriminator agent retries until all checks pass or a retry limit is reached.” (Appendix B, p. 15) The default configuration starts with 15 manually crafted seeds, runs 10 iterations, and adds 3 tests each iteration (Section 4.1, pp. 6–7).

Verus form. Inference: a generated failing input should become a regression lemma or executable test around a Verus function. It can instantiate a `requires` domain and expose a missing `ensures` clause, but fuzzer output itself is not proof.

Evidence. In cross-testing, the full ACToR achieved 425/447 = 95.1% pass rate versus 75/177 = 42.4% for the coverage baseline under approximately equal cost (Section 4.2, p. 7). On coverage-guided tests, ACToR-NoFuzz and ACToR reached 90% and 94%, while the coverage baseline was below 40% on adversarial tests (Section 4.2, p. 7). The denominator is test cases in each cross-method suite, not programs.

## technique 3: relative pass-rate evaluation and ablation

The paper avoids evaluating a method only on its own tests, where overfitting can make results look artificially high. It defines relative pass rate as the percentage of one method’s translation passing tests produced by another method (Section 4.1, p. 6). The unioned suites provide 92.6% average line coverage on micro and 90.1% on macro benchmarks (Section 4.1, p. 6).

Compare four baselines: a naive translator restricted to the seed tests, a stronger Claude Opus 4.6 translator without the adversarial loop, coverage-guided two-agent generation, and ACToR without fuzzing (Section 4.1, p. 6). These comparisons isolate the iterative loop, adversarial test choice, and fuzzer construction, and compare them with a stronger LLM. Configuration studies found that adding 3 rather than 1 test per iteration raised pass rate from 94.7% to 98.2% with 16% more cost; adding 5 rather than 3 tests added 1.4 percentage points for 29% more cost; extending 10 iterations to 20 added 1.4 percentage points at 2.1× cost (Section 4.2, p. 8; Appendix H, p. 19). Three default runs averaged 97.0%; the 1.9 percentage-point deviation is the average of per-program sample standard deviations across the three runs (Section 4.2, p. 8).

Verus form. Inference: evaluate verified Rust with independently generated behavioral tests, but report proof success, solver time, and specification changes separately. A passing differential suite cannot be counted as a Verus proof.

## what is proved, trusted, and relevant to VL

The paper reports measured behavioral agreement on selected tests and improvements from adversarial feedback. It does not present a proof of C/Rust equivalence, fuzzer completeness, or agent correctness; its equivalence goal excludes inputs triggering memory-unsafety in C (Section 3.1, p. 4). Inference: interpreting the pass rates relies on the C oracle, test normalization, compilers, execution environment, and deterministic behavior. For the main benchmarks, the authors state, “After all the experiments finished, we manually reviewed the final translations output by ACToR, confirming they are indeed safe and contain no malicious constructs intended to bypass the checking.” (Section 4.1, p. 6) The C2SaferRust experiment retained existing unsafe code (Section 4.3, p. 9); the older Sonnet-4 macro experiment removed unsafe blocks only after translation (Appendix I, p. 19).

Inference: for VL, ACToR can supply tests and counterexamples before a Verus proof. Treating its pass rate as verification could miss behavior, and the C oracle may encode an unintended requirement. A possible extension is proving that generated Rust satisfies a reviewed semantic contract and measuring repair effort when dependencies change; the paper does not evaluate this extension.

## techniques for the catalog

- adversarial translation loop — alternate a translator and a discriminator while appending validated differential tests
- agent-customized differential fuzzing — generate program-specific inputs, execute C and Rust identically, normalize trivial output differences, and retain mismatches
- cross-method relative pass rate — evaluate each translation on tests generated by other methods to reduce self-test bias
- cost-aware ablation — vary seeds, iterations, tests per iteration, and fuzzing while recording pass-rate denominators and token or dollar cost
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Against the strong baseline (Claude Opus 4.6), we compare ACToR and the strong baseline on the coverage-baseline tests (neither method sees them during translation)."): checked the full paper text, study quotations, numbers, references, and technique steps; corrected figure and section page references, retry and batch behavior, sandbox enforcement, baseline descriptions, deviation definition, and unsafe-code exceptions; did not reproduce experiments, inspect implementation code, or validate the inferred Verus/VL extensions. The paper link uses arXiv:2510.03879v3 from p. 1.
