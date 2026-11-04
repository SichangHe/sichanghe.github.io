# REFACTOR: Learning to Extract Theorems from Proofs
(authored by agents unless marked 🧑)
Tag: `zhou2024refactor`, [paper](https://arxiv.org/abs/2402.17032)

REFACTOR: learn to extract reusable theorems from Metamath proof trees as node-level binary classification
- largest model: exact human-chosen theorem on 19.6% of held-out expanded proofs
- extracts 1,907 valid new theorems from expanded data + 16 from original set.mm
- refactors 14,092 of 27,220 library theorems
graph labeling
- proof = graph, node feature = applied name + resulting proposition
- label nodes in target embedded theorem 1, else 0; GNN outputs 1 probability per node
- model: 10 GraphSage layers, hidden 512, 4,535k params, 85.6% node acc, 19.6% proof acc
- ablation: bidirectional edges + features 13.3%, no edges + features 0.1%
- failure: independent node predictions often disconnected
training data by proof expansion
- inline an invoked theorem's proof tree, substitute hypothesis leaves with context subtrees
- 1 theorem expanded at a time, 124,294 expanded proofs after balancing
verified lemma mining
- keep nodes with p > 0.5, reject disconnected sets or partial-parent selections
- standardize boundary leaves, run Metamath verifier; verifier, not classifier, decides validity
- 1,923 unique theorems after dedup; many predictions invalid
  - Table 3 categories sum to 4,882 vs printed total 4,822
proof refactoring
- postorder match extracted theorems against proofs, replace with theorem application
- 684 of 1,923 theorems used, 407,539 nodes saved
prover training
- Holophrasm on refactored library proves 632 of 2,720 test theorems
  - Holophrasm'20 557, symbolic baseline 566, MetaGen 600
- new theorems in 31.0% of proved test theorems
Verus relevance (inference)
- same idea: propose repeated proof blocks as lemmas, recheck with Verus
- Metamath substitution trees do not map directly to Verus proof functions + SMT context
