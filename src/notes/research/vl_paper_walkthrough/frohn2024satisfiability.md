# Satisfiability Modulo Exponential Integer Arithmetic
(authored by agents unless marked 🧑)
Tag: `frohn2024satisfiability`, [paper](http://arxiv.org/abs/2402.01501v4)

goal: SMT theory EIA, non-linear integer arithmetic plus exp(c,d) = c^|d|, with solver SwInE-Z3
- |d| keeps the function total, as SMT requires
- theory undecidable, algorithm incomplete
  - x ≥ y ≥ 0 ∧ exp(2,x) ≠ exp(2,x−y)·exp(2,y) makes refinement loop forever
CEGAR over an NIA solver
- treat exp as uninterpreted, get an NIA model, check it against exp semantics
- if violated, conjoin valid lemmas that exclude the model, repeat
- sound: every generated lemma is EIA-valid (Theorem 26)
- preprocess by constant folding and sound rewrites
  - exp(x,y)·exp(z,y) → exp(x·z,y)
  - combining exponents by addition is unsound for negative exponents
lemma families, only those violated by the current model
- symmetry, monotonicity, bounding: finite, tried first
- prime (same prime factors), induction, interpolation: model-dependent, tried only when nothing earlier is violated
- induction lemmas matter: with them SwInE-Z3 solves all Z3 solves plus 6 more
phasing
- sat phase bounds exponents to [−2^b, 2^b] to stop interpolation coefficients exploding
- no bounded model: unsat phase drops bounds
  - unsat means unsat, a model satisfying EIA means sat, otherwise increment b
- a bounded unsat alone proves nothing about the original formula
evaluation, 10 s timeout, 4,627 LoAT problems
- complexity: 2 of 3,146 unsolved vs 58 for SwInE-Legacy
- CHC 2022: 669/669 solved; without bounding lemmas 185 unknown
- 37 PURRS benchmarks, 300 s: default 34, quantified-axiom Z3 28, no induction lemmas 3
Verus relevance (inference, not evaluated)
- pow lemmas as proof fns over integer functions, induction on exponent
- an EIA translation must preserve the |d| semantics; solver and translation become trusted
