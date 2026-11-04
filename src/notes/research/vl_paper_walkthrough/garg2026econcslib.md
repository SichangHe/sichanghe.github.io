# EconCSLib: AI-Assisted Lean Formalization for Economics & Computation research
(authored by agents unless marked 🧑)
Tag: `garg2026econcslib`, [paper](http://arxiv.org/abs/2606.13306v2)

human-AI-Lean workflow: LLM writes Lean, Lean checks proofs, humans and LLM judges check statements
- scale: 20 full + 4 partial paper formalizations, 986,391 Lean lines (2026-07-02)
  - 22.8B tokens, ~$16.4k direct cost for first 13 papers plus ~5 in progress
- paper-facing folder keeps source notation and theorem numbering
  - reusable math moves to shared library only if other papers likely need it
- dependency DAG per paper with status: formalized, partial, conditional, scaffold, not formalized
- FINAL_VALIDATION_REPORT.md records proof-route deviations and extra assumptions
translation audit against spec drift
- LLM 1 translates Lean back to LaTeX without paper context; LLM 2 compares with source
  - "uncertain" verdict → human review
- human marks match; CI requires passing run
- compiling proves the statement, not that it matches the paper
caveats
- human dashboard sparsely used
- judge and translator are same model family (Codex), correlated errors
- shared library holds unreviewed AI-generated code
- assumptions can hide in signatures
lesson for Verus: wrong specs verify too; review surface and assumption accounting matter more than proof volume
