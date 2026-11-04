# Kimina-Prover Preview: Towards Large Formal Reasoning Models with Reinforcement Learning
(authored by agents unless marked 🧑)
Tag: `numinakimiteam2025kiminaprover`, [paper](https://arxiv.org/abs/2504.11354)

Lean 4 prover: long reasoning + whole-proof generation, trained with SFT then RL on Lean binary reward
- no explicit tree search at inference; reasoning tokens explore implicitly
- miniF2F-test, 72B: 52.94% pass@1, 68.85% pass@32, 80.74% pass@8192
autoformalization for RL problem supply
- Kimina-Autoformalizer-7B, expert iteration: SFT, sample, keep compilable, QwQ-32B judge (unanimous vote), retrain
  - filters: contradictions, provable negations, trivial statements
  - 90% one-shot compile, 66% accuracy (compile + judge approval) on ~1k human-curated set
  - needed expert monitoring: model repeats mistakes the judge misses if it compiles
- training set: ~100k autoformalized + ~10k human-annotated, resampled 1:1, 200k entries
  - prune easy problems, send hard/wrong ones to humans, check post-RL proofs for exploiting formalization errors
reasoning format + cold start
- `<think>` block interleaves informal reasoning and Lean snippets; most snippets must reappear in final proof
- cold start: ~20k mini-SFT examples with thinking blocks synthesized by Claude 3.7 Sonnet, mixed with Kimi k1.5 informal data
- output length grew 2,500 to 10,000+ tokens while pass@32 rose 61.8% to ~69%
RL recipe
- per iteration: 1000 problems, 8 rollouts each, reward 1 only for fully accepted proof
- Kimi k1.5 objective, KL τ=0.4, lr 2e-6, from Qwen2.5-72B
- anti format-collapse
  - ≥1 tactic block, tactic blocks cover ≥60% of final Lean code
  - drop negative-gradient samples with prob 0.5
infra
- Numina Lean Server (LeanREPL): LRU-cached import environments, parallel workers
  - 10x verification throughput, up to 100 it/s on 64 cores; 640 cores for RL
- miniF2F decontaminated (13-gram), 8 unsolvable statements fixed
Verus takeaways (inference)
- reward should check contract preservation, verifier acceptance, no `assume`/`admit`/`external_body`
  - a lone "verifies" bit can reward a vacuous spec
- include false or over-strong requirements so the agent flags them
- cache keys must include Rust, Verus, dependency, spec revisions
