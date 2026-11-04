# C2SaferRust: Transforming C Projects into Safer Rust with NeuroSymbolic Techniques
(authored by agents unless marked 🧑)
Tag: `nitin2025c2saferrust`, [paper](https://arxiv.org/abs/2501.14257v2)

c2rust bridge + llm rewrite of small units
- c2rust gives compilable unsafe Rust, llm makes slices safer, hybrid project stays testable
- split fns into units ≤ L=150 lines (root + nested inner units with placeholders)
  - inner units keep live-in/live-out interface
- verus analogue (inference): unit = proof boundary, keep wrapper requires/ensures stable
dependency ordering
- translate callees before callers: reverse topo sort of call graph, dfs post-order for cycles
- re-run static analysis after each change
- ablation: beats no-chunking and random-order in 9/15 settings
static-analysis context for prompts
- root: source, call sites, globals, imports
- inner: source, live-in/out vars from MIR, globals, imports
- signature change => translate call sites in same prompt
compile/test repair loop
- swap in, compile, run e2e tests, feed errors back, up to N=5 attempts
- all fail => keep original unsafe code
- correctness only relative to tests, may remain unsafe
- verus analogue: add verification before acceptance
results (gpt-4o-mini, 7 coreutils programs)
- avg reduction: raw-ptr decls 25%, derefs 22%, unsafe lines 24%, calls 8%, casts 30%
- tests still pass
- on covered functions only: 13/13/14/7/29%
- beat Laertes, CROWN (CROWN ran on only 4/10 projects)
limits
- llm wraps ffi in unsafe instead of replacing
- structs/enums outside functions not translated
- table inconsistencies: summary box vs table 2a, table 4 cast column duplicates lines
