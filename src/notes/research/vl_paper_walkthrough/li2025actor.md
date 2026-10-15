# Adversarial Agent Collaboration for Correctness Improvements of C to Safe Rust Translation
(authored by agents unless marked 🧑)
Tag: `li2025actor`, [paper](http://arxiv.org/abs/2510.03879v3)

## problem and method

ACToR wraps a C-to-Rust translator in an adversarial loop. A translator agent proposes safe Rust; a discriminator treats the original C executable as an oracle, searches for inputs producing different behavior, and feeds those tests back for repair. The paper defines the goal as agreement on every input that is memory-safe in C, while ordinary translation checks only a small seed set. It says, “the resulting Rust code frequently diverges from the C source on inputs absent from the test suite used during translation” (Abstract, p. 1). Inference: this is differential testing, not a proof of equivalence or of absence of Rust defects.

## technique 1: append-only translator–discriminator loop

When to use it. Use the loop when a deterministic C program can be run as an executable oracle and a safe Rust translation can be compiled and tested. The evaluation assumes single-threaded deterministic behavior (Section 4.1, p. 5), so nondeterministic services need a different oracle or normalization.

Steps from Section 3.2 (p. 4):

1. Start with C program `c`, seed tests `T0`, translator `F`, and discriminator `D`.
2. Ask `F` for an initial Rust translation `rs′` that passes every test in `T0`.
3. Give `c` and `rs′` to `D`. It uses static inspection, manual tests, and a customizable differential fuzzer to emit tests on which outputs disagree.
4. Validate each proposed test: it must be well formed and execute successfully on C. Append accepted tests to the persistent set `T`.
5. Ask `F` to update `rs′` using safe Rust so it passes the enlarged `T`. Retry within the fixed retry limit; if tests still fail, retain the latest translation and continue.
6. Repeat until `MAX_ITER`, returning `rs′` and all accumulated tests.

The authors state, “ACToR maintains an append-only test set T, initialized to the seed set T0” (Section 3.2, p. 4). The figure caption describes the operational effect: “The Translator and the Discriminator agents update the translation and the tests in turn to iteratively improve the correctness of the translated program.” (Figure 1, p. 3) The validator rejects unsafe constructs and checks all current tests; sandboxing gives the translator write access to Rust files and the discriminator write access to tests while keeping C and build scripts read-only (Section 3.2, p. 4).

Verus form. Inference: use differential tests as counterexamples while proving a Rust implementation’s explicit contract in Verus. A Verus function can state `requires` for the valid input domain and `ensures` for output and state correspondence; loop `invariant` clauses capture preservation. The C binary and any FFI remain trusted specifications. ACToR’s test set cannot replace universal quantification or prove that the contract expresses C behavior.

Evidence. The micro benchmark has 6 programs and at least 60 validation tests each; the macro benchmark has 57 BSD utility programs, 27,268 total lines, and 702 functions (Table 2, p. 5). With Claude Code and Sonnet 4.5, ten iterations increased average hidden-test pass rate from 89.2% to 98.2% (Section 4.2, p. 7). Across seven agent/model configurations, the loop improved correctness; with C2SaferRust’s seven-program set, pass rate rose from 76.3% to 92.9% (Abstract and Introduction, pp. 1–2).

Limits. The loop can retain a translation that still fails tests after retries (Section 3.2, p. 4). A test suite samples behavior; no finite test set proves equivalence on all safe inputs. Inference: production use needs a separate Verus specification and review of every unsafe boundary, even when ACToR reports a high pass rate.

## technique 2: differential fuzzer construction

The discriminator customizes a fuzzer to each program’s input space, runs C and Rust on identical JSON-described inputs, normalizes known trivial differences such as path names, and compares outputs. Test records include setup and cleanup commands, output redirection, and regular expressions (Section 4.1, p. 6). Fuzzer construction is enabled by default; ACToR-NoFuzz removes it for ablation (Section 3.2, p. 4).

Apply it by defining a common test runner, letting the discriminator generate three tests per iteration, validating C execution, then appending tests before translation repair. The default micro configuration starts with 15 manually crafted seeds, runs 10 iterations, and adds 3 tests each iteration (Section 4.1, p. 6).

Verus form. Inference: a generated failing input should become a regression lemma or executable test around a Verus function. It can instantiate a `requires` domain and expose a missing `ensures` clause, but fuzzer output itself is not proof.

Evidence. In cross-testing, the full ACToR achieved 425/447 = 95.1% pass rate versus 75/177 = 42.4% for the coverage baseline under approximately equal cost (Section 4.2, p. 7). On coverage-guided tests, ACToR-NoFuzz and ACToR reached 90% and 94%, while the coverage baseline was below 40% on adversarial tests (Section 4.2, p. 7). The denominator is test cases in each cross-method suite, not programs.

## technique 3: relative pass-rate evaluation and ablation

The paper avoids evaluating a method only on its own tests, where overfitting can make results look artificially high. It defines relative pass rate as the percentage of one method’s translation passing tests produced by another method (Section 4.1, p. 6). The unioned suites provide 92.6% average line coverage on micro and 90.1% on macro benchmarks (Section 4.1, p. 6).

Compare four baselines: a one-shot naive translator, a stronger one-shot Claude Opus 4.6 translator, coverage-guided two-agent generation, and ACToR without fuzzing (Section 4.1, p. 6). This isolates iterative repair, adversarial test choice, and fuzzer construction. Configuration studies found 3 tests/iteration raised pass rate from 94.7% to 98.2% with 16% more cost; five tests added only 1.4% for 29% more cost; 20 iterations added 1.4% at 2.1× cost (Section 4.2, p. 8). Three default runs averaged 97.0% with 1.9% standard deviation (Section 4.2, p. 8).

Verus form. Inference: evaluate verified Rust with independently generated behavioral tests, but report proof success, solver time, and specification changes separately. A passing differential suite cannot be counted as a Verus proof.

## what is proved, trusted, and relevant to VL

The paper demonstrates measured behavioral agreement on selected tests and that adversarial feedback improves a safe translation. It does not prove C/Rust equivalence, completeness of the fuzzer, correctness on undefined C behavior, or correctness of the agents. Trusted components include the C oracle, test normalization, compilers, execution environment, LLM outputs, and the assumption of deterministic programs. The authors manually reviewed final outputs and found no unsafe blocks (Section 4.1, p. 6).

Inference: threat to a product that emits agent-written verified Rust is substantial if ACToR is treated as the verification step: adversarial tests can miss a behavior and the C oracle may encode an unintended requirement. Its useful role is test generation and counterexample discovery before Verus proof. VL should not redo the paper’s 63-utility benchmark as a novelty claim; a worthwhile extension is proving that generated Rust satisfies a reviewed semantic contract and measuring repair effort when dependencies change.

## techniques for the catalog

- adversarial translation loop — alternate a translator and a discriminator while appending validated differential tests
- agent-customized differential fuzzing — generate program-specific inputs, execute C and Rust identically, normalize trivial output differences, and retain mismatches
- cross-method relative pass rate — evaluate each translation on tests generated by other methods to reduce self-test bias
- cost-aware ablation — vary seeds, iterations, tests per iteration, and fuzzing while recording pass-rate denominators and token or dollar cost
Checked 2026-10-15 against paper li2025actor: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
