# C2SaferRust: Transforming C Projects into Safer Rust with NeuroSymbolic Techniques
(authored by agents unless marked 🧑)
Tag: `nitin2025c2saferrust`, [paper](https://arxiv.org/abs/2501.14257v2)

## scope and result

C2SaferRust combines a deterministic C2Rust transpilation with LLM rewriting and static analysis. C2Rust first produces compilable but non-idiomatic unsafe Rust. C2SaferRust then decomposes that program into translation units, supplies call-graph and dataflow context to an LLM, swaps in each safer translation, compiles, runs end-to-end tests, and repairs failures with feedback. The abstract states: “We then decompose the unsafe Rust code into slices that can be individually translated to safer Rust by an LLM.” (Abstract, p. 1). It reports: “The resulting programs still pass all test cases.” (Abstract, p. 1).

## technique 1: compiler bridge plus bounded translation units

what it is and when to use it

The deterministic transpiler supplies a compilable bridge, while the LLM rewrites manageable slices into idiomatic Rust. The system limits each unit to `L=150` lines in the evaluation. A root unit represents the function and includes its signature; extracted inner units are nested pieces, represented by annotated placeholders in the root prompt (Fig. 2, p. 5). Partial safe and unsafe Rust coexist, so each accepted rewrite can be tested before the next.

The paper explains the need: “Tackling an entire codebase at once can lead to inefficiencies and increased complexity.” (Section 1, p. 1). It defines the strategy: “Instead, we propose breaking down the translation process into smaller, manageable components, such as individual methods or functions.” (Section 1, p. 1).

how to apply it

1. Run C2Rust on the C project and retain the generated unsafe Rust as the bridge (Sections 1 and 3.1, pp. 2–3).
2. Traverse each function’s AST in depth-first post-order; split subtrees larger than `L` lines into sibling groups and remove each extracted group, so each unit has at most `L` lines according to Algorithm 1 (Section 3.2.1, p. 4; Algorithm 1, Appendix A, p. 13).
3. Mark root units with the function signature and inner units with their live-in/live-out variables (Sections 3.2.1 and 3.3, pp. 4–5).
4. Translate one unit, replace its original span, compile and run the system tests, and keep the original unsafe span if all `N` translation attempts fail (Section 3.4, p. 6).
5. Continue until every unit has been attempted exactly once; the final project may still contain unsafe functions (Section 3.4, p. 6).

Inference: in Verus, each unit is a natural proof boundary. Keep a safe wrapper’s `requires` and `ensures` stable while replacing its implementation, then prove the wrapper before moving to callers. This is a recommendation derived from the decomposition; the paper does not use Verus or contracts.

## technique 2: dependency-aware ordering

what it is and when to use it

A caller may still need unsafe blocks to call an unsafe callee or manipulate its raw-pointer interface (Section 3.2.2, p. 4). C2SaferRust therefore orders functions so callees are translated before callers. It builds a call graph, finds weakly connected components, reverse-topologically sorts acyclic components, and uses depth-first post-order for cycles. Units from one function remain contiguous.

The paper states: “The optimal order for translation is moving up the chain of propagated side effects, i.e., translating a unit before translating the units to which its side effects are propagated.” (Section 3.1, p. 3). It specifies: “So each function should ideally be processed before its callers.” (Section 3.2.2, p. 4).

how to apply it

1. Build the directed call graph over the transpiled Rust functions (Section 3.2.2, p. 4).
2. Convert edges to undirected edges to obtain weakly connected components (Section 3.2.2, p. 4).
3. Reverse-topologically sort each acyclic component; for a cyclic component, choose an arbitrary start and use depth-first post-order (Section 3.2.2, p. 4).
4. Keep all units of a function contiguous and process components in any order (Section 3.2.2, p. 4).
5. Re-run static analysis after each translation because signatures and propagated side effects change (Section 3.1, p. 4).

Inference: a Verus workflow can use the same order to establish callee contracts before caller proofs. Cycles require mutually recursive specifications or an abstraction; the paper’s fallback ordering does not prove that a cyclic translation is sound.

## technique 3: static slicing for context-complete prompts

what it is and when to use it

Translation units cannot be understood in isolation. C2SaferRust uses compiler HIR for call graphs and decomposition and MIR for dataflow. A root slice includes source, all call sites, used globals, and imports. An inner slice includes source, live-in/live-out variables, used globals, and imports. The LLM is asked to preserve the live boundary for inner units and to translate call sites alongside a root signature change.

The paper lists the root context: “The source code of the translation unit”; “The function’s call sites”; “Global variables used in the function”; and “Module imports used in the file” (Section 3.3, p. 5). For an inner unit it uses “Its live-in and live-out variables” (Section 3.3, p. 5).

how to apply it

1. Identify root and inner units from the AST partition (Section 3.2.1, p. 4).
2. For each root, collect call sites, globals, imports, and signature; for each inner unit, compute first and last basic blocks and derive live-in/live-out variables from MIR debug information (Section 3.3 and Section 4.3, pp. 5–7).
3. Compose a structured prompt with the unit and context; permit needed imports in the response (Section 3.4, pp. 5–6; Fig. 4, p. 5).
4. Require an inner translation to leave its live-in/live-out interface unchanged, preventing effects on other code (Section 3.4, p. 6).
5. If a root signature changes, translate its call sites in the same prompt and replacement (Section 3.3, p. 5; Fig. 4, p. 5).

Inference: this resembles a proof context: live variables become contract parameters, and imported globals become explicit trusted state. A Verus proof should expose all such state in specifications instead of relying on an opaque prompt context. The paper does not show that its slices preserve all semantic dependencies, especially aliasing through foreign calls.

## technique 4: compile/test feedback repair loop

what it is and when to use it

After each LLM rewrite, C2SaferRust swaps the code into the hybrid project, compiles it, and runs the original end-to-end tests when available. The Laertes benchmarks lack such tests (Section 4.1, p. 6). Compiler diagnostics and test failures are fed to the same LLM to regenerate the whole unit, call sites, and imports. The loop stops after success or `N` attempts; the evaluation uses `N=5`.

The paper states: “If the program doesn’t compile or pass test cases, we give the LLM feedback and repeat.” (Fig. 1 caption, p. 2). It also says: “We repeat this for up to N attempts (where N is a parameter of our technique).” (Section 3.4, p. 6).

how to apply it

1. Replace the selected unsafe span with the generated safer Rust (Section 3.4, p. 6).
2. Compile and run system-level tests from the original C project (Section 3.4, p. 6).
3. If compilation or tests fail, include diagnostics in a repair prompt and ask for a complete regenerated unit, call sites, and imports (Section 3.4, p. 6).
4. Repeat up to `N`; if no attempt succeeds, restore the original unsafe code and proceed (Section 3.4, p. 6).
5. Define translation success as both compilation and test passing; the paper studies success rate and attempts by function length for units up to 150 lines (Section 5.3, p. 9).

Inference: in Verus, add verification between compilation and acceptance: run `verus` on the new unit and require all contracts to pass before replacing the old implementation. Compiler/test repair can fix type and regression errors but cannot detect an underspecified contract or an untested memory bug.

## technique 5: benchmark and safety metrics

what it is and when to use it

The authors contribute seven GNU Coreutils programs, each with end-to-end tests, and select ten Laertes programs for comparison. They measure raw-pointer declarations, raw-pointer dereferences, unsafe lines, unsafe call expressions, and unsafe type casts before and after translation. They also compare C2SaferRust with Laertes and CROWN and ablate chunking and translation order.

The paper describes its dataset: “We contribute a benchmark dataset of 7 C programs collected from GNU coreutils.” (Section 4.1, p. 6). It defines success: “a correct translation is one that compiles and passes tests.” (Section 5.3, p. 9).

how to apply it

1. Record baseline counts over the complete program and, where appropriate, over functions covered by tests (Section 4.4, p. 7; Table 2, p. 8).
2. Run the translation with fixed `L=150`, `N=5`, and the same `gpt4o-mini` model used in the experiments (Section 4.3, p. 7).
3. Recompute all five safety metrics after translation and report each program’s before/after denominator (Table 2, p. 8).
4. On the Laertes set, compare against Laertes and CROWN; report that CROWN was run on only four of ten projects because of unions and variadic arguments (Section 5.2, p. 8, footnote 6).
5. Run ablations with no chunking and random function order on `cat`, `uniq`, and `head`; compare 15 settings (three utilities × five metrics) (Section 5.3, p. 9).

On the seven Coreutils programs, Table 2’s whole-program averages report reductions of 25% in raw-pointer declarations, 22% in dereferences, 24% in unsafe lines, 8% in unsafe calls, and 30% in unsafe casts (Table 2a, p. 8). The largest raw-pointer declaration reduction is 38% for `cat`, the largest dereference reduction is 27% for `uniq`, and the largest unsafe-line reduction is 28% for `uniq` (Table 2a, p. 8). These maxima differ from the whole-program averages. The Section 5.1 summary box (p. 8) disagrees with Table 2a on calls and casts; the values here follow the table. For covered functions only, Table 2b gives different averages: 13%, 13%, 14%, 7%, and 29% for those metrics (Table 2b, p. 8).

The authors report that the full system beats both “No Chunking” and “Random Order” in 9 of 15 settings (Section 5.3, p. 9). Table 4 (p. 11) repeats unsafe-line values in its unsafe-casts column, Inference: those repeated entries do not independently support a cast-specific ablation conclusion. Figure 6 studies only functions of at most 150 lines; the authors describe declining success and increasing attempts with length after excluding the right-hand outliers (Section 5.3, pp. 9–10). The comparison summary reports aggregate win/tie/loss of 39/2/9 over five metrics (Section 5.2, p. 9), while Table 3 separately reports C2SaferRust’s per-metric aggregates on the Laertes set, such as 10/0/0 for unsafe lines (Table 3, p. 10). These denominators and benchmark subsets must not be conflated.

## technique 6: retained unsafe code and explicit limitations

The system progressively replaces unsafe functions but deliberately leaves failed units unchanged, so its correctness claim is relative to supplied tests (Section 3.4, p. 6). Foreign-function interfaces remain unsafe: “Another observation is that the LLM does not replace C FFI function calls with their safe Rust equivalents; rather, it uses unsafe code to wrap these FFI calls.” (Section 7, p. 11). The paper says raw pointers can be eliminated only when external functions are replaced with safe Rust equivalents, which is beyond its scope (Section 5.1, p. 7). It also excludes translating code outside functions, such as struct and enum definitions (Section 3.2.1, p. 4).

Inference: a Verus product should mark such boundaries as explicit trusted interfaces. `external_body` may be used only for a deliberately trusted function boundary, while the function being verified should retain a real body and contracts. The paper’s tests do not establish that unsafe FFI or pointer casts satisfy Verus specifications.

## techniques for the catalog

- transpiler bridge — use C2Rust unsafe Rust as an executable intermediate representation for incremental safer rewrites
- bounded AST decomposition — split functions into context-sized root and inner translation units
- dependency ordering — reverse-topologically translate callees before callers and reanalyze after changes
- HIR/MIR slicing — provide call sites, globals, imports, and live variables as unit-specific context
- feedback repair — compile and run end-to-end tests, then regenerate failed units up to a fixed attempt bound
- unsafe-code metrics — measure raw pointers, dereferences, unsafe lines, calls, and casts with explicit denominators
- ablation validation — compare chunking and ordering choices across fixed programs and metrics
