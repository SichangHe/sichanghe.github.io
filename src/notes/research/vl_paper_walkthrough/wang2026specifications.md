# When Specifications Conflict: A Symmetry-Based Framework for Measuring LLM Preferences
(authored by agents unless marked 🧑)
Tag: `wang2026specifications`, [paper](https://arxiv.org/abs/2607.28384)

llm picks which of two conflicting specs to follow
- method: symmetry-complete attribution
  - each spec induces an executable mapping; query q* where outputs differ, so the answer is attributable to one spec
  - cross presentation order and representation-to-mapping assignment (4 trials)
  - aggregate attributable responses only, clustered-bootstrap 95% CI
- benchmark: 550 conflicts, 11 function families, 50 each
  - representations: NL, Form (formal), NatF (naturalized formal), Ex (io examples)
  - pooled order: Form ≈ NatF > NL > Ex
    - Form over NL 87.45%, Form over Ex 93.04%, NL over Ex 77.80%
  - Form vs NatF is model-dependent: Form 59.67% overall, 69.67% DeepSeek-V4-Flash, GPT-5-nano favors NatF
- takeaway for spec writing: formal notation beats examples and prose when they conflict
  - examples are the weakest spec channel
code generation: mbpp doc vs tests, 67 verified conflicts
- test-selection 16.5% (Gemma-3-4B-IT) to 97.1% (Claude Opus 4.8)
  - weak models follow docs, strong models follow tests
- attribute by hidden-suite execution
  - exclude both-compatible, visible-test-overfit, wrong, extraction failures from the denominator
clinical rules: examples chosen 0.4–38.5%, more restrictive rule 52–87% across 9 models
limits
- real conflicts are incomplete or partial; representation is confounded with length and information density
- needs executable outputs
- 7,968-trial full design ran for only one model in clinical setting
