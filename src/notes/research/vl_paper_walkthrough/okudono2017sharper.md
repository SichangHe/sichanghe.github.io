# Sharper and Simpler Nonlinear Interpolants for Program Verification
(authored by agents unless marked 🧑)
Tag: `okudono2017sharper`, [paper](http://arxiv.org/abs/1709.00314v1)

synthesizes polynomial interpolants for jointly infeasible nonlinear predicates
- combines real algebraic geometry and sdp optimization
- target uses: invariant synthesis, cegar abstraction predicates
strict-cone positivstellensatz handles barely-disjoint regions
- regions are semialgebraic systems with non-strict, strict, and equality constraints
- infeasible iff f + g + h = 0 with f in cone, g in strict cone, h in ideal (thm 3.7)
- interpolant is f + g + h > 0, found by certificate search over shared-variable coefficients
- strictly generalizes dai et al.'s method
sdp reduction
- sos search becomes sdp, non-shared monomial coefficients forced to 0 (linear constraint)
- implementation: ocaml tool generating matlab, sdpt3 via yalmip
rounding-validation loop makes numeric output usable
- continued-fraction rounding of coefficient ratios, depth d increases on failure
- every rounded candidate validated symbolically, so soundness holds
- can return fail
evidence is small
- 9 geometric cases: 8 interpolants, 1 fail, 2.19 to 43.7 s
- cegar examples over reals: aiSat could not interpolate barely-disjoint pair
- authors admit practical applicability is unconfirmed
- verus inference: external predicate generator, output must be re-proved; no machine-int or rust evidence
