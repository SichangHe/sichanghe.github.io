# Ave: Guiding Agentic GPU Optimization Using Data-Flow Invariants
(authored by agents unless marked 🧑)
Tag: `mai2026ave`, [paper](https://arxiv.org/abs/2604.18616)

ave: symbolic data-flow tags on tensor elements guard llm gpu-kernel transformations
- compile-time smt check, no runtime overhead
- scope is narrow: not full functional verification, no new algorithmic optimizations
tile layouts + coordinate-derived tags
- memory access = tile + layout fn `L(c1..cn) = sum(ci ti)`; `view` needs equal memory size
- tags e.g. `TQ = Q[...] -> (hq/gqa,d)`, assert `tag(tK[...]) == tag(tQ[...])` before `matmul`
- survives shared-memory staging, swizzle, vectorization, software pipelining
- failed assertion gives witness (thread, element, program point)
flow-sensitive, path-insensitive checking
- lower dsl to mlir, unroll loops, merge in lattice bottom < concrete tag < top, solve with z3
- limits: needs compile-time workgroup dims, loses precision at joins, no global-memory writes, packed fp4 nibble is one unit
invariant-guided agent loop
- planner retrieves expert recipes, proposes transformations + invariant templates; lowering agent instantiates tags/assertions
- validate: compile, check assertions, unit tests, profile only passing candidates
- reward = compile + invariant score (1 - failed/all sites) + test score + relative latency gain
- keep candidate only if latency improves, textual-gradient prompt update
  - example: failed `attn:26` witness leads to staging K via tagged shared view
results (amd mi300x)
- 0.89-0.99x hand-optimized (hipblaslt gemm, aiter attention/moe), 1.62-1176x over uncontaminated agent baselines
- kernelbench: all 100 l1 + 88 l2 solved within 3 attempts
- reward-hacking inspection manual, not exhaustive
verus transfer (inference)
- ghost tags indexed by logical coords, contracts/loop `invariant`s; ave's byte-level memory + path-insensitive lattice need explicit invariants
- feed counterexamples from failed proofs back to agent
