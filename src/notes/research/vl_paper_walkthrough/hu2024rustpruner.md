# RustPruner: A Program Slicing Tool for Rust Programs
(authored by agents unless marked 🧑)
Tag: `hu2024rustpruner`, [paper](https://doi.org/10.18293/seke2024-118)

## purpose and scope

RustPruner slices Rust source for Kani verification. It combines Kani goto programs, CBMC backward analysis, and a `syn` abstract syntax tree (AST) visitor, then reconstructs source from retained dependencies. The abstract describes “a backward slicing algorithm, integrating the outcomes of program dependency analysis and abstract syntax tree (AST) analysis” (p. 1). The intended result is compilable source with consistent verification results; the evaluation covers four operating-system scheduling projects, not general behavioral equivalence.

Section V describes the method as backward, static slicing using graph reachability and a program dependence graph (PDG): “Our methodology adeptly applies the graph reachability approach through the utilization of PDG, conducting a rigorous intraprocedural analysis” (p. 6). Section III.A nevertheless describes dependencies involving called functions. The paper does not give a formal algorithm reconciling these descriptions or prove preservation for arbitrary Rust programs.

## technique: choose a verification slicing criterion

RustPruner starts from a Kani proof function. The authors state: “Our slicing criterion involves all statements under the #[kani::proof] attribute” (Section IV.A, p. 4). Section III.A describes backward analysis through assertions in the proof function, or outputs or assertions in functions it calls (p. 3). Inputs can be individual Rust files or Cargo projects; dependency acquisition processes these separately. Single files are described as normally using only the standard library, whereas projects include source files, configuration, and dependencies.

The example defines `Point`, computes a distance between two points, and asserts `dist == 4`. Its input proof function calls `main`; the sliced listing removes `midpoint`, `sum_of_coordinates`, and the unused `p3` declaration (Section III.A–C, pp. 3–4). However, the output listing also shows an empty `verify_main` proof function, whereas the input `verifymain` calls `main`. Inference: this example alone cannot establish that the same assertion remains reachable from the verification entry point. The paper does not explain that discrepancy.

Verus form. Inference: choose a contract or assertion as the slicing target, then retain executable and proof dependencies needed for that target. These could include ghost state, preconditions, postconditions, loop invariants, and lemma calls. RustPruner's Kani entry attribute and goto pipeline do not establish how to collect those Verus dependencies; the paper evaluates no Verus implementation.

## technique: source-to-goto dependency analysis

Kani performs control-flow and data-flow analysis and transforms Rust MIR into goto programs (Section II.C, p. 2). RustPruner obtains a goto file for the proof entry and performs backward analysis using CBMC. The authors describe this step as follows: “Using CBMC, mark the key information and remove the irrelevant information from these goto files to obtain a new goto file that only contains dependency information related to the proof framework” (Section III.A, p. 3).

RustPruner then extracts source information corresponding to the retained goto information, forming dependency relationships among Rust elements such as functions, static variables, and enumerations. In the example, analysis follows the proof function to `main`, the assertion to `dist`, its definition to `distance` and arguments `p1` and `p2`, and those arguments to their structure definition (Section III.A and Fig. 2, p. 3). This gives a concrete description of dependency recovery; the paper does not provide pseudocode or a complete dependency rule set.

Verus form. Inference: a proof slicer must also retain dependencies that leave no runtime instructions, including lemma calls and specifications used to discharge obligations. Runtime dataflow alone does not establish which proof text can be removed.

## technique: AST collection with spans

AST parsing runs concurrently with dependency analysis. `CodeCollector` traverses a directory, selects Rust files, parses their contents using `syn`, and implements the `visit` trait to collect information about Rust elements. Collected information includes names, element types, start/end lines, and source paths (Section III.B, pp. 3–4). The authors name the repository of collected node information the Span library. Examples of node types include functions, static variables, enumerations, traits, and impl blocks; Fig. 2 also illustrates constants, structures, and assertions.

The authors' ownership argument relies on collecting entire element scopes: “Each Node information covers the entire scope of Rust elements, essentially ensuring the complete architecture of the dependent elements” (Section III.B, p. 4). They argue that this retains creation, use, destruction, and ownership-transfer paths, reducing the risk of violating ownership or lifetime rules. Their wording is a risk-reduction argument, not a formal preservation proof.

Verus form. Inference: source spans could retain complete selected function bodies together with contracts and relevant proof blocks. A Verus parser and dependency analysis would be needed to establish which declarations and proof constructs belong in the slice. Span extraction by itself does not establish semantic equivalence.

## technique: reconstruct and reorganize the slice

RustPruner filters the Span library against the recovered dependency relationships and writes matching source portions to a new file. For each function node, it checks whether the recorded start/end lines contain function line numbers collected in the dependency relationships; matching definitions are written. It similarly preserves snippets such as `use` statements and structures (Section III.C, p. 4).

Fig. 2 uses a blue dividing line to distinguish retained nodes, which are sorted and reorganized, from unmatched nodes to be eliminated (pp. 3–4). This is an illustration of matching, not a claim that the implementation places rejected source text below a divider in the output. The abstract says the generated slices undergo “rigorous compilation and verification procedures” (p. 1); the experiments compare selected Kani verification results before and after slicing.

## evidence and limits

The four test projects come from operating-system task scheduling. A selects the first ready thread; B executes the current thread and switches between user and kernel mode; C cleans up after a thread finishes; D is the user-mode program's main loop (Section IV.A, p. 4). Their original sizes are 222, 1,013, 1,543, and 1,538 source lines, averaging 1,079. The paper does not identify the operating-system projects by name.

The machine has an AMD Ryzen 8845H CPU at 3.80 GHz and 32 GB RAM; each experiment uses one core and 8 GB memory. Table I lists Ubuntu 22.04.4 LTS, Rust 1.70.0-nightly, Kani 0.51.0, and CBMC 5.95.1 (p. 4). Each time measurement is performed ten times, the first iteration is discarded, and object files are cleared after each slicing or verification run (Section IV.B, p. 5).

Table III reports original verification times of 0.98, 2.17, 2.97, and 3.67 seconds for A–D; sliced sizes are 186, 761, 978, and 1,316 lines; average slicing times are 1.25, 7.89, 11.26, and 24.96 ms (p. 5). Table II reports verification consistency true for all four, with failure/success counts A 1/0, B 0/3, C 0/1, and D 0/1. Thus consistency includes preserving A's failing result, rather than making every harness pass. Fig. 3 plots slice size and sliced verification time as percentages of their original values and shows lower verification time for each project. Table III does not list absolute post-slice verification times.

The authors surveyed LLVM-slicing, LLVM-slicer, semslice, DG, and sbt-slicer after compiling Rust to LLVM representations. They report that these tools did not effectively support Rust slicing, so the experiments focus on RustPruner rather than a competing-tool comparison (Section IV.A, pp. 4–5). The paper supplies no detailed failure breakdown for those tools.

## trust and threat to VL

Inference: using this pipeline requires trusting Kani's translation, CBMC's dependency reduction, AST collection, and source reconstruction to preserve the selected verification task. Four projects with consistent outcomes provide limited empirical evidence. They do not prove preservation for other programs, specifications, or Rust features. The paper reports no Verus experiments or explicit evaluation focused on unsafe code, macros, generated code, or external-crate dependencies.

Inference: RustPruner's approach could help VL reduce a large verification input to the code and proof dependencies needed by one contract. The main concern is accidentally changing the checked task, for example by removing a reachable assertion or a relevant specification. VL would need Verus-aware dependencies and checks that the original and sliced inputs retain the same selected contracts, assertions, and verification entry points. The empty proof function in the paper's output example makes entry-point preservation a concrete concern.

## what VL should not redo

Inference: reuse the paper's separation of goto dependency recovery, AST span collection, source reconstruction, and verification-result comparison where applicable. A Verus implementation would still need its own treatment of proof code and contracts; the Kani experiments do not establish that adaptation.

## techniques for the catalog

- proof-entry slicing — start from Kani proof functions and their assertions or called-function outputs
- goto dependency reduction — use Kani goto programs and CBMC backward analysis to recover relevant Rust elements
- AST span collection — use a `syn` visitor to record element names, types, source paths, and complete line ranges
- source reconstruction — match dependencies to AST ranges, copy retained definitions and imports, and reorganize the output
- verification-result comparison — compare original and sliced Kani results, including preservation of failing outcomes

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Each Node information covers the entire scope of Rust elements, essentially ensuring the complete architecture of the dependent elements."): checked all quotations, numbers, section/page references, technique descriptions, and evidence against the full paper, including Fig. 3 in the PDF; corrected page references, the claim that post-slice timing was absent, and unsupported guarantees; distinguished the empty output proof function and marked Verus/VL conclusions as inferences; did not run RustPruner, reproduce experiments, inspect its implementation, or verify external references.
