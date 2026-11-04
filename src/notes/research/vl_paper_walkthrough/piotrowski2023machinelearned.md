# Machine-Learned Premise Selection for Lean
(authored by agents unless marked 🧑)
Tag: `piotrowski2023machinelearned`, [paper](https://arxiv.org/abs/2304.00994)

machine-learned premise selection inside Lean 4
- ranks lemmas for a theorem statement, lightweight, no external ML service
- data: mathlib3port4, premises from proof terms
  - filters: all (96,915 premises), source (28,784), math (67,462)
features
- names, bigrams, trigrams from hypotheses (H:) and conclusion (T:)
- trigrams overfit: random forest math Cover 0.26 to 0.16
models
- k-NN, k=100, rarity-weighted similarity
  - 5.65 s per theorem
- online random forest, 300 trees, updates per new proof
  - 0.28 s per theorem
  - source filter, names+bigrams: Cover 0.29, Cover+ 0.36 (k-NN 0.25, 0.36)
  - online updating untested
- test: 592 modules, trained on 2,436
metrics
- Cover = |P∩R[:n]|/n, Cover+ uses top n+10
- proof-state data (LeanInk, 91,292 examples) gave no significant gain
interactive tactic
- `suggest_premises` asynchronously tries `apply`, `rw`, `simp only` per suggestion
- shows first one that advances the goal
limits
- measures ranking only, no end-to-end proving or user study
- Verus analogue: features from requires/ensures, labels only from verified proofs
