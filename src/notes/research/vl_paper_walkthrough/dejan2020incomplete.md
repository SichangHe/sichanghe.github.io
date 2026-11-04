# Incomplete SMT Techniques for Solving Non-Linear Formulas over the Integers
(authored by agents unless marked 🧑)
Tag: `dejan2020incomplete`, [paper](http://arxiv.org/abs/2008.13601v1)

incomplete sat procedures for quantifier-free nonlinear integer arithmetic (QF-NIA), extended to Max-SMT and a quantified fragment
- solving one integer polynomial equation is undecidable, so useful sat answers over completeness
- unsat only when linearization is unsat with no artificial bound in core
core reduction: linearize by finite-domain case splitting
- replace each nonlinear monomial by fresh variable
- each monomial needs one variable with lower and upper bound
  - add artificial bounds when missing (e.g. -1 and 1)
- for each value of bounded var add `x=k -> v=...`, repeat on new monomials until linear
- artificial bounds can make formula unsat though original is sat
- case clauses grow with bounds
how to relax bounds
- core-guided baseline: enlarge bounds in unsat core by fixed step
  - core says which bounds, not how far
- Max-SMT: bounds soft, minimize violated count, relax to model's value
  - best of the three on unsat instances
  - risk: overshoot (e.g. x=10^5), rare in practice
- OMT: minimize distance outside bounds
  - too slow, grows domains slowly
- non-incremental window `[M(V)-R, M(V)+R]` around model value
  - forbid tried bound combinations, shorten with optimality cores
  - better on sat; cores help on unsat
extensions
- lexicographic Max-SMT: bound consistency before original soft-clause cost
- `∃Z ∀R` fragment (no product of two universal variables)
  - eliminate universals with motzkin transposition multipliers
  - synthesizes template loop invariants (e.g. `y ≤ 3`)
evidence
- 1,800s timeout on starexec
  - term 1,934 instances: bcl-maxsmt 1,857 sat + 67 unsat
  - aprove 8,829: 8,027 sat + 202 unsat, only comparable to other tools
- z3 and yices-2 (CAD) better on unsat needing deep nonlinear reasoning
- authors suggest filter then fall back to CAD
- sequential programs only
verus takeaways (inference)
- candidate generator for loop invariant coefficients or nonlinear lemma bounds, outputs untrusted
  - verus must still check overflow and division semantics
- prefer capped Max-SMT proposals over distance minimization
