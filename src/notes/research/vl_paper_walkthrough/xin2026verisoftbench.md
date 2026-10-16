# VeriSoftBench: Repository-Scale Formal Verification Benchmarks for Lean
(authored by agents unless marked 🧑)
Tag: `xin2026verisoftbench`, [paper](https://doi.org/10.48550/arxiv.2602.18307)

## scope and contribution

The paper introduces VeriSoftBench, a benchmark of 500 Lean 4 proof obligations from 23 open-source formal-methods repositories. Its purpose is to measure proof automation in repository-scale software verification, where definitions and lemmas are project-specific and spread across files. The abstract states: “We introduce VeriSoftBench, a benchmark of 500 Lean 4 proof obligations drawn from open-source formal-methods developments and packaged to preserve realistic repository context and cross-file dependencies.” (Abstract, p. 1). The benchmark covers compiler correctness, programming-language semantics and type systems, verification frameworks, zero-knowledge circuits, protocols, and optimization projects (Sec. 2.1, p. 3).

The selection procedure is itself a reusable verification technique. A candidate theorem must have a hole-free ground-truth proof; all invoked lemmas must recursively have hole-free scripts; the file must compile after replacing the target proof with `by sorry`; the goal must not be discharged only by standard automation such as `simp`, `omega`, or `grind`; and it must reference a repository-local definition (Sec. 2.1, p. 3). Candidates are scored by ground-truth tactic-script length and by the number of distinct repository-local definitions and lemma statements used. The authors then sample 500 tasks while balancing repository category and these two difficulty axes (Sec. 2.1, p. 3).

## technique: preserve dependency-closed repository context

What it is. Each task contains the target theorem, local file context, required local definitions and helpful repository lemma declarations, and necessary imports. The paper says: “Tasks are extracted without rewriting definitions or replacing local abstractions with equivalent standard-library formulations, preserving the original dependency structure of each proof.” (Sec. 2.1, p. 4). This keeps the abstractions that a real verifier must understand rather than reducing a task to an isolated mathematical statement.

When to use it. Use this construction when evaluating proof search intended for real verified software, especially code with project-defined datatypes, invariants, and multi-module APIs. It is unsuitable as a measure of isolated arithmetic proving.

How to do it. (1) Freeze a source repository and its toolchain version. (2) Select a theorem satisfying the validity and non-triviality checks above. (3) Include source text preceding the theorem in its file. (4) Resolve direct and transitive dependencies of definitions and lemma statements used by the proof. (5) Include imports and declarations but elide proof bodies. (6) Keep the original definitions and local names. (7) Verify the packaged target with Lean after inserting the ground-truth proof. These steps are the paper's extraction procedure (Sec. 2.1, pp. 3–4).

Verus form. Inference: apply the same packaging to Rust crates by freezing the `rustc`/Verus toolchain, extracting a target `fn` with its preceding module context, and traversing specifications and proof dependencies. Preserve `struct`, `enum`, `spec fn`, `requires`, `ensures`, `invariant`, and `assert` statements as written. Inference: include declarations and specifications while omitting proof bodies in a retrieval benchmark; unlike Lean, Verus verification also depends on generated SMT obligations and Rust typing, so the packaged crate must remain compilable under Verus.

Evidence and limits. The benchmark contains 500 tasks: 381 in 21 regular repositories and 119 in two repositories whose full context exceeds 200k tokens (Table 2, p. 4). The authors report direct averages of 2.3 library and 11.6 project dependencies, expanding transitively to 11.2 library and 37.9 project dependencies per theorem (Table 4, p. 8). The construction intentionally samples rather than exhaustively retaining every theorem, and curated context does not in general form a standalone compilable project because lemma dependencies are not tracked transitively (Sec. 2.1, p. 4).

## technique: oracle curated context versus full-repository context

What it is. Curated context includes declarations in the transitive dependency closure of the ground-truth proof. Full context includes the entire repository library. The paper calls curated mode “an intentionally oracle-like diagnostic condition, constructed using ground-truth proof dependencies to isolate context utilization from premise selection.” (Sec. 1, p. 2). Proof bodies are hidden in both modes and the target proof is never supplied.

Steps. (1) Compute the ground-truth proof's declaration dependencies. (2) Recursively include definitions and lemma statements in that closure. (3) For full mode, add all repository declarations. (4) If the context exceeds the model window, include every curated declaration first and fill remaining capacity with other declarations. (5) Generate a proof block, compile it in the original environment, and optionally provide compiler errors and proof state for repair. The generation-check-repair loop samples k candidates, verifies each with a 300-second compilation timeout, and permits up to r repair rounds (Sec. 3.2, p. 6).

Verus form. Inference: compute a dependency closure over Rust modules, trait bounds, `spec fn`s, lemmas, and imported crate items. Feed the closure to an agent, then run `verus` on each candidate. Inference: use compiler diagnostics and the current verification state as repair feedback; the benchmark must record whether an `ensures` proof actually verifies, rather than trusting text similarity.

Evidence. On the 500-task set, Gemini-3-Pro succeeds on 41.0% with curated context and 34.8% with full context; Claude Opus 4.5 achieves 31.2% and 23.2%; GPT-5.2 12.6% and 10.8%; Goedel-Prover-V2 5.6% and 5.2% (Pass@8, repair rounds as Table 3, p. 7). These are task denominators of 500, except four tasks excluded from Goedel because their required context exceeded its window. On the separate 100-task Aristotle-compatible subset, Aristotle solves 69% and Gemini-3-Pro 65%; these rows are explicitly not directly comparable to the 500-task rows (Table 3, p. 7).

## technique: dependency-depth stratification and proof-pattern analysis

The authors measure transitive dependency nesting depth, the longest chain in the dependency graph, and bucket tasks by depth. Gemini-3-Pro success falls from 38.0% curated and 32.6% full at depth 1–3, to 25.5% and 23.5% at depth 4–6, and 21.1% and 15.6% at depth 7+ (Sec. 4, p. 8). About half theorems have depth at least 5 and about 10% exceed depth 12; Spearman correlation with failure is −0.356 for depth and −0.337 for total transitive dependency count (Sec. 4, p. 8). The paper reports that only 7% of VeriSoftBench proofs begin with `unfold`, 10% close with `simp`, none are solved by one-shot automation, and 71% contain branching by case analysis or induction (Sec. 4, p. 9).

Inference: a Verus benchmark should record direct and transitive dependency counts, graph depth, and whether proofs branch over `match`/induction-like cases. Inference: these measurements can identify whether an agent fails because it cannot retrieve a lemma or because it cannot compose a long chain of invariants. Inference: a Verus proof-pattern report should distinguish `assert`, `have`, `reveal`, `broadcast proof`, loop `invariant`, and recursive lemma calls rather than treating all proof text as one tactic sequence.

## what is proved, trusted, and not shown

Lean's compiler checks candidate proofs; the benchmark does not prove that an LLM's generated explanation is sound without compilation. The repository's Lean kernel and imported libraries remain trusted. The curated condition uses ground-truth dependencies, so it is a diagnostic oracle rather than a deployable retrieval system. The authors caution that they do not isolate why Goedel transfers poorly and cannot fully rule out training-data contamination (Sec. 6, p. 10).

Inference: for a product of agent-written verified Rust, the results indicate a substantial retrieval and composition threat. Even oracle dependency selection leaves 59% of the 500 tasks unsolved for the best reported model, and full context lowers success. This threat concerns automation reliability, not the soundness of Verus when verification succeeds. Existing work already supplies a repository-scale Lean benchmark and should not be recreated as a generic mathematics benchmark; VL should instead measure Rust/Verus dependencies and compiled verification.

## techniques for the catalog

- dependency-closed benchmark packaging: preserve definitions, imports, and transitive project dependencies while hiding proof bodies
- curated-versus-full context diagnostic: compare oracle dependency context with noisy repository context under compilation checking
- generation-check-repair loop: sample proof candidates, compile each, and feed compiler/proof-state errors into bounded repairs
- dependency-depth analysis: correlate transitive graph depth and counts with verified-proof success

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
