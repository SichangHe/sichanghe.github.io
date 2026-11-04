# Translator vs. Challenger: Adversarial Agentic Learning for C-to-Rust Translation
(authored by agents unless marked 🧑)
Tag: `wang2026translator`, [paper](http://arxiv.org/abs/2609.15381v1)

TRAIL: adversarial learning of c-to-rust translation insights
- insight record = Trigger, Goal, Constraint, Risk (+ tags)
  - stored in JSON, FAISS index, bge-base-en-v1.5 on Trigger+tags, top-5 retrieval
  - candidates filtered for duplicates, triggerless, contradictory, project-specific
- single-insight refinement: each insight is a falsifiable hypothesis
  - challenger builds executable c→rust challenge (C code, rust interface, harness, oracle)
  - cargo check/test failure attributed to one field; update accepted only if replay passes
  - example: zero-padded fixed array copy gives wrong string length; rule fixed to treat as raw bytes
- compositional refinement: lessons that are fine alone can conflict when co-activated
  - classify pairs support/independent/conflict; pick set of ≤3 greedily; challenge jointly
- project pipeline: macro-expand, dependency order, retrieve insights, generate, repair check ≤5 then tests ≤3, reflect
results (100 CRUST-Bench projects, gpt-5.4-mini)
- full: 88% CompRate, 69% TestRate
  - no single-insight learning: 85% / 63%
  - no compositional learning: 86% / 66%
- transfer to 20 SmartC2Rust-Bench: 55% → 70% TestRate, still below Direct 75%
- cost: tokens +9.8%, time 1.47× SmartC2Rust
limits
- cargo check/test is not semantic equivalence
- public c projects only; no kernels, drivers, native deps
verus relevance (inference)
- same loop could mine proof-repair lessons, but only discharged verus contracts count as evidence
