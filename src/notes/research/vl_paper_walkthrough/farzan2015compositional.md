# Compositional Invariant Generation via Linear Recurrence Analysis
(authored by agents unless marked 🧑)
Tag: `farzan2015compositional`, [paper](http://arxiv.org/abs/1502.00138v1)

linear recurrence analysis (LRA) = compositional numerical loop invariant generator
- each cfg edge is an arithmetic transition formula over pre-state x and post-state x'
  - sequence: ∃x''. ϕ[x''/x'] ∧ ψ[x''/x]
  - choice: ϕ ∨ ψ
  - loop star: recurrence-based summary, so loop control structure is irrelevant once body formula exists
- evaluate a regular path expression to the assertion
- result is a sound over-approximation, not exact
- running example proves x = q*y + r for division
loop summary via recurrences
- simple recurrence x' = x + c closes to x(k) = x(0) + kc
  - detect with SMT: does the body formula imply x' = x + c
- stratified recurrence x' = x + c·y, y from lower strata
  - solve linear system (Gaussian elimination) over affine hull of body
  - sum lower closed forms by polynomial curve fitting, e.g. y(k) = y(0) + kx(0) + k(k+1)/2
  - gives nonlinear closed forms as intermediate facts
- recurrence inequalities for nondeterministic updates
  - difference variables δx = x' − x, convex hull of body projected onto them
  - e.g. x(0)−k ≤ x(k) ≤ x(0)
guards and nonlinearity
- guard(ϕ) = (∃Var.ϕ) ∧ (∃Var'.ϕ) recovers pre/post loop conditions
- linearization lin(ϕ) over-approximates nonlinear ϕ
  - uninterpreted functions plus affine hull, then interval bounds from symbolic optimization
  - heuristic, no best linear approximation exists
evidence: 119 loop benchmarks (81 safe, 38 unsafe)
- safe proved: LRA 71/81, LRA-Comp 65/81, SeaHorn 68/81, CPAChecker 38/81
- mean time: LRA 5.4s, LRA-Comp 3.0s, CPAChecker 42.4s, SeaHorn 37.7s
- unsafe false negatives: LRA 0, CPAChecker 3, SeaHorn 2
- LRA proves 8 benchmarks CPAChecker and SeaHorn cannot
limits
- arbitrary-formula domain costs performance
- stratified form only, no completeness for arbitrary nonlinear updates
- unsatisfiable body summarized as zero iterations
for Verus
- use as invariant synthesizer, outputs become loop `invariant` candidates
  - Verus must still prove them inductive on the real Rust code
- nonlinear closed forms may need nonlinear arithmetic lemmas
