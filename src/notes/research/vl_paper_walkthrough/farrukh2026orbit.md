# ORBIT: Guided Agentic Orchestration for Autonomous C-to-Rust Transpilation
(authored by agents unless marked 🧑)
Tag: `farrukh2026orbit`, [paper](http://arxiv.org/abs/2604.12048v1)

## what the paper measures
ORBIT is a project-level C-to-Rust pipeline with dynamic context collection, dependency ordering, generated or expert Rust interfaces, function mapping, specialized agents, and deterministic checks. The abstract states: “ORBIT achieves 100% compilation success and 91.7% test success in both expert-interface and automatically generated-interface settings, substantially outperforming C2Rust and CRUST-Bench, while reducing unsafe Rust code blocks to nearly zero.” The abstract reports evaluation on 24 CRUST-Bench programs, 91.7% of which exceed 1,000 lines; it reports 100% compilation and 91.7% test success in both interface modes (Abstract, PDF p. 1). The system excludes multithreaded and GUI programs because nondeterminism makes verification harder (Section 5, p. 10).

## technique: two-level dependency ordering
What it is. ORBIT parses each `.c` and `.h` with Tree-sitter and tracks function and include nodes. It builds an intra-module graph and an inter-module graph, then uses Kahn’s algorithm twice so callees, base libraries, and utility headers precede their dependents (Section 2.1, PDF pp. 2–3). Cycles are grouped into one translation unit.

How to apply it.
1. Parse every source and header into an AST and retain function signatures, macro-wrapped names, static inline functions, and include nodes (Section 2.1, p. 2)
2. Add local call edges and module-level include edges (Section 2.1, p. 2)
3. Topologically sort functions inside each module; separately sort module groups (Section 2.1, p. 3)
4. Detect a cycle and collapse its entities into one unit so translation can continue (Section 2.1, p. 3)

Verus form. Inference: represent the graph as ghost `Map`/`Set` state and prove that each translation step consumes only nodes whose dependencies are complete. Use a `requires` predicate for the ready-node condition, an `ensures` clause for progress and preserved edges, and a loop `invariant` for the claim that all emitted nodes are ordered. The paper’s parser and Kahn sorting are orchestration code, not a proof of translated Rust behavior.

## technique: agentic iterative scaffolding
What it is. Algorithm 1 starts with `cargo new`, mirrors C files as Rust modules, maps C types, creates function signatures with `unimplemented!()` bodies, repeatedly compiles and repairs, refactors unsafe constructs, translates tests, and finishes with Verify&Repair. The paper gives the central invariant: “The result is a complete, verified Rust translation of the source C codebase” (Section 2.4, p. 5).

How to apply it. Initialize an empty Cargo project; add each discovered type; compile and repair; add each function signature as a stub; compile and repair; run up to K safety-refactor attempts; add translated `#[test]` functions; compile again; run final Verify&Repair (Algorithm 1, PDF p. 4). The compile-repair helper retries until compilable or N attempts (Algorithm 1, lines 21–25). Inference: treat the stub phase as a temporary scaffold only; a Verus pipeline must reject `unimplemented!()` before proof acceptance.

Verus form. Inference: generated interfaces can be Rust structs, enums, and function signatures with `requires`/`ensures`; safety refactors must be followed by Verus proof obligations. Use `proof fn` lemmas for representation invariants and executable `fn`s for translated logic. Inference: a compilable scaffold establishes syntax and types, not memory safety or semantic equivalence.

## technique: validated two-tier function mapping
What it is. For each sorted C function, Tier 1 searches Rust declarations with exact name matching, then lowercased underscore/hyphen normalization; substring and prefix matches are excluded. Tier 2 invokes a Mapping Agent only if static search fails, supplying signatures and both projects. Every JSON mapping is validated by checking that module paths and function declarations exist (Sections 2.3–2.3.2, PDF pp. 3–4).

How to apply it. Build `(c_module,c_function)` pairs; run strict static search; if unresolved, ask the agent to reason over semantic correspondence, parameter count, parameter types, and return types; accept `null` when no Rust counterpart exists; verify module and function paths; retry invalid mappings only up to the configured limit (Section 2.3.2, p. 4). The motivation is concrete: an agent can otherwise hallucinate a mapping or silently miss a function.

Verus form. Inference: encode a mapping as ghost data and prove a lookup postcondition that the target module and signature exist in the generated project model. Keep mapping validation outside the trusted functional proof; it only establishes that the selected symbol is present.

## technique: per-unit orchestration with independent checks
What it is. A Translation Agent implements one mapped function at a time. An Implementation Checker rejects bodies containing `unimplemented!()` or TODO comments; a Compiler Agent repairs errors; the orchestrator independently runs `cargo check`; after all units, a Refactoring Agent removes unsafe operations and a Verifier Agent runs tests and repairs failures (Section 2.4, PDF p. 5). The paper emphasizes, “Rather than accepting an agent’s output at face value, ORBIT independently confirms the result using static analysis or toolchain checks” (Section 2.4, p. 5).

How to apply it. Give the agent the C/Rust projects, target mapping, and explicit scope constraints; check implementation completeness; compile and retry; record only a successful unit; after all units, refactor unsafe code; run the full test suite and repair failed tests; independently re-run `cargo check` after the compiler agent claims success (Section 2.4, p. 5). Inference: replace the final test gate with Verus plus tests, and require a proof artifact for each function before marking its unit complete.

## evidence, assumptions, and threat to VL
On the 24-program CRUST-Bench set, ORBITExt and ORBITGen both reach 100% compilation and 100% test success except LTRE ORBITGen test failure; the abstract summarizes 91.7% overall test success. Average unsafe lines are 0.06% and 0.11% for the two interface modes versus 69.6% for C2Rust (Section 1, p. 2). On the 13 hardest TRACTOR programs, ORBIT passes about 70% (9/13) (Section 1, p. 2). These denominators are programs, not functions; “test success” means all available tests pass. The authors’ ablation defines functional coverage as fully translated C functions excluding stubs and missing functions, and test coverage as original C cases translated and executed by `cargo test` (Section 4.3, PDF p. 9). Removing all structure leaves LTRE with 64.4% functional and 3.0% test coverage; full ORBIT reaches 100% functional and test coverage there, but LTRE still has a semantic-gap test failure (Section 4.3.4, p. 10).

The trusted base includes the C tests, agent prompts, parser, mapping validator, compiler, cargo, and Rust semantics. The paper admits that tests bound equivalence and that some C/Rust library contracts differ: `fputs` truncates at a null byte while `write_all` writes the full slice (Section 4.2, p. 8). Inference: for VL, compilation and tests are evidence of bounded behavior, not a universal proof. Inference: threat is high for untested paths and wrong interface contracts; VL should preserve a complete function-coverage report and use Verus contracts to cover properties absent from tests.

What is already done. ORBIT already provides dependency-guided orchestration, interface scaffolding, mapping validation, iterative compile repair, and dual independent checks. Inference: VL should reuse these controls and add proof-contract review rather than reproduce a generic agent loop.

## techniques for the catalog
- dependency-aware translation order — build intra- and inter-module graphs, topologically sort, and group cycles
- iterative scaffolding — create typed Rust interfaces and repair compilation after each structural stage
- two-tier mapping — exact static lookup first, semantic agent fallback second, with path validation
- independent completion checks — reject stubs/TODOs and independently rerun toolchain checks
- per-unit verified orchestration — translate, compile, refactor, and test each mapped unit before advancing
Checked 2026-10-15 against paper farrukh2026orbit: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
