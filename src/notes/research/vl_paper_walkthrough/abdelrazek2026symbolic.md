# Symbolic Execution Meets Multi-LLM Orchestration: Detecting Memory Vulnerabilities in Incomplete Rust CVE Snippets
(authored by agents unless marked 🧑)
Tag: `abdelrazek2026symbolic`, [paper](http://arxiv.org/abs/2605.00034v1)

## purpose and scope

The paper presents a pipeline that turns isolated, uncompilable Rust CVE fragments into compilable Rust FFI wrappers, then analyzes those wrappers with KLEE symbolic execution. It targets memory vulnerabilities in unsafe Rust when database entries omit types, imports, traits, and Cargo metadata. The authors state: “This paper presents a system combining symbolic execution (KLEE) with a 4-agent multi-LLM architecture for detecting memory vulnerabilities in Rust unsafe code.” (Abstract, p. 1)

The input is a fragment, not the original buildable program. The authors report zero compilation success for Kani, Prusti, Creusot, and Haybale on their 31-file dataset (Sections 2.4 and 5.2, pp. 3, 6). Their explicit limitation is: “Generated wrappers approximate the vulnerability class rather than its precise exploitation path.” (Section 8.1, p. 9) Inference: this is a bug-finding aid for generated approximations; a KLEE error does not establish that the original program has the same execution path.

## technique 1: role-specialized planning and wrapper synthesis

What it is. Four agents exchange structured outputs with distinct responsibilities. The authors describe the sequence: “The process consists of four sequential stages: strategic planning by the Oracle/Validator, security analysis by the Safety Checker, FFI wrapper generation by the Code Specialist, and parameter optimization by the Fast Filter, followed by KLEE symbolic execution.” (Section 4.1, p. 4)

Inference: use this decomposition when a fragment cannot compile and the goal is to construct an executable example of its suspected vulnerability class. It does not supply the missing evidence needed to establish exact whole-program behavior.

How to do it, following the paper:

1. Give the raw CVE snippet to the Oracle/Validator, GPT-4 Turbo. It identifies potential vulnerability types, estimates complexity, and recommends typically 8–12 FFI functions (Section 4.3, p. 4).
2. Pass the snippet and structured analysis plan to the Safety Checker, Claude Opus 4.5. It identifies vulnerability patterns, assigns a 0–10 risk score, and marks critical lines (Figure 1, p. 2; Section 4.3, p. 4).
3. Give the prior outputs to the Code Specialist, Claude Sonnet 4.5. It generates exported Rust FFI functions. Missing context is replaced with raw-pointer or primitive representations such as `*mut u8`, `usize`, and `i32`, without external crates. The multi-agent configuration uses `max_tokens=2500` (Figure 1, p. 2; Sections 4.2–4.3, p. 4).
4. If compilation fails, return the exact compiler error for up to two correction attempts before using a predefined fallback template. Three of 31 files required the fallback (Section 7.1, p. 9).
5. Give the Safety Checker's risk score and vulnerability patterns to the Fast Filter, GPT-4o-mini. It selects DFS, BFS, or random-path search, time and memory limits, and maximum fork depth (Section 4.3, p. 5).

The motivating example maps the paper's suspected fault in `Vec::from_raw_parts(self.buffer, 0, self.cap)` to separate functions containing an unchecked pointer write, deallocation followed by a write, and unchecked size multiplication (Listings 2–3, pp. 4–5). The authors explain: “This is semantic approximation rather than code repair” (Section 7.2, p. 9). Inference: replacing a source operation with a different operation that exhibits the same suspected error class requires an independent fidelity check before applying the result to the source.

Verus form. Inference: a possible adaptation is to specify and verify a reconstructed wrapper with `requires`, `ensures`, assertions, and loop invariants. Raw-pointer operations would require a supported pointer model and explicit assumptions. Such a proof would establish the wrapper's contract; correspondence to the original fragment would remain a separate obligation. The paper does not evaluate Verus.

Evidence. The paper reports 28/31 wrappers compiling successfully, 90.3%, versus 58.0% for the single-agent baseline. Fallback rates were 9.7% versus 42.0%; file detection rates were 83.9% versus 51.6%. Average time per file increased from 4.2 to 6.8 minutes (Section 6.1, p. 6; Table 5, p. 8). The dataset is the memory-safety subset selected from HALURust (Section 5.1, p. 6).

Limits. The single-agent baseline used Claude Sonnet 4.5 alone with `max_tokens=1500`; the multi-agent wrapper generator used 2500 (Sections 4.3 and 5.3, pp. 4, 6). Inference: this comparison changes both orchestration and output allowance, so it does not isolate the effect of role specialization. The authors also identify default-temperature nondeterminism, semantic fidelity, and KLEE parameter sensitivity as threats to validity (Section 8.1, p. 9).

## technique 2: symbolic execution and error interpretation

What it is. Compile the generated Rust FFI wrapper to LLVM bitcode, link it with an automatically generated C harness, and execute it symbolically with KLEE (Section 4.4, p. 5). The post-processing section lists `.ptr.err`, `.external.err`, `.abort.err`, `.div.err`, and `.overflow.err` output types (Section 4.5, p. 5).

Steps described by the paper:

1. Declare the exported Rust functions in the C harness and include `klee/klee.h` (Listing 4, p. 5).
2. Make inputs symbolic with `klee_make_symbolic`. The example uses a 128-byte buffer, constrains two indices to less than 10000 with `klee_assume`, and selects among four function calls with `klee_range(0, 4, "path")` (Listing 4, p. 5).
3. Link the Rust bitcode with the harness and run KLEE using the selected search and resource parameters (Sections 4.3–4.4, p. 5).
4. Inspect pointer errors as stronger evidence of invalid accesses in the generated artifact. Examine external errors individually: some arise from allocator calls, while a generic fallback's division panic can be unrelated to the original CVE (Section 7.3, p. 9).

Inference: Listings 3–4 are not a directly reusable, internally consistent implementation. The displayed Rust `buffer_overflow_write` accepts three arguments, but its C declaration and call use four; the C harness also calls `double_free_trigger`, whose definition is not in the displayed Rust listing (pp. 4–5). The study therefore records the intended procedure rather than treating the listings as validated executable code.

Verus form. Inference: encode the intended memory and arithmetic properties as contracts and prove them over the contract's permitted inputs. A symbolic counterexample can help identify a violated condition. Any external specification and any correspondence between wrapper and source need separate justification; executing a generated wrapper does not establish either.

Evidence. The authors report detection in 26/31 files and 1,206 critical errors: 124 pointer errors and 1,082 external/panic errors. Two CVEs account for 1,133 errors, 93.9% of the total (Section 6.1, p. 6). Their warning is explicit: “KLEE’s critical error count measures symbolic path coverage, not distinct vulnerability instances.” (Section 8.3, p. 9)

Limits. Table 2 reports use-after-free detection of 6/9, 67%, and integer-overflow detection of 1/3, 33% (p. 7). Section 7.4 attributes these limitations to difficulty reconstructing object lifetimes and surrounding context (p. 9). Miri is reported to label all 31 files generically, while Clippy produces 14 warnings across 11 files (Section 5.2, p. 6; Table 4, p. 7). Inference: these outputs have different meanings, so their counts do not establish relative accuracy on original-program vulnerabilities.

The paper also contains numerical inconsistencies. Section 5.1 says eight CWE-416 files, whereas Table 2 lists nine (pp. 6–7). Table 3 gives its top ten CVEs 1,205 errors, leaving one of the reported 1,206 errors for the other sixteen detected files; those totals cannot all hold under the stated criterion of at least one error per detected file (Table 3, p. 7; Section 6.1, p. 6). Inference: retain the headline values as reported results, but do not treat the detailed per-CVE distribution as reconciled.

## technique 3: graph post-processing for cross-CVE analysis

What it is. `graph_klee.py` converts KLEE output into a typed property graph. It creates CVE, ErrorType, SymPath, and CWE nodes. A SymPath stores concrete inputs and the associated stack trace (Section 4.5, p. 5).

Steps: ingest a KLEE output directory; create the four node types; add `HasError` edges from CVEs to error types weighted by error count; add `TriggeredBy` edges from CVEs to test cases; add `ClassifiedAs` edges from CVEs to CWE categories assigned by Agent 1; and add `SharedPattern` edges between CVEs sharing a symbolic path pattern of the same error type. Export the graph as JSON-LD (Section 4.5, pp. 5–6).

Evidence. The authors report 31 CVE nodes, 5 error-type nodes, 11 CWE nodes, 1,206 symbolic-path nodes, and 1,310 labelled edges (Section 4.5, p. 6). Figure 2 instead depicts vulnerability-function nodes linked to error files by `Triggers` edges (p. 6). Inference: the illustrated graph and the stated four-type schema should not be assumed identical without inspecting the implementation.

Verus form. Inference: a graph could organize verified contracts, assumptions, and counterexamples, with explicit links to proof results. Graph connectivity itself supplies no proof. The paper's graph inherits the generated wrappers' fidelity limitations and the distinction between path counts and vulnerability counts (Sections 7.4 and 8.3, p. 9).

## what is proved, trusted, and relevant to VL

The paper reports compilation and symbolic-execution results, rather than a proof that wrappers preserve original-program semantics. It acknowledges that a wrapper assigned the wrong class can produce real KLEE errors of that wrong class, and that the Oracle's constraint is enforced through prompting rather than formal verification (Section 8.1, p. 9).

Inference: VL could reuse the planning, wrapper-generation, execution, and error-triage pattern as a way to propose verification targets. Accepting a wrapper result as evidence about production code would additionally require source correspondence and justified models of external operations. A Verus contract for the wrapper alone would not supply those links. This paper evaluates neither that extension nor Verus proofs.

## techniques for the catalog

- role-specialized JSON orchestration — split planning, security analysis, wrapper generation, and KLEE tuning among four sequential agents
- incomplete-code FFI synthesis — replace missing context with exported primitive/raw-pointer functions, retry compilation, then use a fallback template
- KLEE harness construction — declare exported functions, make inputs symbolic, constrain indices, and select execution paths
- typed error triage — prioritize pointer errors and inspect whether external errors arise from CVE-specific functions or generic fallback code
- graph post-processing — organize CVEs, CWE categories, error types, and symbolic test cases with labelled relationships

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "For our 31-CVE dataset, the resulting Graph DB contains 31 CVE nodes, 5 ErrorType nodes, 11 CWE nodes, and 1,206 SymPath nodes, connected by 1,310 labelled edges."): read the full paper and study; checked quotations, reported numbers, section/page references, and technique steps; corrected references and quotation wording, separated inferences, and recorded baseline, listing, graph-schema, and numerical limitations; did not inspect the replication repository, rerun experiments, or independently validate the original CVEs or Verus adaptations.
