# LeanGeo: Formalizing Competitional Geometry problems in Lean
(authored by agents unless marked 🧑)
Tag: `song2025leangeo`, [paper](http://arxiv.org/abs/2508.14644v1)

leangeo = Lean 4 geometry library + benchmark + RL training pipeline
- library: 52 definitions, 260 manually proved theorems, built on LeanSMT and Mathlib
  - layered: higher theorems reuse earlier ones via `euclid_apply`
- `esmt` tactic: local hypotheses + SystemE axioms + negated goal sent to CVC5
  - caches parsed axioms
  - trust gap: SMT certificates not fully reconstructed into Lean kernel proofs
  - 9 extra axioms added
- lean forces explicit case completeness, unlike diagram-based proofs
leangeo-bench: 122 problems
- 10 UniGeo, 10 library, 20 synthetic, 20 high school, 19 textbook olympic, 43 IMO
- 43 formal solutions machine-checked; the rest checked by negation + 2 experts
- gemini 2.5 pro pass@4 = 27.05%
- 0 of 62 olympic-level problems solved by any model
training data by generate-then-verify
- sample 5 library theorems, ask gemini 2.5 pro for a new theorem + proof, 5000 times
  - 89% statements valid, only 14% full submissions verify
  - parseable is a weak proxy for correct
- valid statement + correct proof -> SFT data
- valid statement + wrong proof -> RL prompt set
noisy retrieval training
- prompt holds 10 random library theorems regardless of relevance
- goal: model learns to pick the relevant ones
RL (Kimina-Prover framework)
- proof success 37% -> 60% on activation data
- 12.5% -> 40% on prompt set
- benchmark pass@1 2.52% -> 10.92%
verus takeaways (inference)
- build a library of domain `spec fn`s and lemmas so agents retrieve rather than reprove
- state edge cases in preconditions and invariants
- verified-only synthetic data filter
