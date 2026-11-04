# Detecting Critical Bugs in SMT Solvers using Blackbox Mutational Fuzzing
(authored by agents unless marked 🧑)
Tag: `mansur2020storm`, [paper](https://arxiv.org/abs/2004.05934)

storm: blackbox mutational fuzzer for smt solvers
- target: class-A critical bug = `unsat` on a satisfiable formula
  - a verifier trusting it can prove false claims
  - inference: relevant to Verus, which trusts z3 answers; fuzzing detects unsoundness, cannot prove a solver sound
- no theorem on completeness; only measured results
satisfiable-by-construction oracle
- fragment seed instances into sub-formulas, each with truth value under a random model
  - model from a separate solver (z3)
  - keep fragments up to depth Dmax
- combine fragments with AND/NOT (functionally complete) while tracking truth value
- assert the formula if true, its negation if false
  - every assertion holds under the model, so instance is sat
  - any `unsat` answer = bug
- can also generate push/pop for incremental mode
  - only fuzzes logics z3 supports
depth minimization
- rerun fuzzer on buggy seed, binary search smallest Amax then Dmax still triggering bug
  - median reduction 86.1% on 19 bugs
  - adapted ddSMT gives smaller instances but fails on several bugs (e.g. `str.to.re`, `check-sat-using`)
    - needs the fixed solver version as reference, assumed correct
evidence
- 7 solvers, 43 logics, 193,586 seeds
- 29 new developer-confirmed critical bugs in 3 solvers, 19 fixed
  - found only by generated instances, never by seeds
- reproduced 6/21 known bugs, about 1/3 of critical reports in 3 months
- coverage on z3 after 500 instances per seed: +2,958 lines, +1,149 functions
- larger assertion bound cuts iterations (up to 11x); depth bound mainly helps minimization
- threats: seed, solver, logic selection; randomness
