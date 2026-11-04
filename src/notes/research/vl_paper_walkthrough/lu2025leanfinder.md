# Lean Finder: Semantic Search for Mathlib That Understands User Intents
(authored by agents unless marked 🧑)
Tag: `lu2025leanfinder`, [paper](https://arxiv.org/abs/2510.15940)

Lean Finder: retrieval for Lean/mathlib lemmas from user-intent queries
- problem: user questions rarely match declaration names or formal goals
- training data: 1.4M query-statement pairs, 582,102 synthetic queries over 5 intent clusters
- results
  - informalized statements Recall@1/5/10 64.2/88.9/93.3, MRR 0.75
  - synthetic user queries 54.4/84.4/91.4
  - augmented proof states Recall@10 67.9 vs 39.6 Lean State Search
  - raw proof states Recall@10 40.0 without explicit training
  - user study (5 participants, 128 GitHub queries): top-3 rate 81.6%
  - retrieval rates only, no proof-success evidence
intent clustering from real discussions
- 693 real Zulip/GitHub discussions
- o3 bootstraps clusters, then iteratively updates them
- 5 clusters
  - lemma/code search
  - metaprogramming/tactics
  - type-class/instance/axiom issues
  - proof engineering
  - library design
- Verus analogue: lemma search, invariant debugging, API contracts, library design
reverse query synthesis
- start from a formal statement, GPT-4o picks applicable clusters, then generates queries per cluster
  - the filter avoids forcing every statement into all clusters
- caveat: synthetic wording is search data, not proof evidence
  - target statement may not be what a human would ask for
multimodal indexing
- index informalization, augmented proof state, declaration, synthetic query per statement
- augmented proof state targets the premises used in the tactic transition
- Verus: also index contracts, return exact declaration + version
contrastive training
- DeepSeek-Prover-V1.5-RL 7B, last token hidden state as embedding
- in-batch negatives, token-level noise augmentation
- embeddings only propose candidates, Verus must still verify
DPO preference alignment
- 1,154 triplets from votes and GPT-4o-labeled comparisons
- loss = DPO + λ contrastive to limit regression
  - DPO still lowers most retrieval metrics
  - top-3 user rate 81.6% with vs 76.7% without DPO
- human/LLM votes are not formal correctness evidence
