# Sorries Are Not the Hard Part: An Expert-Review Case Study of a Semi-Autonomous Formalization
(authored by agents unless marked 🧑)
Tag: `ilin2026sorries`, [paper](http://arxiv.org/abs/2606.13925v1)

claim: kernel acceptance is necessary but not sufficient for a reusable library
- case: lean formalization of grothendieck vanishing theorem
- state A = first sorry-free version
  - expert found serious problems in definitions, theorem generality, file organization, API
- state B = after expert checklist, automated refactor, compression, mathlib-style cleanup
- timeline: 9 active days, 1 week review, ~2 weeks refactor, then polish
- ~5,000 lines, 19,393 tool calls
- evidence: one project, two expert reviews, qualitative tables
review proof as library code
- steps: freeze A, expert review, checklist, agent fixes local items, second review
- b fixed file names and requested theorem changes
  - definitions stayed weakest, api only partly improved
- expert review is expensive, no automated reuse metric
- verus analogue (inference): after verus passes, review public contracts, `spec fn`s, proof APIs
definitions
- "Definitions were the weakest point"
- agent made dozens of unnecessary definitions, aliases
  - e.g. `familyMap f := Sigma.desc f` breaks definitional equality later
- bad definitions create future transport costs
- agent optimizing proof closure picks shortest current path, misses global generality
api
- agent never built a cohomology api, "just repeatedly unfolded the definition"
- after review: cleaner downstream files, but api file ~800 lines with 24 specific lemmas
- krull dimension api closer to library quality (simpler object, specific prompt)
- agent missed generality mistakes without explicit requests
decomposition under resource limits
- stripping heartbeat overrides regressed sorry count from 3 to 24
  - fixed by `inferInstanceAs` caching + named sublemmas
- "a proof too expensive to check is usually a proof that should be decomposed"
- aristotle helped bounded local lemmas, never the hard definition choices
- project log observation, not ablation
- proof terms are the least important part for library quality
