# Type-migrating C-to-Rust translation using a large language model
(authored by agents unless marked 🧑)
Tag: `hong2024typemigrating`, [paper](https://doi.org/10.1007/s10664-024-10573-2)

This paper presents Tymcrat, an LLM-based workflow that translates C functions to Rust while changing unsafe C-oriented signatures into idiomatic Rust types. The target is compilable, safer Rust; it is not formal verification. The central evidence is a benchmark of GNU C packages (41 in Section 4.2 and Table 1; the Introduction's contribution list says 39, an inconsistency inside the paper), with comparisons between GPT-3.5 Turbo and GPT-4o mini. The abstract states, “Our evaluation shows that the proposed approach yields a 63.5% increase in migrated types and a 71.5% decrease in type errors compared to the baseline (the naïve LLM-based translation) with modest performance overhead.” Later results show that these are configuration- and model-specific outcomes. The 63.5% is GPT-3.5 Turbo with four candidate signatures versus zero candidates, counting Rust-type occurrences (Section 4.3, p. 18). The 71.5% is GPT-4o mini with four candidates, with callee-signature augmentation and error fixing both on versus both off (Section 4.5, p. 24).

## technique 1: generate multiple candidate signatures

What it is. Instead of asking an LLM for one translation, ask it for several idiomatic Rust signatures, translate the function under each, and select among them. The paper's motivation is semantic ambiguity: the same C `int *` can become `&mut i32` when it is mutated in place or `Option<i32>` when it encodes success/failure. It says, “type migration cannot be achieved through syntactic mappings between type names” (Introduction, p. 2).

When to use it. Use candidate generation when C types are overloaded or when a Rust API has several idiomatic representations. A pointer used as an output parameter may move into the return type (Section 2.1, pp. 4–5). The paper also notes that `FILE *` should become `Write` or `Read` rather than `File` (Section 4.4, p. 22), though the LLM often still picks `File`.

How it is done. Ask for N candidate signatures. Discard candidates with signature type errors. Translate the body against each remaining signature. The paper's example asks for two signatures for `div` and obtains `fn div(n: i32, d: i32, q: &mut i32) -> i32` and `fn div(n: i32, d: i32) -> Option<i32>` (Section 3.1, p. 9). Candidate count is configurable. In the evaluation, `Tymcrat0` is direct translation and `Tymcrat1` through `Tymcrat4` generate one through four candidates (Section 4.3, p. 17).

Verus form. Inference: candidate generation can precede Verus verification. For each candidate, compile and run Verus; rank only candidates whose contracts and proofs pass. A candidate function can use ordinary Rust signatures plus `requires`/`ensures`; a selected result needs a semantic equivalence argument or tests against the C behavior. Verus cannot decide which API is idiomatic, and type checking alone does not prove behavioral equivalence.

Evidence and limits. With GPT-3.5 Turbo, four candidates introduced 63.5% more Rust-type occurrences than the zero-candidate baseline (Section 4.3, p. 18). The denominator is average Rust-type occurrences per GNU package, not a percentage of functions. With GPT-4o mini, the corresponding increase was 18.8% (same section, p. 18), showing model dependence. The authors also report fully migrated signatures: GPT-3.5 `Tymcrat0` 70.7% versus `Tymcrat4` 79.9%; GPT-4o mini `Tymcrat0` 87.1% versus `Tymcrat4` 85.6% (Section 4.3, p. 19). These are proportions of signatures in the benchmark settings, and candidate generation reduced unmigrated signatures even when full migration did not improve.

## technique 2: translate callees before callers and augment prompts

What it is. The workflow constructs a syntactic call graph, translates leaf functions first, and includes each translated callee's Rust signature when translating its callers. The paper says, “we translate leaf nodes of the call graph first and then move towards their parents” (Section 3, p. 7).

When to use it. Use it whenever a migrated signature changes argument count, return shape, ownership, or error representation. Callers must know those changes to restructure their bodies.

How it is done. Identify callee names and construct the call graph. Translate leaves. For each caller, add the callee signatures to the prompt and force the output to start with the chosen caller signature. In the paper's `div5` example, without the callee signature the LLM keeps a three-argument call to `div` and compares the integer result with 0, which is a type error; when the translated `div` signature is supplied, it writes `div(5, d)` returning `Option<i32>` (Section 3.2, p. 10). For mutual recursion, choose one function, translate it without all signatures, translate the others, then revisit the first while preserving its original signature (Section 3.2, pp. 10–11).

Verus form. Inference: translate and verify bottom-up at the API level. Put each callee's `requires`/`ensures` contract in the caller's proof context, then prove that caller arguments satisfy the callee precondition and use the postcondition to establish the caller result. Mutual recursion needs a stable contract and a decreasing measure or loop-style proof accepted by Verus; the paper's retry procedure alone is not a termination proof.

Evidence and limits. In the paper's evaluation, function augmentation is an ablation feature. With GPT-4o mini and four candidates, augmentation reduced average type errors by 34.9% relative to the no-augmentation/no-fix setting (Section 4.5, p. 24). The denominator is average errors per GNU package under those exact settings. Augmentation assumes the callee signature itself is correct; a wrong leaf contract can propagate through every caller.

## technique 3: compiler-feedback iterative fixing

What it is. After translation, type-check the function while replacing callee bodies with `todo!()` but retaining their signatures. Apply compiler-suggested fixes automatically, then ask the LLM to fix remaining errors and keep a change only when the number of errors decreases.

When to use it. The paper's examples are missing integer casts, where C converts implicitly and Rust does not (Section 3.3, pp. 11–12). Inference: the same loop may suit other type errors, such as changed return shapes or ownership-sensitive rewrites. It addresses compilation, not semantic equivalence or memory safety beyond what the Rust compiler checks.

How it is done. Algorithm 1 first partitions compiler errors into those with suggestions and those without (Section 3.3, p. 12). Repeatedly apply suggested fixes and re-type-check. Algorithm 2 then supplies the code and all remaining errors to the LLM, type-checks its result, applies suggestions, and accepts the result only if the error count strictly decreases (Section 3.3, pp. 12–13). For an `i32` divided by `i64`, the example fixes the expression to `n as i64 / d` (p. 13).

Verus form. Inference: run `rustc` and Verus after each repair. Treat compiler feedback as a search heuristic; require a Verus proof of the intended contract before accepting a patch. Keep old contracts fixed to prevent the repair loop from “solving” an error by weakening the specification. Use `proof fn` and `invariant` only for proof obligations; do not turn proof code into runtime calls.

Evidence and limits. For GPT-4o mini with four candidates, enabling iterative fixes reduced errors by 58.7% relative to the no-augmentation/no-fix setting, and enabling both techniques reduced them by 71.5% (Section 4.5, p. 24). Even then, each program averaged 1,155.3 type errors (Section 4.5, p. 25), so compilation remained far from complete. The authors warn, “the absence of type errors does not necessarily imply the correctness of the translation” (Section 4.5, p. 25).

## technique 4: select the best translation

What it is. Rank candidate translations first by fewest type errors. If tied, ask the LLM to choose the more Rust-idiomatic implementation pairwise, respecting token limits (Section 3.4, p. 14).

When to use it. In the paper's workflow, selection comes after the type-error fixing step (Section 3, p. 7). Inference: treat idiom selection as a secondary heuristic, since the paper found the LLM sometimes favors non-idiomatic signatures (Section 4.4, p. 22). The paper says `Option` and `Result` are used for partial functions, and that a function writing to `FILE *` should use `Write` and one reading from it `Read` (Section 4.4, p. 22).

How it is done. Compare two implementations at a time. The paper's `div` example selects the `Option<i32>` form as more idiomatic than an output reference plus integer status (Section 3.4, p. 14). Pairwise comparison is required when many candidates would exceed the LLM token limit.

Verus form. Inference: rank verified candidates by proof obligations, test coverage, and API constraints, then use idiom heuristics only for ties. The paper's observed errors show why: the paper says GPT-4o mini frequently maps `void *` to `Any` where generics are preferred, and the LLM (both models) typically maps `FILE *` to `File` where `Read` or `Write` is appropriate (Section 4.4, p. 22). A Verus proof can validate a chosen contract but cannot establish that the API choice matches ecosystem conventions.

## techniques for the catalog

- candidate signature generation — generate several idiomatic Rust APIs before translating a C function
- bottom-up callee augmentation — translate call-graph leaves first and provide their signatures to callers
- compiler-feedback repair — apply suggested fixes, then use LLM repairs only when the error count decreases
- pairwise translation selection — rank by type errors, then compare idiomatic alternatives under token limits
- proof-aware adaptation — inference: run Verus contracts and fixed-spec checks after each compiler repair
