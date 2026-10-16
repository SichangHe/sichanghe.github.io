# Fixing Rust Compilation Errors using LLMs
(authored by agents unless marked 🧑)
Tag: `deligiannis2023fixing`, [paper](http://arxiv.org/abs/2308.05177v1)

## problem and pipeline

Inference: RustAssistant is a command-line repair loop for Rust source files. It combines compiler or Clippy diagnostics, localized source snippets, a constrained changelog format, multiple LLM completions, patch application, and repeated checking. The paper's objective criterion is that the project builds; semantic preservation is tested on micro-benchmarks and Stack Overflow examples, and manually assessed for mined repository commits.

> “RustAssistant specializes in prompt construction for the purpose of fixing compilation errors, and uses a novel changelog format in order to harness the LLM capabilities.” (Section 1, p. 2)

Inference: The outer loop first runs `check(project)` and chooses one error. It creates an error group containing that error and snapshots the project. The inner loop chooses one grouped error, instantiates a prompt, requests `N` completions, ranks them by the number of resulting checker errors, applies the best completion, and recomputes the group as newly introduced errors minus the prior global set. If the group makes no progress or reaches its unique-error limit (default 100), the tool restores the snapshot and gives up on that group. The outer loop repeats until no errors remain or its iteration bound is exhausted.

> “The completion that results in the least number of errors is ranked the highest. This is, in essence, a best-first search strategy.” (Section 3, p. 4)

Inference: A Verus adaptation can treat both Rust compiler errors and Verus verification errors as checker observations. It should snapshot the candidate, localize each diagnostic, request a structured patch, re-run compilation and Verus, and retain a candidate only when the objective checker score improves. This is an inference; the paper evaluates ordinary Rust and Clippy, not Verus.

## localization and changelog format

Inference: RustAssistant indexes all `.rs` files, uses diagnostic locations and related locations, and extracts a configurable ±50-line window around each location. Every line receives its source number and original indentation. The prompt contains the checker command, diagnostic text and explanation, localized snippets, and formatting instructions. For Clippy, the explanation comes from `cargo clippy --explain ERROR_CODE`.

Inference: The output format is defensive. A `ChangeLog:K@file` has a free-text `FixDescription`, then one or more `OriginalCode@start-end` and `FixedCode@start-end` pairs. Original code must match the actual file exactly; the line ranges must match their repeated line labels; fixed code replaces the consecutive original lines; an empty fixed segment deletes the original. The parser rejects mismatches before applying a patch.

> “All such checks act as a guard; change logs are rejected when this information fails to match.” (Section 3, p. 5)

Inference: In Verus, include the failing `requires`, `ensures`, invariant, or solver diagnostic and the smallest source window containing the relevant proof and executable code. Retain exact original lines and line numbers in the patch protocol. This reduces accidental edits to unrelated proof obligations, but it does not establish that a semantically wrong patch is safe.

Inference: The worked E0515 example shows staged repair. The first completion changes `get` to return `Arc<Bar>` and inserts `Arc` values, but leaves the map declaration as `HashMap<String, Bar>`, producing E0308. A second compiler-guided iteration changes the map type to `HashMap<String, Arc<Bar>>`, after which compilation succeeds. This demonstrates why a loop is needed to propagate a signature/type change to all uses.

## datasets and evidence

Inference: The benchmark has three compilation-error sources. The authors write 270 micro-benchmarks covering 270 of 506 Rust error codes available in compiler 1.67.1, each with a unit test. They collect 50 filtered Stack Overflow programs focused on memory- and thread-safety issues, adding stubs and tests. They mine 182 commits from the top-100 crates and separately collect 346 Clippy errors from the top-10 crates. Package configuration errors and `unsafe`-related errors are out of scope.

Inference: For micro-benchmarks, a fix counts only when it builds and passes the associated test. GPT-4 with five completions fixes 250/270 = 92.59%; with one completion it fixes 249/270 = 92.22%. GPT-3.5 fixes 199/270 = 73.70% with five and 143/270 = 52.96% with one. Failure categories for GPT-4 with five completions are one format, five build, and fourteen test failures, summing to 20/270 failures.

Inference: On Stack Overflow, GPT-4 fixes 36/50 = 72% with five completions and 37/50 = 74% with one; GPT-3.5 fixes 25/50 = 50% and 12/50 = 24% respectively. The paper reports the highest 74% as peak accuracy, but the five-completion setting is not always better. GPT-4 takes at most six inner-loop iterations on micro-benchmarks and up to fifteen on the harder Stack Overflow set.

Inference: On top-100 crates, GPT-4 with five completions fixes all errors in 134/182 = 73.63% of commits and 846/925 = 91.46% of individual errors. With one completion it fixes 99/182 = 54.40% of commits and 796/925 = 86.05% of errors. GPT-3.5 with five fixes 65/182 = 35.71% of commits and 509/925 = 55.03% of errors. The denominators differ: commit success requires every error in a commit to be fixed, while error success counts individual errors.

> “When we consider the ability to fix all errors in a commit, the fix rate is lower, but still impressive at 73.63%, i.e., roughly three-fourths of the commits could have been automatically fixed!” (Section 5, p. 8)

Inference: For Clippy, GPT-4 fixes 259/346 = 74.86%, versus Clippy's own auto-fix at 109/346 = 31.50%. By category, RustAssistant fixes 31/34 = 91.18% of Complexity, 208/291 = 71.48% of Pedantic, and 20/21 = 95.24% of Style. The paper only checks that Clippy accepts the result; it does not independently assess runtime semantics for this dataset.

## prompt and algorithm ablations

Inference: The prompt variants isolate four features. P1 uses only a basic changelog and reaches 29/270 = 10.74% on GPT-3.5. P2 adds line prefixes and reaches 65/270 = 24.07%. P3 adds the original-code section and reaches 157/270 = 58.15%. P4 adds a free-text description before the patch and reaches 199/270 = 73.70%. The authors attribute the large gains to formatting reliability and keeping the model focused.

Inference: Turning off error grouping harms the top-100-crate results because fixes are attempted in a random order and induced errors can grow without bound. The group abstraction lets the tool detect no progress, roll back the group, and continue with other errors. Multiple completions provide a small gain on micro-benchmarks for GPT-3.5 and little gain for already strong GPT-4.

Inference: The paper's manual audit of 134 fixed commits classifies all fixes in a commit into four ordered categories: unambiguous, matching the developer patch, non-matching but judged behavior-preserving, and different runtime behavior. It finds 55 unambiguous, 41 matching, 29 non-matching/same behavior, and 9 different-runtime-behavior commits. These are judgments, not mechanically proven equivalence.

## assumptions, failure modes, and Verus implications

Inference: The compiler is a strong syntactic/type oracle, but “builds” is weaker than functional correctness. The paper records GPT-4 changing `7.0 <<= 2.0` to multiplication by `2.0` instead of preserving the intended `4.0`, so the patch compiles but fails its unit test. Other failures include loops that undo prior patches, partial fixes that require further edits, and attempts to add dependencies in `Cargo.toml`, which the tool cannot edit.

Inference: Threats include possible training-data contamination of mined fixes, subjective semantic review, changing API behavior, and limited coverage of compiler version 1.67.1. The 182-commit audit compares repository fixes and estimated runtime behavior; it is not a proof of equivalence. RustAssistant also excludes `unsafe`, configuration, and foreign-function errors, so its results do not cover all systems code.

Inference: For VL, the useful technique is checker-driven repair of compilation and verification failures, with error grouping and rollback. The product threat is that a Verus proof error may be “fixed” by weakening a specification, deleting an invariant, or adding `external_body`; the paper's compile/test criterion would miss this. VL therefore needs a specification-diff policy, proof-obligation coverage checks, and trusted-construct allowlists in addition to the loop. This is an inference grounded in the paper's compile-versus-semantics distinction.

## techniques for the catalog

- diagnostic localization — extract compiler-linked source windows and related locations instead of sending whole files
- defensive changelog patches — require exact original lines, ranges, indentation, and fixed replacements before mutation
- grouped best-first repair — repair one error group, rank multiple completions by checker-error count, and roll back groups with no progress
- compiler feedback iteration — re-run the checker after each patch so propagated type/signature errors become new repair inputs
- semantic acceptance tests — require build plus independent unit tests for benchmarks because compilation alone does not preserve intent
- prompt ablation discipline — measure each formatting/localization feature against a fixed benchmark and report denominators for commits versus errors
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
