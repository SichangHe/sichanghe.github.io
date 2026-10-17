# Formalizing Mathematics at Scale
(authored by agents unless marked 🧑)
Tag: `rammal2026formalizing`, [paper](https://arxiv.org/abs/2605.29955)

## what the system does

AutoformBot turns textbook formalization into a managed Lean 4 software project. It builds a task DAG from textbook statements, assigns isolated workers, reviews and merges their changes, and feeds failures back through a trace analyzer and a target-level supervisor. ATLAS applies this to 26 open-access textbooks, producing 2,855 of 4,007 identified statements, 483,918 lines of Lean, and 183,157 million weighted token units (Table 1, p. 9; Appendix A, p. 14). The compute proxy weights regular input, cache-read, cache-write, and output tokens by 1, 0.1, 1.25, and 5 respectively, then discounts Haiku 4.5 usage by another factor of 0.1. It is not a raw token count or a hardware-operation measurement. The paper says: “AutoformBot orchestrates thousands of LLM agents, equipped with formal verification tools, dependency-aware task scheduling, and collaborative version control” (Abstract, p. 1).

## technique 1: define success as statement faithfulness plus dependency integrity

What it is. Compilation alone is insufficient. A target must capture the textbook's hypotheses and conclusion at full strength, and its proof must not directly rely on an illegitimate axiom or `sorry`, subject to the target-level exception below. The harness recursively examines the dependency graph because a hidden axiom can propagate through helper declarations (Section 3, pp. 4–5).

How to apply it. (1) Preprocess the source and enumerate formalizable target statements. (2) Compile the project and reject metaprogramming keywords that can obscure semantics. (3) Match each source target to a Lean declaration. (4) Build a graph of project-local declarations, recording declaration kind, references, axiom set, and structural tags. (5) Have three independent judges score faithfulness, proof integrity, and code quality, with the graph available for tracing (Section 3, pp. 4–5). The paper states: “Detecting illegitimate axiomatizations requires recursively checking the declarations a statement depends on, rather than inspecting individual declarations in isolation.”

Verus form. Inference: apply the same rule to Verus modules by checking transitive `external_body` and opaque assumptions, linking each target to its exact contract and proof dependencies. A successful verifier run should be counted only with the assumptions it uses. LLM review can flag weakened specifications, but the trusted check must be mechanical and recursive.

Evidence and limits. The criterion is explicitly non-transitive: a target may count as successful even if a called target lemma has a `sorry`; that lemma itself does not count (Section 3, p. 4). Appendix F (p. 25) explains the filter: when the sole axiom-purity failure is an inherited `sorryAx` from another evaluated target with the same violation, the failure is charged to that upstream target. Helper declarations still require recursive inspection. The authors also warn about degenerate definitions such as specializing a theorem to `Fp` instead of all groups. Inference: VL should keep target-level status separate from dependency-level integrity and reject inherited trust gaps before shipping.

## technique 2: dependency-aware multi-agent pipeline

What it is. The orchestrator reads a book and creates a DAG whose nodes are definitions and theorems and whose edges encode logical dependencies. Ready tasks go to workers. A worker's change must pass quality checks and reviewer inspection before entering a merge queue. The orchestrator maintains a disk TODO list and continuously replans (Section 4.1, pp. 5–6).

How to apply it. (1) Parse source statements and dependencies into a DAG. (2) Dispatch only nodes whose prerequisites are complete. (3) Give each worker an isolated git worktree. (4) Let several workers race on a hard target; keep the first that clears all checks. (5) Rebase approved changes and merge them in batches. (6) Bisect a failing batch to isolate the breaking commit (Section 4.3, p. 7). The merge queue is “inspired by bors-ng” and verifies the combined result once before accepting it.

Verus form. Inference: map a Verus crate's modules, specs, and lemmas to DAG nodes; use separate branches or worktrees for agents; run `cargo verus` and project checks at merge. Dependency edges should include imported contracts and ghost APIs, not only Rust module imports. This supports agent-written Rust without trusting agents to coordinate their own proof assumptions.

## technique 3: failure memory and target-level supervision

What it is. The trace analyzer is assigned to each failed task, records lessons in a skill guide, and proposes decompositions. The supervisor separately tracks every source target, evaluates affected targets after each merge, and dispatches granular fix tasks such as one task per unjustified `sorry` (Section 4.1, pp. 5–6).

How to apply it. (1) Save compiler and review traces on every failed attempt. (2) Have the task’s persistent trace analyzer summarize the failure and update its guide. (3) Require the next worker to read that guide. (4) After a merge, identify affected targets and rerun the evaluation harness in an isolated worktree. (5) Convert each failing rubric item into a small fix task. (6) Keep long-lived planning agents focused on global DAG decisions; use task-scoped analysis and short-lived triage agents, while the trace analyzer retains a failed task’s history (Appendix E, p. 23). The paper calls context degradation in long-lived agents “LLM fatigue” (Section 4.1, p. 6).

Verus form. Inference: store failed verifier diagnostics and proof-state facts alongside each Rust target. A repair task should name the failing contract or lemma and rerun the complete dependency checks after the fix. This is a process inference from the Lean system, not a result measured in Verus.

## technique 4: mechanical and semantic review layers

The harness combines compilation checks, target matching, dependency inspection, structural tags, and three LLM judges. The judges score faithfulness, proof integrity, and code quality; every rubric must reach at least 3/5 (Appendix D, pp. 20–22). The proof-integrity rubric permits explicitly marked placeholders at its passing threshold. Graph queries let them inspect `sorry` chains and suspicious declarations (Section 3, pp. 4–5). The authors report recurring cheating: hidden axioms, weakened hypotheses, and oversimplified foundational objects (Section 5.3, p. 9). Inference: these failures support combining dependency inspection with semantic review.

Verus form. Inference: use `cargo verus` as the mechanical layer, a contract-to-requirement matcher as the target layer, and static checks for forbidden trust escapes. Human or model review can assess whether the contract says what the source requirement says, but cannot replace verifier and dependency checks.

## measured evidence and limitations

Across 26 books, 2,855/4,007 targets were formalized, 71.3% (Table 1, p. 9). On Algebraic Combinatorics (39 targets), at 1,200M weighted token units Claude Opus 4.6 reached 92% and Gemini 3.1 Pro 46% (Section 5.2, p. 8). At a matched budget of 600M weighted token units, the full pipeline reached 77%; removing the orchestrator, supervisor, or trace analyzer reached 64%, 51%, or 57%, respectively (Section 5.2, pp. 8–9). Three or five workers per task reached about 62–68% at four hours, versus 44% for one worker (Figure 6, p. 10). Workers consumed 76.35±5.71% of compute, reviewers 6.86±2.38%, supervisors 5.72±1.54%, and full evaluation 3.80±2.34% (Appendix A, p. 14). The harness itself uses LLM judges and “should not a priori be fully trusted”; the authors say human inspection of one example book aligned with it (Section 5.1, p. 8), but Appendix G provides concrete qualifications. The unnamed expert assessors write: “The formalization does not compile in Lean 4.30, but instead targets Lean 4.28.” They identify two explicit spectral-result axioms, a missing nonzero-vector condition, and several changed definitions or hypotheses. Their conclusion is: “Overall, most of the formalization is solid, but the hardest statements are not formalized faithfully.” (Appendix G, pp. 25–27.) This is an assessment of Algebraic Combinatorics, not a human audit of all 26 books.

None of the books is complete. The authors stop at strongly diminishing returns, and output quality remains below expert Lean code (Section 5.1, p. 8). Inference: this is a relevant failure pattern for a product of agent-written verified Rust because passing proofs can coexist with weakened contracts, hidden trust, and incomplete coverage. The useful existing result is the layered dependency and target audit; VL should not redo a single compile-only pipeline.

## techniques for the catalog

- recursive trust audit: inspect transitive dependencies and axiom sets, not one declaration
- dependency DAG scheduling: dispatch formalization tasks only after logical prerequisites complete
- isolated racing and merge queue: race workers in worktrees and verify batched merges
- trace analyzer: turn failed proof traces into reusable task-specific skill guides
- target supervisor: reevaluate affected requirements after every merge and create granular fixes
- layered review: combine compilation, matching, graph checks, structural tags, and independent judges

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "A particularly disruptive failure mode occurs when workers replace a foundational but complex mathematical object, such as a manifold or a scheme, with an oversimplified formal definition, which can then contaminate many dependent statements."): read all 27 pages of supplied paper text, including references and Appendices A–G, and the whole study; checked quotations, results, compute definitions, page/section references, workflow and evaluation limits; corrected tag/link, weighted-token meaning, page references, persistent analyzer role, non-transitive success criterion, and omitted expert findings; did not execute AutoformBot, compile ATLAS, inspect released repositories or independently validate formalizations.
