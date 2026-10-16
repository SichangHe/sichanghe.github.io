# RustAssure: Differential Symbolic Testing for LLM-Transpiled C-to-Rust Code
(authored by agents unless marked 🧑)
Tag: `bai2025rustassure`, [paper](http://arxiv.org/abs/2510.07604v1)

## scope and result

RustAssure transpiles C functions to Rust with an LLM and checks the translation by differential symbolic execution. Its central claim is stronger than ordinary unit or fuzz testing: “RustAssure symbolically executes both the original C and LLM-transpiled Rust code to detect functional divergence between the original C and Rust code.” (p. 1). The tool reports a Semantic Similarity Score (S3) from graph edit distance between symbolic return values and output parameters. It is compositional: a caller can be checked while an invoked function is abstracted to return symbolic values.

The evaluation covers five codebases—libcsv (405 lines), urlparser (435), optipng (3,039), libbmp (287), and u8c (334)—and four models. Across 176 C functions, GPT-4o compiled 158, GPT-4o-mini 146, GPT-3.5-turbo 124, and Claude-3.5-Sonnet 85. The abstract's 89.8% compilability is GPT-4o's 158/176 denominator, while the reported 72% equivalence is across successfully symbolized outputs, not all 176 functions. Per-model average equivalent translations are 72% (GPT-4o), 74% (GPT-4o-mini), 71% (GPT-3.5-turbo), and 80% (Claude-3.5-Sonnet); Claude's high rate is paired with only 48.3% compilability. The paper reports 12 complex and 13 simple bug instances; because some recur across models, the distinct buggy functions are 20 and 17, respectively.

## technique 1: context-shaped LLM transpilation

The LLM Invoker preprocesses C before prompting. First expand headers and remove unused typedefs, variable definitions, and struct definitions with Clang ASTMatchers. Then extract C struct definitions and translate them once into a Struct Transpilation Cache; supply the cached Rust definition in every function prompt so nondeterministic calls do not create inconsistent field names. Analyze uses of ambiguous fields such as `char*`: a field used as a buffer should become `Vec<u8>`, while a null-terminated string should become `String`. Include those uses in the struct prompt. For a function exceeding the model context window, split it into chunks, translate each chunk, then assemble the responses. If compilation fails, send the original C function and compiler diagnostics back to the LLM for repair. If the result contains `unsafe` or calls unsafe libc functions, request re-translation up to a configurable limit (pp. 3–4).

The motivating `u8next_` example shows why this context matters. C resets `val` to the first byte on invalid UTF-8; the generated Rust omits that assignment and returns an intermediate state (`0x02` rather than `0xC2`) for input `{0xC2, 0x41}` (pp. 2–3). Figure 5 gives the type-use rule: a reallocating `char*` buffer maps to `Vec<u8>`, while a URL string maps to `String` (p. 7).

Inference: for Verus, this stage is an untrusted synthesis front end. A Rust function that is later verified should retain a precise contract and should not inherit safety merely from a successful compile or a low `unsafe` percentage. Inference: the cached struct definition and usage analysis are useful prompts for choosing Verus data types, but they do not prove that the chosen type preserves C aliasing or ownership behavior.

## technique 2: symbolic instrumentation and compositional execution

Instrument each C and Rust function with a Symbolizer prologue and epilogue. The prologue initializes scalar, pointer, and struct arguments with symbolic values; nested pointer and struct fields are allocated and traversed to a configurable depth (10 in the evaluation). The epilogue logs explicit returns, output parameters, and modified struct fields or array elements. External calls are replaced by symbolic-return stubs, so each function can be analyzed independently even if another generated function does not compile or link. Compile both languages to LLVM IR, then use KLEE v3.1 to execute the IR symbolically. The paper explains, “After the Symbolizer modifies the C and Rust functions, the Symbolic Executor performs the core symbolic execution process using the KLEE [18] symbolic execution engine.” (p. 4).

KLEE emits KQuery expressions. Rust's standard library is compiled to LLVM bitcode and linked because KLEE lacks direct Rust-standard-library support. An ANTLR KQuery parser converts the returned expressions to GraphViz graphs, and networkx computes graph edit distance. A zero edit distance means the compared symbolic returns are identical; a larger distance indicates divergence (pp. 4–6). The checker logs only fields changed by the function, which avoids treating untouched output memory as a difference.

Inference: the Verus analogue is to write a function with `requires` describing valid input ownership and `ensures` relating its returned and modified values to an abstract C behavior, then prove the relation with `assert` facts and proof functions. A Verus proof can establish the Rust contract, but it does not automatically establish equivalence to arbitrary C or to KLEE's IR model. Inference: the paper's symbolic stubs are assumptions and must be represented as trusted external contracts in a Verus threat model.

## technique 3: language-aware normalization before comparison

Raw symbolic graphs differ even when high-level behavior matches. Rust's compiler adds integer-extension and overflow-check nodes absent from C; struct layout and padding differ; nullable pointers become `Option`; C strings and arrays become Rust `String`, slices, or `Vec`. RustAssure normalizes these differences in three patterns.

First, put `#[repr(C, packed)]` on every transpiled struct. This preserves C field order and C-style alignment/padding for comparison. Second, when a Rust value is `Option<T>`, extract/cast its inner value before comparing it with C's nullable pointer representation. Third, compare the data pointer and symbolic buffer contents for `String`/slice and `Vec` values, initializing slices with symbolic buffers of size 100 and length 100. The checker recursively compares array elements and pointer-referenced fields. The authors state, “RustAssure applies the #[repr(C, packed)] attribute on every Rust struct type.” (p. 5).

The Language-aware Graph Converter removes redundant type-extension nodes and other language artifacts. For `u8fold`, both programs add 40 to a Unicode code point, but Rust's overflow checks create extra graph nodes; normalization removes those nodes while retaining semantic operations (Figure 3, p. 5). RustAssure deliberately uses graph edit distance instead of SMT solving to simplify implementation; strict SMT equivalence is left for future work (p. 6).

Inference: `repr(C)` and explicit layout may help a Verus model, but `repr(packed)` can create unaligned-access hazards and does not by itself prove semantic equivalence. Inference: a Verus migration should specify an abstract value relation and prove it, rather than importing a graph-distance threshold as a proof. A zero S3 score is evidence from this checker, not a Verus theorem.

## technique 4: divergence diagnosis and feedback

Use the S3 graph difference to identify which return value or output parameter diverges and how. The checker found a missing pointer increment in `scan_option`: C consumes and discards `=`, while generated Rust leaves it in the option name. Symbolic minimum returns are `ptr = ptr + 3` for C and `ptr = ptr + 2` for Rust (p. 8). It also found a wrong conditional in `csv_set_blk_size`: C assigns when `p` is non-null, while Rust tests `p.blk_size != 0`; symbolic execution exposes the added constraint (Figure 7, p. 8). The motivating UTF-8 bug similarly appears as a mismatch in the output parameter `ch` (pp. 2–3).

The system can feed a divergence back into a future LLM translation, a proposed enhancement in the discussion. In the reported evaluation, 12 complex and 13 simple bugs were found across model outputs; average S3 precision is 85.7% for libcsv and 88.2% for u8c, with recall 100% for both. The recall denominator is manually rewritten existing tests: 39 libcsv tests and 5 u8c tests comprising 13 inputs. These figures do not mean all five codebases were manually exhaustively checked.

Inference: a Verus repair loop could turn a counterexample or mismatching abstract value into a failing `assert`, then ask an agent to revise code or its `ensures` contract and rerun Verus. The contract must not be weakened merely to silence the mismatch. Inference: storing each mismatch as a regression lemma or test is a direct way to prevent repeated agent errors.

## evidence, assumptions, and limits

Table I gives GPT-4o compilation 158/176 = 89.8%; its S3-equivalent output percentages are denominated by each row's “Output values,” not by C functions. Across codebases, instruction coverage ranges from 79.24% to 95.04% for C and 72.21% to 95.91% for Rust (Table II). Symbolic execution uses eight cores and a 180-minute timeout per function batch; Table III reports, for example, GPT-4o totals of 5h2m (libcsv), 5h4m (urlparser), 15h5m (optipng), 6h14m (libbmp), and 11h56m (u8c). FLUORINE's 31/31 compilable functions yield 10 fuzzing passes and 25 symbolic-equivalence passes, whereas RustAssure's 42 functions yield 38 compilable and 33 symbolic-equivalence passes (Table VII).

Trusted or assumed are Clang/rustc lowering, KLEE, KQuery parsing, graph normalization, the correctness of external symbolic stubs, manual bug labels, and the premise that C behavior is the reference. The paper explicitly warns that C memory-corruption bugs absent in Rust can make functions appear nonequivalent and produce false positives (p. 4). It also reports false positives from KLEE array optimizations; alignment is described as engineering work (p. 8). RustAssure's claim that symbolic execution “can explore all paths, thus proving that all inputs produce equivalent outputs” (p. 1) is broader than its configured depth, timeout, external stubs, and language-normalization assumptions; the measured results establish the tested setup, not universal equivalence.

Inference: threat to a product that lets agents write verified Rust is high at translation and reference-model boundaries. RustAssure catches semantic bugs that unit tests miss, but its 72% equivalence rate and 13.05% GPT-4o average unsafe-code percentage show that compilation and safety style are insufficient. VL should reuse differential checking and language-aware normalization rather than redo generic LLM transpilation prompts. A product-grade adaptation needs independently reviewed specifications, explicit treatment of foreign calls and undefined C behavior, and Verus proofs for the Rust implementation's contract.

## techniques for the catalog

- context-shaped transpilation: preprocess headers, cache shared structs, analyze field uses, chunk large functions, and repair from compiler diagnostics
- compositional symbolic execution: instrument arguments and outputs, stub callees symbolically, compile both languages to LLVM IR, and run KLEE
- language-aware normalization: reconcile C/Rust layout, Option, strings, slices, vectors, and compiler-generated graph nodes before comparison
- graph-distance equivalence: parse KQuery returns as graphs and use edit distance, with zero distance as the checker’s equivalence criterion
- divergence diagnosis: report the mismatching output and symbolic expression difference so a missing operation or wrong branch is actionable
- feedback repair: send compiler or semantic-divergence evidence back to the LLM for bounded retranspilation

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
