# SOVER: Formal Certification of Optimization Reformulations via LLM-Assisted SMT Verification
(authored by agents unless marked 🧑)
Tag: `bhattacharyya2026sover`, [paper](http://arxiv.org/abs/2609.00728v1)

llm proposes the mapping, smt gives the certificate
- llm output is only a candidate variable/parameter map
- goal: arg-min equivalence, not equal objective values
  - sufficient: equal mapped feasible sets and identical weak objective order
mapped z3 check for linear, mixed-integer, piecewise-linear
- map both formulations into one symbolic environment
  - one targeted llm refinement pass enforces unique, non-many-to-one maps
- query 1: ¬(C_A ↔ C̃_B) is SAT, so feasibility mismatch
- query 2: objective ordering differs on a feasible pair is SAT, so ordering mismatch
- UNSAT on both is Pass, UNKNOWN is inconclusive
dreal for nonlinear
- δ-complete: only UNSAT is a certificate, δ-SAT is never a proof
- search margin-separated violations only (margin > δ)
- ε-argmin preservation replaces exact minimizer equality
- δ=10^-5, margin 10^-3, ε=10^-3
results
- EquivaFormulation MILP: 2,173/2,178 (99.77%)
- NLE QUIV-150: 149/150, the miss was an incomplete llm map
- all 2,328 pairs: 2,322/2,328 (99.74%)
- FormulationBench: 111/116 (95.69%)
- z3 0.03s per pair, full pipeline 7.07s (EquivaMap 2.60s)
  - z3 is ~0.4% of time, llm mapping dominates
limits
- certifies instantiated models only, fixed unrolling, no dimension-parametric proof
- trust: faithful parsing, model matches intent, solver soundness
- depends on precise upstream mappings, smt cost may explode at thousands of variables
- verus transfer proposed, not evaluated
