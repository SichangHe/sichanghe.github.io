# Accelerating Automated Program Verifiers by Automatic Proof Localization
(authored by agents unless marked 🧑)
Tag: `gopinathan2025proof`, [paper](https://www.semanticscholar.org/paper/430364be4fdb90648dd939ff8839e171a2385049) (link from the fetch record)

proof localization speeds up re-verification by limiting each assertion to its needed axioms
- cause of slowness: large smt queries, many quantifier instantiations
- needs an already successful proof, so no help for the first verification
- targets code evolution, verifier/solver upgrades, ci
- axolocl: fork of boogie 3.0.12.0 with a modified axiom profiler
  - evaluated on boogie from dafny and viper
- verus form (inference)
  - analogue is `assert by` blocks revealing only the needed lemmas
  - not shown on verus by the paper
proof essence = unsat core + lurking axioms
- label each background axiom, compute one vc per assertion (incl. call-site preconditions, postconditions, loop invariants)
- unsat core gives axioms used in the proof
- core alone can fail re-verification
  - lurking axioms are absent from the core but create trigger terms core axioms need
- find lurking axioms by bfs on the z3 instantiation graph from each core axiom
- inference: solver version, seed, or source order may change cores and graphs
- minimality of the essence is claimed, not proved
guarded rewrite exposes only the essence per assertion
- wrap each axiom with a trigger on a unique guard function `ax_i(bool)`
- rewrite assertion as `if (*) { assume ax_i(true)...; assert P; assume false } assume P`
- continuation stays outside the proving branch, so enabled axioms do not pollute later obligations
- semantic equivalence claimed, no formal proof
encoding comparison (viper suite, total speedup)
- fine-grained trigger guards: 4.8
- coarse procedure-level guards: 0.6
- guard embedded in existing triggers: 0.4
- inlining axiom bodies: 0.4, often too large to fit in memory
- takeaway: only fine-grained helps, default to it
setup
- 365 files in 8 projects (files over 2 s mean verification time)
- 2-vCPU Xeon, Z3 4.8.7, 10 min timeout, 50 runs with different seeds
results
- per-file speedups up to 1000x
  - slowdowns only on already-fast files, worst one ~35 s file 4x slower
- suite totals: Viper 3070 s to 711 s (4.3x), Cedar 967 s to 349 s (2.8x)
- aws 370 s to 380 s (1.0x), the only maintained project with ci verification, likely already hand-optimized
- quantifier instantiations drop 2.0-7.1x on all 8 suites, e.g. Cedar 26.0M to 3.8M
- under semantics-preserving mutations (rename, reorder), viper files got 42.59 s slower on average but speedup trend persisted
