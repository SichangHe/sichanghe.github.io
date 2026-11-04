# OSVAuto: automatic proofs about functional specifications in OS verification
(authored by agents unless marked 🧑)
Tag: `wu2024osvauto`, [paper](http://arxiv.org/ps/2403.13457v2)

push-button smt proofs of functional-spec obligations in os verification
- scope
  - invariant preservation and refinement between functional abstraction levels
  - excludes memory, aliasing, concurrent separation logic
  - sound but incomplete: instantiation is heuristic, failure does not mean spec is false
- pipeline: normalize, instantiate quantifiers, encode, z3
- normalization to generalized atomic terms
  - expand definitions, struct updates, switch to ite, let, equality
  - prenex and skolemize, reduce non-basic seq/map ops keeping conditions as ite
  - preserves satisfiability
  - no recursive enums or functions
- graph-based quantifier instantiation
  - nodes = bound vars and seq/map terms, weighted edges for index offsets, pattern edges for general indexing
  - seed indices from free indexed terms, propagate while carrying conditions
  - prune by smt consistency check, cap term generation at k=2
  - omits inequality-derived, -1, and length seeds because they cause loops
- encoding
  - indexed names become uninterpreted functions, no datatype axioms
  - needs non-recursive datatypes with primitive leaves
case study
- µC/OS-II apis, 58 goals, 901 spec lines, 218.7s total, all automatic
- only user input: goals plus specs, aux definitions, invariants
limits
- verus adaptation (instance selection over seq/map with index bounds) is inference
- timings do not predict verus throughput
