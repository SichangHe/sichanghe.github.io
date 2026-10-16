# Translating Large-Scale C Repositories to Idiomatic Rust
(authored by agents unless marked 🧑)
Tag: `dehghan2025rustine`, [paper](http://arxiv.org/abs/2511.20617v1)

## result and what is being verified

Rustine is an automated five-stage pipeline for translating a whole C repository, including application code, tests, and build/configuration files, into idiomatic safe Rust. The paper reports: “Evaluating on a diverse set of 23 C programs, ranging from 27 to 13,200 lines of code, Rustine can generate fully compilable Rust code for all and achieve 87% functional equivalence.” (Abstract, PDF p.1) Functional equivalence here means test assertions passed; it is not a formal equivalence proof. The pooled count is 1,063,099 passed assertions out of 1,221,192, with mean function and line coverage 74.7% and 72.2% (Abstract, PDF p.1).

The five stages are preprocessing, refactoring, dependence analysis, LLM translation, and test-based validation/debugging (§2, PDF p.3). The paper says: “Rustine follows a five-stage architecture (Figure 1) to progressively refine a C project into idiomatic safe Rust.” (§2, PDF p.3) The pipeline is relevant to VL because it exposes where generated Rust is still only tested, where unsafe code enters, and which transformations have a semantic argument.

## technique 1: preprocess C before translation

Rustine runs the C preprocessor to insert headers, substitute macros, and resolve conditional compilation such as `#ifdef` and `#if defined()` (§2.1, PDF p.4). This makes syntax visible before prompting; otherwise the LLM must perform context-dependent macro expansion without complete type and function-signature information.

How to apply it. Run preprocessing on every translation unit; feed the standardized source to later analyses; preserve the original repository tests for the validation stage. The paper does not present a formal proof of preprocessing equivalence. Inference: a VL implementation should treat preprocessor output as a trusted source transformation and test it against the original C tests before proving the Rust result.

## technique 2: semantics-preserving C refactoring

Rustine rewrites constructs likely to produce unsafe or unidiomatic Rust. It refactors unary increment/decrement operations, pointer arithmetic/comparisons, constness, and oversized functions (§2.2, PDF p.4). The stated purpose is to make the source easier for an LLM to translate.

Unary operators. Detect pre/post increment or decrement. If the operator is a standalone expression, desugar it to a compound assignment (for example `*var++;` to `var += 1`). Otherwise split the expression into an assignment and the remaining expression while preserving evaluation order. Skip statements containing multiple unary operations when the rewrite could alter semantics (§2.2.1, PDF p.5).

Pointer arithmetic. Algorithm 1 traverses each function's AST, identifies pointers used in arithmetic/comparison, creates an integer index variable at pointer scope, and replaces accesses with array indexing. Pointer dereferences become `base[index]`; direct pointer comparisons become references such as `&scan[scan_idx]`; reinitialization resets the index. For pointer arguments, Rustine updates the transformed pointer before return to preserve aliases (Algorithm 1 and discussion, PDF pp.5–6). The paper gives `double sum = *w * -1.0` becoming `double sum = w[w_idx] * -1.0` (Fig. 3, PDF p.5).

Rustine runs the post-refactoring tests and reverts a refactoring if tests fail (§2.2, PDF p.4). It also reports a proof that pointer-operation transformations preserve semantics (details in the appendix), but the paper does not claim a whole-repository formal proof. The pointer algorithm assumes the original pointer arithmetic is safe; otherwise output may fail to compile or need LLM correction (§2.2.2, PDF p.6).

Constness. A data-flow pass marks parameters not modified in their scope as `const`; this steers the LLM toward `&T` or immutable owned values, while non-const parameters suggest `&mut T` (§2.2.3, PDF p.6).

Large-function breakdown. For a function exceeding a threshold of 50% of the LLM context window, Algorithm 2 finds large basic blocks without early exits, extracts read/write variables, creates `helper_<function>_<block>` functions, passes written variables by reference and read-only variables by value, and replaces each block with a call (§2.2.4, PDF pp.6–7).

Verus form. Inference: prove each refactoring as a separate equivalence lemma over the C and Rust models, then use the resulting Rust contracts in Verus. Pointer-index rewrites need slice bounds and alias invariants; function breakdown needs a contract whose pre/post state matches the extracted block. Tests alone cannot establish equivalence for unexecuted inputs.

## technique 3: dependence graph and API realization

Rustine builds a context-sensitive directed Dependence Graph with function, struct, union, global, and type nodes. The method states: “Rustine performs a context-sensitive static analysis to construct a Dependence Graph (DG) for C projects.” (§2.3, PDF p.7) Edges represent use-def or caller-callee relations. It finds strongly connected components with Tarjan's algorithm and condenses each into a super translation unit (§2.3, PDF p.7). The graph creates a compilable Rust skeleton, determines reverse topological translation order, and supplies context to prompts.

For core-library calls, Rustine retrieves Linux documentation and suggests a Rust equivalent; for external libraries it generates FFI bindings with `bindgen` (§2.3.1, PDF p.8). The reported examples use `f64::abs` for C `std::fabs`, `ncurses-rs` for ncurses, and FFI for X11 where no exact Rust equivalent existed (§2.3.1, PDF p.8).

Verus form. Inference: every external API node must receive a Verus specification describing its effects and data representation. FFI and OS calls remain trusted unless separately verified; the graph helps find those trust boundaries but does not prove them.

## technique 4: two-tier translation with adaptive examples

Rustine translates units in reverse topological order. Algorithm 3 first prompts a base model with the C unit, fixed idiomatic-Rust ICL example, language hints, dependencies, and compilation feedback. It retries up to a base budget. If compilation still fails, it switches to a reasoning model and supplies an adaptive ICL example selected by Rust error code and embedding similarity (§2.4, PDF pp.8–9). The implementation used DeepSeek-V3 for ordinary attempts and DeepSeek-R1 after eight failures, with a reasoning budget of two (§3.1.2, PDF p.11).

Adaptive ICL can retrieve an existing example for an error such as E0308 or ask OpenAI o4-mini to generate a simple buggy/fixed pair when no similar example exists (§2.4.1, PDF p.9). The paper's E0499 example fixes overlapping mutable slices by partitioning with `split_at_mut` before taking three disjoint references (Fig. 5, PDF p.9).

Verus form. Inference: compilation feedback and ICL can propose proof repairs, but generated fixes must be checked by Verus contracts and invariants. A successful compile says nothing about functional correctness or memory safety beyond Rust's safe subset; unsafe FFI remains outside that guarantee.

## technique 5: assertion-level validation and debugging

After translation, Rustine runs translated tests and counts assertions, not merely test-process exits. The authors write: “Rustine leverages test translation and execution for validation, and to determine an upper bound for functional equivalence.” (§2.5, PDF p.10) For each failure it temporarily disables the failed assertion or test to let the suite continue, re-enables failures one at a time, uses stack traces to shortlist culprit functions, and removes functions already exercised successfully by passing assertions (§2.5, PDF p.10). A reasoning LLM receives the C source, Rust translation, and stderr and proposes a fix. Rustine reverts non-compiling changes and accepts a fix only when the target assertion passes without breaking earlier passing assertions (§2.5, PDF p.10).

This is a debugging heuristic. The authors explicitly say it is imperfect because it examines only a subset of possible culprits (§2.5, PDF p.10). Inference: VL can use the same failure localization to prioritize proof obligations, but acceptance must require a Verus proof rather than a passing test.

## measured evidence and limits

On 23 repositories, Rustine achieved 100% application and test compilation without human intervention. The evaluation reports: “Rustine successfully translates all the programs and tests, achieving 100% application and test code compilation success.” (§3.2, PDF p.12) and 100% assertion pass rate immediately on 10 projects (§3.2, PDF p.12). A developer then repaired the remaining 11 within 4.5 hours on average (range 0.33–10 h); two projects ended at 94% and 76% assertion pass rate (§3.2, PDF p.12). The final pooled rate is 1,063,099/1,221,192 = 87.0%; mean coverage is 74.7% functions and 72.2% lines (Abstract, PDF p.1). Rustine averaged 3.92 hours and $0.48 per translation (Introduction, PDF p.3).

Safety metrics show raw-pointer declarations/dereferences falling from 4,080/2,045 in C to 198/126 in Rust across the overlapping subjects, while pointer arithmetic fell from 452 to 14 after refactoring (§3.2.1–3.2.2, PDF pp.14–15). The translation nevertheless introduced 243 new pointer-arithmetic cases in 14 projects, mainly for C libraries without Rust equivalents and string manipulation (§3.2.2, PDF p.15). This is a direct warning against treating “safe Rust” output as automatically verified Rust.

Proved or argued: pointer refactoring semantic preservation and Rust compiler acceptance. Measured: compilation, test assertion outcomes, coverage, pointer/unsafe counts, readability, time, and cost. Trusted: C test adequacy, preprocessing, LLM outputs, FFI/OS libraries, unsafe blocks, and the source specifications implicit in tests. Inference: threat to VL is high for an agent pipeline that equates compilability or tests with formal verification; the paper's 87% means 13% of executed assertions failed before repair. Existing VL should not redo repository translation benchmarks. The reusable work is to place Verus contracts after Rustine's refactoring, prove API wrappers, and report proof coverage separately from assertion coverage.

## techniques for the catalog

- C preprocessing — expand headers, macros, and conditional compilation before analysis
- pointer-index refactoring — replace pointer arithmetic with tracked indices and array accesses
- dependence-graph ordering — use context-sensitive dependencies and SCC condensation to choose translation order
- adaptive two-tier prompting — retry a cheap model, then use a reasoning model with error-indexed examples
- assertion-level validation — execute translated tests, localize failures by stack and assertion, and repair iteratively

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
