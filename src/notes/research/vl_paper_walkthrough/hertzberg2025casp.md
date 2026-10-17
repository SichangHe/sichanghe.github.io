# CASP: An Evaluation Dataset for Formal Verification of C Code
(authored by agents unless marked 🧑)
Tag: `hertzberg2025casp`, [paper](https://doi.org/10.1007/978-3-032-07132-3_5)

## purpose and data product

CASP is a corpus of C functions paired with ACSL contracts, each checked by Frama-C. The abstract says: “We develop a multi-stage filtering process to carefully extract 506 pairs of C code and formal specifications from The Stack 1 and The Stack 2.” (abstract, p. 63). A pair is intended to be a self-contained implementation and specification that can support generation in either direction.

## technique: mine and filter source code

Inference: Use this when building a training or evaluation corpus from uncontrolled repositories. The paper's pipeline is:

1. Download deduplicated C files from The Stack v1 and v2 (section 4.1, p. 69).
2. Apply regular expressions for ACSL-like markers, using expert-authored patterns with confidence labels for language overlap (section 4.2, p. 69). Initial regex filtering keeps 14,525 files, stricter filtering 5,916, and ACSL filtering 2,958 (Table 3, p. 70).
3. Keep only “minimally complete” files whose dependencies are limited to standard C libraries (section 4.3, p. 70). This leaves 1,180 files (Table 3, p. 70).

Table 3's starting point is 25,719,227 combined initial samples (8,625,559 from Stack 1 plus 17,093,668 from Stack 2, both deduplicated) (p. 70). Section 3.1 says “The Stack v1 comprises approximately 546 million files totaling 6.4 TB”, while Table 1 prints 5.46M total files for The Stack v1, and also 19.88M C files for The Stack v1 and 40.88M for v2 (section 3.1, p. 67). Inference: these numbers do not agree with one another (5.46M total is smaller than 19.88M C files) or with Table 3's deduplicated C counts; Table 3's chain is the one tied to the pipeline, and the other counts are unresolved inconsistencies.

Inference: a Verus corpus should filter by parseability, compilability, absence of unresolved external crates, and deterministic verifier invocation. Regex is useful for candidate discovery but cannot establish that a Rust annotation is a valid Verus contract.

## technique: checker-backed repair with verifier feedback

Inference: Use this when source files contain contracts that do not verify. CASP runs Frama-C 30.0 (Zinc) with WP and RTE, using Z3 4.8.12, Alt-Ergo 2.6.0, and CVC4 1.8, with a 500,000-step limit and a 60-second timeout per proof goal (section 5.1, pp. 70–71). For each file, the authors either complete all WP/WP-RTE goals or send the failing file, its non-verifying goals, and a repair prompt to Gemini 2.0 Flash. Each failing file gets at most seven repair iterations (section 5.1, p. 71).

The prompt says “Do not alter the C code unless absolutely necessary.” and, per section 5.1, asks the model to make minimal changes and to output what it “thinks” the user intended (Appendix B and section 5.1, pp. 71, 77). It targets syntax, type mismatches, weak loop invariants, pre/postcondition failures, memory clauses, assigns clauses, and timeout issues (Appendix B, p. 77). It specifically advises precise `\valid`, `\valid_read`, and `\separated`, explicit loop assigns, strategic assertions, correct clause ordering, and, for timeouts, breaking properties into smaller assertions and adding intermediate assertions (Appendix B, pp. 77–79).

Results: of 1,180 minimally complete files, 292/1,180 verify without changes and 177/1,180 verify after modification, for 469/1,180 verified files (Table 4, p. 71). The 888 files that initially failed verification yield 177/888 repaired files = 19.9% (section 8.3, p. 76). The paper says: “The success rate highlights the challenging nature of formal specification repair, even for advanced LLMs.” (section 8.3, p. 76).

Inference: Verus repair should feed the exact failed obligation and verifier diagnostics to an agent, cap iterations, and require a clean verifier run after every edit. The agent must not weaken a contract merely to make it pass; CASP's prompt instruction to preserve the code and report intended behavior is a useful guard, but a Verus experiment must separately check specification adequacy.

## technique: extract minimal specification–implementation pairs

Inference: Use this when whole files contain distracting context or dependencies. From each verified file, retain functions that do not depend on other functions in that file and are not `main` (section 6.2, p. 72). Run two extraction pipelines in parallel: a regex pipeline that extracts the implementation, its corresponding ACSL specification if present, and additional dependencies; and a Gemini pipeline prompted to extract the same components (section 6.2, p. 72). Remove functions without specifications, take the union, rerun Frama-C, manually post-fix remaining failures, exact-deduplicate implementations, and retain functions longer than one line (section 6.2, p. 72). The union has 513 pairs; final filtering leaves 506 (section 6.2, p. 72).

The paper gives three reasons for pairs: decoupled evaluation, consistency between specification and implementation, and bidirectional specification-to-code and code-to-specification tasks (section 6.1, pp. 71–72). It says: “Second, these pairs ensure that the specification is logically consistent with the implementation and practically implementable.” (section 6.1, p. 72).

Inference: a Verus pair should include the smallest compilable module containing one function, its contract, model definitions, and proof lemmas, while preserving imports needed by the verifier. Extraction must retain ghost and spec dependencies; deleting them can create a misleadingly easy task.

## technique: measure corpus diversity and contamination

CASP filters the files of all compared datasets, including its own source files, to minimally complete ones, embeds the files that verify with the 2B-parameter CodexEmbed model (maximum context length 4096; longer samples truncated), then visualizes t-SNE and computes nearest-neighbor distances (section 7.1, p. 73). The authors report limited overlap with prior datasets: “only approximately 35 CASP source files are” (p. 75) “very similar to some other file in any of the other datasets” (p. 76; the sentence spans a figure) (section 8.2, pp. 75–76). They also note that removing files that depend on `.h` files filters out many files of existing datasets (section 8.2, p. 76).

Inference: a Verus benchmark should publish repository commits, deduplication rules, model context length, and nearest-neighbor contamination checks. A model can memorize repeated proof idioms; pair counts alone do not establish generalization.

## what the evidence proves and what remains trusted

The paper reports 506 deduplicated pairs, each verified by Frama-C as in section 5.1 after any manual post-fixing (section 6.2, p. 72), and the abstract says “a manual inspection is conducted to confirm the correctness of every pair” (p. 63). Inference: this does not prove that ACSL contracts capture the original programmer intent, that all C undefined behaviors are modeled, or that a passing pair is useful for production code. Frama-C WP and RTE, the three SMT solvers, Gemini's edits, manual post-fixing and inspection, regex and Gemini extraction, and standard-library assumptions remain trusted parts of the construction.

Inference: the most direct new work is a CASP-style Verus benchmark with paired executable Rust and proof code, measured repair iterations, held-out repositories, dependency-change tests, and independent review of whether `ensures` states the intended behavior. The paper's artifact is a prior design to adapt, not evidence that Verus generation will reach the same 506-pair scale.

## techniques for the catalog

- regex candidate mining — find likely formal annotations in very large source collections before semantic checking
- minimal-dependency filtering — retain files whose contracts and implementations verify with only standard libraries
- checker-backed LLM repair — iterate model edits from verifier goals under fixed solver, timeout, and iteration limits
- paired extraction — combine regex and LLM extraction, reverify, deduplicate, and keep self-contained function-contract pairs
- contamination analysis — embed source files, inspect t-SNE and nearest-neighbor similarity, and report overlap counts
- benchmark accounting — preserve every filtering denominator, model/solver setting, timeout, and unresolved count
