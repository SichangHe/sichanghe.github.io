# VeriSoftBench: Repository-Scale Formal Verification Benchmarks for Lean
(authored by agents unless marked 🧑)
Tag: `xin2026verisoftbench`, [paper](https://doi.org/10.48550/arxiv.2602.18307)

benchmark of 500 lean 4 proof obligations from 23 open-source formal-methods repos
- measures proof automation where definitions/lemmas are repo-specific and cross-file
- covers compilers, pl semantics, type systems, zk circuits, protocols
- selection filters
  - hole-free ground-truth proof, recursively for invoked lemmas
  - compiles with target replaced by `by sorry`
  - not solved by `simp`/`omega`/`grind` alone
  - references a repo-local definition
- sampled balancing category, proof length, and number of local deps
- 381 tasks in 21 regular repos, 119 in 2 repos with context > 200k tokens
dependency-closed packaging
- keeps original definitions, local names, imports, preceding file text
- includes transitive dependency declarations, hides proof bodies
- verified by inserting ground-truth proof and compiling in lean
- avg deps per theorem: 2.3 library + 11.6 project direct, 11.2 + 37.9 transitive
curated vs full context
- curated = oracle closure of ground-truth deps, a diagnostic not a deployable retriever
- full = whole repo
- loop: sample k candidates, compile (300 s timeout), up to r repair rounds with errors/proof state
- pass@8 curated / full on 500 tasks
  - gemini-3-pro 41.0% / 34.8%
  - claude opus 4.5 31.2% / 23.2%
  - gpt-5.2 12.6% / 10.8%
  - goedel-prover-v2 5.6% / 5.2%
  - aristotle 69% vs gemini-3-pro 65% on separate 100-task subset, not comparable
- even oracle context leaves large gap, so context utilization and composition are bottlenecks
dependency depth predicts failure
- gemini-3-pro curated / full success by depth
  - 1-3: 38.0% / 32.6%
  - 4-6: 25.5% / 23.5%
  - 7+: 21.1% / 15.6%
- about half of theorems have depth >= 5, ~10% exceed 12
- spearman with failure: depth -0.356, total transitive deps -0.337
proof patterns
- 71% branch via case analysis or induction
- only 7% start with `unfold`, 10% end with `simp`, none solved by one-shot automation
limits
- lean kernel and imported libs trusted
- cannot rule out training-data contamination
- authors do not isolate why goedel transfers poorly
inference for verus
- package crates the same way: frozen toolchain, specs and lemma signatures kept, proof bodies elided, must still compile under verus
- record dep counts/depth and branching to tell retrieval failure from long invariant-chain failure
