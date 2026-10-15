# The Illusion of Safety: Multi-Tier Verification of AI vs. Human C++ Code
(authored by agents unless marked 🧑)
Tag: `mahmud2026illusion`, [paper](https://www.semanticscholar.org/paper/9e5701151f384740f5ae509c90eb4f05f6a36606)

## question and main result

Mahmud et al. build VULBENCH-CPP to compare three open-weight LLMs with human C++ solutions under four verification tiers: functional tests, static analysis, dynamic sanitizers, and bounded model checking (BMC). The benchmark contains 8,918 programs from 851 CodeContests tasks: 7,223 generated programs and 1,695 human solutions (Abstract and Sections I–III, pp. 1–3). The abstract reports that AI code is “roughly twice as likely as human code to trigger a confirmed runtime violation, even after controlling for code length and test pass-rate.” (Abstract, p. 1).

The central methodological lesson is that these tiers observe different behavior regions. The introduction states: “Consequently, no single verification tier is sufficient.” (Section I, p. 1). Dynamic analysis executes supplied tests; ESBMC explores all paths up to a loop bound; static tools inspect source patterns. The paper is an empirical comparison, not a proof that any tool is complete or that all reported findings are exploitable.

## technique 1: construct a reproducible four-tier harness

Use this when comparing generated systems code with a human baseline. Select tasks with public tests and human solutions, generate a fixed number of independent outputs per task, and run every program through the same pipeline. The authors select 851 instructions, of which 560 have at least one public test and 291 have none. They generate three solutions per task from Gemma 3 27B IT, LLaMA 3.3 70B Instruct, and Qwen 2.5 Coder 32B Instruct, using one zero-shot prompt and temperature/top-p 1.0 (Section IV, pp. 3–4). Human solutions provide the reference group.

The pipeline extracts C++ from responses, compiles and runs public tests, runs cppcheck and clang-tidy, compiles with ASan/UBSan and reruns the same tests, then invokes ESBMC. Every output is retained in a master CSV with per-program verdicts, CWE tags, and cross-tool annotations (Section III, pp. 3–4). Programs are aggregated as binary flags per tool before overlap analysis.

Verus form. Inference: a VL harness should freeze a Rust/Verus commit, specification file, toolchain, solver settings, and input corpus; run functional tests, the Verus verifier, and runtime sanitizers separately; and store each result with its denominator. Inference: the checker result must be tied to the exact source and contract revision, because an unchanged proof can coexist with a changed specification.

Evidence and limits. Human compilation is 1,665/1,695 = 98.2%; AI compilation is 2,018/2,238 = 90.2% for Gemma, 2,272/2,496 = 91.0% for LLaMA, and 2,290/2,489 = 92.0% for Qwen (Table V, p. 4). ESBMC nevertheless emits a verdict for every row, including parse errors. The benchmark is short competitive-programming C++, so its vulnerability distribution may not generalize to production code (Section VII, p. 10).

## technique 2: dynamic memory-safety testing with sanitizers

Compile each program with C++17 and `-fsanitize=address,undefined -fno-omit-frame-pointer`, then run the instrumented binary on the public tests. Classify a program as sanitizer-triggered if ASan or UBSan reports any error. ASan findings are mapped to buffer overflow, use-after-free, and double-free categories; UBSan supplies arithmetic overflow, shift, and null-pointer categories (Section IV-E and IV-H, pp. 4–5).

The method confirms executed violations, so it can expose concrete runtime behavior but cannot find an error on an unexecuted path. Among compiled programs, AI sanitizer rates are 173/2,018 = 8.6% (Gemma), 217/2,272 = 9.6% (LLaMA), and 224/2,290 = 9.8% (Qwen), versus 43/1,665 = 2.6% for humans (Table II, p. 3). The results section summarizes the comparison as 9.3% AI versus 2.6% human when aggregated over compiled programs (Section V-A, p. 5). Restricting to programs with at least one executed test gives 15.5% AI versus 4.3% human (Section V-A, p. 5). These denominators differ and should not be conflated.

Verus form. Inference: runtime tests can complement Verus by exercising the compiled executable and FFI or hardware paths outside the proof model. Inference: sanitizer success cannot discharge a Verus `ensures` clause, and a Verus proof cannot establish behavior of unmodeled unsafe code, external libraries, or the test environment.

## technique 3: bounded model checking with ESBMC

ESBMC v8.0.0 translates C/C++ and safety properties into SMT formulas and exhaustively explores paths up to a finite loop bound. The paper’s invocation is `esbmc "$src" --compact-trace --no-unwinding-assertions --no-div-by-zero-check --overflow-check --unwind 10 --timeout 60` (Section IV-F, p. 4). Interpret verdicts as SUCCESS (no violation found within the bound), FAILED (a concrete counterexample is proven), PARSE_ERROR, TIMEOUT, or ERROR.

The configuration checks array bounds, null dereferences, unsigned arithmetic overflow, leaks, double-free, and use-after-free. It explicitly disables division-by-zero checking and notes that signed integer overflow is not caught by `--overflow-check`; UBSan is needed for that case (Section IV-F, p. 4). BMC therefore gives a formal result relative to the property set and bound, not an unbounded proof of C++ safety.

Across all 8,918 rows, ESBMC returns PARSE_ERROR for 5,039 (56.5%), TIMEOUT for 1,621 (18.2%), SUCCESS for 1,551 (17.4%), FAILED for 661 (7.4%), and ERROR for 46 (0.5%) (Table IV, p. 4). Among analyzable programs, AI failure rates are 234/904 = 25.9% (Gemma), 271/738 = 36.7% (LLaMA), and 135/458 = 29.5% (Qwen), versus 21/112 = 18.8% for humans (Table II, p. 3). The analyzable denominators are inferred from the table’s percentages and are much smaller than the full 8,918.

Verus form. Inference: ESBMC’s bounded paths correspond to a Verus proof only when the Rust function’s contract and loop invariants establish all iterations, rather than bounding exploration. A VL harness should report verifier success, solver timeout, unsupported syntax, and runtime failure separately. Inference: the closest safe workflow is to require Verus to close the function’s `requires`/`ensures` obligations, while retaining bounded model checking or tests for code outside Verus’s modeled subset.

## technique 4: compare tool coverage with set overlap

Represent each tier as a set of flagged programs and compute program-level Jaccard overlap `J(A,B)=|A∩B|/|A∪B|`. The cross-tool subset contains 4,295 programs from 819 tasks where sanitizer execution was possible; all programs still receive ESBMC and static verdicts (Section IV-I, p. 5). The paper notes: “Static tools (cppcheck, clang-tidy) report comparable warning rates for AI-generated and human-written code, superficially suggesting these two are equally safe.” (Section I, p. 1) This avoids pretending that a sanitizer can classify the 291 no-test tasks.

The paper reports dynamic/formal Jaccard approximately 0.05. Of 661 ESBMC-proven violations, 598 are ESBMC-exclusive relative to sanitizers; sanitizers find 576 runtime bugs that ESBMC does not (Section I and Discussion, pp. 1, 9). The abstract’s “near-zero” agreement is therefore a set-overlap claim under the stated tool versions and bounds, not evidence that either tier is wrong.

The authors also fit mixed-effects logistic regressions with a random intercept for task, treating source (AI versus human) as the main fixed effect and retaining relevant covariates after likelihood-ratio elimination (Section IV-H, p. 5). For the 4,961-program dynamic/static regression, AI has adjusted odds ratio 2.15 (95% CI 1.52–3.03, p<0.001) for sanitizer violations and 0.68 (0.57–0.81, p<0.001) for cppcheck flags after length adjustment. Formal regression has n=1,680 and AI OR 1.83 (0.94–3.56, p=0.076); only 96 human programs have conclusive formal verdicts, so this estimate is underpowered (Table VI, p. 5).

Verus form. Inference: compare a Verus proof-failure set, sanitizer-failure set, test-failure set, and unsupported/timeout set with explicit intersections. Use task or repository as a random effect when many generated variants share one specification. Inference: report both full-corpus and analyzable-subset denominators, because filtering parse failures can change apparent rates.

## what the evidence says and where it fails

The paper’s stability check uses three independent generations per model; sanitizer trigger rates vary by at most 0.6 percentage points for Gemma, 1.3 for LLaMA, and 0.5 for Qwen (Section V-B, p. 6). This supports repeatability for the chosen prompt and decoding setup. It does not establish behavior for other prompts, temperatures, models, or production workloads.

Functional tests are insufficient: among test-passing AI programs, 1.8% trigger sanitizer violations; the corresponding human rate is 3.6% (Section V-A, p. 5). This comparison uses only programs passing all tests and should not be interpreted as an overall vulnerability rate. Static warnings are also not equivalent to confirmed bugs: cppcheck flags 33–46% of AI programs versus 45% human, while clang-tidy flags 27.7–33.6% AI versus 59.2% human (Table II, p. 3); the authors attribute much of the latter to code-length and language-feature differences.

The study trusts compiler/tool versions (g++ 13.3.0, cppcheck 2.19.0, clang-tidy 21, ESBMC 8.0.0), sanitizer instrumentation, ESBMC’s frontend and SMT solver, public tests, CWE mappings, and its statistical model. It reports sensitivity to unwind and timeout: a supplementary unwind-20, timeout-120 run finds 832 FAILED verdicts, compared with 661 under unwind 10 and timeout 60 (Section VII, p. 10). Signed overflow remains a sanitizer-only class under the main configuration.

Inference: the threat to a product generating agent-written verified Rust is high if product acceptance relies on one signal. A passing Verus proof can coexist with an incomplete contract; passing tests cover only exercised inputs; static checks can produce mostly style noise; and runtime sanitizers miss unexecuted paths. VL should combine contract review, verifier results, tests, and targeted runtime instrumentation, while labeling every result with scope and denominator. Existing work already combines static, dynamic, and formal checks in C/C++; VL should not claim novelty for merely adding a second checker. Its distinct opportunity is making the specification boundary and trusted assumptions explicit for Rust/Verus.

## techniques for the catalog

- four-tier verification harness — run tests, static analyzers, sanitizers, and bounded model checking on the same programs
- denominator-aware reporting — attach compilation, analyzability, test availability, model, bound, and timeout denominators to every rate
- cross-tool Jaccard analysis — compare flagged-program sets to expose complementary coverage
- clustered risk regression — use mixed-effects logistic regression with task-level random effects and explicit covariates
- scope-sensitive interpretation — separate proven bounded violations, observed runtime failures, warnings, parse errors, and timeouts

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
