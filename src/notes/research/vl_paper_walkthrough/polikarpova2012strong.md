# What Good Are Strong Specifications?
(authored by agents unless marked 🧑)
Tag: `polikarpova2012strong`, [paper](https://arxiv.org/abs/1208.3337) (arXiv:1208.3337v4, identifier from the paper text)

claim: model-based contracts (mbc) as executable test oracles find twice as many faults as standard partial contracts
- empirical study, not a soundness proof; same code tested with both contract sets
- example: EiffelBase `merge_right` bug found only by the strong postcondition (old prefix + other + old suffix) plus `modify sequence`
model-based abstract state
- specify via mathematical models (sequence, set, bag, map) independent of the concrete list implementation
- invariants: model constraints, attribute definitions, linking invariants, internal representation constraints
  - 46% of 164 invariant clauses are internal representation constraints, which leak implementation detail
- model correctness checked only by inspection and tests
- Verus: model as ghost value + representation predicate
complete postconditions and framing
- complete = pre-state determines one post-state, relative to the model
- frame lists only model queries, since other queries are defined from them
- Verus: untouched abstract fields `==` their `old` values in `ensures`; no `modify` keyword
disciplined invariants
- `depend` checks a clause only when the other object is closed; `open` allows temporary inconsistency in a routine
- only 4 `depend` and 7 `open` across 21 classes
executable specs for testing
- model queries are ordinary functions, `modify` rewritten to old-value postconditions
- 21 EiffelBase classes, 30 sessions x 80 min, ~87M tests
- C# DSA+ with Pex: 9 faults, developers did not confirm
results
- 103 real faults with strong vs 48 standard, 41 common, 62 strong-only, 7 standard-only
  - 62 is 56% of the 110 union, not of 103
  - developers confirmed 107 of 110 reported (97%)
- postconditions triggered 42% of violations vs 11%; invariants 33% in both
- runtime overhead small and insignificant in random testing, may grow on big structures
- cost: spec tokens 8,432 to 19,281 (2.29x), spec/code ratio 0.20 to 0.46; ~1 person-month, ~4 defects/person-day
limits
- harder outside data structures
- spec/code ratio is not a Verus proof-to-code ratio
