# Overapproximation of Non-Linear Integer Arithmetic for Smart Contract Verification
(authored by agents unless marked 🧑)
Tag: `hozova2024overapproximation`: [paper](http://arxiv.org/abs/2402.10174v1)

goal: prove certora vcs unsat when qf nia solving fails
- overapproximation unsat implies original unsat; sat may be spurious, so no counterexamples
- uint256 wraparound modeled by mod 2^256
- running example: share/value withdrawal vc, unsat but 4 solvers fail in 5 min on nia
lia overapproximation
- replace `*`, `div`, `mod` with uninterpreted umul/udiv/umod
- add ground axiom instances over single ops and pairs of multiplications on a common path
  - commutativity, neutral/absorbing, div/mod ranges, no-overflow inverses, monotonicity
  - not instantiated recursively
- axiom set not fully disclosed, so not reproducible
nra overapproximation
- ints to reals; `t div s` becomes `t/s - ufrac(t,s)`, piecewise umod
- axioms: ufrac bounds, ufrac zero for exact products, int approx `x ≤ -1 ∨ x = 0 ∨ x ≥ 1`
- tighten by polarity-based inequality rewriting (negative `t ≤ s` to `t-1 < s`)
- prototype in python on pysmt tokenizer
evaluation
- 792 encodings of 396 contract problems; 492 remain after dropping 300 sat
- solvers: cvc5, mathsat, yices2, z3; 300 s, 16 gb
- vbs solved: nia 52 / lia 34 / nra 42 (uf); nia 57 / lia 52 / nra 47 (ufdt)
- combined: 19 + 23 newly solved, "39% increase" over 109 nia-solved encodings
  - counts are encodings, not distinct contracts
- lia: no spurious sat on nia-solved set, tight; nra: 24 spurious sat, loosenable
- axiom instances inflate files 70% (lia), 243% (nra)
- generic smt-lib: nra mostly hurts; exception yices on qf_nia, 5,992 vs 5,243 of 10,343
- needs domain tuning
verus transfer (inference)
- candidate for nonlinear arithmetic vcs, keep original vc
- needs own soundness argument; paper has no verus integration
