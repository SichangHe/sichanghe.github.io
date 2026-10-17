# SmartC2Rust: Iterative, Feedback-Driven C-to-Rust Translation via Large Language Models for Safety and Equivalence
(authored by agents unless marked 🧑)
Tag: `shiraishi2026smartc2rust`, [paper](http://arxiv.org/abs/2409.10506v3)

## system and evidence

SmartC2Rust translates legacy C in small units, carries cross-unit metadata, refines unsafe output, and repairs it from compiler and test feedback. The paper's central claim is: “The key insight is to iteratively refine the output Rust code with additional feedback, e.g., compilation errors, segmentation contexts, semantic discrepancies, and memory unsafe statements.” (Abstract, p. 1). Its three stages are preprocessing, translation and quality checking, and feedback-driven repair (Section 3.1, p. 3). The default LLM is Claude 3.7 Sonnet (claude-3-7-sonnet-20250219), with temperature 0 and max_tokens 8,192; the default segment size is 400 lines (Section 4, p. 6). The benchmark has 21 C programs: 10 from GitHub repositories and 11 from prior works (Section 4, p. 6). The authors describe them as “up to approximately 3,000 lines of code” (Section 8, p. 11), but Table 2 (p. 6) lists LoC from 69 (qsort) to 20,436 (time, of which the caption says only 2,007 LoC are active code). The Introduction (p. 2) and Conclusion (p. 11), not the Abstract, report a 99.4% reduction in unsafe statements, an 11.25% improvement in test-case pass rate, and 85.2% preservation of C-macro meaning. The 99.4% is the average change from C2Rust in Table 3 (Section 5.1, p. 7); 85.2% is the average share of original C macros remaining in the Rust output (Section 5.2, p. 8). I found no derivation of the 11.25% figure in the paper; Table 4 (p. 8) shows mean test pass of 80 (± 30)% for C2Rust, Laertes and C2SaferRust, 35 (± 47)% for Crown, and 100 (± 0)% for SmartC2Rust.

## technique 1: context-preserving preprocessing and segmentation

Use this when the C program exceeds an LLM context window or splits declarations and definitions across files. The paper's steps are:

1. Analyze the target program, locate function declarations and definitions, and merge included-file contents into the files containing `#include`; make static names unique to avoid conflicts (Section 3.2.1, p. 3).
2. Topologically reorder functions and type definitions so referenced items precede their uses (Section 3.2.2, p. 4).
3. Detect conditional-compilation macros without expanding them. Ask the LLM whether each macro should be defined in `Cargo.toml`, `build.rs`, `lib.rs`, or each module file; translate `#ifdef` conditions to Rust `cfg` attributes (Section 3.2.2, p. 4). The authors explain: “This analysis enables the C macros to be semantically preserved in the translated Rust code.” (Section 3.2.2, p. 4).
4. Segment the merged module into units that include as much code as possible, using a counter and the closest logical-block boundary to a given line (default 400 lines, Section 4, p. 6). A block is a function, global variable, type definition, macro function or variable, preprocessor conditional, or header inclusion (Table 1); functions with circular dependencies form one block (Section 3.2.3, p. 4).
5. Extract definitions and call sites into JSON metadata, then carry that metadata between translation units without putting the entire program in every prompt (Section 3.2.3, p. 4).

Inference: In Verus, segmentation can organize modules and proof obligations, while `requires`/`ensures` contracts document cross-unit interfaces. The executable translation still uses ordinary Rust modules and `cfg`; Verus proofs should state the behavior each unit promises. Metadata does not prove that a C declaration and Rust function are equivalent, so a proof must connect the two semantics or use an explicit trusted assumption.

## technique 2: translation with contextual metadata and self-checking

For each segmented C unit:

1. Build a prompt containing translation rules, the C unit, contextual metadata, and an instruction to split an overlong response, preserving context from earlier parts and merging them (Section 3.3.1, p. 4). The example rule is: “Avoid unsafe in external function calls by using safe equivalents from Rust’s standard libraries or crates.” (Figure 2, p. 5).
2. Enrich metadata with Rust signatures learned from the current translation and use it in later prompts (Section 3.3.1, p. 4).
3. Ask a second LLM pass to quality-refine the generated Rust. Supply the Rust code, refinement guidelines, and self-evaluation flags; repeat until all flags (`refined_completed`, `current_block_complete`, `no_omission`) are true (Section 3.3.2, p. 4).
4. The guidelines target removal of `unsafe` blocks and raw pointers and avoidance of `static mut`; the flags require code that fully implements the C segment “without mocking, simplifications, or placeholders” and can be executed as-is (Section 3.3.2, p. 4).

The motivating example replaces C `malloc`/`sscanf` and a raw pointer with `Url::parse`, `String`, and ownership-based deallocation (Section 2.1, p. 2). Inference: In Verus, generated safe code can be retained, but quality flags are not specifications. Add `ensures` for parsed-output correspondence and `requires` for input validity; prove memory-safe indexing and ownership-sensitive state transitions with assertions, loop invariants, and proof functions. Verus proof code is erased before execution, so executable behavior remains the translated Rust.

## technique 3: feedback-driven repair loop

Algorithm 1 (p. 5) gives the reusable loop. Its steps are:

1. Initialize an empty translated program and compile and repair limits (Algorithm 1, lines 1–3, p. 5).
2. Translate the state-macro unit first; for each other unit, translate it with C metadata and quality-refine until all evaluation flags are true (Algorithm 1, lines 4–12, p. 5).
3. Add the unit to the program and compile. While compile errors remain and the compile limit is not reached, parse Rust metadata, ask for a modification set, apply every modification, and compile again (Algorithm 1, lines 13–24, p. 5).
4. Map each repaired Rust unit back to its C unit to update correspondence metadata (Algorithm 1, lines 25–28, p. 5).
5. After all units, repeatedly collect compile, semantic, and runtime errors; ask for repairs, apply them across affected files, recompile, rerun tests, and stop at the repair limit or when errors disappear (Algorithm 1, lines 29–38, p. 5; the printed loop condition joins the three error sets with “and”, while the text says repair continues “until none remain”).

SmartC2Rust records four error classes: compile syntax errors, runtime syntax errors such as index panics, runtime behavior differences represented as execution-flow differences, and semantic assertion errors (Section 3.4.1, p. 5). Repair prompts contain response rules, Rust code, diagnostics, directory structure, dependencies, and, for semantic repair, execution-flow information and C code (Section 3.4.2, p. 5). Inference: A Verus implementation can run this loop before verification, then replace “no errors” with successful proof checking of contracts. Compiler and test diagnostics can guide proof repair but cannot establish the missing postcondition themselves.

## technique 4: execution-flow localization and equivalence testing

SmartC2Rust executes C and Rust on the supplied tests, compares call stacks, inputs, and return values, and uses differences to localize a function for repair (Section 2.2, p. 3). “If the input and output of the entry point function are identical, SmartC2Rust considers them semantically equivalent.” (Section 2.2, p. 3). For non-standalone libraries, the authors generate a C test driver, translate that driver to Rust, and compare shell-script outputs; this rewrites developer-written tests even where they exist (Section 4, p. 6). For standalone programs the paper uses end-to-end testing (Section 3.2.1, p. 3). The method judges only the entry point, because C and Rust functions may not correspond one-to-one (Section 2.2, p. 3).

Inference: In Verus, the entry-point relation should be an `ensures` statement over mathematical input and output values, with helper lemmas for data-structure correspondence. Execution-flow traces are useful counterexamples and localization hints; they are not a proof and do not cover untested paths. The paper's entry-point-only criterion leaves internal functions and untested macro configurations trusted.

## quantitative findings and ablations

On the 21-program dataset, SmartC2Rust reduced unsafe lines from a C2Rust average of 1,550 to 8.14, a 99.4% reduction (Table 3 and Section 5.1, p. 7; denominator is the C2Rust mean unsafe LoC across 21 programs). It resolved 1,040 compile errors and 832 semantic errors during repair (Table 5, p. 8). It reported 0 compilation errors and a 100 (± 0)% test pass rate on the benchmark (Table 4, p. 8; Section 5.2, p. 8). The 100.0%/100.0% in Table 8 is the ablation baseline on three programs, not the full benchmark. It translated 1,061 macros: 50 macro functions and 164 conditional-compilation macros; 26% of conditional macros became Cargo features, 29% had no Rust equivalent, and overall macro semantic preservation was 85.2% (Section 5.2.3, p. 9; denominators are the stated macro categories and all 1,061 macros). The text says 26% of conditional macros were “replaced with Rust Cargo macros”; Section 5.2.4 (p. 9) describes the mechanism as Cargo features..

Average overhead was 187.90 chats, 45.14 compilation iterations, 13.14 semantic iterations, 2,637.75 seconds, 10,456K input tokens, 116.27K output tokens, and $33.12 per program (Table 7, p. 10; denominator is the 21 program rows). The ablation uses three programs (urlparser, sds, which); its compilation-success metric is average successfully compiled LoC divided by total LoC, while test pass is successful tests divided by all tests (Section 5.4, p. 10). SmartC2Rust achieved 100.0%/100.0%; random file order 28.5% compilation, no contextual summaries 32.3%, fixed-file modification 12.4% compilation, and no execution-flow comparison 23.3% test pass (Table 8, p. 10). GPT-4o reached 34.3% compilation and Gemini Pro 1.5 12.4% in the additional-model experiment (Section 5.4, p. 10).

## trusted boundary, failures, and VL implications

Inference: the result is empirical. Compilation and tests pass, and I found no formal C/Rust equivalence proof in the paper. Test coverage, model behavior, macro combinations, external crates, and the correctness of the C test driver remain trusted. A 12,256-line scalability test compiled after 4,213 chats costing $1,451 and 27 hours, yet only 24% of test cases passed after manual fixes and further iterations (Section 6, p. 10). The authors also report an infinite semantic-repair loop and incomplete coverage of macro combinations (Section 6, pp. 10–11).

Inference: The threat to agent-written verified Rust is high at the translation boundary: a system can satisfy a finite test suite while simplifying behavior or mishandling conditional builds. SmartC2Rust's segmentation, metadata, macro-preservation, and error-localization stages are useful candidate-generation machinery, but VL should require Verus contracts and proofs for each accepted unit and preserve explicit assumptions for external crates and C behavior. VL should not redo the basic 21-program benchmark or the ablations; a useful next experiment is to replay its failures with proof obligations and measure which errors remain after verification.

## techniques for the catalog

- context-preserving preprocessing — merge, reorder, macro-map, segment, and summarize C code before LLM translation
- self-checking translation refinement — iteratively remove unsafe constructs and omissions using explicit quality flags
- feedback-driven code repair — collect compiler, runtime, semantic, and flow errors and apply bounded multi-file repairs
- execution-flow equivalence testing — compare C/Rust entry-point traces and outputs to localize semantic mismatches
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We observed that in Crown, Laertes, and C2SaferRust, the metrics increased rather than decreased for several programs."): read the whole paper text and checked every quotation, number, algorithm line, table value and section/page reference against it; changed the page numbers (several were off by one or two), the claim that the Abstract reports the 99.4%, 11.25% and 85.2% figures (they are in the Introduction and Conclusion, and only 99.4% is a C2Rust comparison), the "up to about 3,000 lines" description (Table 2 lists up to 20,436 LoC), the quality flags (three, not two), Table 8 versus benchmark results, and the ablation scope (three programs); marked the unsupported "no proof" statement as Inference. Did not check: the cited prior works, Table 3 per-program values and Table 6 error-category percentages beyond the averages quoted, the artifact repository, or the PDF figures beyond text.
