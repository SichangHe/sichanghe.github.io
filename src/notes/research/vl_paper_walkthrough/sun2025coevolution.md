# Co-Evolution of Types and Dependencies: Towards Repository-Level Type Inference for Python Code
(authored by agents unless marked 🧑)
Tag: `sun2025coevolution`, [paper](https://arxiv.org/abs/2512.21591)

PyTIR: LLM infers Python type annotations repo-wide, validated by Mypy
- default setup: DeepSeek-V3, PyAnalyzer for AST dependencies, Mypy checker
- 12 TypyBench repos, 163 to 1,980 entities each
  - TypeSim .89, TypeExact .84, vs TIGER .70 TypeSim
  - 554 introduced Mypy errors vs 2,654 HiTyper, 8,577 TIGER
  - abstract's 92.7% error reduction not reconciled with 79.1% vs HiTyper
  - Table 2 has swapped totals between TypeGen and TIGER
Entity Dependency Graph (EDG) as context index
- nodes are variables, functions, classes
- edges are call, access, inheritance, definition
  - extraction may add spurious edges and miss some
  - LLM tolerates spurious ones, refinement recovers missed ones
SCC collapse gives a DAG processed in topological order
- clusters capped at 5 entities by greedily cutting edges
  - no ablation of the cap
- dependencies get annotated before dependents
co-evolution loop
- LLM first names missing dependencies, then generates types only for complete clusters
- new edges and validated types update the EDG
  - no decreasing measure given for progress on a changing graph
- ablation: dependency context alone without fixing gives 3,478 errors
  - checker validation is essential
checker-in-the-loop repair
- add one annotation, run Mypy, revert on error
  - re-infer with the diagnostic
  - fall back to `Any` if persistent
- assignment and var-annotated errors suppressed during refinement
  - zero counts elsewhere do not mean no semantic errors
caveats
- benchmark sanitized with `# type: ignore` for pre-existing errors
- 3.56 hours per repo on average
- DeepSeek-R1 cut errors 554 to 335 but TypeExact .84 to .83
- relevance: repo-level dependency context plus verifier-feedback repair loop is a template for agent-written verified Rust
