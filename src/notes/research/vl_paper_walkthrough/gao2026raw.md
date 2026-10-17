# Raw Pointer Rewriting with LLMs for Translating C to Safer Rust
(authored by agents unless marked 🧑)
Tag: `gao2026raw`, [paper](http://arxiv.org/abs/2505.04852v3)

## scope and result

Gao et al. present PR2, a two-phase pipeline applied after C2RUST has produced Rust containing raw pointers. The paper states: “Specifically, we propose a raw pointer rewriting technique that lifts raw pointers in individual functions to appropriate Rust data structures.” (Abstract, p. 1). Phase 1 lifts raw pointers within single functions and refactors their uses (the prompts take one function and one raw pointer, Figures 4 and 5, p. 4); phase 2 repairs compiler and test failures. The implementation uses gpt-4o-mini, tree-sitter, `cargo check`, greedy decoding (temperature 0), and up to five repair attempts per pointer (Section 4, p. 5).

The benchmark is 28 real-world C projects selected from NOPCRAT's 55-project set: 26 lacked tests and one had raw pointers only in function parameters, leaving 28 with tests and in scope (Section 4, "Benchmark", p. 6). They contain 17–2,731 raw pointers (Table 4, Appendix A.1) and range from 437 to 136K lines of C. Across these 28 projects PR2 eliminated 2,255 local raw pointers (Introduction, p. 2; Table 1). The paper states that on average PR2 removes 18.57% of raw pointers and transforms 13.05% of functions (Section 4.1, p. 6). Inference: from Table 1 (#ERP, #AF) and Table 4 (#RP, #F), I computed that 18.57% and 13.05% are unweighted means of the per-project ratios; pooled over all projects the ratios are 2,255/15,560 = 14.5% of raw pointers and 1,722/15,217 = 11.3% of functions. Total prompting cost was $31.60, or $1.13 per project, and mean time was 5.02 hours per project (28-project denominator; Section 4.1, pp. 6–7). The text says the longest project took 28 hours, but the largest TotalT in Table 1 is 83,479 s, about 23.2 hours (my conversion). The paper reports 2,255 versus 506 pointers eliminated by Laertes, 2,160 PR2-only eliminations (95.79% of PR2's 2,255), and that PR2 eliminates 3.46× more raw pointers than Laertes (Section 4.2, p. 7; Table 2, p. 8). Inference: 2,255/506 is about 4.46 times as many, so "3.46× more" means 3.46 times more, not 3.46 times as many.

## technique 1: decision-tree pointer lifting

Use this when a translated function contains a local raw pointer whose ownership, shape, or access pattern can be inferred from its code. The paper's procedure is:

1. Extract raw pointers from translated Rust with tree-sitter (Section 4, p. 5).
2. Give the LLM the function and pointer and ask it to analyze ownership, memory shape (singleton or array), and read/write behavior (Section 3.1.1, pp. 3–4). The prompt explicitly says: “You need to conduct the following three analyses upon the raw pointer: 1) Analyze whether the raw pointer owns the memory. 2) Analyze the shape of the memory, i.e., whether it is a singleton or array. 3) Analyze memory read/write operations using the raw pointer.” (Figure 4, p. 4).
3. Follow the decision tree. Owning singleton, owning array, non-owning written singleton, non-owning read singleton, non-owning written array, and non-owning read array map to `Option<Box<T>>`, `Option<Vec<T>>`, `Option<&mut T>`, `Option<&T>`, `&mut [T]`, and `&[T]`, respectively (Figure 3, p. 4). The paper says nullability is handled conservatively by wrapping inferred structures in `Option` (Section 3.1.1, p. 4).
4. Ask the LLM to return only one of the six candidates, then pass that result to statement refactoring (Figure 4, p. 4). The full prompt in Appendix A.4 (p. 13) adds a step 0: pointers of type void and pointers to pointers (double or higher-level) get the answer CANNOT_REWRITE. It also asks for `Box::from_raw` on the owning singleton case, with `Box::into_raw` if the pointer is returned. Inference: these exclusions mean void and multi-level pointers are outside what the pipeline rewrites.

