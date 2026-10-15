# Proof-Refactor: Refactoring Generated Formal Proofs into Modular Artifacts
(authored by agents unless marked 🧑)
Tag: `fu2026proofrefactor`, [paper](https://doi.org/10.48550/arxiv.2606.03743)

## scope and result

Proof-Refactor turns a compiling Lean proof into a modular artifact by extracting local fragments, designing helper declarations, proving those helpers, and repairing the original proof to call them. The paper targets proof quality—structure, signatures, tactic transparency, reuse, and readability—rather than proof length. It reports average rubric-score gains of +0.31 on 12 Putnam2025 proofs and +0.45 on 96 PutnamBench proofs over a Claude Code `lean4:refactor` baseline (Table 1, p. 6). The authors summarize the motivation: “proof-assistant verification also induces a narrow objective: a generated proof is rewarded primarily for compiling” (Sec. 1, p. 2). The transformation preserves the original theorem signature and Lean validity while adding declarations to the environment.

## technique 1: staged extraction, helper design, proving, and repair

What it is. Four sequential Claude Code sessions operate on one Lean file; only the previous phase's file is passed forward. External model calls supply high-level fragment selection and interface design, while the Lean agent edits and checks code. The paper states: “Proof-Refactor decomposes refactoring into four sequential phases. Each phase is a separate Claude Code session with lean-lsp-mcp that does not inherit the previous session’s context; the Lean file produced by the previous phase is the only artifact passed forward” (Sec. 4.3, p. 4).

How to do it:

1. extraction: ask external assistance to identify tactic blocks; invoke `lean_extract`; check each scaffold and repair errors before continuing (Sec. 4.3, p. 4)
2. helper design: group scaffolds by similarity, provide scaffolds, owner declarations, Mathlib search evidence, and context to external assistance; review and revise signatures; insert helpers with dependency annotations (p. 4)
3. proving: fill every helper and scaffold proof obligation, guided by dependencies and original fragments; use external assistance only for difficult goals (p. 4)
4. proof repair: replace each extraction site with the corresponding helper call, use the scaffold body as a guide, remove wrappers and scaffolds, and add mathematical annotations (p. 4)

The dependency rule is operational: scaffolds are temporary and no declaration may depend on them. The final proof therefore depends on named helpers, not extraction machinery.

When to use it. Use this pipeline after a verifier has accepted a generated proof when maintainability and library reuse matter. It is suited to self-contained files where adding declarations is allowed; it does not yet handle import changes or multi-file refactoring (Sec. 7, p. 9).

Verus form. Inference: apply the same phase boundary to Verus: first isolate proof blocks from a verified function, then design `lemma` functions with natural `requires`/`ensures`, verify them, and finally replace local blocks with lemma calls. Inference: preserve executable code and contracts while moving only proof reasoning. Inference: store the prior file as the phase artifact and reject a helper that depends on an extraction wrapper.

Evidence and limits. Lean checking establishes that every staged artifact compiles, but the quality score is external. Early extraction failures can propagate: “failures or bugs in lean_extract can produce poor scaffolds, making helper design, proving, and repair harder” (Sec. 7, p. 10). Four sessions and external calls cost more than a one-pass rewrite.

## technique 2: a context-aware `extract` tactic that creates scaffolds

What it is. The custom tactic extracts a tactic block into a standalone theorem and retains only variables used by the block. It handles two cases: a block that closes the goal or leaves a definitionally equal goal, and a block that leaves a different goal, for which the extracted theorem states an implication from post-block to pre-block goal (Sec. 4.2, p. 4). The inserted theorem is a scaffold, not a final helper.

How to do it:

1. insert an `extract` wrapper around a contiguous tactic block
2. infer the local variables and post-block goal
3. emit a standalone theorem with unused variables removed
4. if the post-goal differs, emit an implication theorem rather than forcing the original goal
5. keep the wrapper and scaffold body as repair guidance
6. after helper proving, remove both and call the final helper (Sec. 4.2–4.3, pp. 4–5)

The paper's example extracts the two directions of `Set.inter_comm` into `mem_inter_swap_1` and `mem_inter_swap_2` scaffolds, each with a local element and membership implication (Fig. 2, p. 4). It distinguishes this tactic from Mathlib's `extract_goal`, which cannot handle the second case or clean variables reliably (Sec. 4.2, p. 4).

Verus form. Inference: implement an analogous source-to-source extractor for contiguous `assert`/`assert forall`/`reveal` blocks, producing a temporary proof function whose parameters are the used locals and whose `ensures` is the postcondition implication. Inference: Verus has no Lean tactic API, so this would be an editor or AST transformation; the resulting scaffold must itself pass Verus before helper design proceeds. Inference: avoid extracting executable statements that change ownership or mutation unless the generated helper preserves the exact function contract.

Evidence and limits. The paper validates scaffolds by Lean diagnostics before later phases, but provides no extraction precision or failure-rate denominator. A buggy extractor can create misleading signatures, and the authors warn that overly strict generality criteria can reject useful problem-specific lemmas (Sec. 7, p. 10).

## technique 3: separate high-level reasoning from verifier interaction

External assistance runs in an independent context and is used mainly to choose mathematically meaningful fragments and generalize signatures. The Lean agent remains responsible for editing, searching, proving, and diagnostics. The paper explains: “The purpose is to decouple high-level refactoring reasoning from low-level interaction with Lean” (Sec. 4.3, p. 4). Lean-LSP-MCP supplies context inspection (`lean_file_outline`, `lean_hover_info`, `lean_goal`, `lean_diagnostic_messages`), declaration search (`lean_local_search`, `lean_leansearch`, `lean_loogle`), and parallel proof interaction (`lean_multi_attempt`, `lean_code_actions`, `lean_run_code`) (Sec. 4.1, p. 3).

When to use it. Use an independent design context when tool traffic and local repair would otherwise crowd out abstraction decisions. Keep the verifier-facing agent authoritative over source edits and acceptance. Inference: a Verus implementation can give one model the failed proof and surrounding contracts for lemma design while another process invokes `verus`, searches the local catalog, and applies patches.

Evidence. Removing external assistance on Putnam2025 and a 48-problem PutnamBench subset changed average improvement from +0.31 to −0.55, reduced win rate from 39.1% to 30.4%, and produced losses on 69.6% rather than 52.2% of shared problems (Table 2, p. 8). Structure fell −1.34, human readability −1.17, and signature quality −0.98. These denominators are the ablation's shared problems and the paper reports the scores as differences from the original proof (Sec. 5.3, p. 8).

## evaluation, trust, and threat to VL

The corpus is 96 generated PutnamBench proofs (mostly 50–500 lines, median about 160) and 12 generated Putnam2025 proofs (Sec. 5.1, p. 5). Every candidate had to pass Lean; correctness was therefore a precondition, not a scored dimension. A separate LLM judge scored five dimensions, and human review on 28 valid problems agreed with the judge's pairwise winner 75.0% of the time (Sec. 5.1, p. 5). Word reduction was secondary: PutnamBench improved from 4.0% baseline to 6.5% (+2.5 percentage points), while Putnam2025 decreased from 8.3% to 4.5% (−3.8 points) (Table 1, p. 6).

Trusted components include Lean's kernel, Mathlib, the baseline/generated proofs, the extraction implementation, and the LLM judge's rubric. Inference: judge scores are evidence about perceived maintainability, not a formal theorem about readability. Inference: Verus should retain verifier acceptance as a hard gate and use human or model review only for modularity and naming. The setting is self-contained Lean files whose environment only adds declarations; no result establishes project-scale or library-scale integration.

Inference: threat to VL is moderate to high for proof maintenance. The method directly addresses a product risk—agent-written proofs that compile but become monolithic and difficult to repair—but it does not verify that a helper's abstraction matches an unstated requirement. VL should adapt the four phase artifact protocol, extraction dependency rule, and ablation measurement; it should not assume that Lean's tactic extractor or LLM rubric transfers unchanged to Rust ownership, mutable state, or cross-crate specifications.

## techniques for the catalog

- staged proof refactoring — extract fragments, design helpers, prove them, then repair the owner proof in separate verifier-checked phases
- scaffold extraction — turn a tactic block into a standalone theorem with only used variables and an implication when the post-goal differs
- reasoning–interaction separation — use an independent model context for fragment and signature design while a verifier agent edits and checks code
- rubric-plus-ablation evaluation — require compiler validity, score structure and reuse separately from length, and measure the effect of removing design assistance

Checked 2026-10-15 against the paper by a Codex agent for proof_refactor_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
