# RustMap: Towards Project-Scale C-to-Rust Migration via Program Analysis and LLM
(authored by agents unless marked 🧑)
Tag: `cai2025rustmap`, [paper](https://arxiv.org/abs/2503.17741v1)

## what the paper measures
RustMap translates project-scale C by splitting code into dependency-aware units, prompting ChatGPT 4o, compiling translated functions with their necessary dependencies, and comparing C/Rust execution states. The paper’s evaluation takeaway is: “RustMap can produce runnable Rust projects that pass the same test cases as the original C projects.” (Section 5.1, p. 16). The overview says: “RustMap first generates a Rust project scaffolding where each C header file and each C function is mapped to a Rust file” (Section 2, PDF p. 4). The evaluation reports 125 RosettaCode programs and bzip2 converted to runnable Rust; coverage is measured against the code executed by the given tests, not all source (Section 5.1, pp. 15–16).

## technique: scaffolding and translation units
What it is. `cargo new` creates a project; each C file maps to a directory, each function or global/data/macro group maps to a Rust file, and each header maps to a shared header module (Section 3.1, pp. 5–6). Scaffolding files are temporary: “The folders and files generated during scaffolding are temporary, mainly for managing the translation units, and will be merged together so that the final Rust project structure closely matches the original C project file/folder structure.” (Section 3, p. 5). Directives are handled as units with their def-use dependents. Common library includes can be omitted and replaced with Rust libraries; project headers become `mod` declarations (Section 3.2, pp. 7–8).

How to apply it.
1. Initialize Cargo and create a Rust file for each function, global/data group, and header (Section 3.1, p. 6)
2. Group preprocessor directives with directly dependent code using def-use analysis; split an oversized unit at dependency boundaries (Section 3.2, p. 7)
3. Use LLM type inference and rule-based rewriting to turn numerical macros into C constants and then typed Rust constants; rewrite complex macros as typed functions after giving ChatGPT their uses and callers (Section 3.2, pp. 8–9)
4. Preprocess unsupported conditional directives with GCC into `.i` files so the remaining C is compilable and analyzable (Section 3.2, pp. 9–10)

Verus form. Inference: represent each unit’s interface as a Rust module with `requires`/`ensures`; use `spec fn` predicates for well-formed constants and data layouts. Proof-only `proof fn`s can establish that a macro-to-function rewrite preserves a specified expression, while executable code uses the typed constant or function. Inference: GCC preprocessing is a trusted transformation unless its output is related to the original source by a separately checked refinement argument.

## technique: call-graph order with SCCs
RustMap obtains dynamic call graphs with gprof and static graphs with cflow. Dynamic edges prioritize functions exercised by tests; static edges improve completeness. Tarjan’s algorithm finds strongly connected components (SCCs), and each SCC becomes one unit; depth-first search emits children before callers (Section 3.3, pp. 10–11). The paper warns: “Due to this translation strategy, RustMap cannot ensure the functional correctness of non-executed functions yet.” (footnote 13, p. 10).

How to apply it. Run representative tests and record dynamic edges; compute conservative static edges; begin at the main entry; DFS through callees; collapse recursive SCCs; translate each child unit before its caller; split an SCC only when it exceeds the LLM input limit (Section 3.3, pp. 10–11). For unknown dependencies, the paper describes instructing the LLM to ignore them, use a generic no-op placeholder, or ask the human for definitions (Section 3.3, p. 11). Inference: ignoring a dependency or inserting a no-op requires separate justification for any claim beyond the supplied tests.

Verus form. Inference: collapse SCCs first, then maintain a ghost set of translated components and an invariant that every emitted component’s external dependencies are in that set. Use `decreases` on a finite graph traversal measure and `ensures` to relate component order to dependency closure. Oversized SCCs split for LLM input limits would need separate reasoning about unresolved dependencies. Inference: dynamic coverage still cannot prove unexecuted functions; Verus contracts must be written for those functions or the product must explicitly mark them unverified.

## technique: compiler and state-feedback repair
The translation prompt requests idiomatic Rust, minimal unsafe code, comments on numeric types, careful type conversions, bounds caution, and overflow awareness (Figure 7, p. 13). When a translated function and its necessary dependencies fail compilation, rustc diagnostics, the faulty Rust code, and the corresponding C code are returned to ChatGPT for up to three repair attempts (Section 4.3, p. 14). Once the whole program compiles, RustMap instruments both programs and compares execution states. A binary search places corresponding breakpoints; if states match, it searches the second half, otherwise the first, until fewer than ten candidate statements remain within a function and they have simple control flow, exemplified by Cyclomatic Complexity below five (Section 4.4, pp. 14–15). Instrumentation uses inserted print statements; LLM-assisted use-def analysis selects fragment inputs and outputs (footnote 17, p. 14). ChatGPT receives the C fragment with its before/after states and the faulty Rust fragment with its before-state for up to three fixes per fragment. The whole localization-and-repair process repeats until timeout or passing the given tests (Section 4.4, p. 15).

Verus form. Inference: run Verus after each unit and feed the failing obligation, source span, and current contract to the model. Replace runtime-state comparison with a relational `spec fn` over C-model and Rust-model states, then prove an `ensures` relation for each translated unit. Inference: a binary-search debugger can localize a failing test but cannot replace a proof of all executions.

## technique: safe rewrites for difficult C idioms
Global primitive variables become `lazy_static!` values protected by `Mutex`, with getter/setter functions, avoiding mutable statics (Section 5.2, pp. 18–19). In the illustrated aliasing case, three pointers become one owning `Vec` plus conversion functions; without endianness concerns, copy to a temporary `Vec`, operate, and copy back; with endianness, branch on `cfg!(target_endian)` and use byte conversions (Figures 11–12, pp. 20–22). The illustrated C switch fall-through becomes a Rust `match` inside a state loop. For the illustrated `goto` inside nested macros, refined human prompts wrap the target code in a function and split `GET_BITS` into two functions, the first returning `Result` (Figures 13–14, pp. 23–24). The authors qualify this result: “This splitting and replacement worked well, although specific for this case; it makes the translated code more readable and maintainable through explicit error handling and state management.” (Section 5.2, p. 24).

Verus form. Inference: model a mutex-protected global with a ghost invariant relating the lock value to the abstract state; prove getters and setters with `requires`/`ensures`. For alias rewrites, use ownership of one `Vec`, slice/index bounds in `requires`, and `proof fn` lemmas for byte-order round trips. Inference: `cfg!` branches require platform-specific contracts; a proof for one target endian does not prove the other.

## techniques for the catalog
- dependency scaffolding — map C functions, globals, macros, and headers into mergeable Rust translation units
- dynamic/static graph ordering — combine test traces, conservative call graphs, DFS, and Tarjan SCCs
- compiler-feedback repair — iterate rustc diagnostics with bounded LLM retries
- execution-state localization — binary-search corresponding C/Rust states before asking for a fix
- alias and control-flow rewrites — replace raw aliases, fall-through, and goto with vectors, state loops, and explicit results
