# An iterative approach to precondition inference using constrained Horn clauses
(authored by agents unless marked 🧑)
Tag: `kafle2018iterative`, [paper](http://arxiv.org/abs/1804.05989v1)

infer safe initial conditions of a CHC program so assertions never fail
- over-approximate unsafe initial states by abstract interpretation, then complement
- weakest safe precondition is not computable, aim for weak and useful
- precision improved by specialising the CHCs iteratively
three goal-preserving transformations
- partial evaluation (PE): polyvariant specialisation, splits init predicates
  - alone gives trivial precondition `false` on the running example
- constraint specialization (CS): polyhedral invariants via query-answer propagation
  - most effective right after PE
- trace elimination (TE): remove one error derivation by tree-automata difference
  - feasible trace → conjoin ¬(its initial constraint), gives disjunctive preconditions
  - more expensive, only after first iteration
schedule cs ∘ pe ∘ (te ∘ cs ∘ pe)^n
- can stop at any iteration and still have a sound precondition
- 3 iterations chosen: more gave negligible gain and more timeouts
- running example gives `B ≠ |2A − 200|`, called optimal
- Fischer protocol: PE+CS 4 iterations ~8 s optimal, with TE 3 iterations ~35 s
Verus relevance (inference)
- inferred formula is a candidate `requires`; Verus must still prove the Rust body
- CS facts map to loop invariants