Inference: In Verus, the executable replacement can use the same Rust ownership shapes (`Option`, `Box`, `Vec`, slices, and references) where the supported subset permits them. A Verus `requires` clause can state non-null or length assumptions, and `ensures` can state the function's functional result; `assert` and proof functions can establish arithmetic facts about indices. The decision tree itself is an LLM heuristic, so it supplies no proof that the chosen ownership or lifetime matches the C semantics. Raw-pointer behavior that must remain can be isolated behind a trusted boundary only if its contract is explicit; this inference follows Verus's contract-based model, not a claim by Gao et al.

The result is a safe-data-structure choice, not a formal equivalence proof. The authors say they focus on sequential data structures for non-singleton values and leave sets and maps for future work (Section 3.1.1, p. 4). It can therefore fail when aliasing, ownership, loops, or library calls are outside the six-way abstraction.

## technique 2: statement refactoring with alias-aware prompts

Apply this immediately after pointer lifting. The paper's steps are:

1. Replace the raw-pointer declaration with a constructor for the selected structure (Section 3.1.2, p. 4).
2. Perform alias analysis to find every use-site of the pointer and rewrite each use with the selected structure's APIs (Section 3.1.2, p. 4). The refactoring prompt says: “You need to conduct the alias analysis to identify all the use-sites of the raw pointers and refactor the statements.” (Figure 5, p. 4).
3. Restrict the edit to the single function; type signatures remain unchanged (Sections 3.2.1 and 6, pp. 5, 9; the Appendix A.4 prompt says not to change parameter or return types). The paper says this conservative scope simplifies repairs but misses chances to eliminate raw-pointer parameters (Section 6, p. 9).

Figure 1 gives the concrete shape: an `Option<Box<c_char>>` replaces a `malloc`ed singleton and a slice `&[c_char]` replaces a pointer used to traverse an array (Figure 1, p. 2). Inference: A Verus port should preserve the executable ownership and API changes, then add contracts for lengths, initialization, and mutation. Borrow relationships are enforced by Rust; Verus proof code can establish that every slice index satisfies its bounds. The LLM's alias analysis is an input to proof development, not evidence that aliases are sound.

## technique 3: change-focused compilation repair

Use after each function rewrite if `cargo check` reports errors. The paper's algorithm is:

1. Compare the function before and after rewriting to compute added, deleted, and modified statements (Section 3.2.1, p. 5).
2. Feed the code changes along with the compiler error message to the LLM, filtering out irrelevant tokens (unrelated pointers and statements) from the repair context (Section 3.2.1, p. 5). The paper does not show this prompt template.
3. Apply the proposed repair and rerun `cargo check`; the data-structure usage repair is limited to N = 5 failures per pointer before PR2 gives up on that pointer (Section 3, p. 3; Section 4, p. 5). The paper uses `cargo check` to avoid linking (Section 4, p. 5).

The paper's example fixes an immutable borrow of `group_slice.len()` interleaved with a mutable slice borrow by storing the length before creating the mutable slice (Figure 6, p. 5). Inference: In Verus, this repair remains ordinary Rust code; verification then requires `requires`/`ensures` and loop invariants for any changed indexing or mutation. A compiler-clean result does not imply a Verus proof or semantic equivalence.

## technique 4: test-case repair and semantic sampling

After compilation succeeds, execute the translated program's existing tests (Section 3.2.2, p. 5). For each panic or output mismatch:

1. Compute code changes between the original and rewritten function (Figure 7(a), p. 5, shows a code change analysis result for a test failure).
2. Give the changed statements and the test error (a panic backtrace in Figure 7) to the LLM; the paper says the design closely follows compilation error fixing (Section 3.2.2, p. 5).
3. Apply the repair and rerun tests; the same limit of N = 5 failures per pointer covers the whole usage repair (Section 3, p. 3; Section 4, p. 5). The Appendix A.4 prompt also tells the LLM not to introduce new raw pointers and to answer CANNOT_FIX if that is impossible (p. 13).

The paper explicitly qualifies this evidence: “passing all test cases which the original Rust program pass is a necessary condition for a valid translation, although it does not theoretically guarantee semantic equivalence.” (Section 3.2.2, p. 5). Existing test suites averaged 62.84% coverage across the benchmark. For rewritten pointers in functions not covered by the tests, the authors had LLMs synthesize tests; in 59 total cases they found only 2 incorrect pointer rewrites, which they report as a 96.61% correctness rate (57/59) among inspected cases (Threats to Validity, p. 8). Ten Rust-experienced volunteers independently examined 20 randomly selected eliminations each (around 1% of all cases), using gpt-4o-mini explanations and Rust documentation; all confirmed that the rewritten code preserved original semantics (Section 4.5, User Study, p. 8). Inference: Verus should encode the input-output relation as a specification and prove each rewrite against it; tests can discover counterexamples but cannot discharge that proof.

