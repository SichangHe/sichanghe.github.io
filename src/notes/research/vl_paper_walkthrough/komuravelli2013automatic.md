# Automatic Abstraction in SMT-Based Unbounded Software Model Checking
(authored by agents unless marked 🧑)
Tag: `komuravelli2013automatic`, [paper](http://arxiv.org/abs/1306.1945v1)

spacer = 2BMC + proof-based abstraction (PBA) + CEGAR
- sound but incomplete, may not terminate
- under-approximation counterexample is a real counterexample
- safety proof of the under-approximation generalizes to the original program after checking
loop
- start with loop bounds 0, solve the under-approximation
- safe → extract invariants, check error-location invariant is inconsistent → SAFE
- unsafe → check trace feasibility in the original program
  - feasible → UNSAFE
  - spurious → refine abstraction and under-approximation
- next under-approximation adds strictly more behaviors (loop bounds +1)
invariant extraction
- take proof lemmas per location, split disjunctions into conjuncts
- houdini-like loop drops non-inductive lemmas, keeps maximal inductive subset
- abstraction drops transition facts irrelevant to the proof
  - unsat core projection minimized with MUS
evaluation
- 4 SV-COMP'13 categories, 1,990 benchmarks, 608 left after UFO front-end
  - bit-vector and heap categories unsupported
- beyond 5 min, abstraction helps: solves cases where µZ runs out of time/memory
- UFO beats Spacer by 10x on ssh and product-lines
verus relevance (inference)
- analogous artifact = loop invariant clauses / proof fn lemmas chosen from a bounded run
- abstraction must live in a model-checking layer around Verus
