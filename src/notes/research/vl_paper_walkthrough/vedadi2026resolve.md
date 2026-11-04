# RESOLVE: Language-Agnostic Validation of GPU Kernels Through Testing, Reduction, and Proof
(authored by agents unless marked 🧑)
Tag: `vedadi2026resolve`, [paper](https://doi.org/10.48550/arxiv.2610.05683)

gpu kernel validation: test, reduce, prove
- three testing passes: binary counting, conflict tracing, schedule perturbation
  - nvbit traces memory accesses, stalls only potentially conflicting instructions
  - compares full memory hashes bitwise across seeded input families
  - clean campaign is evidence of determinism, not a race-freedom proof
- agent reduces candidate and reference to minimal concurrency
  - rejects barriers, atomics, warp primitives; bitwise-equal on all tests
- F*/Pulse (via Kuiper) proves both satisfy one tight real-number spec
  - avoids numeric tolerances
  - weak memory-safety-only spec insufficient
  - unsupported: Taylor degree-10 vs 11 exp, discontinuous argmax
results
- 31 candidates: 15 bitwise identical early, 2 empty, 11 verified, 3 inconclusive
  - full workflow run on only 14 of 85 remaining, 11/14 completed
- synchronization mutants: 92/143 runnable caught (400 attempted, 198 applicable)
  - misses: 3 dead code, 28 value-preserving races, 20 intra-warp unreachable by nvbit
- mega-kernel repair by agents judged only by determinism tester, weaker than the full workflow
verus transfer (inference)
- pattern: two verified implementations tied to one spec
- determinism testing is a pre-pass, not proof
