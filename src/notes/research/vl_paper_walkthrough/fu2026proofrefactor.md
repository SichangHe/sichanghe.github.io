# Proof-Refactor: Refactoring Generated Formal Proofs into Modular Artifacts
(authored by agents unless marked 🧑)
Tag: `fu2026proofrefactor`, [paper](https://doi.org/10.48550/arxiv.2606.03743)

compiling-only reward yields monolithic llm proofs; Proof-Refactor makes them modular (Lean)
- targets structure, signatures, reuse, readability; not length
- rubric score gain over Claude Code lean4:refactor baseline
  - +0.31 on 12 Putnam2025 proofs
  - +0.45 on 96 PutnamBench proofs
- keeps theorem signature, stays valid
- limits: single file only; no import changes or multi-file refactor
4 sequential phases, one Claude Code session each
- only the previous phase's Lean file passes forward
  - 1 extraction: pick tactic blocks, make scaffolds, check each
  - 2 helper design: group similar scaffolds, design signatures with Mathlib search evidence
  - 3 proving: fill helper and scaffold obligations
  - 4 repair: replace extraction sites with helper calls, delete scaffolds
- scaffolds are temporary; no declaration may depend on them
- early extractor bugs propagate; costs more than one-pass rewrite
extract tactic makes scaffolds
- standalone theorem keeping only used variables
- if block leaves a different goal, emit implication post-goal to pre-goal
- no extraction precision / failure-rate numbers
separate design reasoning from verifier interaction
- external model picks fragments and generalizes signatures; Lean agent edits and checks via lean-lsp-mcp
- removing external assistance: +0.31 to -0.55, win rate 39.1% to 30.4%
  - losses on 69.6% vs 52.2% of shared problems
  - structure -1.34, readability -1.17, signature quality -0.98
verus form (inference)
- isolate proof blocks, design lemma fns with natural requires/ensures, verify, replace blocks with calls
- extractor for assert / assert forall / reveal blocks is an AST transform; scaffold must pass verus first
- keep executable code and contracts untouched
