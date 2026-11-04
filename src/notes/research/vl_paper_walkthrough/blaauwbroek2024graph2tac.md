# Graph2Tac: Online Representation Learning of Formal Math Concepts
(authored by agents unless marked 🧑)
Tag: `blaauwbroek2024graph2tac`, [paper](https://arxiv.org/abs/2401.02949)

online theorem proving for coq, exploiting locality of new definitions and recent proofs
- shared mono-graph of definitions and proof states, equal terms hashed
  - hundreds of millions of nodes, so bounded subgraphs only
online k-NN
- retrieve tactics from the 1000 most recent proof states by hand-crafted features
graph2tac
- 8-hop GNN, graphs pruned to 1024 nodes
- two tasks: definition to embedding, proof state to tactic + arguments
- embeddings for unseen definitions computed in dependency order
results
- online beats offline with at least 10 new dependencies
- definition task lifts unseen-package pass rate 17.4% to 26.1%
- online k-NN 15.0% vs 25.8% in 10-minute benchmark
- graph2tac + k-NN solve 33.2% of test set
  - k-NN wins when new dependencies reach hundreds
  - comparison to prior systems informal, setups differ
- `skip_axiom : False` used on 38.4% of 500 theorems in one benchmark, kernel check needed
take for verus
- retrieve prior proof states and definitions from current project before proposing `proof fn`
- retrieval accelerates search, does not show validity
