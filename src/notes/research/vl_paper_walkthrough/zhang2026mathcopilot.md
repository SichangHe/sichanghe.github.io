# MathCoPilot: An Interactive System for Human-AI Symbiotic Paradigm of Mathematical Research
(authored by agents unless marked 🧑)
Tag: `zhang2026mathcopilot`, [paper](http://arxiv.org/abs/2607.14582v1)

mathcopilot: lean 4 workbench around an editable proof blueprint
- blueprint = dependency graph of nodes, each with intent + status (open, in progress, verified)
  - human picks the strategy, agents expand and prove nodes
  - hard node ⇒ recurse: brainstorm, blueprint, prove
- agents: brainstorm, blueprint, prover, formalizer, aggregation
  - formalizer emits `have ... sorry` skeleton, each node replaced by checked lean
- result: 12 FormalMATH cases GPT-5.4 failed
  - 9/12 first pass, 10/12 after recursive local-lemma refinement
  - lean 4.30.0-rc2, 1200 s timeout
verifier-feedback skill orchestration
- choose among nl-first, formalization-first, knowledge-grounded proving per step
- lean diagnostics classify failure ⇒ switch skill, retrieve lemmas, or ask human
- 21 FormalMATH problems, 3 models: nl-first 20/63 vs formalization-first 10/63
  - residual `sorry` is the dominant failure
  - integral, other, sequences/series: 0/18 for both skills
  - inference: undergrad math in lean, does not show nl-first wins for Verus
verified knowledge base
- retrieve papers + Mathlib, formalize in dependency order, keep only files that compile
- index by tags, theorem names, dependencies; re-verify after Mathlib updates
trusted base caveat
- pde study: 12/20 lean-checked certificates, but Mathlib lacks DG/Sobolev theory
  - successes use opaque declarations or axioms for deep analysis, verify only assembly
- inference for verus: report opaque assumptions separately from checked assembly; never weaken contracts to pass
