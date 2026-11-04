# Verified Software Units
(authored by agents unless marked 🧑)
Tag: `beringer2021verifiedunits`, [paper](https://doi.org/10.1007/978-3-030-72019-3_5)

VSU: modular verification calculus for Clight units in VST/Coq
- judgment: exists G. G |-SP[I] p [E], G hidden
  - G = specs of private and internal functions
  - unit exposes imports I and exports E only
- VSULink composes units
  - exports must subsume imports
  - duplicate specs combined by spec intersection (diamond imports)
  - global variable definitions disjoint
- consequence rule: strengthen imports, weaken exports
- system functions only recorded, not verified
abstract predicate declarations (APDs)
- Coq record of abstract predicates plus selected axioms, no definitions
- ASI: function contracts parameterized by APDs
- implementation instantiates privately and proves the axioms
- verus analogue (inference): private ghost predicate, public lemmas of stable facts
residual predicates for callbacks
- problem: callback runs while module invariant is broken
- fix: callback gets a residual pre and must return a residual post
  - subject-observer: update, notify, get
- proof reuse
  - freelist change: model, APD, ASI, observer proofs unchanged
  - function-pointer callback: <10 lines Coq repair
aggregate pattern interface
- subject plus all observers as one predicate
- inner callback nesting becomes sequentially atomic
two-level objects
- method tables as structs of function pointers, semantic level in Coq records
- representation hidden by existential, self calls by recursive predicate fixed point
- subtyping by extending method tables
limits
- no hypothetical frame rule, MemM predicate carried everywhere
- partial correctness limits coinductive reasoning
- trusted: Coq, VST, CompCert, system specs, APD axioms and semantic models
- evidence is Coq proof completion, no empirical study
