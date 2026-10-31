# Translating Large-Scale C Repositories to Idiomatic Rust
(authored by agents unless marked 🧑)
Tag: `dehghan2025rustine`, [paper](http://arxiv.org/abs/2511.20617v1)

## result and what is being verified

Rustine is an automated five-stage pipeline for translating a whole C repository, including application code, tests, and build/configuration files, into Rust. The paper reports: “Evaluating on a diverse set of 23 C programs, ranging from 27 to 13,200 lines of code, Rustine can generate fully compilable Rust code for all and achieve 87% functional equivalence (passing 1,063,099 assertions out of 1,221,192 in test suites with average function and line coverage of 74.7% and 72.2%).” (Abstract, PDF p.1) This percentage measures assertion passes after automated and manual debugging (§3.2, PDF pp.12–13). Inference: these tests provide evidence of functional agreement, not a proof for all inputs; the generated Rust also retains unsafe constructs (Table 3, PDF p.14).

The five stages are preprocessing, refactoring, dependence analysis, LLM translation, and test-based validation/debugging (§2, PDF pp.3–4).

## technique 1: preprocess C before translation

Rustine runs the C preprocessor to insert headers, substitute macros, and resolve conditional compilation such as `#ifdef` and `#if defined()` (§2.1, PDF p.4). This makes syntax visible before prompting; otherwise the LLM must perform context-dependent macro expansion without complete type and function-signature information.

The paper does not present a formal proof of preprocessing equivalence.

## technique 2: semantics-preserving C refactoring

Rustine rewrites constructs likely to produce unsafe or unidiomatic Rust. It refactors unary increment/decrement operations, pointer arithmetic/comparisons, constness, and oversized functions (§2.2, PDF p.4). The stated purpose is to make the source easier for an LLM to translate.

Unary operators. Detect pre/post increment or decrement. If the operator is a standalone expression, desugar it to a compound assignment (for example `*var++;` to `var += 1`). Otherwise split the expression into an assignment and the remaining expression while preserving evaluation order. Skip statements containing multiple unary operations to avoid changing semantics (§2.2.1, PDF p.5).

Pointer arithmetic. Algorithm 1 traverses each function's AST, identifies pointers used in arithmetic/comparison, creates an integer index variable at pointer scope, and replaces accesses with array indexing. Pointer dereferences become `base[index]`; direct pointer comparisons become references such as `&scan[scan_idx]`; reinitialization resets the index. For pointer arguments, Rustine updates the transformed pointer before return to preserve aliases (Algorithm 1 and discussion, PDF pp.5–6). The paper gives `double sum = *w * -1.0` becoming `double sum = w[w_idx] * -1.0` (§2.2.2, PDF p.6; Fig. 3, PDF p.5).

Rustine runs the post-refactoring tests and reverts a refactoring if tests fail (§2.2, PDF p.5). The authors also write: “In addition to post-refactoring test execution, we also prove Rustine pointer operation transformations are semantic preserving (details in Appendix).” (§2.2.2, PDF p.6) The supplied 25-page paper ends with references and contains no appendix, so that claimed proof could not be inspected. The pointer algorithm assumes the original pointer arithmetic is safe; otherwise output may fail to compile or need LLM correction (§2.2.2, PDF p.6).

Constness. A data-flow pass marks parameters not modified in their scope as `const`; this steers the LLM toward `&T` or immutable owned values, while non-const parameters suggest `&mut T` (§2.2.3, PDF p.6).

Large-function breakdown. For a function exceeding a threshold of 50% of the LLM context window, Algorithm 2 finds large basic blocks without early exits, extracts read/write variables, creates `helper_<function>_<block>` functions, passes written variables by reference and read-only variables by value, and replaces each block with a call (§2.2.4, PDF pp.6–7).

Verus form. Inference: establish each C-to-C refactoring as a separate equivalence lemma, then separately prove the Rust translation against its source behavior using explicit models and contracts. Pointer-index rewrites need slice bounds and alias invariants; function breakdown needs a contract whose pre/post state matches the extracted block. Tests alone cannot establish equivalence for unexecuted inputs.

## technique 3: dependence graph and API realization

Rustine builds a context-sensitive directed Dependence Graph with function, struct, union, global, and type nodes. The method states: “Rustine performs a context-sensitive static analysis to construct a Dependence Graph (DG) for C projects.” (§2.3, PDF p.7) Edges represent use-def or caller-callee relations. It finds strongly connected components with Tarjan's algorithm and condenses each into a super translation unit (§2.3, PDF p.7). The graph creates a compilable Rust skeleton, determines reverse topological translation order, and supplies context to prompts.

For core-library calls, Rustine retrieves Linux API descriptions and synopses to help the model find or implement a Rust equivalent; for external libraries it generates FFI bindings with `bindgen` and suggests those bindings to the model (§2.3.1, PDF p.7). The reported examples use `f64::abs` for C `std::fabs`, `ncurses-rs` for ncurses, and FFI for X11 where no exact Rust equivalent existed (§2.3.1, PDF p.8).

API calls are dependencies attached to function nodes, not separate graph nodes (§2.3.1, PDF p.7). Verus form. Inference: attach specifications of effects and data representation to those API dependencies. FFI and OS calls remain trusted unless separately verified; the graph identifies dependencies but proves no API behavior.

## technique 4: two-tier translation with adaptive examples

Rustine translates units in reverse topological order. Algorithm 3 first prompts a base model with the C unit, fixed idiomatic-Rust ICL example, language hints, dependencies, and compilation feedback. It retries up to a base budget. If compilation still fails, it switches to a reasoning model and supplies an adaptive ICL example selected by Rust error code and embedding similarity (§2.4, PDF pp.8–9). The implementation used DeepSeek-V3 for ordinary attempts and DeepSeek-R1 after eight re-prompts still leave compilation errors, with a reasoning budget of two (§3.1.2, PDF p.11). If reasoning attempts also fail, the loop returns to the base model with the latest feedback, stopping at a compilable translation or the outer iteration limit (§2.4, PDF p.8).

Adaptive ICL can retrieve an existing example for an error such as E0308 or ask OpenAI o4-mini to generate a simple buggy/fixed pair when no similar example exists (§2.4.1, PDF p.9). The paper's E0499 example fixes overlapping mutable slices by partitioning with `split_at_mut` before taking three disjoint references (Fig. 5, PDF p.9).

Verus form. Inference: compilation feedback and ICL can propose proof repairs, but generated fixes must be checked by Verus contracts and invariants. Compilation alone does not establish functional equivalence or the correctness of unsafe code and FFI.

## technique 5: assertion-level validation and debugging

After translation, Rustine runs translated tests and counts assertions, not merely test-process exits. The authors write: “Rustine leverages test translation and execution for validation, and to determine an upper bound for functional equivalence: after completing the translation of the entire project, Rustine executes the translated tests.” (§2.5, PDF p.9) For each failure it temporarily disables the failed assertion or test to let the suite continue, re-enables failures one at a time, shortlists the top n functions on the stack trace, and replaces a shortlisted function if it is a focal method examined by a passing assertion (§2.5, PDF p.9). A reasoning LLM receives the C source, Rust translation, and stderr and proposes a fix. Rustine reverts non-compiling changes and disables the failing assertion again. It accepts a compilable fix only when the corresponding test/assertion passes without breaking previously passing tests/assertions (§2.5, PDF p.10).

This is a debugging heuristic. The authors explicitly say it is imperfect because it examines only a subset of possible culprits (§2.5, PDF p.10).

## measured evidence and limits

On 23 repositories, Rustine achieved 100% application and test compilation without human intervention. The evaluation reports: “Rustine successfully translates all the programs and tests, achieving 100% application and test code compilation success (gray rows under column Compilation Success of Table 2).” (§3.2, PDF p.12) It reports 10 projects as fully equivalent without human intervention, after automated debugging. However, two starred projects, xzoom and snudown, have no assertion results in Table 2 (PDF p.13). Inference: the reported count of 10 must not be read as 10 projects with demonstrated full assertion passes.

One developer, with over ten years of relevant industry experience and no familiarity with the subjects, was given ten hours per project to repair the remaining translations. The paper states: “The human developer achieved 100% assertion pass rate on 11 remaining projects, within 4.5 hours on average (min=0.33 and max=10 hours).” (§3.2, PDF p.12) It reports final assertion pass rates of 94% for tulipindicator and 76% for lodepng after manual effort. The final pooled rate is 1,063,099/1,221,192 = 87.0%; the reported mean coverage of 74.7% functions and 72.2% lines describes the augmented subject test suites (§3.1.3, PDF p.12), rather than all translated Rust coverage values. Rustine averaged 3.92 hours and $0.48 per translation (§3.5, PDF p.20).

Safety metrics show raw-pointer declarations/dereferences falling from 4,080/2,045 in C to 198/126 in Rust across the subjects, while pointer arithmetic fell from 452 to 14 after refactoring (§3.2.1–3.2.2, PDF pp.14–15). The translation nevertheless introduced 243 new pointer-arithmetic cases in 14 projects, attributed to C libraries without Rust equivalents and string manipulation (§3.2.2, PDF pp.14–15). Inference: these retained unsafe constructs require separate justification in a verified translation.

Evidence limits. The paper claims pointer-refactoring semantic preservation, but its referenced appendix is absent. It measures compilation, test assertion outcomes, coverage, pointer/unsafe counts, readability, time, and cost. The 87% pooled assertion pass rate is the final reported result after automated and manual debugging, not a before-repair rate.

## techniques for the catalog

- C preprocessing — expand headers, macros, and conditional compilation before analysis
- pointer-index refactoring — replace pointer arithmetic with tracked indices and array accesses
- dependence-graph ordering — use context-sensitive dependencies and SCC condensation to choose translation order
- adaptive two-tier prompting — retry a cheap model, then use a reasoning model with error-indexed examples
- assertion-level validation — execute translated tests, localize failures by stack and assertion, and repair iteratively
