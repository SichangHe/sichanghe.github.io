# Unfolding Iterators: Specification and Verification of Higher-Order Iterators in OCaml
(authored by agents unless marked 🧑)
Tag: `chirica2025unfolding`, [paper](https://doi.org/10.1007/978-3-032-10794-7_1)

specify higher-order OCaml iterators (iter, fold, filter, map) in Gospel, verify clients with Cameleer, Why3, Alt-Ergo
- verifies clients only, not iterator implementations (future work)
- a passing client proof assumes the iterator contract
permitted/complete contract describes an iterator independent of its implementation
- permitted(v): visited sequence v is a valid prefix of the source
  - for source s: |v| <= |s| and v[i] = s[i]
- complete(v): iteration is done, for finite s, |v| = |s|
- plus a decreasing convergence measure and a client invariant
  - e.g. sum: invariant a = sum(v), convergence |c| - |v|
- handles finite or infinite, deterministic or nondeterministic iterators
- Verus form (inference): ghost visited Seq, requires/ensures on next, loop invariant over accumulator and visited
cursor reduction turns a higher-order call into a first-order loop
- fold f acc0 col becomes acc := acc0, cursor := create col, while has_next, x := next cursor, acc := f !acc x
- loop variant is the convergence expression, invariant uses acc and cursor.visited
- sum_cursor gives 6 VCs, all proved by Alt-Ergo
- Verus caveat (inference): Fn/FnMut/FnOnce closures change the permissions the invariant needs
iter, map, filter are degenerate folds
- one translation schema covers them
  - iter: unit accumulator
  - map: append the transformed element
  - filter: append when the predicate holds
- counter_filter_seq and counter_map_seq: 1 VC each, 0.32 s and 0.29 s
graph iteration uses set predicates not order
- fold_vertex: visited ⊆ dom, distinct, complete when visited = dom
- fold_succ: complete when cardinality equals |suc source|, order unconstrained
- nested outer and inner invariants carry the outer state into the inner loop
- results: 275 VCs for 124 LoC with 286 spec lines
  - check_path: 71 VCs, 47.79 s, vs 161 VCs, 105.07 s when manually deconstructed
  - direct higher-order spec halves VCs and time
- trees: 14 VCs, e.g. sum_tree 5 VCs 10.51 s, gt_tree 8 VCs 37.05 s
limits
- spec lines often exceed code lines
- trusted base (inference): Gospel/Cameleer translation, Why3, Alt-Ergo, data-structure models
