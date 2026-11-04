# Towards SMT Solver Stability via Input Normalization
(authored by agents unless marked 🧑)
Tag: `amrollahi2024smt`, [paper](https://arxiv.org/abs/2410.22419)

problem: tiny semantics-preserving input changes swing solver time
- 4 mutations: assertion reorder, commutative operand swap, symbol decl reorder/rename, anti-symmetric op → converse
- fix: normalize solver inputs; implemented for shuffling + renaming only (C++)
ideal normalizer
- prefix-sequence formulas; user symbols → numbered pattern symbols by first occurrence
- pick lexicographically least over assertion permutations × commutative variants
- computing it is at least as hard as graph isomorphism
  - GI in P is open, so not proven impossible in poly time
practical heuristic, no uniqueness guarantee
- sort assertions by pattern
- break ties by super-pattern (symbol's role multiset across pattern classes)
- rename to canonical names, sort each class again
- scaling: DAG-shared subterms, per-symbol occurrence index, sparse super-patterns
  - indexing cuts lookups from hundreds of millions to hundreds of thousands
evidence
- SMT-LIB 41,075 + Mariposa 16,620 benchmarks, 10 mutations each
- Equality: distinct outputs 10.00 → 2.79, line similarity 0.05% → 98.48%
- vs Weber's normalizer: unique outputs 87% vs 12% (4,461-benchmark subset)
- overhead < 0.8% of normalization + solving time
- stability: MAD of cumulative penalized runtime (PR-2) improves in all cases, sometimes > 10×
  - cvc5 Equality: 286.0 → 4.0; Z3 Equality: 108.8 → 10.7
  - stability ≠ speed: Z3 KomodoD mean rises 12,561 → 13,327
  - symmetric assertions can still defeat tie breaking; no ADT support
Verus relevance (inference, untested in paper)
- reuse mutation taxonomy + MAD metric to test proof brittleness on Verus queries
- normalized queries do not validate contracts
