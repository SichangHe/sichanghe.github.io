# Synthesizing Proofs Using Proof Sharding and Exploration
(authored by agents unless marked 🧑)
Tag: `ghahani2026synthesizing`, [paper](https://arxiv.org/abs/2609.28535v1)

proofsax: Dafny extension automating last proof-debugging steps
- insight: hard residue is a few annotations (triggers, lemma calls, reveals, case splits), not the invariant
- divide and conquer: shard lemma, query prover per shard, iterate only on failing shards
- target Dafny/Z3; Verus adaptations below are inference
- eval: 86/103 single-hole tasks, 32/42 multi-hole (only where single-hole solvable)
  - from scratch only 8/49
  - mostly distributed protocols; no Rust/Verus
  - output is ordinary Dafny, checked by unmodified Dafny, TCB unchanged
sharding
- split disjunctive preconditions into per-case lemmas
- split conjunctive postconditions: later shards assume earlier conjuncts
- keep old proof via if (!C) { original } wrapper, proving C by contradiction
- ineffective when missing annotation spans several shards
- Verus: separate proof fns, if/match case split, check wrapper form
bounded expression synthesis
- enumerate typed expressions by complexity budget, grow budget until proof passes
- syntactic form restricts search to terms that affect triggers or signatures
trigger synthesis
- generate E-matching terms for quantifier patterns
- try singles and pairs, in batches of 64 via covering design
  - batch 64 empirical on one 1,024-trigger workload
  - never tries 3+ triggers
transformer usefulness (counts overlap, no denominator)
- helper-lemma invocation 42, most useful
  - call existing acyclic lemmas with synthesized arguments
  - never invents lemma signatures
- reveal opaque definitions 38
  - harmful if unrelated, so each candidate checked
- trigger 9, sharding 6, quantifier elimination 5
  - quantifier elimination introduces variable from existential pre / universal post
failure causes
- 7 of 10 multi-hole failures needed two helper invocations, deliberately unsupported
- unsupported: templates, set comprehensions
scaling
- recursive transformation, gRPC backend across prover instances
- ring-election search: >6h on 1 node, <25min on 10 nodes
- evaluation removes annotations from published proofs, so measures recovery of known steps
