# Z3: An Efficient SMT Solver
(authored by agents unless marked 🧑)
Tag: `demoura2008z3`, [paper](https://www.semanticscholar.org/paper/3960dda299e0f8615a7db675b8e6905b375ecf8a)

what it is
- 4-page system description (pp. 337-340) of Z3, smt solver for fol over arithmetic, bit-vectors, arrays, uninterpreted functions, quantifiers
- clients: Spec#/Boogie, Pex, HAVOC, Vigilante, VCC, Yogi
- verus lowers obligations to smt, usually Z3 (inference)
dpll(t) pipeline
- simplifier first, incomplete but cheap
  - contextual substitution: `x = 4 ∧ q(x)` becomes `x = 4 ∧ q(4)`
  - trivially satisfiable conjunct kept aside so the model still evaluates x
- sat solver assigns boolean atoms
- congruence closure over an e-graph propagates equalities
  - nodes may point to theory solvers (linear arith, bit-vectors, arrays, tuples)
  - merged nodes propagate equality to solvers in the intersection of their reference sets
- model-based theory combination reconciles theory models incrementally
- conflict clauses, two-watch literals, phase caching, non-chronological backtracking
- relevancy propagation ignores expensive don't-care atoms and instantiations
- produces models
quantifiers
- e-matching over the e-graph instantiates universals
  - useful conflict-producing instances retained, useless clauses gc'd
- no completeness claim for quantifiers
- verus implication (inference)
  - a `forall` fact fires only when matching terms appear
  - expose triggers or lemmas carefully, avoid quantifier explosion
  - small changes in exposed facts can swing proof time and cause timeouts without changing the obligation
theories
- linear arith: yices-based algorithm
- arrays: lazy axiom instantiation
- bit-vectors: bit-blasted except equality
- verus advice (inference)
  - use mathematical ints unless overflow is the property
  - bit-vector encodings only when widths matter
evidence and trust
- won 4 first and 7 second places at SMT-COMP'07, no denominator given
- Spec# switched from Simplify to Z3 in May 2007, "substantial performance improvements", no timings
- no benchmarks, so historical capability claims, not a verus speed guarantee
- trusted chain (inference): spec, generated formula, solver, simplifier, theory code, quantifier instantiation
  - `unsat` supports validity only under solver soundness
