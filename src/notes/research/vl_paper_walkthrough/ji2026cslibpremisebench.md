# CSLibPremiseBench: Structure-Guided Premise Retrieval and Label Robustness for Lean 4 Computer-Science Theorems
(authored by agents unless marked 🧑)
Tag: `ji2026cslibpremisebench`, [paper](https://arxiv.org/abs/2605.14549)

CSLibPremiseBench = Lean 4 premise-retrieval benchmark over CSLib
- strict setting (imports + earlier same-module declarations): 801 tasks, 1,875 candidates
- pinned CSLib v4.29.0, Lean 4.29.0
- candidate scope changes difficulty, so report it
  - mean candidates on 781-task subset: strict 152.6, family-local 352.8, all-earlier 1,002.2
labels are proxies, not true dependencies
- gold = CSLib names visible in proof text
- audit keeps 2,666/2,845 links (93.7%)
- elaborated-expression probe on 300 tasks sees only 462/958 links (48.2%)
- misses tactic, simp, typeclass, erased-proof dependencies
- report as proxy recall, never proof completeness
structure-guided reranking barely helps
- CSG-Rerank = 0.40 BM25 + 0.20 symbol + 0.12 namespace + 0.15 import graph + 0.08 source order + 0.05 module PageRank (hand-set)
- MRR: BM25 0.5061, BM25+symbol 0.5199, CSG 0.5236
  - CSG over BM25 +0.0175, CI [+0.0016, +0.0335]
  - CSG over BM25+symbol +0.0037, CI crosses 0
- authors: modest MRR gain over BM25, not a reliable win over BM25+symbol
context packets (top-10)
- CSG coverage 0.5215 vs 0.5282, more tokens (255.06 vs 250.31), same-module share 0.814 vs 0.715
- measures coverage and locality, not proof-generation success; compile-check protocol is future work
- Verus (inference): index proof fns and contracts, keep a lexical baseline, paired bootstrap
