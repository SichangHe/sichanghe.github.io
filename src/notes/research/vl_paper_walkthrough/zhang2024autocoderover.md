# AutoCodeRover: Autonomous Program Improvement
(authored by agents unless marked 🧑)
Tag: `zhang2024autocoderover`, [paper](https://doi.org/10.1145/3650212.3680384)

AutoCodeRover (ACR) treats an issue report and repository as a structured program-navigation problem. Its context-retrieval agent searches an AST through class, method, and code-snippet APIs, in iterative strata; a patch agent then retrieves precise snippets, writes a patch, and retries malformed or unappliable patches. When tests exist, spectrum-based fault localization (SBFL) supplies suspicious methods and a final test-validation retry loop. The paper says, “Our code search exploits the program structure in the form of classes/methods to enhance LLM’s understanding of the issue’s root cause, and effectively retrieve a context via iterative search.” (Abstract, p. 1)

## technique: AST retrieval with stratified search

what it is and when to use it

Use AST retrieval when an issue names classes, methods, files, or snippets but the exact edit location is unclear. The APIs are `search_class`, `search_class_in_file`, `search_method`, `search_method_in_class`, `search_method_in_file`, `search_code`, and `search_code_in_file`; class searches return signatures, method searches implementations, and code searches ±3 lines (Section 4.2, Table 1, p. 5). Returning signatures first controls context size. The paper says, “To avoid forming very lengthy code context that creates distraction during patch generation, we return only necessary information as API outputs.” (Section 4.2, p. 5)

how to do it

1. Present each retrieval API's description and expected output to the context LLM in the prompt; execute its API requests locally by parsing the codebase into an AST and searching over it (Section 4.2, pp. 5–6)
2. Extract keyword hints from the issue: class, method, file, and code-snippet names (Sections 1 and 4.2, pp. 1, 5)
3. In stratum 1, select the necessary API calls from the issue statement and execute them locally (Section 4.3, p. 6)
4. Add returned signatures and implementations to context; ask the LLM whether context is sufficient (Sections 4.1 and 4.3, pp. 4, 6)
5. If insufficient, use newly revealed method names and snippets as arguments for the next stratum; execute only necessary calls to avoid context overflow (Section 4.3, p. 6)
6. Stop when sufficient and emit a list of potentially buggy class/method locations (Sections 4.1 and 4.3, pp. 4, 6)

The Django example (django-13933) starts by searching `ModelChoiceField`, `ModelMultipleChoiceField`, and a `clean` method in each; the results show `ModelChoiceField` has no `clean` and its signature reveals `to_python` and `validate`, whose implementations are then retrieved until `to_python` is selected as the modification site (Section 3, Figure 1, pp. 3–4). The paper says this "suggests the retrieval should be performed iteratively in multiple steps, so that results from a previous search can become arguments of the following search." (Section 3, p. 4)

Verus form

Inference: A Verus implementation can index Rust modules, structs, traits, and functions, then expose retrieval tools that return signatures first and bodies on demand. The agent can use `search_fn_in_module`-style operations to collect the function and its callers before editing. AST parsing and API orchestration are external tooling; Verus contracts (`requires`, `ensures`, `invariant` statements inside loops) remain in the Rust source. The paper's Python API names do not carry over.

## technique: SBFL-augmented context and validation retry

what it is and when to use it

Given a test suite with passing and failing tests, SBFL assigns suspiciousness scores to program locations from control-flow differences between their executions, using metrics such as Tarantula or Ochiai; ACR uses method-level SBFL. ACR does not replace retrieval with SBFL: it presents suspicious methods as extra hints, letting the LLM cross-reference them against the issue before selecting APIs (Section 4.4, p. 6). The paper says SBFL accuracy depends on test-suite quality because "the SBFL results are effectively an abstraction of the differential of control flows between passing tests and failing tests." (Section 4.4, p. 6)

how to do it

1. Run the available test suite and record the control flow of passing and failing test executions (Section 4.4, p. 6)
2. Compute method-level suspiciousness and select the top-5 suspicious methods (Section 4.4, p. 6; Section 6.2, p. 9)
3. Before context retrieval starts, give the methods to the retrieval agent as "results from an external analysis tool that identifies suspicous code" (Section 4.4, p. 6)
4. Let the agent search those methods and issue-mentioned entities together; retain the resulting context and buggy locations (Section 4.4, p. 6)
5. After each generated patch, execute the test suite on the patched program; if it does not pass the complete suite, re-invoke the patch agent; this validation loop is configured to run three times (Section 6.2, p. 9)

On SWE-bench lite (300 issues), ACR @1 resolved 57/300 = 19%; @3 resolved 78/300 = 26%; SBFL ACR resolved 66/300 = 22% (Table 2, p. 8). On full SWE-bench (2,294), @1 resolved 285/2,294 = 12.42% and @3 422/2,294 = 17.96% (Table 2, p. 8). ACR-sbfl used the developer-written test cases provided in SWE-bench lite as its test suite (Section 6.2, p. 9). Manual inspection on lite found 51/78 = 65.4% of plausible @3 patches correct (Section 6.1, p. 9). The paper says, “Overall, on SWE-bench lite, AutoCodeRover has a correctness rate of 65.4% (51 correct/78 plausible).” (Section 6.1, p. 9)

Verus form

Inference: Replace SBFL with Rust coverage instrumentation or verifier-diagnostic localization: rank functions whose executions or proof obligations correlate with the failing test or `verus` error, then feed those names to the AST retrieval layer. Validation retry should run `cargo verus` and focused regression tests after each patch. A Verus proof failure is stronger evidence than a failing test for the modeled property, but test coverage still matters for unmodeled behavior.

## technique: constrained patch generation

The patch agent receives the issue, buggy locations, all retrieval history, and precise snippets. It must produce an applicable patch; a linter catches Python indentation errors, and the agent retries up to three times before returning the best patch (Section 4.5, p. 7). ACR used GPT-4 (`gpt-4-0125-preview`), temperature 0.2, max 1,024 tokens, and terminates when a patch is generated or the context retrieval stage repeats ten times (Section 5, p. 7). Inference: A Verus agent should similarly separate retrieval from proof editing, require a machine-applicable diff, and reject patches that fail parsing or verification.

## evidence, trust, and limits

ACR's evidence is benchmark resolution, time, token cost, and manual patch equivalence. On lite, @1 averaged 195 seconds and 37k tokens ($0.43) per task; @3 averaged 520 seconds and 112k tokens ($1.30) (Table 2, p. 8). Inference: its trust boundary includes GPT-4, AST parser/API correctness, benchmark tests, and manual labels. Classifying the best of three runs on each of the 300 lite tasks, the authors report success 26.0%, wrong patch (all developer-modified methods modified, wrong content) 29.3%, wrong location in correct file 20.0%, wrong file 18.0%, and no patch 6.7% (Section 6.3, Figure 10, p. 10). They report that all but 2 overfitting patches modify the same methods as developer patches but the code modifications are wrong (Section 6.1, p. 9). Inference: ACR threatens a product that accepts agent-written verified Rust mainly through wrong localization and under-specified intent; Verus can reject invalid proofs, but a proof of the wrong contract remains accepted; VL should reuse structure-aware retrieval, bounded context, and independent validation; it should not assume SWE-bench pass rates transfer to formal specifications.

## techniques for the catalog

- stratified AST search — retrieve signatures and implementations in iterative strata, using each result to select the next necessary API calls
- SBFL-augmented retrieval — add method-level suspiciousness from passing/failing tests as hints that guide, rather than replace, structural search
- validation retry — rerun tests after a patch and regenerate up to a fixed attempt count when validation or patch application fails
- constrained patch generation — supply precise locations and retrieval history, enforce an applicable diff format, lint it, and cap retries
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Our first observation is that the context retrieval should not be restricted to a single API invocation."): what I checked: every quotation, number, section and page reference, technique step, the DOI link, and the tag; what I changed: corrected the API-interface step (no argument formats are described), the Django example (clean was searched, not discovered; Section 3 is pp. 3-4), the SBFL steps (top-5 methods, the quoted hint wording, the validation loop is in Section 6.2 p. 9 and runs three times), the GPT-4 parameters reference (Section 5, not 4.5), added the ACR-sbfl test-suite source and the Section 6.3 failure percentages, and marked the trust-boundary sentence as Inference; what I did not check: the figures as images (Figures 6-8, 11) and the Verus forms, which are Inference.
