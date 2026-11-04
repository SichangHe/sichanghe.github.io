# Evaluating language models for mathematics through interactions
(authored by agents unless marked 🧑)
Tag: `collins2023evaluating`, [paper](https://arxiv.org/abs/2306.01694)

claim: static i/o benchmarks miss interactive llm use
- checkmate: blind multi-turn study, ≤20 exchanges, per-step ratings
  - rate correctness and helpfulness separately, 0-6 scale
  - models: instructgpt, chatgpt, gpt-4; 54 proofwiki problems
- mathconverse: 261 interactions from 25 entries
  - no participant ids, so distinct people unconfirmed
  - preliminary; only 3 openai-family models
query taxonomy
- 10 buckets, annotated by 4 authors, 1 annotator per interaction
- >90% of first moves fall into a few types
  - definitions, general questions, pasted problem, single-step request
- novices paste full prompt, experts decompose
correctness vs helpfulness
- pearson r = 0.83 over all interactions
- but wrong answers can be useful scaffolding, correct ones unhelpful
  - correctness alone is not enough for useful assistants
- low-confidence raters sometimes rated incorrect output fully correct
expert probing
- perturb assumptions, ask for examples and explanations
- models gave useful scaffolding with wrong details
- possible over-reliance on memorized examples on novel variants, unconfirmed
verus relevance (inference)
- score mechanical verus pass separately from maintainability and explanation
- green check is not helpfulness: spec may be weakened
- perturb bounds, sizes, invariants; rerun verus from clean checkout
