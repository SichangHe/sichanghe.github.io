# Lean Refactor: Multi-Objective Controllable Proof Optimization via Agentic Strategy Search
(authored by agents unless marked 🧑)
Tag: `lu2026leanrefactor`, [paper](https://www.semanticscholar.org/paper/2f0151bfebda9519988fe8657d41ed18ae06b416)

## problem and result

Lean Refactor rewrites already-proved Lean 4 proofs to reduce length, compilation cost, or toolchain breakage. Its central artifact is a retrieval bank of refactoring strategies annotated with the conditions for use, examples, measured compile-time reduction, and compatible Lean versions. The abstract reports: "We present Lean Refactor, a plug-and-play retrieval-augmented agentic framework for multi-objective, controllable, and version-robust refactoring of Lean proofs." (Abstract, p. 1.)

The released bank contains 9,237 unique strategies distilled from 481,567 raw extractions over 200,000 verified long-short proof pairs (Sect. 3.1 and Appendix B, pp. 3, 14–18). Evaluation uses 194 miniF2F theorems, 75 PutnamBench theorems, 66 Putnam2025 theorems, and 45 theorems from each of Analysis, FLT, PFR, and PhysLean, plus 15 generated Verina solutions (Sect. 4, p. 6). Unless stated otherwise, runs use Gemini 3 Flash, Lean v4.24.0, and a 30-call budget (Sect. 4, p. 6).

Inference: this matters to VL when an agent's verified Rust proof is correct but bloated, slow, or sensitive to Verus and Rust revisions. The paper is about Lean, so any Verus mapping below is an inference and needs Rust-specific evaluation.

## technique: construct a grounded strategy bank

Use this when examples are too sparse for a model to learn stable refactoring patterns and when a proof change must be tied to a concrete source region. Each strategy record has six fields: title, description, when-to-apply precondition, sequential application guide, before/after abstract example, and categorical potential reduction (Appendix B.5, p. 16). The paper states: "Each entry is a reusable refactoring pattern distilled from a raw long–short proof pair, organized into six fields." (Sect. 3.1, p. 3.)

The construction procedure is:

1. Aggregate formal statements from NuminaMath-1.5, FineLeanCorpus, Mathlib4, and ATLAS (Appendix B.1, pp. 14–15).
2. Decontaminate against held-out evaluation statements by exact-match normalization, then embedding similarity; candidates at cosine similarity at least 0.8 receive an LLM judge decision and confirmed duplicates are discarded (Appendix B.1, p. 15).
3. Synthesize verified long-short pairs by shortening long proofs and expanding short proofs. Recompile both members so each pair proves the same theorem (Appendix B.2, pp. 15–16).
4. Profile each pair with `lake env lean --profile`, excluding import overhead, and record relative execution-time reduction. Recompile non-Mathlib short proofs under Lean v4.14.0, v4.16.0, and v4.22.0; retain the versions where the short proof compiles (Appendix B.3, pp. 16–17).
5. Ask GPT-OSS-120B to extract one or more strategies and anchor each strategy to start and end line numbers in the long proof. Location grounding both controls hallucinated transformations and supervises retrieval (Appendix B.4, p. 16).
6. Judge transformation correctness and all six schema fields. Discard a strategy that fails either check rather than attempting repair (Appendix B.6, p. 17).
7. Deduplicate iteratively: retrieve ten embedding-nearest entries, merge automatically when cosine similarity is at least 0.9, otherwise use a GPT-OSS judge, then append a new canonical entry if no duplicate exists (Appendix B.7, pp. 17–18).
8. Aggregate metadata by median speedup and intersection of all constituent pairs' compatible toolchains (Appendix B.8, p. 18).

Inference: the Verus analogue is a corpus of verified Rust proof diffs, each anchored to a function or proof block and tagged with Verus version, Rust toolchain, solver time, and whether `requires`, `ensures`, `invariant`, or `proof fn` structure changed. Inference: acceptance must re-run Verus on both the original and transformed code; an LLM judge cannot replace the verifier. The Lean strategy schema transfers as record structure, but Lean tactics, Mathlib names, and exact version sets do not.

## technique: objective-conditioned retrieval

At inference, retrieve a broad set by semantic similarity and then apply the requested objective. For shortest proofs, use top-K cosine neighbors. For compilation cost, rerank the broad pool by annotated cost reduction. For a target version, filter to strategies whose compatibility set contains that version; version filtering can be stacked with cost reranking (Sect. 3.2, pp. 4–5). The paper says: "Each objective is realized as a different retrieval rule over the same shared bank." (Sect. 3.2, p. 5.)

The retrieval model is Qwen3-Embedding-8B fine-tuned on 639,090 query-strategy pairs with in-batch negatives, a temperature of 0.01, and a false-negative margin of 0.1 (Sect. 3.2, p. 4; Appendix E, p. 19). Boundary augmentation jitters code-segment boundaries so training spans resemble noisy runtime segments (Sect. 3.2, p. 4).

Inference: a Verus bank should retrieve by normalized Rust/Verus syntax, dependency names, failing diagnostic, and target objective such as proof size or verifier time. Filter by exact Verus and Rust versions before exposing a strategy. Inference: a candidate that shortens text but introduces `external_body`, `assume`, or a weaker postcondition should be rejected by a product policy even if Verus accepts it, because the paper optimizes already-correct proofs and does not address specification weakening.

## technique: planner, refactorer, debugger loop

Use this when one proof contains multiple independent opportunities and each rewrite must compile before the next is attempted. The loop is:

1. Annotate the proof with signatures of invoked dependencies and segment it at multiple granularities (Sect. 3.3, p. 5).
2. Embed each segment, retrieve and objective-filter top-K strategies, and pass strategies with target locations to the planner (Sect. 3.3, p. 5).
3. Have a frozen LLM planner map a sequence of steps to segments or the whole proof (Sect. 3.3, p. 5).
4. Have the refactorer apply one planned step, then send the candidate to Lean for validation (Sect. 3.3, p. 5).
5. On failure, route compiler feedback to a debugger for at most D local repair rounds while preserving the planner's intent (Sect. 3.3, p. 5).
6. On successful compilation and length reduction, feed the proof and trace back to the planner. Skip persistent failures and stop at B calls or target length T (Sect. 3.3, p. 5).

Inference: for Verus, the compiler-in-the-loop is a `verus` run after every patch, with diagnostics and proof-state summaries returned to the debugger. Keep a trusted-base inventory and reject patches that add unchecked bodies or alter the specification without review. The planner/refactorer/debugger separation is transferable orchestration; Lean's syntax-aware state and proof traces are not.

## evidence: proof length and dependency reduction

On Gemini 3 Flash, Table 1 reports average relative proof-length reduction for 194 miniF2F, 75 PutnamBench, and 66 Putnam2025 theorems. Full Lean Refactor obtains 88.40%, 70.38%, and 79.27%, respectively; these percentages use the theorem counts in Sect. 4 and are means across each benchmark's proofs (Table 1, p. 6). On research benchmarks of 45 theorems each, reductions are 33.54% Analysis, 23.55% FLT, 20.37% PFR, and 27.69% PhysLean (Table 2, p. 6). Claude Haiku 4.5 gives 51.35% on PutnamBench's 75 theorems and 21.09% on Analysis's 45, under a matched dollar budget against Claude Code (Table 3, p. 7).

Dependency counts provide a second check. Reduced dependencies occur in 99/194 miniF2F (51.0%), 48/75 PutnamBench (64.0%), 29/66 Putnam2025 (43.9%), and 30/45 Analysis (66.7%) (Table 7 and Table 8, pp. 20–21). Increased dependencies occur in 11/194, 11/75, 12/66, and 8/45, respectively. These denominators matter because the percentages are not pooled across benchmarks.

Inference: for VL, a length reduction should be reported with the number of verified functions, proof obligations, and unchanged contracts, not token reduction alone. A shorter Verus proof that relies on a larger trusted specification is a different outcome from a self-contained simplification.

## evidence: compilation cost and an internal inconsistency

Table 4 compiles each miniF2F, PutnamBench, and Putnam2025 proof five times and reports means across proofs, excluding import time. Cost-aware reranking reduces compilation by 30.17% on miniF2F, 42.62% on PutnamBench, and 60.14% on Putnam2025; the absolute reductions are 3.14, 10.01, and 6.05 seconds (Table 4, p. 7). The denominator for each mean is the theorem set named in Table 4, and the five runs supply the displayed standard deviations.

The table contains a contradiction that must remain visible: on miniF2F, cosine-only Lean Refactor reports -103.98% relative reduction but 1.46 seconds absolute reduction, while reranking reports 30.17% and 3.14 seconds. The text explains that -103.98% means average compile time doubled because a few proofs became much slower (Sect. 4.2, p. 7), but the sign and absolute number do not form an intuitive reduction pair. The study should preserve the table's values and treat the apparent mismatch as a reporting or denominator issue until raw timings are supplied.

Inference: Verus evaluation should measure verifier wall time and solver-query time separately, repeat runs under a pinned toolchain, and report failures and specification changes. Lean's heartbeat proxy has no automatic Verus equivalent in the supplied Verus notes.

## evidence: version compatibility

Version-aware retrieval is evaluated on PutnamBench because research repositories are pinned to deep Lean/Mathlib dependencies (Sect. 4.3, p. 8). The test uses Lean v4.14.0, v4.16.0, and v4.22.0, Gemini 3 Flash and GPT-OSS-20B, and three retrieval settings. Filtered retrieval is best in four of six version-model cells; full retrieval has no consistent gain over no retrieval (Table 5, p. 8). The authors explicitly call the v4.14.0 exception less consistent because its strictly compatible strategy pool is smaller (Sect. 4.3, p. 8).

For zero-shot transfer, the authors recompile miniF2F outputs produced at v4.19.0 against later releases without refactoring. Table 6 counts proofs that type-check: at v4.22.0, Lean Refactor 194/194, ProofOptimizer 189/194, and originals 194/194; at v4.26.0, 168/194, 162/194, and 141/194; at v4.29.0, 166/194, 161/194, and 140/194 (Table 6, p. 8). The denominator is 194 miniF2F proofs for every row.

Inference: a Verus strategy should carry compatibility sets for Verus, Rust, and relevant crate versions, and the transformed proof should be replayed on each target version. The paper's conservative intersection rule is directly useful, but its Lean release numbers do not predict Verus stability.

## what is proved, trusted, and already done

Each long-short pair is independently verified by Lean, and successful agent outputs compile under the selected toolchain. The study does not prove that a shorter proof is semantically easier for humans, that metadata causally belongs to one strategy, or that compatibility on non-Mathlib proofs transfers to pinned research projects. Strategy metadata is a cluster median of joint refactorings; the authors identify marginal attribution as open (Appendix C, p. 18).

Trusted elements include Lean's kernel, Mathlib and project dependencies, the frozen LLM, embedding model, LLM judges, compiler timing environment, and the strategy extraction and aggregation code. Inference: the threat to agent-written verified Rust is high for maintenance claims and moderate for proof generation. Lean Refactor demonstrates that retrieval keyed to version and objective can outperform generic agents, so VL should not redo a generic retrieval bank or compiler-in-the-loop refactoring study. The opportunity is Rust-specific: measure whether Verus proofs survive crate upgrades, whether ownership changes dominate strategy matching, and whether specification weakening can be detected.

## techniques for the catalog

- verified strategy-bank construction: distill anchored long-short proof pairs, judge them, deduplicate them, and aggregate speed/version metadata
- objective-conditioned retrieval: retrieve semantic neighbors, rerank by compile cost, and filter by compatible toolchain
- planner-refactorer-debugger loop: plan localized rewrites, compile each candidate, repair diagnostics, and replan after success
- dependency-grounded rewriting: annotate invoked declarations and anchor extracted strategies to source locations
- version compatibility sets: intersect toolchains on which all strategy instances compile
- multi-metric evaluation: report length, compile time, dependency counts, and cross-version survival with explicit denominators

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numbers, references, techniques, and conclusions against the full paper; corrected nothing; did not independently reproduce experiments or verify external references.
