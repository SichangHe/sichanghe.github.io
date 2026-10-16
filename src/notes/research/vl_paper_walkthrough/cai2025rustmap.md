# RustMap: Towards Project-Scale C-to-Rust Migration via Program Analysis and LLM
(authored by agents unless marked 🧑)
Tag: `cai2025rustmap`, [paper](http://arxiv.org/abs/2503.17741v1)

## what the paper measures
RustMap translates project-scale C by splitting code into dependency-aware units, prompting ChatGPT 4o, compiling after each unit, and comparing C/Rust execution states. The paper’s evaluation takeaway is: “RustMap can produce runnable Rust projects that pass the same test cases as the original C projects.” The overview says: “RustMap first generates a Rust project scaffolding where each C header file and each C function is mapped to a Rust file” (Section 2, PDF p. 4). The evaluation reports 125 RosettaCode programs and bzip2 converted to runnable Rust; coverage is measured against the code executed by the given tests, not all source (Section 5.1, pp. 15–16).

## technique: scaffolding and translation units
What it is. `cargo new` creates a project; each C file maps to a directory, each function or global/data/macro group maps to a Rust file, and each header maps to a shared header module (Section 3.1, pp. 5–6). Directives are handled as units with their def-use dependents. Common library includes can be omitted and replaced with Rust libraries; project headers become `mod` declarations (Section 3.2, pp. 7–8).

How to apply it.
1. Initialize Cargo and create a Rust file for each function, global/data group, and header (Section 3.1, p. 6)
2. Group preprocessor directives with directly dependent code using def-use analysis; split an oversized unit at dependency boundaries (Section 3.2, p. 7)
3. Keep numerical macros as typed Rust constants when possible; rewrite complex macros as typed functions after giving ChatGPT their uses and callers (Section 3.2, pp. 8–9)
4. Preprocess unsupported conditional directives with GCC into `.i` files so the remaining C is compilable and analyzable (Section 3.2, pp. 9–10)

Verus form. Inference: represent each unit’s interface as a Rust module with `requires`/`ensures`; use `spec fn` predicates for well-formed constants and data layouts. Proof-only `proof fn`s can establish that a macro-to-function rewrite preserves a specified expression, while executable code uses the typed constant or function. Inference: GCC preprocessing is a trusted transformation unless its output is related to the original source by a separately checked refinement argument.

## technique: call-graph order with SCCs
RustMap obtains dynamic call graphs with gprof and static graphs with cflow. Dynamic edges prioritize functions exercised by tests; static edges improve completeness. Tarjan’s algorithm finds strongly connected components (SCCs), and each SCC becomes one unit; depth-first search emits children before callers (Section 3.3, pp. 10–11). The paper warns: “Due to this translation strategy, RustMap cannot ensure the functional correctness of non-executed functions yet” (footnote 13, p. 10).

How to apply it. Run representative tests and record dynamic edges; compute conservative static edges; begin at the main entry; DFS through callees; collapse recursive SCCs; translate each child unit before its caller; split an SCC only when it exceeds the LLM input limit (Section 3.3, pp. 10–11). If a dependency is unknown, instruct the model to leave a placeholder, request the missing definition, or ignore it only when safe for the current test (Section 3.3, p. 11).

Verus form. Inference: maintain a ghost set of translated nodes and an invariant that every emitted node’s dependencies are in that set. Use `decreases` on the DFS measure and `ensures` to relate unit order to dependency closure. Inference: dynamic coverage still cannot prove unexecuted functions; Verus contracts must be written for those functions or the product must explicitly mark them unverified.

## technique: compiler and state-feedback repair
The translation prompt requests idiomatic Rust, minimal unsafe code, explicit numeric types, bounds caution, and overflow awareness (Figure 7, p. 13). After each unit, rustc diagnostics are returned to ChatGPT for up to three repair attempts (Section 4.3, p. 14). Once the whole program compiles, RustMap instruments both programs and compares execution states. A binary search places corresponding breakpoints; if states match, it searches the second half, otherwise the first, until fewer than ten simple candidate statements remain (Section 4.4, pp. 14–15). The faulty fragment and before/after states are then given to ChatGPT for up to three fixes.

Verus form. Inference: run Verus after each unit and feed the failing obligation, source span, and current contract to the model. Replace runtime-state comparison with a relational `spec fn` over C-model and Rust-model states, then prove an `ensures` relation for each translated unit. Inference: a binary-search debugger can localize a failing test but cannot replace a proof of all executions.

## technique: safe rewrites for difficult C idioms
Global primitive variables become `lazy_static!` values protected by `Mutex`, with getter/setter functions, avoiding mutable statics (Section 5.2, pp. 18–19). Pointer aliases become one owning `Vec` plus conversion functions; without endianness, copy to a temporary `Vec`, operate, and copy back; with endianness, branch on `cfg!(target_endian)` and use byte conversions (Figures 11–12, pp. 20–22). C switch fall-through becomes a Rust `match` inside a state loop; `goto` macros are split into functions returning `Result`, with explicit state updates (Figures 13–14, pp. 23–24).

Verus form. Inference: model a mutex-protected global with a ghost invariant relating the lock value to the abstract state; prove getters and setters with `requires`/`ensures`. For alias rewrites, use ownership of one `Vec`, slice/index bounds in `requires`, and `proof fn` lemmas for byte-order round trips. Inference: `cfg!` branches require platform-specific contracts; a proof for one target endian does not prove the other.

## evidence, trusted parts, and threat to VL
RustMap reports bzip2 average function coverage 94.4% and line coverage 92.8% relative to executed code; 125 RosettaCode files reach 95.3% function and 93.2% line coverage (Table 1, p. 16). Unsafe blocks for bzip2 fall from C2Rust’s 3,824 total listed blocks (386 mutable-global, 3,424 raw-pointer, 14 alloc, 1 external call) to RustMap’s 253 (126, 122, 5, 0); RosettaCode falls from 1,593 to 3 (Table 2, p. 17). Cognitive Complexity is lower than C2Rust with p-value < 0.05 (Section 5.1, p. 17). These counts are tool classifications, and the functional guarantee is only for supplied tests.

Trusted components include ChatGPT prompts, gprof/cflow, GCC preprocessing, rustc, instrumentation, test inputs, and the assumption that state comparisons capture intended semantics. The paper reports that copied vectors may reduce efficiency and that concurrency was not evaluated (Section 5.3, p. 25). Inference: threat to agent-written verified Rust is high for unexecuted code, C undefined behavior, aliasing, and platform assumptions. VL should reuse the unit decomposition and state-localization ideas but require Verus contracts and coverage accounting before claiming verification.

What is already done. RustMap already implements project scaffolding, dynamic/static dependency ordering, compiler feedback, state-difference localization, macro rewrites, alias-safe vectors, and goto/state-machine rewrites. Inference: VL should not redo these as generic migration features; a distinct contribution would need formal refinement proofs or Verus-specific repair evaluation.

## techniques for the catalog
- dependency scaffolding — map C functions, globals, macros, and headers into mergeable Rust translation units
- dynamic/static graph ordering — combine test traces, conservative call graphs, DFS, and Tarjan SCCs
- compiler-feedback repair — iterate rustc diagnostics with bounded LLM retries
- execution-state localization — binary-search corresponding C/Rust states before asking for a fix
- alias and control-flow rewrites — replace raw aliases, fall-through, and goto with vectors, state loops, and explicit results
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
