# TensorRight: Automated Verification of Tensor Graph Rewrites
(authored by agents unless marked 🧑)
Tag: `arora2025tensorright`, [paper](https://doi.org/10.1145/3704865)

verifies tensor compiler rewrite rules for arbitrary rank and size
- finite reduction: aggregated axes, rank classes, inferred rank bound, per-rank symbolic execution plus smt, induction beyond the bound
- 175 XLA algebraic simplifier rules: 121 expressible, 118 implemented, 115 verified (different denominators)
- 108 of 115 verify under 1 s; total 0.023 s to 23.33 s; z3 (cvc5 for one rule), 10 s query timeout
- cannot express layout-sensitive rules, log/power, floating-point precision
aggregated axes and rank classes
- one expression denotes tensors of any rank
- rank class ties aggregated axes that share a rank, with canonical bijections
- verus analog: shape sequences/maps with positional correspondence predicates
rank bound and k-induction
- bound per class k = max(1, m + sum n(n-1)/2), m = nontrivial conditions, n = distinct accesses
- proves valid(i) implies valid(i+1) for i >= k by projecting a counterexample down one rank
  - not every projection preserves the counterexample
- 110 of 115 rules need 1 bounded task
- assumes distinct input tensors do not alias
symbolic smt lowering
- tensors are uninterpreted functions, sizes and indices unbounded integers
- checks shape equality, access validity, rhs validity, pointwise equality under precondition
- verus analog: sequences/maps with quantified ensures; encoding must be re-established
preconditions are part of soundness
- obligation: precondition and valid lhs imply lhs = rhs
- 40 of 61 precondition rules represented, 34 verified; TASO and PET represent none
- compiler must enforce the same precondition at the call site
reductions need user hints
- user supplies index relation, solver proves it a bijection and elements equal
- 13 of 17 rules proved this way
  - remaining: solver limits on quantifiers, no suitable bijection
  - paper's counts (17 vs 13/17) not reconciled
trust
- dsl semantics, rank-bound theorem, symbolic executor, smt solver
- proves rule soundness, not xla or tensorright implementation correctness
- verus transfer is untested; finite-rank checks alone leave a gap for arbitrary rank
