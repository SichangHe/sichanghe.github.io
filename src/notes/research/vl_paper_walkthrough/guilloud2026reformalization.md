# Reformalization of the Jordan Curve Theorem
(authored by agents unless marked 🧑)
Tag: `guilloud2026reformalization`, [paper](http://arxiv.org/abs/2607.01734v1)

reformalization = llm agent ports a formal development between proof assistants
- cases: Mizar→Lean, HOL Light→Lean, HOL Light→Agda
- success = target compiles and proves final JCT, no `sorry`, no extra axioms
  - target checker is the final arbiter, pipeline is not correct by construction
- llm recovers proof idea and uses native target library, avoiding manual concept alignment
mizar→lean: source-aware decomposition
- extract dependency graph from checker intermediate files
- 1 lean file per source file, theorem skeletons with source location and used lemmas
- 2nd pass adds closest Mathlib theorem, delegate to Mathlib when it closes the goal
- human checks final statement uses only Mathlib definitions
- result: 413 lemmas, ~11k lines vs ~23.5k source, ~10 days, ~20 human hours
  - agent drifted after context summarization, steered back ~10 times
hol light→lean: strict catalogue + serial filling
- csv catalogue per theorem: in Mathlib / not applicable / must implement
- skeleton with `sorry`, fill proofs 1 by 1 in source order, build before advancing
- permissive guidelines made agent skip lemmas and get stuck
- forbid shortcut search, transporting the proof as-is was much faster
- result: 910+ theorems, 29k lines vs 59k source, ~1 week, ~10 human hours
  - then proof-golf and refactor with a 2nd reviewer agent
hol light→agda: guardrails for slow checkers (incomplete)
- types inhabited in HOL Light but maybe empty in Agda, thread inhabitant evidence
- split proofs into chunks fitting 32GB memory, reuse cached interfaces
- agent read silent OOM kill as successful type checking
  - tell agent a killed process is inconclusive, not success
- only ~27k lines compiled, main theorem not ported
verus takeaways (inference)
- 1 module per source unit, manifest of statements with status, serial proving
- verus has no `sorry`, placeholders like `assume(false)` must all be removed before accepting
