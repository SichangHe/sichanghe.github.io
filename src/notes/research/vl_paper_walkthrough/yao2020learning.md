# Learning Nonlinear Loop Invariants with Gated Continuous Logic Networks
(authored by agents unless marked 🧑)
Tag: `yao2020learning`, [paper](https://doi.org/10.1145/3385412.3385986)

g-cln learns nonlinear loop invariants from traces, z3 checks the candidate
- pipeline: instrument loop, run on valid inputs, expand monomials up to maxDeg, train, extract formula, check with Z3
  - z3 counterexample goes back into training data
- neural model only searches; z3 is the trusted check
  - fitting all traces is no evidence of inductiveness
results
- 26/27 nonlinear problems (3 more than prior work), avg 53.3 s
- all 124 linear Code2Inv problems
- 97.5% convergence on quadratic problems, +39.2% over CLN
- only failure knuth: 165 candidate terms of degree <= 3
gated continuous logic
- relax and/or/not to product t-norm, t-conorm, 1 - t
- gates near 1 keep a subformula, near 0 drop it, so structure is learned
- extraction: keep clauses with gate > 0.5, round coefficients to bounded-denominator rationals, discard if not fitting data
pbqu activation for tight inequalities
- penalizes points far from the boundary, unlike sigmoid
fractional sampling
- vary initial values over reals, then set initial vars = V0
- sound: invariant of the continuous relaxation is an invariant of the discrete program
training stabilizers
- L2-normalize samples, growth-rate term filter, term dropout, regularization
  - ablation: without normalization only ps2 solved
external calls (mod, gcd) sampled as extra terms
- gcd programs validated by hand, z3 lacks gcd
takeaways for verus agents (inference)
- treat output as an untrusted candidate invariant; verus proves init, preservation, exit
- coefficients need translation to verus syntax; nonlinear steps may need assert lemmas
