# Sharpen the Spec, Cut the Code: A Case for Generative File System with SYS SPEC
(authored by agents unless marked 🧑)
Tag: `liu2025sharpen`, [paper](https://arxiv.org/abs/2512.13047)

SYS SPEC: spec-guided LLM generation and evolution of a file system
- three spec parts: functionality, modularity, concurrency
- prototype SPEC FS: FUSE file system from AtomFS design, ~4300 lines C, 45 modules
- checked version: arXiv v4, 2026-02-10
motivation: 3157 Ext4 commits (Linux 2.6.19-6.15)
- 82.4% bug-fix or maintenance, 5.1% feature
- ~80% of bug fixes < 20 lines, ~60% of feature patches < 100 lines
functionality spec
- structured natural language with types, Hoare-style pre/postconditions, invariants
- optional system algorithm to forbid correct-but-slow code
  - sort contract alone allows bubble sort
- global invariants for what local pre/post cannot express
  - e.g. inode modification only while holding its lock
- no formal prover: "an LLM enforces adherence to this logic during code generation, replacing the role of a formal theorem prover"
rely-guarantee modularity
- modules <= 500 lines, ~30K tokens of inference
- Rely: assumptions on dependencies, Guarantee: exported behavior
- generate dependents without seeing dependency internals
- regenerate all dependents when a shared guarantee changes
sequential first, then concurrency
- LLMs fail when logic and locking are specified together
- phase 1 sequential code, phase 2 instrument with locks
- Rely clauses carry lock pre/postconditions
DAG spec patches for evolution
- leaf: self-contained module change
- intermediate: consume child guarantees
- root: guarantee unchanged semantically, atomic replacement of old implementation
agents
- SpecCompiler: CodeGen proposes, SpecEval checks against spec, retry with feedback
- SpecValidator: holistic check of all modules plus unit/regression tests
- SpecAssistant: helps author and refine specs
- "dual-agent design is critical for overcoming LLM hallucination"
results
- 45 modules: Gemini-2.5-Pro and DeepSeek-V3.1 100% with SYS SPEC
  - best oracle baseline 81.8% even given ground-truth dependencies
- DeepSeek-V3.1 Reasoning ablation (40 concurrency-agnostic + 5 thread-safe modules)
  - functionality only: 12/40, 0/5
  - + modularity: 40/40, 0/5
  - + concurrency: 40/40, 4/5
  - + SpecValidator: 40/40, 5/5
- 10 evolution features, 64 modules: Extent 4.5 -> 1.5 h (3.0x), Rename 13 -> 2.4 h (5.4x), 4 students
- delayed allocation: up to 99.9% fewer writes in tested workloads
limits
- correctness judged by tests, manual equivalence, LLM review, not proof
- 754 regression tests, 64 fail (unimplemented functionality)
- FUSE: no kernel integration, no crash consistency
- push-button verification integration only proposed
Verus analogue (inference)
- functionality -> requires/ensures + spec fn
- Rely/Guarantee -> module boundary exposing contracts, plus explicit ownership/aliasing assumptions
- prove sequential contract first, then add concurrency via state machines; keep sequential proof as regression
- patch DAG: reverify leaves first, root ensures must be provably equivalent to the old contract
