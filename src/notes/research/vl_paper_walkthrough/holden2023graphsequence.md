# Graph Sequence Learning for Premise Selection
(authored by agents unless marked 🧑)
Tag: `holden2023graphsequence`, [paper](http://arxiv.org/abs/2303.15642v1)

## scope and result
This paper selects a small set of axioms before automated theorem proving. Its abstract states, “Premise selection is crucial for large theory reasoning as the sheer size of the problems quickly leads to resource starvation.” The method combines a graph neural network (GNN) embedding of a first-order problem with an LSTM that generates an ordered sequence of proof axioms. In online evaluation with iProver, combining axiom captioning with SInE (3, 0) solved 17.7% more problems than the baseline with no premise selection.

## technique: turn proof premises into a sequence-generation task
Represent each training item as a problem I and a proof axiom sequence S. Extract the axioms used in the proof, impose a consistent order, and train an RNN to maximize `log p(S|I)`. The paper frames premise selection as “maximising the probability of producing the sequence of axioms used in the proof of a given problem.” The implementation uses LSTM cells. Add start and end tokens, replace rare axioms with an out-of-vocabulary token, and train with teacher forcing so the next ground-truth token is fed at each step. The paper says teacher forcing “prevents the model from being unable to recover from poor predictions.”

At inference, generate a sequence from the problem embedding and use the selected axiom set to construct a smaller prover input. The sequence order is a modeling device; the ATP still reasons over the selected set. The authors argue that axioms should be treated as a collective entity because binary classification considers them independent (Section 2); Inference: this matters when proofs use a small collective subset and independent binary scores would miss interactions among premises.

Inference: A Verus implementation can train on successful proof traces, generate candidate lemma names or contract IDs, and pass only those candidates to a proof-repair agent. The generated list is advisory. A checked proof must include every needed fact and satisfy Verus's actual contracts.

## technique: encode the problem as a graph
Parse each first-order formula into a directed acyclic graph. Nodes represent element types such as function symbols and constants; edges represent relationships such as an argument supplied to a function. Build one global graph for the conjecture and axioms. The paper says this representation is “invariant to symbol renaming and encoding problems with previously unseen symbols.” It uses 17 node types.

Initialize an embedding vector for each node type. Apply graph-convolution message passing so each node incorporates neighboring structure, then pool node embeddings into a fixed-size problem vector. The authors test pooling all nodes, only axiom nodes, or only the conjecture node. The resulting vector is the LSTM's problem input.

Inference: For Rust verification, construct a graph whose nodes are function calls, contract predicates, data types, and lemmas, with edges for call, data-flow, and predicate dependency. This graph encoding is an adaptation, not a result in the paper. It can be invariant to identifier renaming if names are normalized, but it must retain type and ownership information needed for Verus applicability.

## technique: pre-train embeddings with supervised or unsupervised signals
For supervised pre-training, train the GNN at the axiom-node level as a binary premise-selection classifier. The node embedding learns whether an axiom occurs in a proof, and the pooled embeddings, computed before the captioning model is trained, serve as its problem input. For unsupervised pre-training, train a Siamese GNN on pairs of graphs. Pool each graph, and make the vector norm between the two graph embeddings approximate a synthetic graph similarity target: the Laplacian spectrum distance. The unsupervised GNN was trained on 12000 graph pairs. The paper defines the graph Laplacian as `L = D − A` and the distance as the square root of the summed squared differences between the paired eigenvalues of the two graphs' Laplacians, up to the smaller graph's size. The paper notes the metric considers neither node types nor edge directions.

The dataset is DeepMath: 32,524 first-order problems. Limiting sequences to 20 axioms leaves 30,805 problems: 22,179 train, 2,465 validation, and 6,161 test. The vocabulary is the 6,000 most common training axioms. Table 2 reports OOV-containing problems as 0.80 train, 0.85 validation, and 0.85 test; these are fractions of each partition, not percentages of the original 32,524.

Supervised problem pooling gives validation Jaccard 0.23 and coverage 0.32; unsupervised problem pooling gives 0.19 and 0.27 (Table 4). Jaccard is intersection over union of predicted and true axiom sets; coverage is the intersection divided by the true set size. The authors therefore use supervised problem embeddings for later experiments.

Inference: A Verus corpus can pre-train retrieval on whether a lemma appears in a successful proof, then optionally use unsupervised graph similarity for cold-start projects. The OOV fractions show that a fixed vocabulary drops many rare facts; production retrieval needs a rare-item path.

## technique: preserve a consistent axiom order
Although the prover treats axioms as a set, an RNN needs a sequence. The authors compare original, shortest-string first, frequency, per-sequence random, and global-random orders. Length and frequency reach validation Jaccard 0.24 and coverage 0.33; random order falls to 0.15 and 0.16 (Table 5). The paper infers that “a consistent relative position across sequences is essential.”

Inference: Sort Verus lemma candidates by a stable project-wide rule, such as dependency depth or learned frequency, and keep that rule fixed during training and evaluation. Per-request random order can make sequence learning fail even when the candidate set is unchanged.

## technique: attention and decoding choices
Attention computes a context vector as a weighted sum of embedding elements, with softmax weights from an alignment score. The authors test Bahdanau, Luong concatenation, and Luong dot attention. Luong dot has validation Jaccard 0.24 and coverage 0.34, only a small difference from no attention at 0.24 and 0.33 (Table 6).

For decoding, greedy selects the highest-probability axioms, Top-K samples from the top K, and temperature rescales logits. At each step the method adds n sampled axioms to the selected set but feeds only the top axiom back into the model. Greedy with n=4 reaches coverage 0.64 and selected-set size 24.25; Top-32 reaches 0.58 coverage and size 37.86; temperature 0.5 reaches 0.50 coverage and size 17.15 (Table 7). The paper reports that greedy sampling is superior and that “achieving a high coverage score is crucial for solving the problems in this dataset.”

Inference: In Verus retrieval, prefer deterministic top-ranked candidates when solver context is scarce, but tune for recall of required lemmas rather than text similarity. Keep the selected-set size and proof success as separate measures.

## technique: combine a specific neural selector with a broad symbolic filter
Rare positive axioms outside the 6,000-token vocabulary can be essential. The paper's “rare-axiom” procedure scans a problem and selects “any axioms that have previously appeared positively but rarely.” In the online experiment the captioning model is trained on the 6K most common positive axioms in the benchmark. The online comparison includes axiom captioning, SInE, no selection, and related neural methods. DeepMath alone is too easy for iProver, which solves 86% without selection, so the authors merge it with Mizar404, reducing the no-selection rate to 52%. iProver runs with a default heuristic and a 10-second limit. Nine premise-selection configurations are compared.

Axiom captioning chooses specific likely premises; SInE (3, 0) selects many premises and gives broad coverage. The paper says their combination gives “axiom selection with sufficiently large coverage scores while maintaining a computationally feasible size,” solving 17.7% more problems than no premise selection. SInE (1, 1) combined with captioning is only slightly better than captioning alone, and captioning alone is behind SInE (3, 0). Binary Graph complements captioning on half of its solved problems but tends to select large, low-coverage sets.

Inference: Combine learned Verus lemma retrieval with a conservative dependency or API filter. Measure proof success under a fixed verifier timeout and report recall, candidate count, and solved-item denominator separately.

## what is measured and trusted
The reported 17.7% is an online solved-problem increase over the no-selection baseline on the merged DeepMath/Mizar404 evaluation with a 10-second iProver limit. Offline Jaccard and coverage are set metrics, not proof correctness. Training uses proof-derived labels and a 6,000-axiom vocabulary; rare axioms are handled by a separate scan. The GNN, LSTM, training data, ordering, decoder, SInE, iProver, and timeout are trusted experimental components. The method does not prove that a selected set contains a proof, and the paper does not evaluate Rust or Verus.

## Verus form
Inference: Store lemma signatures and their `requires`/`ensures` predicates as retrieval records. Build a dependency graph from verified proof traces, generate a candidate list, and insert selected lemma calls into a `proof fn`. Use `assert` to expose required equalities and loop `invariant` declarations where the selected lemmas support iteration. Run Verus on the full source. Retrieval scores never replace proof obligations, and an omitted lemma is a search failure rather than a correctness result.

## techniques for the catalog
- sequence premise prediction: train an LSTM to emit an ordered proof-axiom sequence conditioned on a problem
- graph problem embedding: encode formula structure as a global graph and pool GNN message-passing representations
- supervised and unsupervised pre-training: learn premise relevance or graph similarity before sequence generation
- stable axiom ordering: use length or frequency order and avoid per-sequence random positions
- attention and deterministic decoding: compare alignment mechanisms and use greedy top-probability selection for coverage
- rare-axiom inclusion: add essential positive axioms outside the learned vocabulary through a separate scan
- neural plus symbolic filtering: combine specific graph-sequence selection with broad SInE filtering before ATP search
