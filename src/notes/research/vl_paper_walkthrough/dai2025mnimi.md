# Statistical Independence Aware Caching for LLM Workflows
(authored by agents unless marked 🧑)
Tag: `dai2025mnimi`, [paper](https://arxiv.org/abs/2511.22118)

problem: naive prompt-to-response caching makes repeated calls identical
- breaks pass@k, semantic entropy, uncertainty estimation, repair retries
- all need samples with controlled independence
mnimi: cache design pattern with explicit sampling semantics in the type of the LLM reference
- model interface is sample(prompt) -> iterator, an infinite sequence of samples
- Repeatable: same lazy sequence replayed for the same prompt
  - queries inner model only on cache miss
  - backends: InMemory, Persistent (on-disk replay across runs)
- Independent: one shared consumptive iterator per prompt
  - used outputs never reused by other callers
  - stores nothing, only a consumption strategy
- compose wrappers at loop scopes
  - Repeatable inside the scope needing reuse, Independent outside the scope needing fresh samples
  - namespace-only caching cannot express nested cases
specfix case study
- Persistent for the programs/tests that score() draws, so rescoring a description is stable
- Independent for each repair proposal, so retries are fresh
- 8 runs, 100 HumanEval+ problems, gpt-4.1-mini, temp 1.0
  - C=20, E=10 baseline: 417k tokens, 1716 s, $1.10; replay: 0 tokens
  - C=40, E=10: no-cache 601k tokens, $1.68; first-cached 301k tokens, $0.84
limits
- independence of provider samples is assumed, not proved
- needs deterministic prompt/settings serialization
- API randomness, float ordering, cache growth, eviction unresolved
- semantic caching and concurrency are future work
- no distribution-preservation proof, no verification of specfix
verus inference
- cache as map prompt -> sequence plus cursors
- prove replay and monotone cursor, keep provider independence as explicit assumption
