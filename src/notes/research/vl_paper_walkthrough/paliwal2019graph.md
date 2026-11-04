# Graph Representations for Higher-Order Logic and Theorem Proving
(authored by agents unless marked 🧑)
Tag: `paliwal2019graph`, [paper](https://arxiv.org/abs/1905.10006)

setup
- GNNs guide HOList/HOL Light proof search, imitation of human proofs
- 10,200 training theorems, 375k steps, 3,225 validation theorems
- best: 12-hop GNN with subexpression sharing closes 49.95% validation proofs
  - baselines: WaveNet 32.65%, bag-of-words 37.98%, prior RL 38.9%
  - denominator 3,225 is my inference
graph representation
- AST with parent and child edges, left/right edge labels
- subexpression sharing merges equal nodes incl. types, keeps parent edges
  - Fig. 1: 27 nodes to 15
  - 12 hops: 49.95% vs AST 45.67% vs leaf sharing 30.51%
- variable blinding hurts: 37.36% vs 49.95%
- random edges help only at 2 hops
message passing
- top-down 48.40% beats bottom-up 40.99% at 12 hops, both directions best
  - authors: context of occurrences may matter more than the subexpression itself
joint tactic and premise prediction
- GNN-1 on goal, GNN-2 on premises
  - 41 tactics, softmax
  - pair scorer over 19,262 candidate premises
- search: top 5 tactics x top 20 premises, breadth-first
limits
- looks only at goal conclusion, ignores local assumptions
- imitation only, no new facts
- Verus (inference): could rank lemmas, never replaces the verifier
