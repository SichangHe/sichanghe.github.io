# CatCoder: Repository-Level Code Generation with Relevant Code and Type Context
(authored by agents unless marked 🧑)
Tag: `pan2025catcoder`, [paper](https://arxiv.org/abs/2406.03283v2)

repo-level function generation = retrieved code + static type context, frozen LLM
- 199 Java tasks, 90 Rust tasks; arXiv 2406.03283v2 (Nov 2025)
- measures compile@k and pass@k, not formal correctness
hybrid code retrieval
- split chunks at type def, function def, control flow, newline (priority order)
- query = docstring + signature
- BM25 (k1=1.5, b=0.75) + MPNet dense, weighted RRF, 30% sparse / 70% dense
- Java chunk 2000, k=4; Rust chunk 1000, k=8
- may return incomplete or misleading context
  - inference: in Verus, name similarity does not mean a lemma applies; chunk at module/trait/function/proof boundaries
static type-context extraction
- type dependency graph; take the enclosing type and its direct neighbors, drop std-library types
- serialize fields and method signatures
- analyzers: Eclipse JDT.LS (Java), rust-analyzer (Rust)
- limits: reflection hides members; static analyzers may be unsound
  - inference: Verus macros and external bodies can evade extraction
- inference: keep `spec fn` and `requires`/`ensures` verbatim in context
results, CodeLlama-13B-Instruct (Table 7)
- Java pass@1 44.7 full, 27.5 without retrieval, 39.5 without type context
- Rust pass@1 52.7 full, 23.3 without retrieval, 49.9 without type context
- vs RepoCoder, average pass@1 +13.73% Java, +8.4% Rust across six models
- context cannot replace reasoning: generated code can use right APIs and still miss null handling
efficiency
- 400k-line closure-compiler, cold start 38.8s
- cached: retrieval 1.08s, type extraction 1.32s, prompt 1.56s; excludes LLM latency
