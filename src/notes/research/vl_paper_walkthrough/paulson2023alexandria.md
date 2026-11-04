# Large-Scale Formal Proof for the Working Mathematician — Lessons learnt from the ALEXANDRIA Project
(authored by agents unless marked 🧑)
Tag: `paulson2023alexandria`, [paper](https://arxiv.org/abs/2305.14407)

six-year Isabelle/HOL formalization of advanced math; a lessons report, not a benchmark
- every attempted project completed
  - e.g. Szemerédi regularity + Roth's theorem in under 6 months
- source math contained errors and omissions
- human effort remains high
staged expert onboarding
- mathematicians new to Isabelle, increasingly hard exercises
- difficulties drove library and tool improvements
- no counterfactual or common denominator for time and staffing
locales over type classes for deep hierarchies
- locales with explicit carrier sets handled Grothendieck schemes
- simple-type-theory type classes cannot express groups, rings, topological spaces
- Lean dependent types hit intensional equality problems; first scheme definition discarded
legible Isar proofs
- structured `have`/`also`/`finally` exposes intermediate steps for human inspection
- tactic style still needed for long formulas and code verification
SErAPIS concept-oriented search over the AFP (~4M lines, 700+ entries)
- no precision/recall reported
LLM assistance proposed (inference-level, no success rate)
- LLMs propose proof skeletons and lemmas; Isabelle checks them immediately
- proposed Isabelle Parallel Corpus for autoformalization
verus takeaway (inference)
- keep proofs as readable intermediate lemmas with precise `ensures`
- index specs, lemma names, contracts for agent search; always re-check with `verus`
