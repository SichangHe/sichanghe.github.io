# EvoC2Rust: A Skeleton-guided Framework for Project-Level C-to-Rust Translation
(authored by agents unless marked 🧑)
Tag: `wang2026evoc2rust`, [paper](https://doi.org/10.1145/3786583.3786856)

## method and purpose
EvoC2Rust translates complete C projects by first creating a compilable Rust project skeleton, then filling function bodies, then repairing compilation errors. It targets incompatible signatures and broken cross-module references in independently translated functions. The paper describes three stages: “(1) Skeleton Construction decomposes the C project into modules and constructs a Rust project skeleton to assemble the Rust modules (Section 2.1); (2) Module Translation incrementally converts definitions, macros, and functions using safety-preserving linguistic mappings (Section 2.2); and (3) Post-Generation Repair combines LLM-based refinement with static analysis for code optimization (Section 2.3).” (section 2, p. 3)

## technique: skeleton construction
Parse the C project with Tree-sitter. Extract filenames, includes, macros, type declarations, globals, function signatures, and declaration-to-file mappings into project metadata. Convert includes to Rust `use` imports and declarations to `pub use` statements. Translate definitions, macros, and signatures to construct a Rust project preserving the original structure. Give every function its translated signature and an `unimplemented!()` body so the project can compile before implementations arrive. The authors explain: “Each C function is assigned a type-checked dummy counterpart in Rust using its translated signature and the unimplemented!() macro.” (section 2.1, p. 3)

Translate and insert function bodies incrementally. The authors say this design enables concurrent processing and isolates translation from cross-module dependencies (section 6.2, p. 10). In the case study, direct prompting passes a raw pointer where a mutable reference is required, while Self-Repair introduces a moved-value ownership error. EvoC2Rust uses `Ptr<T>` and `.cast()` to maintain consistent interfaces and pointer semantics (section 4.5, pp. 8–9; Figure 4, p. 10).

Inference: for Verus, reuse the order of constructing data types and signatures before bodies. Add contracts to those signatures and replace temporary placeholders before claiming verification. The paper does not evaluate Verus or prove that this adaptation works.

## technique: safety-preserving linguistic mappings
EvoC2Rust defines seven mapping categories: types, type conversion, macros/functions, syntax structures, operators, globals, and variadic arguments. Examples include `Ptr<T>` for C pointers, `cstr!()` for null-terminated strings, `CastIntoTyped` for conversions, `c_for`, `c_do`, and `c_switch` for C control flow, `c_ref!()` for address-of, `Global<T>` with an internal `Mutex` for mutable globals, and `VaList` plus `va_format!()` for variadic calls. Table 1 maps `int *` to `Ptr<i32>` and `FILE *` to `FilePtr`. Pointer-to-integer casts are allowed; integer-to-pointer casts are disallowed. A typeless `cast()` supports implicit C conversions. `VaList` models a slice of references to values implementing `Display`, motivated by logging and formatting uses (section 2.2, pp. 3–4).

Encode each mapping as a transformation pattern containing motivation, consequence, solution, and code examples. Embed the source snippet and pattern examples, compute cosine similarity, retrieve the top-K relevant patterns, and insert them into the LLM prompt with paired demonstrations and the source. The paper specifies: “Specifically, we encode both the code snippet and pattern examples into dense vectors, compute cosine similarity, and select the top-K matching patterns.” (section 2.2, p. 4) The implementation uses BGE-M3 embeddings and top-10 retrieval (section 3.4, p. 6).

Inference: a Verus adaptation would need contracts and proofs for each mapping's supported behavior. Pointer operations, synchronization, and formatting require explicit specifications; a wrapper's name alone supplies no evidence of correctness. The paper's mappings are translation aids, not evaluated Verus libraries.

## technique: cascading compilation-driven repair
For each problematic Rust snippet, generate multiple repair candidates from compiler diagnostics and retain candidates that reduce error counts until no further improvement is possible. Run the three repairs in order (section 2.3, pp. 4–5):

1. Bracket repair: ask an LLM to fix mismatched brackets and similar syntax issues using compiler output and examples. The prompt restricts edits to lines with unmatched parentheses.
2. Rule-based repair: apply regex transformations for recurring issues, including misplaced derive macros, redundant `cast()` calls, and array access patterns that cause borrowing conflicts.
3. LLM refinement: provide guidelines, expert-written correction examples, erroneous code, and compilation feedback to address remaining type errors and structural mismatches.

The paper says: “A hybrid strategy—applying rules first, followed by LLM refinement—yields the best results.” (section 2.3, p. 4) Bracket repair precedes these stages to improve compiler diagnostics. The implementation limits bracket repair to five rounds and LLM refinement to three rounds (section 3.4, p. 6).

On C2R-Bench with DeepSeek-V3, removing LLM refinement lowers ICompRate from 93.84% to 89.57%; removing all three repairs lowers it to 74.29%; removing mappings as well lowers it to 56.67% (Table 6, p. 9). These are incremental module compilation rates, not percentages of fully translated projects. The ablation removes repair stages in reverse order because later stages depend on earlier outputs (section 4.3, p. 7).

Inference: compiler-guided edits could also use Verus diagnostics, but fewer errors would remain an intermediate signal. Any claim of verification would require checking the resulting proof obligations and identifying trusted specifications.

## evidence and limits
The paper evaluates Vivo-Bench, containing 19 projects and 113 top-level tests, and C2R-Bench, containing six industrial projects, 8,170 lines of C, and 222 top-level tests (Table 3 and section 3.2, p. 5). Project evaluation constructs a skeleton, inserts translated modules incrementally, and reverts modules that fail compilation. Module evaluation instead replaces one module in a reference Rust implementation and checks compilation and associated tests (section 3.3, p. 6).

On C2R-Bench with DeepSeek-V3, EvoC2Rust reports 93.84% ICompRate and 97.41% SafeRate; module evaluation reports 92.25% compilation and 89.53% test pass rates (Tables 4–5, pp. 7–8). ICompRate measures translated modules compiling within the skeleton. SafeRate measures generated code free of unsafe functions or blocks. Line acceptance compares initial output with manually corrected code; three engineers repair compilation and test failures with Claude Sonnet 4 assistance (sections 3.3–3.4, p. 6). For Vivo-Bench with DeepSeek-V3, Table 5 reports 99.07% module compilation and 98.50% test pass rates, whereas section 4.2 states 100% and 99.07%. These two reports disagree.

On ten larger RepoTransBench projects (9,973–91,588 LoC), EvoC2Rust with DeepSeek-V3 reports 75.61% ICompRate and 96.20% SafeRate. Functions depending on third-party libraries are excluded, and line acceptance is omitted because manually verified Rust references are too costly (section 4.4, p. 8). Across the evaluated datasets, reported translation time averages 0.63 seconds per line (section 4.4, p. 8).

The authors state: “The main internal threat comes from correctness verification, which currently relies on predefined test cases.” (section 5, p. 9) They limit the evaluated settings to single-threaded user-level C with ISO C standard library dependencies and identify multithreading, third-party libraries, and kernel code as future work (section 5, p. 9). They also acknowledge possible training-data leakage and limited evaluation across foundation models. The scale analysis attributes high SafeRate partly to encapsulating low-level operations in a relatively fixed set of unsafe blocks (section 4.4, p. 8).

Inference: VL could reuse the skeleton, retrieved mappings, and repair ordering, but compilation, tests, and SafeRate do not establish semantic equivalence or a Verus proof. The implementation and safety of the custom abstractions would need separate examination.

## techniques for the catalog
- project skeleton: parse metadata and compile a Rust module skeleton with typed `unimplemented!()` placeholders before body translation
- safety-preserving mappings: encode C/Rust type, conversion, macro/function, control-flow, operator, global, and variadic correspondences as transformation patterns
- top-K pattern retrieval: select patterns by embedding similarity and inject them with paired demonstrations into translation prompts
- cascading repair: run bracket repair, regex rule repair, then LLM refinement, retaining candidates that reduce compiler errors
- incremental evaluation: insert translated modules into the skeleton and revert modules that fail compilation

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "To avoid this issue and ensure a meaningful evaluation, we remove components in reverse order, beginning with the final step (LLM refinement)."): checked all study quotations, numbers, technique steps, section references, and PDF page references against the full paper; corrected page references, benchmark/model scope, metric interpretation, the tag year and paper link, and unsupported Verus claims; recorded the conflicting Vivo-Bench module results; did not inspect source code, run translations, reproduce experiments, or validate the proposed Verus adaptations.
