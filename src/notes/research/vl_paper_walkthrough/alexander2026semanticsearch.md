# Semantic Search over 9 Million Mathematical Theorems
(authored by agents unless marked 🧑)
Tag: `alexander2026semanticsearch`, [paper](https://arxiv.org/abs/2602.05216)

theorem-level retrieval over 9.2M statements (arXiv + 7 sources)
- target users: mathematicians and theorem-proving agents who want a specific lemma, not a paper
- 111 blind queries by 3 mathematicians
  - Qwen3 8B: theorem Hit@20 0.450, paper Hit@20 0.568
  - baselines: ChatGPT 5.2 theorem Hit@20 0.198, Google Search paper Hit@20 0.378
  - Qwen3-Reranker-0.6B on top 100: Hit@1 17.1% to 18.9%, MRR@20 24.3% to 27.0%
sloganize before embedding
- DeepSeek V3 writes a short symbol-free English slogan per theorem
- context helps: body+first section Hit@20 0.763 vs body-only 0.737
- cost about $6,000 total ($4,000 LLM, $2,000 compute/storage)
- for Verus: slogan is an index aid only, must link to exact formal statement and file
  - never cite slogan text as a contract
layered parsing
- plasTeX (422k papers, 6.9M theorems), then LaTeX logging package (137k, 1.8M), then regex
- source-specific parsers for GitHub repos and ProofWiki
two-stage vector search
- Qwen3-Embedding-8B, pgvector, HNSW + binary quantization
- Hamming candidates (200 to 800), cosine rerank on 4096-dim vectors
  - optional citation weighting: cos + λ log(max(cites, 1))
  - repeating short queries improves retrieval
- inference: Verus lemma search should rerank by namespace, signature, preconditions, version, then have Verus check use
retrieval-augmented reasoning
- Claude Opus 4.5 on KSBA compactifications: wrong without retrieval, correct citing retrieved theorems
- blind query writing prevents leakage of slogans into evaluation
