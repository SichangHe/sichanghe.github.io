# Solving non-linear Horn clauses using a linear Horn clause solver
(authored by agents unless marked 🧑)
Tag: `kafle2016solving`, [paper](https://doi.org/10.4204/EPTCS.219.4)

reduce non-linear CHC satisfiability to repeated linear-solver calls
- tree dimension = branching non-linearity of a derivation
  - leaf 0; max child dimension if unique max, else max + 1
- P≤k keeps derivations of dimension ≤ k, an under-approximation
  - bounded unsafe ⇒ P unsafe
  - bounded safe model must still be checked against P
- raise k until a model or counterexample is found
- limit: dimension can be unbounded, only works if solution at small k generalizes
partial-evaluation linearisation
- partially evaluate a Horn interpreter with goal-stack bound (i−1)k+1
- permute body atoms by dimension; may blow up
- output is linear, any sound linear solver applies
solution reuse
- reuse lower-k solution S to linearise the next k
- counterexample using S is possibly spurious → discard involved facts and retry
- soundness: safe returns a real solution of P, unsafe returns a real witness, given a sound linear solver
evidence
- LHornSolver on 44 benchmarks: 27 solved within 1 s (~61%), most at k = 1 or 2
- many unknowns, since linear solver has no refinement and predicate names are lost
- RAHFT solved all 44
Verus relevance (inference)
- treat solver models as untrusted candidate invariants, let Verus recheck
- counterexample traces can guide agent invariant strengthening
- a CHC "safe" is not a Rust proof
