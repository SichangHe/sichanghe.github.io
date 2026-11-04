# SemanticForge: Repository-Level Code Generation through Semantic Knowledge Graphs and Constraint Satisfaction
(authored by agents unless marked 🧑)
Tag: `zhang2025semanticforge`, [paper](https://arxiv.org/abs/2511.07584)

semanticforge: repo-level python codegen with knowledge graph + smt-constrained decoding
- 4 stages: dual static/dynamic graph, learned graph-query planner, smt-guided beam decoding, incremental graph update
- repokg-50: 4,250 tasks over 50 repos
- reported pass@1 49.8% vs 34.2% Code-Llama-34B, 42.3% CodePlan
- all numbers are paper claims, not reproduced
dual static + dynamic graph
- static analysis misses runtime types and polymorphism, traces miss unexecuted paths
- merge: traces refine polymorphic targets
- dynamic part lifts pass@1 42.5% to 49.8%, logical hallucination 35.5% to 23.1%
- text claims 31% reduction, which mismatches the table
learned graph-query planner
- instruction to structured query under a grammar, trained with REINFORCE
- reward = test + 0.3*type - 0.001*subgraph size
  - type term sign is unclear in the paper
- 73% context precision vs 51% BM25
smt-guided beam search
- encode type, signature, visibility, architecture constraints in Z3
- prune beam prefixes that are unsat
- 89% of type errors removed (intro says "schematic errors")
- ~6% latency overhead, other sections say 8.3% or 13.5%
- guarantee holds only if a valid completion stays in top-k
incremental graph maintenance
- recompute impact sets, re-extract only changed files, lazy cross-file resolution
- 0.52 s vs 12.7 s full rebuild for 5-20 file changes
paper has internal inconsistencies
- validation split 20% vs 10%
- "super-additive" ablation claim contradicts its own numbers
- complexity O(|dR| d log n) vs O(|dR|)
- theorem proofs are sketches
verus inference
- graph over fns, spec fns, proof fns, contracts; verus diagnostics as dynamic-like signal
- stale graph facts can make a proof target an old contract
  - invalidation must cover specs, lemmas, flags, verus version
- smt type/signature constraints do not show a contract states the intended property
- final verus check on the result is still required
