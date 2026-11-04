# Projectional Decoding: Towards Semantic-Aware LLM Generation
(authored by agents unless marked 🧑)
Tag: `chen2026projectional`, [paper](https://doi.org/10.1145/3803437.3805571)

idea: keep a partial graph model beside the text during decoding
- elements are certain / possible / absent / error
- each token refines the model, error refinements are discarded
- vocabulary masked by grammar (LLGuidance) then by semantic constraints
preliminary CLEVR program-generation eval, Qwen3 4B/8B/14B, greedy
- semantic validity: no guidance 4.33/60.33/55.44%, semantic guidance 73.67/79.67/73.33%
  - syntax-only: 48.67/61.00/58.33%
- accuracy gain not uniform; 14B 37.33% vs 37.67% unguided
- overhead 1.1x-1.5x per token
- no run reaches perfect validity despite "provable guarantees" claim
limits
- conceptual framework, no repeated runs, open models only
- backtracking left as future work
- paper never mentions Verus; use for contract/invariant structure masking is inference
