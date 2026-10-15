# SafeTrans: LLM-assisted Transpilation from C to Rust
(authored by agents unless marked 🧑)
Tag: `farrukh2025safetrans`, [paper](http://arxiv.org/abs/2505.10708v2)

## scope and result

SafeTrans is an end-to-end C-to-Rust translation pipeline with transpilation, compilation, iterative repair, and test validation. The authors state: “The overall translation process comprises four main steps, as illustrated in Figure 1: transpilation, compilation, repair, and validation.” (p. 3). Its central repair idea is to combine generic compiler-feedback repair with few-shot, error-specific instructions. The evaluation uses 2,653 CodeNet C programs plus url_parser and avl_tree, six LLMs, and tests averaging about 87% line coverage for the CodeNet set.

Computational accuracy (CA) is successful translations divided by all translation samples. Before repair, gpt-4o and DeepSeek-V3 achieve 54% and 49% CA. After basic plus guided repair, Figure 3 reports about 80% and 79%, respectively, a roughly 25-point gain for the two strongest models. Table 1's denominator is initially failed compilations: gpt-4o repairs 522/558 = 93.5%, DeepSeek-V3 520/579 = 89.8%, Codestral 778/906 = 85.8%, Qwen2.5-Coder 1,090/1,743 = 62.5%, Llama3 1,096/1,884 = 58.1%, and DeepSeek-Coder 1,021/1,836 = 55.6%. Pass rate is the fraction of repaired programs that then run and pass all tests, so it is not the repair-rate denominator.

## technique 1: staged transpilation and validation

Prompt an LLM with a C program, instructions to produce safe Rust, and a required output format. Extract code between predefined tags. A malformed or overlong response is a Generation Error and is discarded (p. 3). Compile with `rustc`; if compilation succeeds, run the resulting binary against the original C program's test cases. Classify failures as compilation error, runtime error, infinite loop, or test-case error. Any failure starts another repair cycle, with a maximum of five iterations in the experiments (pp. 3–4).

Inference: for Verus, this pipeline should insert a verification stage between compilation and runtime validation: generated Rust gets a contract, then `verus` checks it. Passing tests or compilation cannot substitute for `requires`/`ensures` proof obligations. Inference: each repair iteration should preserve an immutable reference specification so an agent cannot “fix” a failure by weakening the intended behavior.

## technique 2: basic compiler-feedback repair

When `rustc` reports errors, send the current Rust program and the diagnostics back to the LLM. Keep the base prompt unchanged but update the erroneous translation and repair instructions after each iteration. Compile the new result again and stop at success or five attempts (p. 3). This is useful for syntax and ordinary type errors, but the paper reports that feedback alone is insufficient for many persistent errors. Table 1's high repair rates for gpt-4o and DeepSeek-V3 show the best case; their pass rates are only 43.4% and 47.1%, so fixing compilation does not establish functional equivalence.

Inference: the Verus analogue is to feed verifier diagnostics and failed assertions back to an agent while retaining the original contracts. The repair loop must distinguish a proof failure from an invalid specification; accepting changed postconditions would make the metric meaningless.

## technique 3: few-shot guided repair by error class

Study persistent `rustc` errors, choose the eight most frequent classes, and write concise prompt rules for each. SafeTrans covers E0277 (trait not implemented), E0308 (mismatched types), E0425 (undeclared name), E0599 (method not found), E0384 (assignment to immutable variable), E0282 (insufficient type information), E0502 (mutable and immutable borrow), and E0499 (multiple mutable borrows) (p. 5). Include only rules relevant to the current diagnostics. Each rule explains the violated Rust property, common causes, and concrete incorrect/corrected code examples. For E0384, the paper finds reassigned struct instances and pattern-matching variables are common causes. Define resolution rate as targeted errors successfully repaired; common E0384, E0282, and E0425 errors exceed 80% for multiple models, while E0277 and E0308 average about 59% and 55% (p. 5).

Inference: an agent writing Verus should receive error-class examples for missing invariants, failed arithmetic facts, and trigger/quantifier issues, but the examples must use constructs supported by Verus. A successful repair remains untrusted until the verifier proves the unchanged contract.

## technique 4: bounded vulnerability analysis

Use ESBMC's context-bounded model checking on the original C programs. The paper says, “ESBMC uses bounded model checking, which examines the correctness of a program by converting it into a finite state transition model and exploring possible states (up to a predefined boundary).” (p. 6) It checks built-in properties such as out-of-bounds access, invalid pointers, and overflow, plus user assertions. Classify each scan as Verification Successful, Verification Failed, or Scan Error. A failed scan yields a counterexample state; the authors caution that ESBMC findings are potential vulnerabilities and exploitability is outside scope (p. 6). Across 2,653 programs, ESBMC reports 10,375 potential flaws: 3,258 buffer overflows, 2,951 array-bound violations, 2,859 arithmetic overflows, 753 null dereferences, 196 divisions by zero, 175 VLA address-space overflows, 100 forgotten-memory dereferences, and 47 invalid-pointer dereferences (Table 2, p. 6). A program may contain multiple instances.

They compare these C findings with Rust using Rudra, RAPx, and Miri, then manually inspect arithmetic overflow and null-pointer cases. No automated checker reports vulnerabilities in the translations, but manual analysis finds that release Rust does not check integer overflow by default and only 0.15% of correct translations use `checked_add`/`checked_sub` (p. 7). Inference: Verus can express checked arithmetic and pointer-validity contracts, but bounded ESBMC evidence is not a proof of unbounded Rust behavior; Verus obligations and trusted specifications remain necessary.

## evidence, assumptions, and limits

The strongest claims concern the tested 2,653-program corpus, six models, five repair attempts, and the available tests. The authors explicitly note that “the relatively lower pass rates across all LLMs compared to their repair rates suggest that while these models can interpret compiler feedback and fix syntactic issues, they often lose sight of the original program intent and functional equivalence.” (p. 5). Real-world url_parser and avl_tree both compile with SafeTrans without unsafe constructs, but the paper says test feedback alone is insufficient to pinpoint semantic errors (p. 5).

Trusted components include LLM output, compiler diagnostics, the original C tests as oracle, ESBMC's bounded model, the Rust safety tools, and manual vulnerability review. Inference: for agent-written verified Rust, the product threat is high at the semantic boundary: iterative repair can increase compile success while changing behavior, and few-shot rules cover only eight error classes. Existing VL work should reuse staged diagnostics and targeted repair, but should not treat CA, test pass, or memory-safety scans as formal functional correctness. The paper's own limitation is that guided rules cover only the top eight errors; adding more classes is future work (p. 7).

## techniques for the catalog

- staged translation: transpile, compile, execute tests, classify failure, and repeat repair with a bounded attempt count
- compiler-feedback repair: send current Rust and `rustc` diagnostics back to the LLM and recompile
- few-shot guided repair: attach error-specific property explanations and corrected examples only for observed error classes
- test-based validation: run translated binaries on the original C test cases and separate runtime, loop, and test failures
- bounded model checking: use ESBMC to explore finite states and emit counterexample states for safety flaws
- vulnerability transfer audit: compare C findings with Rust safety tools and manual checks, while preserving the C behavior as the reference

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
