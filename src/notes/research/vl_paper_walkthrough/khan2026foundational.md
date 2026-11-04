# Foundational Constraint Solving for Expressive Refinement Typing
(authored by agents unless marked 🧑)
Tag: `khan2026foundational`, [paper](https://doi.org/10.48550/arxiv.2607.12226)

flex: constrained horn clause (chc) solver in lean whose solver steps emit kernel-checked proof terms
- trusted base is the lean kernel alone, not the smt backend
  - compiler plugins, specs, trusted wrappers (e.g. slice abstraction) stay outside the theorem
- refinements are lean terms, so specs beyond smt fragments work (quantifiers, recursion, bit-vectors)
- one solver serves multiple frontends
  - imperative floyd-hoare vc generator, refinement-typed lambda calculus, flux backend for rust
- unknown loop invariants/refinements are horn variables κ, existentially solved
solver
- zap eliminates acyclic horn variables via strongest solutions, with a certified rewrite
  - Zap-Equivalence and Zap-Soundness theorems
  - 369 constraints all reduced, max 62 ms; grind reduces 67% (18x more heartbeats), aesop 90% (22x slower)
- fix handles cyclic variables by predicate abstraction over qualifier templates
  - returns strongest solution expressible as conjunctions from the qualifiers, relative to oracle completeness
  - needs hand-supplied qualifiers
- imp frontend: each `while` gets a horn variable with entry, body, exit obligations
evidence
- 880 constraints, 843 success (95.7%); cyclic 135/164 (82.3%)
  - 37 failures include 21 recursion depth, 4 heartbeat, 4 missing qualifier, 8 concrete goals
- flex 21.8 min total vs 31 s for liquid fixpoint smt backend
- 5 case studies: 1,250 flux lines, 52 chcs, 416 spec lines, 2,784 proof lines
  - ring buffer invariant (all valid indices initialized) is quantified, inexpressible in prior smt-restricted flux
  - complex invariants (merge, quicksort_range) still hand-written
verus takeaway (inference)
- no existential chc variables in verus; invariants stay manual: `spec fn` + `invariant`, same entry/body/exit obligations
- qualifier instantiate-and-prune is a candidate invariant generator that would run outside verus
- guarantee is conditional on spec matching the requirement
