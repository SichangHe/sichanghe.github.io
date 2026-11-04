# Polynomial Invariant Generation for Non-deterministic Recursive Programs
(authored by agents unless marked 🧑)
Tag: `chatterjee2020polynomial`, [paper](https://arxiv.org/abs/1902.04373v3)

goal: synthesize conjunctions of strict polynomial inequalities as inductive invariants
- handles polynomial assignments, nondeterminism, recursion; no probabilistic programs
- sound always, semi-complete under compactness and large enough sum-of-squares degree
- real-valued variables, strict inequalities with positivity margin
recursion
- post-condition per function over return value and frozen entry parameters
- calls become abstract transitions constrained by callee pre/post
template-and-constraint pipeline
- unknown-coefficient polynomial templates per label (degree d, n conjuncts, SOS degree ϒ)
- constraints for initiation and consecution on every CFG edge
  - branch guards split into DNF, one constraint per disjunct
- constraint system polynomial in program size for fixed d, ϒ
Putinar positivstellensatz reduction
- `g = ε + h_0 + Σ h_i g_i`, ε > 0, h_i sum of squares
- match monomial coefficients, `h_i = y^T L L^T y` with L lower triangular, yields quadratic equalities
solving
- strong synthesis: representative solution per connected component, subexponential for fixed d, ϒ, performs poorly in practice
- weak synthesis: QCLP/QCQP optimizing a target assertion or bound
evaluation
- 19 non-recursive and 8 recursive benchmarks, 5.4-587.8 s, LOQO
- slower than incomplete tools (ICRA, SeaHorn, UAutomizer) but solves recursive cases they cannot
- outputs rechecked in infinite precision with 10^-9 residual tolerance
  - approximate satisfaction leaves a gap to the exact soundness hypotheses
- ϒ = d and variables not bounded by preconditions, so completeness guarantee does not cover the runs
verus transfer (inference)
- synthesize offline, emit as `spec fn` invariant, let Verus check initiation and consecution
- solver is not a proof, SOS identity must be checked exactly
- real model vs integers and overflow is separate work