## ablations, trust, and limitations

Disabling decision-tree prompting (NT) eliminated 1,208 pointers, 46.43% fewer than full PR2's 2,255; disabling change analysis (NCC) eliminated 1,580, 29.93% fewer (Table 2 and Section 4.4, pp. 7–8). These percentages use full-PR2 eliminations as the denominator (1 - 1,208/2,255 = 46.43%; 1 - 1,580/2,255 = 29.93%, my arithmetic). The baseline comparison uses the same 28 projects, but Laertes processes all 28 in 3,732.85 seconds (133.32 seconds/project) while PR2 averages 5.02 hours/project (Section 4.2, p. 7). The paper notes that two ablation settings slightly outperform full PR2 on `tar-1.34` and `glpk-5.0` (Threats to Validity, p. 8). Inference: Table 2 shows more cases than that: NT exceeds full PR2 on IDs 19 (rcs-5.10.1, 91 versus 73) and 26 (tar-1.34, 187 versus 175); NCC exceeds it on IDs 1, 2, 17, 25 and 28. The wording "slightly" does not fit every one of these (for example ID 19).

What is proved or trusted: Inference: PR2 establishes only that the Rust compiles and the available tests pass; the authors' user study and synthesized-test check are empirical evidence, and the paper says it lacks formal guarantees (Section 4.5, p. 8). The LLM, prompts, C2RUST translation, test adequacy, Rust compiler, and unmodeled C behavior remain trusted. Inference: For a Verus product, the threat is material: an agent can produce compilable, test-passing rewrites that violate an unstated memory or functional requirement. A Verus contract and proof can reduce that threat for the specified behavior, but the C-to-Rust semantic correspondence, external libraries, unsafe code, and the specification itself remain assumptions.

The authors list function-local scope and unchanged signatures, no theoretical correctness guarantee (dependence on test coverage), and possibly low readability and maintainability of the rewritten code as limitations (Section 6, p. 9). They also name nondeterministic LLM outputs and test-case quality as threats to validity (p. 8), and sets and maps as unsupported (Section 3.1.1, p. 4). The paper reports no formal verification and no proof of C/Rust equivalence; it names relational verification as possible future work (Section 6). Inference: VL should reuse the paper's change-focused repair and six-way ownership analysis only as candidate-generation stages, then require Verus contracts and proofs before accepting generated Rust.

## what VL should not redo

Inference: The six-way decision tree, alias-aware statement refactoring, compiler/test repair loop, and the 28-project measurement already constitute a baseline. A new VL experiment should instead measure whether Verus contracts catch PR2's known failure modes, especially uncovered-pointer rewrites and unchanged pointer parameters. The paper's 62.84% mean test coverage and 2/59 uncovered-case errors (p. 8) identify concrete gaps for such a comparison.

## techniques for the catalog

- decision-tree pointer lifting — classify ownership, singleton/array shape, and read/write behavior, then map the result to one of six Rust data structures
- alias-aware statement refactoring — replace declarations and all aliased uses with constructors and APIs of the selected structure
- change-focused compilation repair — feed only changed statements plus diagnostics to an LLM and retry compilation up to five times
- test-case repair — feed changed statements plus test failures to an LLM and rerun tests up to five times
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Meanwhile, a non-trivial portion (17.6%) of raw pointers are successfully rewritten into sequential data structures, including Vec, &[T], and &mut [T]."): I read the whole paper text (and viewed Figures 1 and 3 in the PDF) and checked every quotation, number, page and section reference, and technique step against it; I recomputed totals and means from Tables 1, 2 and 4. I changed page references (Section 4 is on pp. 5-6, Section 4.2 on p. 7, threats and user study on p. 8), the 18.57% and 13.05% description (unweighted per-project means, not pooled), the "3.46× as many" claim (the paper says 3.46× more), the repair and attempt-limit wording, and the ablation note, and added Appendix A.4 prompt details and Inference labels. I did not check cited works, the C2Rust or Laertes outputs, or the released code, and the Table 3 numbers for Claude-3.5-Sonnet and Deepseek-v3.2 were not used.
