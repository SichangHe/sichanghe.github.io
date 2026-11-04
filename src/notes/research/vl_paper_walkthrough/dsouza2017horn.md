# Horn-ICE Learning for Synthesizing Invariants and Contracts
(authored by agents unless marked 🧑)
Tag: `dsouza2017horn`, [paper](http://arxiv.org/abs/1712.09418v1)

horn-ice = learner-teacher loop for invariants, procedure contracts, rely/guarantee annotations
- teacher inserts predicates into VCs, runs Boogie, returns positive, negative, or Horn counterexamples
- learner is black-box, sees only configurations and constraints
- teacher prefers positive/negative samples, Horn only if neither is possible
horn counterexamples
- plain ICE samples are insufficient with calls or concurrency
- failed inductive step is a pair of configurations: if I(c) then I(c')
- clauses like `d1 ∧ d2 → d`, positive is `true → d`, negative is `e → false`
- needed when several unknown annotations jointly imply another (pre, post, guarantees)
decision-tree learner
- nodes are base predicates, true leaves give a disjunction of path conjunctions
- label pure leaves, split others, Horn-Solve checks consistency
- O(h·n³) for separable points and satisfiable constraints
  - n data points, h Horn constraints
- inseparable points get iff constraints
Horn-Solve
- pebbling algorithm (Dowling-Gallier), O(h·n²)
- returns forced-true and forced-false points
heuristics
- breadth-first node selection builds all invariants' subtrees together
- information gain penalized by Horn clauses cut
- no ablation reported, benefit is a claim
infinite predicate sets
- grow a finite subset of an enumerable universe, converges if the invariant is expressible
evidence
- concurrent (Owicki-Gries, rely-guarantee) and recursive programs encoded by hand into Boogie
- most finish within 10 s, one over 50 s, peterson-OG 65 s with 277 Horn counterexamples
- base predicates limited to Boolean vars and `x ± y ≤ c`
- Peterson needed a manual encoding trick
Verus transfer (inference)
- candidates as spec fn in loop invariant or contracts, Verus plays the teacher
- Verus does not expose Horn samples, adapter must keep multi-premise dependencies
