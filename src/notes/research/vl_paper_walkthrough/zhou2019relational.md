# Relational Verification via Invariant-Guided Synchronization
(authored by agents unless marked 🧑)
Tag: `zhou2019relational`, [paper](https://doi.org/10.4204/EPTCS.296.6)

pequod: relational verification (equivalence of 2 programs) for JVM bytecode, EPTCS 296 pp. 28-41
- problem: syntax-first product construction picks bad synchronization points, so needed invariants are complex or inexpressible
- idea: search synchronization points and relational invariants together
- scope: first-order recursive programs only, no loops (sec 6)
bounded product programs
- unroll each recursive procedure at most n times, further calls become ⊥
- proof rules COMM (which program steps first) and PART (split sequences = pick sync points) enumerate all proof paths
- encode all paths with 1 fresh relational predicate per point into 1 CHC system
  - solved by Z3 DUALITY
invariant-guided synchronization (Syn)
- find 1 bounded proof path that generalizes to the unbounded program, discard others
- generalize via ASSUME rule: hypothesis pre implied by goal pre, hypothesis post implies goal post
- no generalizable path: increase n and repeat
evidence
- all but 4 benchmarks verified (4 time out at 300s: sumMono, multMono, multComm, mult0plus)
  - benchmarks: automatic induction work, Software Foundations, LeetCode
  - intro says 33 benchmarks, Fig 6 lists 30, unresolved
- baselines: automatic induction fails 15 more, VeriMapRel 8 more, self-composition solves only addDigits
  - VeriMapRel needed manual transformation, otherwise solves 2
- trust: no certificate for CHC solution, soundness rests on proof rules + solver
Verus relevance (inference, untried)
- relational invariant = predicate over 2 ghost states
- CHC solver stays outside Verus, so replay emitted invariants as lemmas
