# Python Symbolic Execution with LLM-powered Code Generation
(authored by agents unless marked 🧑)
Tag: `wang2024symbolic`, [paper](https://www.semanticscholar.org/paper/9165f54bc04a617797dd20e52f73dec8da311525)

## what the paper proves and builds

Wang et al. present LLM-Sym, an agent that extracts Python control-flow paths, asks an LLM to emit Z3Py constraints, executes and repairs that code, and turns a solver model into a test case. The paper's motivation is that Python's dynamic types and flexible lists make fixed Python-to-SMT rules difficult. The abstract states: “The core contribution of LLM-Sym is translating complex Python path constraints into Z3 code.” (Abstract, p. 1). The implementation is built on the path extractor from The Fuzzing Book; only its CFG explorer is reused, while the rule-based translator is replaced by generation.

Inference: for VL, the important pattern is a generator whose output is executable proof or solver code, followed by a machine checker and a fallback. The paper generates tests rather than proofs of Rust behavior, so the Verus mapping below is an engineering inference, not a result demonstrated by this paper.

## technique 1: extract and chunk complete execution paths

What it is. The extractor builds a Python AST-based control-flow graph, traverses it with breadth-first search, and records each path as ordered entries containing a line number, a type (`enter`, `condition`, or `expr`), and the statement text (Section 3.1, pp. 5–6). The authors add class-definition support and annotate `for` nodes with the reached iteration. They split a path before generation because long sequences cause more generation errors. The default is one statement per chunk; an alternative groups statements up to condition nodes (Section 3.1, p. 6).

Steps from the paper:

1. Build the CFG from the program AST and traverse it breadth-first (Section 3.1, p. 5).
2. Classify each node as function entry, branch/loop condition, or another expression (Section 3.1, p. 5).
3. Record loop iteration numbers and emit an ordered path of dictionaries (Section 3.1, pp. 5–6).
4. Split the path into generation chunks; the default has one statement per chunk (Section 3.1, p. 6).

The paper says, “we find that the Z3 code generator is more likely to err when the input execution path sequence is long.” (Section 3.1, p. 6). Its intrinsic path-explosion problem remains; optimizing extraction is explicitly outside the work (Section 3.1, p. 6).

Verus form: Inference: represent a verified Rust function's control-flow summary as a ghost `Seq` of tagged statements or as a finite specification model. Use a `spec fn` to interpret a path and `proof fn` lemmas to show that each executable branch preserves the interpretation. A Rust loop can carry a loop `invariant` for the processed prefix and a `decreases` measure. Inference: Verus does not extract CFGs or synthesize path summaries, so extraction and chunking remain an external generator; Verus checks the emitted Rust contracts and proofs.

Evidence and limits. The evaluation truncates paths to length 20; the 111 paths come from 50 LeetCode programs, with average trace length 12.3 (Section 4.2, p. 10). No experiment measures coverage of all CFG paths, and breadth-first enumeration can still explode. Inference: a VL system must bound path count and retain an explicit “unexplored” status instead of treating generated paths as exhaustive.

## technique 2: LLM type inference before SMT translation

What it is. Because Z3 variables require fixed sorts while Python variables need not have annotations, LLM-Sym first asks an LLM to collect all variables and input arguments and predict their types. The prompt uses three few-shot examples and requires element/key/value types for sequence and mapping types (Section 3.2.1, pp. 6–7). The method assumes approximately that a variable's type does not change during execution; the paper says this applies to the majority of variables (Section 3.2.1, p. 6).

Steps from the paper:

1. Provide the Python snippet and three formatted examples to the type predictor (Figure 4, p. 6).
2. Ask for every variable's likely type, including nested element, key, and value types (Section 3.2.1, p. 6).
3. Pass the resulting type list to every Z3-code-generation step (Section 3.2.2, p. 7).

Verus form: Inference: replace predicted runtime types with Rust's compile-time types and explicit mathematical models. For a collection, use a verified representation predicate connecting the executable collection to a ghost `Seq` or `Map`; state valid lengths and element relations in `requires` and `ensures`. Inference: if a generated model requires a dynamic type, reject it or require an explicit enum and prove each variant's operations; an LLM guess cannot be a Verus type proof.

Evidence and limits. Figure 9 reports correct inferred types for `nums: List[int]`, `l`, `r`, and `i` in one `sortColors` example (Section 4.3, p. 11). The paper gives no aggregate type-prediction accuracy. Dynamic reassignment, unsupported Python objects, and an incorrect type guess can invalidate every later constraint.

## technique 3: SSA-aware, retrieval-guided incremental Z3 generation

What it is. For each path chunk, the generator receives the chunk, inferred types, and previously generated Z3 code. It converts variables to SSA names and maintains an SSA environment, then retrieves semantically similar path-to-Z3 examples from a manually built knowledge base. Keys and queries are Sentence-BERT vectors compared by L2 distance (Section 3.2.2, pp. 7–8). The knowledge base has 14 templates, including list initialization, length, indexing, assignment, append, pop, negative indexing, general assignment, and arithmetic (Section 3.2.2, p. 8; Table 1, p. 8).

The list representation is concrete in the paper: a Python list is approximated by a Z3 `Array` plus a symbolic integer length. For example, Table 1 gives `_n_1 = Store(_n_0, _n_0_len, _x_0)` for append, increments `_n_1_len`, and gives `solver.add(_n_0_len > 0)` before pop. Figure 5's retrieval record supplies a path, variable types, previous code, answer code, and updated environment (Section 3.2.2, pp. 7–8).

Steps from the paper:

1. Transform assignments to SSA and provide the current variable environment (Section 3.2.2, p. 7).
2. Embed the path chunk and retrieve the most similar templates by L2 distance (Section 3.2.2, p. 8).
3. Prompt the LLM with the chunk, types, prior code, and retrieved examples; append the resulting Z3Py to prior code (Figure 6, p. 8).
4. Repeat for all chunks, preserving the updated SSA environment (Section 3.2.2, p. 7).
5. Run the completed Z3 program and interpret its model as input values; arrays are reconstructed using their `Store` chains and symbolic length (Section 3.2.3, pp. 8–9).

Verus form: Inference: retain the paper's separation between a symbolic model and generated code, but make the model a `spec fn` over Rust values and use `proof fn` lemmas for each collection operation. Use `requires` for bounds and representation validity, `ensures` for exact updates and frame facts, and loop `invariant` clauses for SSA-like state relations. Inference: Verus has no retrieval API or SSA environment object; a generator may propose lemmas and contracts, but only the Verus checker can accept them. Do not use `lemma` as a Verus keyword, and do not mark the function being verified with `external_body`.

Evidence. On the 111-path dataset, the default two-template setting produced 97 SAT results, 94 executable tests, and 65 paths matching the target trace (Table 2, p. 10; denominators are 111 generated paths). For retrieval, recall@1 is 55.8%, recall@2 64.2%, and recall@5 81.5% on constraint statements after excluding simple conditions (Table 4, p. 13). Table 3 shows a non-monotonic result: one, two, three, four, and five retrieved templates yield path-correct counts 54, 65, 62, 61, and 62, respectively, out of the same 111 paths. Inference: more context can distract the model, so VL should tune retrieval count empirically rather than assume monotonic improvement.

## technique 4: execute-and-self-refine generated solver code

What it is. After each chunk, LLM-Sym executes the accumulated Z3Py. If execution raises an error, it sends the buggy code and error message back to the LLM and retries up to three times (Section 3.2.2, p. 8). If all retries fail, it abandons Z3 generation for that path and invokes a direct LLM solver. The paper states: “If all fixing attempts are unsuccessful, we regard this path as unsolvable and directly use an LLM solver to solve the constraints.” (Section 3.2.2, p. 8).

The successful Figure 11 repair replaces Python-style integer `//` with Z3Py `/`, because integer-variable division in Z3Py rounds down (Section 4.4, p. 14). Figure 12 shows the boundary: attempts to encode `str(count)` and string indexing produce unsupported or undefined APIs after three retries (Section 4.4, pp. 14–15).

Steps from the paper:

1. Concatenate the new code with prior code and execute it (Section 3.2.2, p. 8).
2. On an exception, provide code plus the error message to the self-refiner (Section 3.2.2, p. 8).
3. Retry the repair three times in the experiment (Section 3.2.2, p. 8).
4. If every attempt fails, call the direct LLM solver instead (Section 3.2.2, p. 8).

Verus form: Inference: use the Verus compiler as the checker in the loop: generate a candidate proof function or contract, run Verus, feed diagnostics back to the generator, and retain only a candidate that verifies. A candidate should use `assert`, `proof fn`, `requires`, `ensures`, loop `invariant`, and `decreases` as appropriate. Inference: a fallback that merely asks an LLM for an answer is not evidence of a Rust proof; a failed candidate must remain failed unless a checker validates the replacement. Solver success is also conditional on the specification and trusted external contracts.

Evidence and limits. Table 6 reports that with two retrieved templates the Z3 generator produced 74 solutions with a 73.0% pass rate, while the LLM fallback produced 23 with a 47.8% pass rate; the table excludes UNSAT outputs, so these denominators are generated solutions rather than all 111 paths (Table 6, p. 15). The paper's fallback improves availability but cannot establish correctness for unsupported operations.

## technique 5: convert solver models into executable tests

What it is. Once Z3 solves the full path, a separate GPT-4o test-case generator identifies initial-input SSA variables and reconstructs Python lists from Z3 arrays plus length variables. It emits a complete test function and no code outside it (Figure 7, p. 9). The paper's Figure 9 example converts `_nums_0 = Store(K(Int, 0), 0, 3)` and `_nums_0_len = 3` into `[3, 0, 0]`, then asserts the sorted result (Section 4.3, p. 12).

Verus form: Inference: use a verified model-to-input function only when its output has a proved representation relation to the Rust test state. State that relation in `ensures` and prove bounds before constructing slices or indexing. Inference: generated tests can check executable behavior, but they do not replace a universal Verus postcondition; VL should use them as counterexamples and regression tests after proof generation.

Evidence and limits. The paper measures whether a generated test is runnable and whether it follows the same target path, not whether the target program is correct for all inputs. The direct LLM solver can return `UNSAT`; an incorrect SSA reference can also make a satisfiable path appear unsatisfiable, as Figure 10 explains (Section 4.3, pp. 12–13).

## technique 6: choose between SMT-backed generation and direct LLM solving

What it is. LLM-Sym uses the Z3 route when generation succeeds and a direct LLM solver otherwise. The latter receives the program and path, reasons about satisfiability, and emits a test or `UNSAT` (Section 3.2.4, p. 9). The authors compare both routes and two standalone models.

Evidence. With two templates, Z3-generated solutions pass at 73.0% and direct-LLM solutions at 47.8% on their respective non-UNSAT subsets (Table 6, p. 15). Table 7 reports, over all 111 paths, path-correct counts of 55 for GPT-4o-mini (49.5%), 71 for GPT-4o (64.0%), and 65 for LLM-Sym (58.6%); these percentages are arithmetic checks of 55/111, 71/111, and 65/111, while the table's “Pass rate (Z3)” and “Pass rate (LLM)” are conditional rates for LLM-Sym subsets, not overall rates (Table 7, p. 16). The paper says GPT-4o has a higher overall path-correct count than LLM-Sym, while LLM-Sym's Z3 subset is stronger.

Cost evidence is for all 111 paths: Table 8 reports total and per-sample time and money of 2241 seconds and $0.61 ($0.005) for LLM-Sym, 495 seconds and $0.04 ($0.0004) for GPT-4o-mini, and 1189 seconds and $1.96 ($0.018) for GPT-4o (Section 4.6, pp. 16–17). The paper states, “On average, LLM-Sym solves a single path with 20.2s, and the cost is only 0.005$.” (Section 4.6, p. 16). The 2241/111 time is 20.19 seconds, consistent after rounding; $0.61/111 is $0.0055, also consistent after rounding.

Verus form: Inference: use direct generation only to propose a proof repair; route acceptance through Verus and preserve a machine-checked proof artifact. A product can use model-based ranking to select which candidate to compile, but must report verifier-clean candidates separately from suggestions.

## what is proved, trusted, and still missing

The paper demonstrates a prototype's path-solving and test-generation behavior on 111 traces from 50 short LeetCode programs. It does not prove Python programs correct, prove the LLM's type predictions, or establish completeness of path exploration. The backbone engine solves none of the traces because it lacks annotations and list support (Section 4.2, p. 10). Trusted components include the CFG extractor, prompt and template contents, GPT-4o-mini/GPT-4o behavior, Z3, Python execution, and the interpretation from a model to a test. The paper's model-validity threat says it supports only part of Python list operations and no explicit support for other data structures (Section 5.1, p. 17). Its data-validity evidence is restricted to a subset of LeetCode solutions (Section 5.2, p. 17).

Inference: the threat to a product in which agents write verified Rust is medium for proof-search engineering and high for semantic trust boundaries. Retrieval, incremental checking, and error-directed repair are directly useful orchestration patterns, but a passing Verus proof still depends on the written specification, external-library contracts, compiler, verifier, and solver. Dynamic Python type prediction and the direct LLM fallback cannot be treated as Verus evidence. Inference: VL should not redo this paper's basic checker-in-the-loop, retrieval-template, SSA bookkeeping, or bounded retry ideas as if they were new; it should adapt them to Verus diagnostics and measure proof success with denominators that distinguish generated candidates, compiled candidates, and verifier-clean proofs.

Inference: a concrete VL experiment suggested by this paper is to index verified `proof fn` examples by normalized obligation shape and retrieve one or two examples per obligation, then compile each candidate with a fixed Verus version. Record candidate count, compile success, proof success, repair attempts, solver time, and failures from ownership or unsupported specifications. This is a proposed adaptation, not an experiment in the paper.

## techniques for the catalog

- CFG path extraction — build a breadth-first AST control-flow graph and record typed, loop-annotated execution paths
- path chunking — split long paths into one-statement or condition-delimited generation units
- LLM type prediction — infer variable and collection element types before constructing SMT symbols
- SSA environment tracking — carry versioned variable names and an updated environment across chunks
- retrieval-guided Z3 generation — retrieve path-to-Z3 examples by embedding similarity and use them as few-shot templates
- array-plus-length list model — encode Python lists as Z3 arrays with a symbolic nonnegative length
- execute-and-self-refine — run generated solver code, feed errors back for up to three repairs, then fall back
- solver-model test reconstruction — convert SSA scalar and array models into runnable input tests
- checker-backed route selection — prefer SMT-backed generation and use direct LLM solving only when generation fails

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
