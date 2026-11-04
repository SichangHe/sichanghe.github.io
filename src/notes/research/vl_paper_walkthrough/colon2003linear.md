# Linear Invariant Generation Using Non-linear Constraint Solving
(authored by agents unless marked 🧑)
Tag: `colon2003linear`, [paper](https://www.semanticscholar.org/paper/0d68b14e040c346fca41350f8d6e7b603604bf82)

synthesize linear loop invariants by solving for unknown coefficients
- sound and complete for inductive linear assertions over linear transition systems
- setup: pick cutpoints, posit `c1 x1 + ... + cn xn + d ≤ 0` at each with unknown c, d
  - encode initiation (init to cutpoint) and consecution (cutpoint to cutpoint) per basic path
farkas lemma turns each linear implication into multiplier equations
- multipliers are nonnegative
- consecution multiplies the invariant multiplier by unknown coefficients, so constraints become non-linear
solving the non-linear constraints
- tools: quantifier elimination (CAD), factorization, gröbner bases, double description for linear cones
- factor `P1P2 ≤ 0` into a disjunction to lower degree
- if result is too large, set some coefficients to 0 (restricts invariants to fewer variables, may lose valid ones)
evidence is thin
- 3 hand-picked case studies (increment, heapsort, vagrant robot), no runtimes or sizes
- recovers invariants of Cousot and Halbwachs on heapsort
- finds `i ≥ 1` on increment, which the compared abstract interpretation misses
limits
- authors: main drawback is non-linear constraints, only small/medium instances
- examples declared over integers but farkas lemma is over reals, gap not discussed
verus relevance (inference)
- verus does not synthesize coefficients, an external generator could propose constants and verus checks the loop `invariant`
