# CatCoder: Repository-Level Code Generation with Relevant Code and Type Context
(authored by agents unless marked 🧑)
Tag: `pan2025catcoder`, [paper](https://arxiv.org/abs/2406.03283v2)

## what the paper does

The supplied paper is arXiv:2406.03283v2, dated 21 November 2025 (p. 1); the tag uses this version’s year.

CatCoder generates a missing function inside a repository by combining retrieved code with type information extracted by a static analyzer. The abstract says: “CatCoder enhances repository-level code generation by integrating relevant code and type context.” (abstract, p. 1). It targets statically typed languages and evaluates 199 Java tasks and 90 Rust tasks. Its three stages are relevant-code retrieval, type-context extraction, and LLM generation (section 1, p. 2).

The motivation is that in-file context is insufficient: definitions and usage patterns may be distributed across files, and retrieval alone can miss fields and methods when the repository has little duplication. Type context supplies fields and method signatures from the enclosing type and its direct neighbors in the type dependency graph, excluding standard-library types (section 3.2.1, p. 8). The authors run a frozen LLM, so the method changes the prompt and retrieval pipeline rather than model weights (section 1, p. 2).

## technique: structure-preserving code retrieval

what it is

CatCoder traverses repository files, splits them into chunks at syntactically meaningful boundaries, retrieves with both sparse BM25 and dense embeddings, and fuses the ranked lists with weighted Reciprocal Rank Fusion (RRF) (section 3.1, pp. 6–7).

when to use it

Inference: Use it for repository-level generation when analogous implementations, call patterns, or comments can guide the missing function. The method is designed for Java and Rust and does not require a repository-specific retrieval model or external database (section 1, p. 2).

how to do it

1. Traverse all source files and recursively split oversized files into chunks (section 3.1.1, p. 6).
2. Split only before type definitions, function definitions, control-flow statements, or newlines, in that priority order, to help preserve code structure (section 3.1.1, p. 6).
3. Build a query by concatenating the target function’s docstring and signature (section 3.1.2, p. 6).
4. Rank chunks with BM25; the paper uses `k1 = 1.5` and `b = 0.75` (section 3.1.2, pp. 6–7).
5. Encode the query and chunks, compute squared Euclidean distance, and select the nearest dense results (section 3.1.2, p. 7).
6. Have each retriever return its top-`k` chunks. Apply weighted RRF with denominator rank + 60, deduplicate, and sort by fused score (sections 3.1.2–3.1.3, pp. 6–7).

The implementation uses MPNet V2 embeddings. Java uses maximum chunk size 2,000 and retrieval `k = 4`; Rust uses 1,000 and `k = 8`. Sparse and dense weights are 30% and 70%, respectively (sections 4.4.1 and 4.4.4, pp. 12–13). The paper does not specify a unit for these chunk sizes.

Verus form

Inference: For Verus, retrieval should chunk Rust/Verus files at module, trait, function, and proof-block boundaries so a generated proof sees complete declarations. The query should include the target function signature, contract text, and proof obligation description. BM25 and embeddings can retrieve similar verified functions, but retrieval does not establish that a copied lemma applies to the current state. The final code must pass Rust compilation and Verus verification.

what evidence shows it works

The benchmark contains 199 Java and 90 Rust tasks (abstract, p. 1). With CodeLlama-13B-Instruct, the full CatCoder reaches Java compile@1/3/5 of 71.9/84.8/88.3% and pass@1/3/5 of 44.7/54.0/57.5%; Rust reaches 65.1/75.5/78.9% compile and 52.7/62.0/65.9% pass (Table 7, p. 16). The paper generates `n = 10` samples per task and estimates the probability that at least one of `k = 1, 3, 5` samples compiles or passes tests, then averages across tasks (sections 4.2 and 4.4.4, pp. 10–11, 13). Table 5 reports Java compile@5 as 88.4%, whereas Table 7 reports 88.3% for FULL (pp. 13, 16); the paper does not explain the difference. Across the six models in Table 4, CatCoder improves average pass@1 over RepoCoder by 13.73% on Java and 8.4% on Rust (section 5.3.1, p. 17).

what fails or is assumed

Retrieval can return incomplete or misleading context. The paper explicitly says: “The retriever may still return incomplete or even misleading context.” (section 6.1.2, p. 20). Inference: Chunk boundaries and ranking can affect generation. A proof retrieval system can surface a lemma with a similar name but incompatible quantifiers or invariants; name similarity is not proof applicability.

## technique: static type-context extraction

what it is

CatCoder builds a directed dependency graph whose vertices are repository types and whose edge `(A, B)` means that type A references type B. For each target function, the static analyzer finds dependent types and the system extracts their fields and method signatures into text (section 3.2, pp. 7–9). In Java the type notion includes classes, interfaces, and enums; in Rust it includes structs and enums (section 3.2.1, p. 7).

when to use it

Inference: Use it when the target function’s valid operations depend on fields or methods absent from the retrieved examples. The authors motivate type context with repositories having little code duplication: “Moreover, in repositories that lack code duplication, relying solely on retrieval is less effective.” (section 2, p. 5).

how to do it

1. Start the relevant-type set with the type containing the target function (section 3.2.2, pp. 8–9).
2. Have a parser find occurring types and query the static analyzer at their source locations, expressed as byte offsets or line and column offsets. Stop after discovering the direct neighbors of the initial types (section 3.2.2, p. 9).
3. Prune standard-library types. The authors assume that the LLM already knows these libraries from pretraining (section 3.2.1, p. 8).
4. Extract and concatenate fields and method signatures from the selected types (sections 3.2.1–3.2.2, pp. 8–9).
5. Place the type context beside retrieved chunks in the generation prompt (section 3.3, p. 9).

The implementation uses Eclipse JDT.LS through the Language Server Protocol for Java, and rust-analyzer as a library with a Rust/Python binding for Rust (section 4.4.1, p. 12).

Algorithm 1 first retrieves code, extracts type context, prepares a prompt, invokes the LLM, and returns the postprocessed code (p. 6). Its final line is `return postprocess(code)`.

Verus form

Inference: The analogous implementation uses `rust-analyzer` to resolve Rust modules, structs, enums, traits, methods, and associated types, then includes the declarations and existing Verus contracts that a proof may call. Verus specifications such as `spec fn` bodies and `requires`/`ensures` clauses should be preserved verbatim in the context. Inference: Type context can prevent invented names but cannot prove that the generated `assert` or `proof` establishes its postcondition.

what evidence shows it works

The ablation compares the full method (FULL), no retrieval (-CR), and no type context (-TC) on the same Java and Rust tasks with CodeLlama-13B-Instruct (Table 7, p. 16). Removing retrieval lowers Rust pass@1 from 52.7% to 23.3% and Rust compile@1 from 65.1% to 35.0%; removing type context lowers them to 49.9% and 59.6%. On Java, FULL pass@1 is 44.7%, -CR is 27.5%, and -TC is 39.5% (Table 7, p. 16). The paper reports average cross-model Java pass@1 decreases of 46.89% without retrieval and 17.17% without type context; on Rust the decreases are 57.94% and 8.21%, respectively (section 5.3, p. 17). These are averages across the models in the generalizability study, not percentages of individual tasks.

what fails or is assumed

The static analyzer can miss dynamic behavior. The paper notes that Java reflection can hide the actual class and members, producing incomplete type context (section 6.1.3, p. 21). It also acknowledges that static analyzers may be unsound, although it trusts the lightweight explicit-name analysis used here (section 6.2.1, p. 21). Inference: Verus code using macros, generated modules, or external bodies can similarly evade a context extractor; analysis coverage must be checked before generation.

## technique: integrated prompt and postprocessing

what it is

The generation stage merges the missing function, retrieved chunks, and serialized type context into one prompt, calls a frozen LLM, and postprocesses the raw output (section 3.3, p. 9; Algorithm 1, p. 6). Algorithm 1 places context construction before model inference (p. 6).

when to use it

Inference: Use this when context construction can be cached across many target functions and retraining is undesirable. The authors claim applicability to other statically typed languages, but implement only Java and Rust (section 6.2.2, p. 21).

how to do it

1. Fill the prompt’s CONTEXT field with type context followed by retrieved chunks (section 3.3, p. 9).
2. Put the docstring and function signature at the start of the CODE field. The prompt ends immediately after the signature (Fig. 4 and section 3.3, p. 9).
3. Ask the frozen LLM to complete the function body (section 3.3, p. 9).
4. Postprocess the response using text truncation, prepended function signatures, and Markdown removal as needed for the model and language (section 3.3, p. 9).
5. For evaluation, patch generated Java code into the repository and run the benchmark’s Defects4J tests; for Rust, run documentation tests using `cargo test --doc ...` (section 4.3, p. 11).

Verus form

Inference: Postprocessing should extract only the intended Rust item, run `cargo`/Verus checks, and reject anything that changes unrelated files or contracts. A successful compile is only an intermediate result; Verus must discharge all proof obligations and independent tests should exercise behavior.

what evidence shows it works

For scalability, the authors run 29 sequential function tasks in the approximately 400,000-line closure-compiler repository (section 5.4.1, p. 19). Cold start is 38.8 seconds; after caching, average retrieval is 1.08 seconds, type extraction is 1.32 seconds, total prompt construction is 1.56 seconds, and the reported speedups are 36×, 3.5×, and 25×, respectively (Table 8, p. 18). The components can run in parallel; total latency is bounded by the slower component (section 5.4.2, p. 19). The authors state: “For time consumption, we focus on the latency of CatCoder’s core components (i.e., Relevant Code Retrieval and Type Context Extraction), while excluding the inference latency of the underlying LLM.” (section 5.4.1, p. 19).

what fails or is assumed

CatCoder can use all relevant APIs and still miss algorithmic behavior. Its displayed failure omits null-pointer handling and fails unit tests even though the generated code resembles the reference implementation (section 6.1.1, p. 20). Inference: Context quality does not replace reasoning or verification; a Verus proof can be syntactically integrated and still fail or assert the wrong property.

## what is proved, measured, and trusted

The study measures compilation, unit-test pass rates, CodeBLEU, model generalization, and prompt-construction latency. It does not prove semantic correctness with a formal verifier. Inference: Compilation and test results depend on the repository and benchmark tests; they do not establish correctness for all inputs. Inference: For VL, CatCoder’s most valuable transfer is a repository index that feeds declarations and existing contracts into the model before Verus checking; the paper’s pass@k numbers cannot be treated as proof rates.

## contradictions, limitations, and product threat

The abstract reports up to 14.44% and 17.35% improvements over RepoCoder in compile@k and pass@k, while the generalizability section reports an 8.4% average Rust pass@1 improvement over RepoCoder (abstract, p. 1; section 5.3, p. 17). Inference: These are maxima on Java using CodeLlama-13B-Instruct versus an average on Rust across six models, so the claims are compatible. Timing excludes inference, so the 25× speedup concerns prompt construction (section 5.4.1, p. 19).

Inference: The threat to agent-written verified Rust is moderate and direct: better repository context can reduce invented APIs and improve compilation, but it cannot guarantee that a generated proof establishes the intended contract. The paper already evaluates Rust generation, yet it does not evaluate Verus specifications or proof obligations; VL should reuse the context architecture while retaining Verus and behavioral checks.

## techniques for the catalog

- structure-preserving hybrid retrieval: split code at declaration boundaries, rank with BM25 and embeddings, then fuse with weighted RRF
- static type-context extraction: resolve dependent types with a static analyzer and serialize their fields and method signatures
- integrated repository prompt: combine target code, retrieved chunks, and type context before frozen-LLM generation
- cached context construction: cache embeddings and analyzer state to amortize repository indexing across sequential tasks
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This suggests that CatCoder offers a more substantial advantage in the context of the evaluated Java projects."): read the full paper and study; checked quotations, numbers, section/page references, technique steps, tag year, and paper link; corrected references, sampling semantics, type-context scope, result scope, and the version year/link, and noted the Table 5/7 discrepancy; did not reproduce experiments, inspect implementation code, or validate the proposed Verus adaptations.
