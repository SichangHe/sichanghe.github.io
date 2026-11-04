# Proof-Pattern Recognition and Lemma Discovery in ACL2
(authored by agents unless marked 🧑)
Tag: `heras2013proof`, [paper](https://arxiv.org/abs/1308.1780)

ACL2(ml): cluster theorem shapes statistically, then synthesize helper lemmas symbolically
- target: ACL2 rewriting fails until the user supplies an intermediate lemma
- examples: recursive vs tail-recursive fact, power, fib; JVM bytecode correctness
- loop: retrieve similar proved goals, mutate their lemmas toward the goal, reject by counterexample, then prove
- no soundness claim for the ML ranking, ACL2 still proves lemmas
fixed-size term-tree features
- node placed in an arity x depth matrix, 49 features, ~20% density
- shape only, so unrelated theorems collide (revrev vs int-x-x)
  - paper's 7x7 vs 5x7 dimension arithmetic is inconsistent
recurrent definition clustering
- symbol value from the cluster of its definition, recomputed as the library grows
- K-means, EM, Farthest-First, granularity 1-5, 200 runs
- fib-fib-tail cluster contains fact-fact-tail and power-power-tail in most settings
  - 150 JVM lemmas, then 996 theorems
analogy mapping + three-level mutation
- map non-shared symbols within a cluster, keep shared ones
- reconstruct tree, expand nodes (depth ≤ 2 terms), expand top level
- counterexample-test every candidate equation
- vs QuickSpec: analogy returns one relevant lemma, QuickSpec floods or runs out of memory
- limits
  - cannot find smaller lemmas, extra side conditions, or new concepts (`subp`)
staged correctness decomposition
- spec + algorithm, program implements algorithm, total correctness of bytecode
Verus transfer (inference)
- advisory retrieval over spec ASTs, version the learned mapping
- emit candidate `proof fn`, test executably before Verus
- ACL2's untyped argument dropping does not carry over
