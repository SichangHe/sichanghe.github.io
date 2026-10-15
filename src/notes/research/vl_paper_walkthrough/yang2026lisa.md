# LLM-Based Invariant Testing for Software Functional Bugs
(authored by agents unless marked 🧑)
Tag: `yang2026lisa`, [paper](https://www.semanticscholar.org/paper/1f96a39a587fddf7f29201864fc96d8aff4859ab)

## what the paper establishes

LISA is a two-stage unit-test generator for C/C++ libraries. It first synthesizes valid, diverse API call sequences using API n-gram feedback, then inserts documentation-grounded invariants at semantically coherent chunk boundaries. Each invariant becomes an executable assertion. A persistent assertion failure is reported as a high-confidence bug candidate for developer confirmation. The paper's scope is explicit: "L ISA provides an end-to-end automated pipeline for unit test generation." (section I, p. 2) It defines the core object as follows: "An invariant in L ISA is a Boolean predicate φ over program state that must hold every time execution reaches a designated program point." (section III-F, p. 7)

The evaluation covers seven libraries, 25 re-introduced historical functional bugs, coverage against Vanilla LLM and OSS-Fuzz, and ablations of repair, chunking, and knowledge sources. Full LISA detects 12/25 bugs (48%), compared with CITYWALK 3/25 (12%) and OSS-Fuzz 2/25 (8%) (table VI, p. 13). Average line/branch coverage across the seven libraries is 45.36%/38.70% for LISA, 38.07%/33.78% for OSS-Fuzz, and 31.31%/27.84% for Vanilla LLM (table IV, p. 11). These are benchmark measurements, not proofs of absence of bugs. The paper says: "Because L ISA does not prove its invariants, a violation is only a high-confidence bug candidate." (section III-F, p. 7)

## technique: extract a structured API context

What it is. Parse C/C++ headers with Clang's AST dump, extracting function declarations, parameter/return types, structs, enums, typedefs, pointer mutability, and array sizes. Canonicalize this metadata into schemas used for generation (section III-B, p. 5).

How to do it.

1. Parse target headers with Clang AST
2. Serialize declarations and type definitions as structured JSON
3. Canonicalize types while preserving mutability and array-size information
4. Supply this library context, project rules, API combinations, successful examples, and an Initialize-to-Cleanup execution schema in the generation prompt (section III-C, p. 5)

Verus form. Inference: model extracted API signatures as Rust traits or structs and state preconditions for ownership, nullability, and valid state transitions with `requires`. Prove wrapper conversions and cleanup postconditions with `ensures`; keep AST extraction and foreign C implementation assumptions trusted.

Evidence and limits. The paper reuses PromptFuzz's front-end extraction but not its fuzzing loop (section III-B, p. 5). Inference: an inaccurate header or undocumented convention can make generated calls compile while violating actual library semantics.

## technique: generate and repair API sequences

What it is. Use an LLM to emit straight-line API sequences constrained by a library context, project rules, selected API combinations, successful examples, and an execution schema. Compile and execute each seed. If compilation or execution fails, send the error type, code, and diagnostics to a repair prompt that must preserve function names, parameters, overall logic, and structure; allow one repair attempt (sections III-C–D, pp. 5–6).

How to do it.

1. Generate a sequence with gpt-5-mini under the fixed prompt and selected API combinations (section III-C, p. 5)
2. Compile and link it with Clang; reject compile failures (section III-D, p. 6)
3. Run it in an isolated Docker sandbox with a 30-second timeout, catching segfaults, assertion failures, exceptions, and hangs (section III-D, p. 6)
4. Feed the failure diagnostic to one constrained repair call; recompile and re-execute (section III-D, p. 6)
5. Accept only sequences that compile and execute; discard a still-failing seed after the single repair attempt (section III-D, p. 6)

Verus form. Inference: represent a sequence as a typed command list and prove a small-step transition invariant over each command. Use `invariant` in loops that execute commands and `ensures` for state preservation. Foreign calls, Docker behavior, and LLM output remain trusted inputs.

Evidence. On seven libraries, LISA's compilation/execution average is 97.9%/90.9%, versus 81.8%/52.0% for Vanilla LLM (table III, p. 10). Inference: high execution validity is necessary for useful tests but does not imply semantic correctness.

## technique: API n-gram feedback with adaptive condensed sampling

What it is. Maintain an energy E(a) for each API. Each newly observed successful API 3-gram increments the energy of its three APIs. Normalize energies with epsilon = 0.01, apply power condensation C(a) = E-hat(a)^alpha, and sample APIs with probability proportional to C. Adapt alpha from the coefficient of variation so skewed distributions encourage exploration (section III-E, pp. 6–7).

How to do it.

1. Start every API at E(a)=1
2. Extract each consecutive API 3-gram from a successful trace and add one to each constituent API
3. Min-max normalize energy and add epsilon so every API retains nonzero probability
4. Set alpha_t = alpha_min + (1-alpha_min)e^(−s_t), with alpha_min = 0.5 and s_t the energy coefficient of variation
5. Sample API combinations using P_t(a)=C_t(a)/sum C_t and prompt the LLM to use them (section III-E, p. 7)

The paper's sensitivity study on zlib under an identical three-hour budget found N=3 best: 818 valid programs, 73.01% line coverage, 60.01% branch coverage; N=2 yielded 512, 71.48%, 59.22%, and N=4 yielded 705, 69.89%, 57.02% (table I, p. 7). Inference: this is a search heuristic, not a Verus proof. A Verus implementation could prove probability normalization and nonzero-probability arithmetic, but not that the sampler explores the most useful API paths.

## technique: build a documentation-and-Daikon invariant knowledge base

What it is. Combine Daikon-mined candidate relations, LLM extraction of intended invariants from official documentation, and lightweight manual curation. Keep a Daikon candidate only when it does not contradict documentation and does not fail on the reference build; retain explicitly documented invariants missed by Daikon (section III-G1, pp. 7–8).

How to do it.

1. Mine dynamic candidates with Daikon from executable API sequences
2. Ask an LLM to extract contracts such as read-only behavior or state reset from API documentation
3. Manually filter candidates that contradict documentation or fail on the reference build
4. Curate missing documented properties on demand; two annotators spent 5.0 minutes per API on average for 20 APIs (section III-G1, p. 8)

Verus form. Inference: encode retained properties as `spec fn` predicates and prove wrapper functions preserve them. Treat documentation, Daikon output, and manual curation as specification inputs; do not mark a generated predicate `external_body` to bypass proof.

Limits. The knowledge base is not fully automated and depends on documentation completeness. The paper reports that Daikon-only detects 5/25 bugs, documentation-only 4/25, and the combined full system 12/25 (table VI, p. 13).

## technique: chunk-invariant reasoning and bounded repair

What it is. Split an API sequence into semantic chunks C1||...||CN using inline step markers. Process chunks left to right, preserving accepted code and assertions from earlier chunks. At each chunk, ask the stronger model (gpt-5.1) for assertions grounded in the chunk and relevant documentation. Compile and execute the accumulated test immediately. On failure, ask the model to weaken, repair, or remove the failing assertion for up to K=5 attempts; persistent failure becomes a candidate for human review (section III-G2, pp. 8–9).

How to do it.

1. Generate a valid sequence with `// STEP1`, `// STEP2`, ... markers
2. For chunk Ci, provide accepted C1...Ci−1 code/assertions, raw Ci, and API documentation
3. Insert candidate assertions at the end of Ci and concatenate processed chunks
4. Compile and execute the accumulated prefix; on failure send assertion, trigger input if available, and error trace
5. Retry up to five times, then discard transient test code or report a persistent failure for developer confirmation (section III-G2, p. 9)

The paper's invariant is a Boolean predicate phi over program state at a designated point, compiled to `assert(phi)`. It supports structural, value-range, relational/conservation, and documentation-derived semantic contracts. Its example asserts `memcmp(buf, saved, n) == 0` for a documented read-only guarantee (section III-F, p. 7).

Verus form. Inference: place Verus `assert` statements or `assert forall` facts at chunk boundaries and use loop `invariant` clauses for state carried between chunks. A Rust wrapper's `ensures` can express the invariant as a postcondition, but the generated LISA assertion itself is only a runtime test unless translated and proved. A failed runtime assertion identifies a candidate violation; it is not a proof failure until formalized.

Evidence. Full LISA finds 12/25 historical bugs; removing repair, chunking, or knowledge leaves 4/25, 4/25, and 3/25 respectively (table VI, p. 13). On sqlite3, the case study calls `sqlite3_prepare_v2` with `SELECT 0 OR 2`, then asserts `val == 1`; the buggy revision returns 2, so the assertion fires while crash fuzzing would miss the logic error (section VI-A, pp. 13–14).

Limits. The authors require developer confirmation because persistent failures may still be test-side inaccuracies. Inference: an assertion can be too strong, and a Verus postcondition can be wrong if its specification does not match intended behavior.

## what is proved, measured, and trusted

The paper measures compilation/execution success, line and branch coverage with llvm-cov, Average Unique Verifications Count, and historical bug detection. It repeats the full pipeline three times on zlib, cJSON, and sqlite3; coverage standard deviations are at most 3.5 percentage points, and bug counts are stable per library (table VII, p. 14). The 25-bug corpus spans five libraries and is selected by a fixed protocol from deterministic developer-confirmed fixes (section VI-B, p. 14).

Trusted elements include Clang parsing, the reference build, API documentation, Daikon, LLM outputs, Docker isolation, mutation/reintroduction selection, manual curation, and human review. The paper explicitly says the system mitigates but does not solve the oracle problem. It tests C/C++ libraries only; external validity to other languages, repositories, concurrency, and production systems remains open (section VI-B, p. 14).

Inference: for VL, LISA's useful transfer is the decomposition between sequence reachability and semantic checking. A Verus agent can first synthesize a typed call path that reaches a state, then generate proof predicates at state boundaries, and finally ask Verus to prove or reject them. Runtime invariant mining can suggest candidate lemmas, but accepted Verus proofs must replace the paper's developer-confirmed high-confidence candidates before product use.

Inference: the product threat is semantic incompleteness. Agent-written verified Rust may preserve an inferred relation while violating an undocumented API contract, or may never reach a state where a missing invariant would fail. Keep generated invariants traceable to documentation and human-approved specifications, and record which states and properties remain unmodeled.

## techniques for the catalog

- API-context extraction — parse headers into canonical structured signatures and project rules
- sequence generate-repair — compile and sandbox straight-line API sequences, then perform one diagnostic repair
- n-gram adaptive scheduling — reward successful API n-grams and sample with condensed, exploration-aware probabilities
- invariant knowledge base — reconcile Daikon candidates, documentation-derived contracts, and manual curation
- chunk-invariant reasoning — insert documentation-grounded assertions at semantic chunk boundaries with up to five repairs
- high-confidence candidate review — report persistent assertion failures for developer confirmation rather than claiming autonomous detection

Checked 2026-10-15 against the paper by a Codex agent for llm_based_invariant_testing_for_software_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
