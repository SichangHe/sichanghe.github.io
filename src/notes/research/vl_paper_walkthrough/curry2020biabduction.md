# Bi-Abduction for Shapes with Ordered Data
(authored by agents unless marked 🧑)
Tag: `curry2020biabduction`, [paper](http://arxiv.org/abs/2006.10439v1)

one-stage bi-abduction for separation logic with shape + ordering
- solve `A * ?M ⊢ C * ?F`: infer anti-frame ?M (missing precondition) and frame ?F (untouched state)
- supports linked lists, sorted lists, binary trees, BSTs
  - prototype built on Cyclist
- ordering inequalities inferred during matching, no separate arithmetic phase
  - rules `INF-SLS`, `INF-STREE`
spec inference loop: next operation -> entailment -> 3-phase search
- normalize to precise symbolic heap
  - split inductive predicates, add non-null and non-aliasing facts, check pure part with SMT
- unfold-and-match subtraction
  - unfold, subtract identical/overlapping segments, `GENERALIZE` forgets ordering (may weaken postconditions)
- inference when stuck: add missing predicate to ?M, move extra to ?F
- call: use callee precondition as consequent, compose frame with callee post
- branches: collect anti-frames, propagate back
evidence
- soundness + termination only proof sketches
- 313 entailments (counts in paper inconsistent) plus 14 tree ones
  - 30 s timeout, 54 timeouts, 20 in proof construction, 34 in validation
  - sorted-list: 16-570 ms
- limits: simplistic numerics, brittle predicate-specific rules, smallfoot vc37 unsupported
takeaways for verus (inference)
- ?M -> candidate `requires`, ?F -> preserved ghost facts in `ensures`
- tool only proposes, Verus must check each candidate
- verus has no native separating conjunction
