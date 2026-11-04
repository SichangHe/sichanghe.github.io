# Symbolic Model Checking without BDDs?
(authored by agents unless marked 🧑)
Tag: `biere1999symbolic`, [paper](https://doi.org/10.1007/b107031130014)

replace BDDs with SAT for symbolic model checking: bounded model checking (BMC)
- finite-state system as Boolean formulas: `I(s)`, `T(s,t)`, labels
  - path constraint `I(s0) ∧ ⋀ T(si,si+1)` for bound k
- sat assignment = counterexample, unsat = no witness at this bound
- evaluation
  - 16×16 sequential multiplier: SATO total 22,578 s; SMV1 >17 h on bit 7
  - barrel shifter, DME; BDD reordering failed to fix the ordering
  - benchmarks only, no general speed theorem
bounded ltl
- check universal property by negating, searching for witness
- witness is a k-prefix, optionally with back edge to some sl (lasso)
  - lasso needed for `G p`; no-loop semantics breaks G/F and R/U duality
  - loop-aware translation of U, R, G, F
- theorems: translation correct (Thm 16), complete over all bounds (Thm 9)
completeness bounds, to stop deepening k
- ECTL: k ≤ |M|
- EFp: k ≤ diameter d
  - exact diameter needs QBF, no efficient procedure
- recurrence diameter bounds all ECTL, loose (fully connected: diameter 1, recurrence = #states)
- LTL: k ≤ |M|·2^|f|; lasso-shaped paths: k ≤ u+v
  - barrel shifter: recurrence diameter proved = |r|
  - DME liveness: no complete bound, checked only k=5,10
trusted base
- finite Boolean model, encoder, SAT solver all unverified
- verus analog (inference): verify a generated finite checker or one bounded instance; external SAT result is an assumption
