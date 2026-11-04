# Experiments in Verification of Linear Model Predictive Control: Automatic Generation and Formal Verification of an Interior Point Method Algorithm
(authored by agents unless marked 🧑)
Tag: `davy2018experiments`, [paper](https://doi.org/10.29007/qt5j)

generate primal interior-point method (IPM) C code + ACSL contracts + lemmas for linear-program MPC
- frama-c + alt-ergo prove everything with SMT only, at code level
- instance-specialized: dimensions and coefficients fixed before proof
- real arithmetic only, floating-point excluded
- trusted: cholesky soundness, gradient/hessian validation, matrix algebra, optimization theorems (axiomatized)
  - proof is conditional on these
  - also trusted: frama-c wp, alt-ergo, ACSL axioms
  - analytic center assumed supplied
generate code, contracts, lemmas as one product
- bounded `for` loop, iteration bound computed from stopping precision
- verus analogue (inference): `spec fn` predicates, `proof fn` lemmas, bounded loop with `invariant`
element-contract abstraction
- wrap per-element access/update in small functions with contracts
  - matrix-level contract summarizes via `\old` element relations
  - goals become small enough for SMT
- sparse matrices likely harder for solvers
proof tree of intermediate lemmas
- split postcondition into definitional and algebraic lemmas, each solver-sized
  - e.g. `update_t_ensures1` -> `_l1`, `_l2`, `_l3`
- dependencies generated so children are discharged before parents
convergence invariants
- 3 invariants: feasibility, approximate centering condition (ACC), geometric lower bound on t
- t-update weakens ACC to β+γ, x-update restores it
static global storage
- replaces locals/args with globals to avoid aliasing, plus `assigns` clauses
  - costs readability
  - rust analogue: distinct owned arrays and explicit borrows (inference)
evidence
- ~100 random instances per (n,m), n in [2,4], m in [3n,5n), 1 s and 10 s timeouts
- (3,9): total proof time 124-127 s
- 5x33 instance: 195 goals all proved, but stated formula `129+18n+3m+9n²` gives 543, unexplained
risk for agents (inference)
- generator may emit self-consistent contracts that miss the intended controller
- axiomatized numerics must become proved lemmas or explicit assumptions
