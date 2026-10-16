# Symbolic Execution Meets Multi-LLM Orchestration: Detecting Memory Vulnerabilities in Incomplete Rust CVE Snippets
(authored by agents unless marked 🧑)
Tag: `abdelrazek2026symbolic`, [paper](http://arxiv.org/abs/2605.00034v1)

## purpose and scope

The paper presents a pipeline that turns isolated, uncompilable Rust CVE fragments into compilable Rust FFI wrappers, then analyzes those wrappers with KLEE symbolic execution. Its target is memory vulnerabilities in unsafe Rust when the database entry omits types, imports, traits, and Cargo metadata. The paper states: “This paper presents a system combining symbolic execution (KLEE) with a 4-agent multi-LLM architecture for detecting memory vulnerabilities in Rust unsafe code.” (Abstract, p. 1)

The input is a fragment, not the original buildable program. The authors report that all four compared formal tools (Kani, Prusti, Creusot, Haybale) achieved zero compilation success on their 31-file set because each needs a complete Cargo project (Sections 2.4 and 5.2, pp. 2, 5). Inference: the system is a triage and bug-finding aid, not a proof that the original CVE is exploitable or that the generated wrapper is semantically equivalent to the source.

## technique 1: role-specialized planning and wrapper synthesis

What it is. Four agents exchange structured JSON, each with one narrow responsibility: Oracle/Validator (GPT-4 Turbo) identifies vulnerability classes and proposes usually 8–12 FFI functions; Safety Checker (Claude Opus 4.5) annotates dangerous lines and assigns a 0–10 risk score; Code Specialist (Claude Sonnet 4.5) writes a self-contained Rust wrapper; Fast Filter (GPT-4o-mini) chooses KLEE search parameters. The method section says, “The process consists of four sequential stages: strategic planning by the Oracle/Validator, security analysis by the Safety Checker, FFI wrapper generation by the Code Specialist, and parameter optimization by the Fast Filter, followed by KLEE symbolic execution.” (Section 4.1, p. 3)

When to use it. Use this decomposition when a source fragment cannot compile and the goal is to expose a vulnerability class to a downstream execution engine. It is unsuitable when exact whole-program behavior is required: the authors explicitly call the wrapper an approximation (Section 7.4, p. 7).

How to do it, following the paper:

1. Feed the raw CVE snippet to Agent 1. It identifies likely classes, estimates complexity, and recommends the number of functions (Section 4.3, p. 3).
2. Pass the snippet and Agent 1’s JSON plan to Agent 2. It performs security analysis, gives a 0–10 risk score, and marks critical lines (Section 4.3, p. 3).
3. Give all prior outputs to Agent 3. Generate exported `extern "C"` Rust functions using primitive or raw-pointer types and no external crates. The paper says the specialist “generat[es] a complete, compilable FFI wrapper preserving the vulnerability semantics of the original CVE” (Section 4.3, p. 3).
4. Compile the wrapper. If it fails, feed the compiler error back for up to two self-correction attempts; then use a predefined template. Three of 31 files needed the fallback (Section 7.1, p. 7).
5. Give Agent 2’s risk and vulnerability pattern to Agent 4. Select DFS, BFS, or random-path search, time and memory limits, and maximum fork depth (Section 4.3, p. 4).

The motivating example translates `Vec::from_raw_parts(self.buffer, 0, self.cap)` into separate functions: an unchecked pointer write, deallocation followed by a write, and unchecked size multiplication (Listings 2–3, pp. 2–3). The C wrapper declares each function, makes arguments symbolic with `klee_make_symbolic`, bounds indices with `klee_assume`, and chooses a function with `klee_range` (Listing 4, p. 4).

Verus form. Inference: Verus can verify a manually reconstructed wrapper’s contract, but it cannot recover omitted struct and trait semantics. Write executable Rust functions with `requires`/`ensures` contracts and `proof fn` lemmas for arithmetic or ownership facts; use `assert` and loop `invariant` statements where needed. The unsafe pointer body would need a supported Verus pointer model and explicit proof obligations. The paper’s LLM-generated wrapper remains an input artifact; a Verus proof would establish only its stated contract, not equivalence to the CVE fragment.

Evidence. On 31 real CVEs, wrapper compilation was 28/31 = 90.3%; the single-agent baseline was 18/31 = 58.0%. Fallback use was 3/31 = 9.7% versus 42.0% (Table 5, p. 6). The denominator is files, and the setting is the HALURust memory-safety subset (Section 5.1, p. 5). The multi-agent method detected at least one KLEE error in 26/31 files (83.9%), versus 16/31 (51.6%) for one agent (Table 5, p. 6).

Limits and assumptions. The generated wrapper approximates a class rather than the original exploit path because omitted context cannot be reconstructed (Section 7.4, p. 7). Results vary with default-temperature LLM nondeterminism and Agent 4’s KLEE parameters (Section 8.1, p. 8). Inference: an agent-written wrapper must be reviewed as a new program before its result is treated as evidence about production code.

## technique 2: symbolic execution and error interpretation

What it is. Compile Rust to LLVM bitcode, link it with the generated C harness, and run KLEE. KLEE explores symbolic paths and emits typed `.ptr.err`, `.external.err`, `.abort.err`, `.div.err`, and `.overflow.err` files (Sections 4.4 and 6.4, pp. 4, 7). Pointer errors directly indicate an invalid LLVM-level access; external errors include Rust allocator or panic calls that KLEE cannot model (Section 7.3, p. 7).

Steps:

1. Declare each exported wrapper function in C and include `klee/klee.h` (Listing 4, p. 4).
2. Call `klee_make_symbolic` on every input, apply `klee_assume` bounds, and use `klee_range` to select paths (Listing 4, p. 4).
3. Compile and link the Rust bitcode with the C harness, then run KLEE with Agent 4’s search and resource settings (Sections 4.4 and 4.3, p. 4).
4. Inspect pointer errors first. Treat external errors as context-dependent: in a CVE-specific deallocation function they may reflect the bug, while a generic division wrapper can produce an unrelated panic (Section 7.3, p. 7).

Verus form. Inference: encode each intended safety property as a contract and prove it for all inputs instead of sampling symbolic paths. KLEE’s concrete counterexample can guide a Verus proof test, but a passing KLEE run is not a universal proof. Use `requires` to constrain valid pointers or sizes, `ensures` for postconditions, and loop `invariant` for path-independent bounds; keep external calls modeled by explicit trusted specifications.

Evidence. KLEE found errors in 26/31 files and emitted 1,206 total errors: 124 pointer and 1,082 external/panic (Section 6.1, p. 5). The count is paths, not distinct vulnerabilities; two files contributed 1,133/1,206 = 93.9% (Section 6.1, p. 5). One CWE-131 file alone produced 752 errors (Table 2, p. 5). These denominators explain why error totals must not be read as vulnerability counts.

Limits. Use-after-free detection was 6/9 = 67% and integer-overflow detection 1/3 = 33%; the paper attributes this to lifetime sequences and missing surrounding state (Table 2 and Section 7.4, pp. 5, 7). Miri labeled all 31 files but only generically; Clippy found 14 warnings in 11/31 files (Table 4, p. 5). Inference: KLEE’s stronger-looking result depends on the wrapper’s fidelity and should be paired with source-level confirmation.

## technique 3: graph post-processing for cross-CVE analysis

What it is. `graph_klee.py` converts each KLEE output directory into a typed property graph. Nodes represent CVEs, CWE classes, error types, and concrete symbolic paths. Edges are `HasError`, `TriggeredBy`, `ClassifiedAs`, and `SharedPattern` (Section 4.5, p. 4).

Steps: ingest any KLEE directory; create one CVE node and shared error-type/CWE nodes; create a `SymPath` node for each test case with concrete inputs and stack trace; add the four labelled relationships; serialize as JSON-LD (Section 4.5, p. 4). The 31-file run yielded 31 CVE, 5 error-type, 11 CWE, and 1,206 path nodes connected by 1,310 edges (Section 4.5, p. 4).

Verus form. Inference: represent verified components and their proof obligations as graph records only after a Verus proof succeeds. Graph edges can organize contracts, trusted external specifications, and counterexamples, but graph structure itself proves nothing.

Limits. The graph aggregates paths and can amplify one root cause into hundreds of nodes. The authors warn that error count is a coverage proxy, not a count of vulnerability instances (Section 8.3, p. 8).

## what is proved, trusted, and relevant to VL

The paper measures wrapper compilation, KLEE error detection, and comparison with Clippy and a single-agent baseline. It does not prove wrapper equivalence, exploitability, absence of bugs, or correctness of LLM decisions. Trusted elements include LLM outputs, generated templates, Rust/LLVM/KLEE implementations, modelled allocator behavior, and the missing-context assumptions. Inference: the product threat is high if VL accepts generated wrappers or KLEE reports as proof; it is moderate if they are used only to prioritize code for subsequent Verus contracts and proofs.

The already-done result VL should not redo is the four-agent wrapper-plus-KLEE architecture on this exact 31-file benchmark; a new effort should instead verify whether generated wrappers preserve source semantics or connect counterexamples to source-level Verus specifications. The paper itself reports contradictory-sounding headline numbers only when denominators differ: “Miri detected generic undefined behavior in all 31 files” while the system detects 26/31 specific files (Sections 5.2 and 6.1, pp. 5–6); these are different labels and targets, not the same metric.

## techniques for the catalog

- role-specialized JSON orchestration — split planning, safety analysis, wrapper generation, and KLEE tuning into sequential agents with persisted artifacts
- incomplete-code FFI synthesis — replace missing Rust context with primitive/raw-pointer exported functions and retry compilation before a fallback template
- KLEE harness construction — make every argument symbolic, bound it with `klee_assume`, and branch with `klee_range` before symbolic execution
- typed error triage — prioritize pointer errors and interpret external errors according to whether they arise from CVE-specific or generic wrapper code
- graph_klee aggregation — convert KLEE files into CVE, CWE, error-type, and symbolic-path nodes with labelled cross-CVE edges
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
