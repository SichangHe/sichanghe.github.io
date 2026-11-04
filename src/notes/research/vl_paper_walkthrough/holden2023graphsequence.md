# Graph Sequence Learning for Premise Selection
(authored by agents unless marked 🧑)
Tag: `holden2023graphsequence`, [paper](http://arxiv.org/abs/2303.15642v1)

premise selection as sequence generation
- encode problem as a graph, pool GNN embedding, LSTM emits ordered proof-axiom sequence
  - trained with teacher forcing on axioms used in proofs, log p(S|I)
  - treats axioms as a collective, unlike independent binary classification
- DeepMath: 32,524 first-order problems, 6,000-axiom vocabulary
  - most problems contain out-of-vocab axioms (0.80-0.85 of each split)
  - rare-axiom scan adds positively-seen but rare axioms
graph encoding
- formula to DAG with 17 node types, invariant to symbol renaming
- supervised pre-training (is axiom in proof) beats unsupervised Siamese Laplacian-spectrum
  - validation Jaccard 0.23 vs 0.19, coverage 0.32 vs 0.27
ablations
- stable axiom order is essential
  - length or frequency order: Jaccard 0.24; random order: 0.15
- attention barely helps (0.24 vs 0.24 Jaccard)
- greedy decoding best, coverage matters most
  - greedy n=4: coverage 0.64, set size 24.25
  - top-32: 0.58, size 37.86
result
- online with iProver, 10 s limit, merged DeepMath and Mizar404
  - captioning + SInE (3,0) solves 17.7% more than no selection
  - captioning gives specific premises, SInE gives broad coverage
- offline Jaccard/coverage are not proof success
- does not evaluate Rust or Verus
verus takeaways (inference)
- train lemma retrieval on successful proof traces, advisory only
  - verifier still checks the full proof
- fix a stable global lemma order
- tune for recall of required lemmas, track candidate count separately
