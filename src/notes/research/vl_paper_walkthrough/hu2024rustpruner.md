# RustPruner: A Program Slicing Tool for Rust Programs
(authored by agents unless marked 🧑)
Tag: `hu2024rustpruner`, [paper](https://doi.org/10.18293/seke2024-118)

## purpose and scope

RustPruner removes Rust code that cannot affect a selected verification entry point. It combines Kani's goto representation and control/data-flow analysis with CBMC backward slicing, then maps the retained goto nodes back to source using a `syn` abstract syntax tree (AST) visitor. The abstract states: “RustPruner commences by constructing a goto-style control flow graph (CFG) through rigorous control flow analysis” and then uses “a backward slicing algorithm, integrating the outcomes of program dependency analysis and abstract syntax tree (AST) analysis” (Abstract, p. 1). The output is intended to remain compilable and preserve verification results.

This is a reduction technique, not a proof of the original program's behavior. The paper evaluates four operating-system task-scheduling projects with Kani assertions. It does not evaluate Verus, unsafe pointer-heavy code, or semantic equivalence beyond the measured Kani properties.

## technique: choose a verification slicing criterion

Use a Kani proof function as the entry. The paper's criterion is all statements under `#[kani::proof]`; Kani treats these functions as verification entry points and RustPruner retains statements dependent on them (Section 4, p. 4). A small example calls `main`, computes `Point::distance`, and asserts `dist == 4`; unrelated `midpoint` and `sum_of_coordinates` functions disappear from the slice (Fig. 2 and Section 3, pp. 2–3).

Step by step: identify the proof function and its assertions or outputs; mark those statements as slicing sinks; include every call and value that can affect the sinks; and preserve declarations needed to compile the resulting program. The method also supports a single Rust file or a Cargo project, processing each separately (Section 3.A, p. 2).

Verus form. Inference: use a Verus function containing `assert` or a postcondition as the sink, then retain code needed by its `ensures` and loop invariants. Verus contracts are richer than Kani assertions, so a slicer must include ghost state, `requires` facts, and proof lemmas that affect the solver context. The paper's Kani attribute and goto format do not carry over directly.

## technique: source-to-goto dependency analysis

RustPruner invokes Kani to obtain a goto file containing control-flow paths and dependency information. It then performs backward analysis from proof assertions, outputs, and assertions in called functions. CBMC marks key goto information and removes irrelevant statements. The paper describes the pipeline: “Using CBMC, mark the key information and remove the irrelevant information from these goto files to obtain a new goto file that only contains dependency information related to the proof framework” (Section 3.A, p. 2).

Apply it by compiling the target with Kani, extracting the goto CFG, and running backward data/control dependency analysis from each sink. Follow calls, definitions, branches, and values; retain a node if changing it could change a sink. Extract the surviving source-level dependency relation, which records that a Rust element requires another element. This relation is also a maintenance aid: if a depended-on element changes, dependent elements may need re-analysis (Section 3.A, p. 2).

Verus form. Inference: a Verus slicer can use the same backward relation over executable and proof code, but it must treat a lemma call as a dependency even if it emits no runtime instructions. Retain specifications and invariants that constrain solver obligations. A slice that preserves runtime dataflow but drops a proof lemma is not a valid Verus proof slice.

## technique: AST collection with spans

In parallel with dependency analysis, `CodeCollector` parses every Rust source file with `syn` and implements the visitor trait. It records each node's name, kind, path, and starting and ending line. The paper says: “All collected Node information is stored in the CodeCollector’s information collector, forming a Rust element information repository, namely the Span library” (Section 3.B, p. 3). Nodes include constants, functions, structs, enums, traits, impl blocks, uses, and assertions.

Apply it by traversing the AST, recording complete source spans for each item, and indexing them by the dependency relation. Preserve whole item scopes rather than individual tokens. The authors emphasize that full scopes retain creation, use, and destruction and avoid truncating ownership transfers (Section 3.B, pp. 3–4). This is how the output remains compatible with Rust's ownership and lifetime checking.

Verus form. Inference: include the complete body of every executable function and proof function selected by the dependency graph, together with its `requires`, `ensures`, `invariant`, and lemma declarations. Verus proof blocks may be erased at runtime, but they must remain in the verification input. Span-based extraction is a source transformation and does not itself establish semantic equivalence.

## technique: reconstruct and reorganize the slice

RustPruner filters the Span library using dependency matches, maps matched nodes back to source text, and writes a new file. For a function, it checks whether its recorded start/end lines contain lines in the dependency relation; matching definitions are copied, and `use`, struct, and related snippets are retained. Nodes that do not match are placed below a divider and eliminated (Section 3.C, p. 4). The resulting source is compiled and verified again.

The key safety condition is structural: keep declarations and complete scopes so ownership, lifetime, and destruction behavior remain syntactically valid. The tool's own claim is narrower than general equivalence: the abstract says slices undergo “rigorous compilation and verification procedures” (p. 1), and the experiment checks Kani verification consistency.

## evidence and limits

Experiments use four OS scheduling projects, average 1,079 source lines each, with sizes 222, 1,013, 1,543, and 1,538 lines (Section 4.A, p. 4). Runs use Ubuntu 22.04.4, Rust 1.70.0-nightly, Kani 0.51.0, CBMC 5.95.1, one CPU core, and 8 GB memory (Table I). Each timing is repeated ten times; the first run is discarded and object files are cleared between runs (Section 4.B, p. 5).

Table III reports original verification times of 0.98, 2.17, 2.97, and 3.67 seconds for A–D; slice sizes are 186, 761, 978, and 1,316 lines; slicing times are 1.25, 7.89, 11.26, and 24.96 ms. Table II reports verification consistency true for all four; failures/successes are A 1/0, B 0/3, C 0/1, D 0/1. These are harness counts, not a claim that all original project properties were verified. The paper gives no post-slice verification times, so reduced source size cannot be converted into a measured speedup from the reported tables.

The authors found no practical direct Rust slicer in their survey and report that LLVM-level tools did not slice Rust effectively (Section 4.B, pp. 4–5). This is evidence for engineering compatibility, not a controlled comparison against a competing Rust implementation.

## trust and threat to VL

Kani, CBMC, `syn`, Rust compilation, and the dependency extraction are trusted or operational assumptions. The paper does not prove that the slice preserves every behavior, only that the selected Kani verification properties remain consistent in four projects. Ownership and lifetime preservation is handled by retaining whole AST scopes, but macros, generated code, external crates, unsafe code, and semantic aliasing can defeat a simplistic line-span relation.

Inference: RustPruner could reduce agent-written Verus verification cost by slicing a large crate to the functions and lemmas needed by one contract. The main product threat is deleting a proof dependency that is invisible in executable dataflow, causing a new proof to pass under a weakened context or changing which code is actually checked. VL should therefore slice only after collecting specification and lemma dependencies, compile the slice with Verus, and compare the original and sliced contracts and proof outcomes. The four-project sample is too small to establish general preservation.

## what VL should not redo

The paper already gives a Rust-specific pipeline for Kani goto extraction, CBMC backward slicing, `syn` span collection, full-scope reconstruction, and consistency checks. A VL effort should reuse these ideas but add Verus-aware dependencies and a semantic comparison of contracts, rather than reproducing a Kani-only slicer.

## techniques for the catalog

- proof-entry slicing — use verification attributes and assertions as backward slicing sinks
- goto dependency reduction — obtain Kani CFGs and remove nodes unrelated to proof outputs with CBMC
- span-based AST collection — index complete Rust item scopes with `syn` visitor spans
- ownership-preserving reconstruction — copy complete dependent definitions, imports, and scopes into a new source file
- post-slice validation — compile and re-run the verifier, comparing selected verification properties and recording failures
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
