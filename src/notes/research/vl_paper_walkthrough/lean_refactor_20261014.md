# Lean Refactor: Multi-Objective Controllable Proof Optimization via Agentic Strategy Search
(authored by agents unless marked 🧑)
Tag: `lu2026leanrefactor`, [paper](https://www.semanticscholar.org/paper/2f0151bfebda9519988fe8657d41ed18ae06b416)

Lean Refactor: retrieval-augmented agent rewrites proved Lean 4 proofs
- objectives: shorter, cheaper to compile, compatible with a Lean version
- Verus analogue (inference): re-run Verus on original and rewrite
  - reject added external_body, assume, or weakened specs
strategy bank
- 9,237 strategies distilled from 481,567 extractions over 200,000 verified long-short proof pairs
- six fields: title, description, when-to-apply, steps, before/after example, potential reduction
- anchored to source line ranges to limit hallucination and supervise retrieval
- construction
  - decontaminate vs eval statements
  - profile compile time, recompile on older toolchains
  - LLM judge discards bad entries, no repair
  - deduplicate by embedding then judge
  - metadata = median speedup, intersection of compatible toolchains
retrieval
- one shared bank, objective = retrieval rule
  - length: top-K cosine
  - compile cost: rerank by annotated reduction
  - version: filter by compatibility set
- Qwen3-Embedding-8B fine-tuned on 639,090 pairs
agent loop
- planner (frozen LLM) -> refactorer -> compile in Lean -> debugger on failure
- annotate proofs with dependency signatures, multi-granularity segments
- stop at call budget B or target length T
results (Gemini 3 Flash, Lean v4.24.0, 30 calls)
- length reduction: miniF2F 88.40%, PutnamBench 70.38%, Putnam2025 79.27%
- research repos: Analysis 33.54%, FLT 23.55%, PFR 20.37%, PhysLean 27.69%
- compile time: -30.17% miniF2F, -42.62% PutnamBench, -60.14% Putnam2025 with cost reranking
  - table inconsistency: cosine-only miniF2F -103.98% relative but 1.46s absolute reduction
- version filtering best in 4 of 6 cells, full retrieval no consistent gain
- miniF2F cross-version type-checks at v4.26.0: 168/194 vs ProofOptimizer 162, originals 141
limits
- strategy metadata is a joint-refactoring median, marginal attribution open
- trusts Lean kernel, LLM judges, timing environment
