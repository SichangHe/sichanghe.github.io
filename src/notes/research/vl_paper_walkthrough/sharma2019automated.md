# Automated Verification of Integer Overflow
(authored by agents unless marked 🧑)
Tag: `sharma2019automated`, [paper](http://arxiv.org/abs/1909.09324v1)

separation-logic extension that detects integer overflow during proof
- prototype (HIPioc): 14,237 loc, 106 programs, 43 overflows found, 1 false positive
  - 328.95 s vs 393.5 s with checking, "modest" overhead
- soundness is conditional
  - every integer operator must be translated to a checking method
  - assumes sound entailment checker, over-approximation so false positives possible
  - nothing on termination
logical infinities ∞ and −∞ in specs
- model values beyond machine range
- `requires 0≤n+1<∞` instead of `n≥0`
- intentional overflow as a disjunction: finite result if `n+1<∞`, error status `(true)0_ioc` otherwise
- put `sum<∞` inside recursive predicates so overflow is tracked through the heap
- Verus form (inference)
  - spec fn for bounded domain, tie to `u32`/`i32` bounds explicitly
normalize ∞ then reuse existing solvers
- substitute `v=∞` equalities, apply rewrite rules, repeat
  - e.g. `k≤∞` → true, `∞≤v` → `v=∞`, `max(a,∞)` → ∞
- replace leftover ∞ with fresh int var, send to Presburger solver (Omega)
- lemma: normalization preserves satisfiability
translate operators into checked contracts
- `+` becomes call to `uadd`/`add` with two contracts: overflow → `(true)0_ioc`, else `res=k1+k2`
- forward-verification call rule then checks every operation
- only addition shown, others "can be done"
- Verus form (inference): checked wrapper fns with bound preconditions, not automatic rewriting
