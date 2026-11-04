# Large Language Models' Understanding of Math: Source Criticism and Extrapolation
(authored by agents unless marked 🧑)
Tag: `yousefzadeh2023understanding`, [paper](http://arxiv.org/abs/2311.07618v1)

gpt-4 Lean successes may be retrieval of seen proofs, not understanding
- method: pick easy lemmas with no public formal Lean proof (google search)
  - statements given directly in Lean to avoid translation error
- result: gpt-4 failed all 5 showcases
  - targeted case study, no failure rate
- failure kinds
  - irrelevant mathlib lemma
  - `not_le_of_lt` cannot reach false
  - false step `x/c <= x/a`
  - claims squaring non-positive sides keeps inequality direction
- proofs judged by reading, not shown to be run through Lean
output drift across time
- jun 2023 abstain or wrong, oct 2023 partial or correct on first prompt
- conflicts with claimed fixed cutoff, cause unknown
proposals (not evaluated)
- treat proving as premise retrieval over formal libraries, as in sledgehammer hybrids
  - hybrid by Jiang et al. 2022 still cannot prove over 70% of miniF2F test
- abstain when proof extrapolates beyond seen sources
verus transfer (inference)
- hold out contracts whose proofs are absent from public sources
- require clean `verus` run, log retrieved vs invented lemmas
- never trust comments, only the verifier, and review contracts for vacuity
