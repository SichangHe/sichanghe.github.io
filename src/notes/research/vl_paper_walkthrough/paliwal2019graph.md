# Graph Representations for Higher-Order Logic and Theorem Proving
(authored by agents unless marked 🧑)
Tag: `paliwal2019graph`, [paper](https://arxiv.org/abs/1905.10006)

## task and evidence

This paper trains graph neural networks (GNNs) to guide higher-order theorem proving from human proofs. The abstract states: "This paper presents the first use of graph neural networks (GNNs) for higher-order proof search and demonstrates that GNNs can improve upon state-of-the-art results in this domain." (abstract, p.1) The system is evaluated end to end by inserting predictions into the HOList/HOL Light proof-search environment, rather than only comparing representation embeddings.

The training set contains 10,200 top-level theorems and around 375,000 proof steps; the held-out validation split contains 3,225 theorems. The theorem database has 19,262 theorems and definitions, and a goal's eligible premises are all preceding theorems and definitions (Section 5, p.5; also Section 4.2, p.4). The best model closes 49.95% of validation proofs with a 12-hop GNN using subexpression sharing (Table 1, p.5; Section 5.2, p.6). Inference: the percentage is over the 3,225 validation theorems (1,611 of 3,225 is 49.95%); the paper labels the column "% Proofs Closed (Validation Set)" and does not state the denominator explicitly.

## technique: graph representations of formulas

When to use it: use graph rather than sequence or one-way tree encodings when a logical subexpression's meaning depends on occurrences elsewhere in the formula.

How to apply it:

1. Parse each HOList S-expression into an abstract syntax tree (AST). Make nodes for applications, variables, lambdas, constants, and type constructors; label child edges with left/right positions so the original expression is recoverable (Section 3, pp.2–3).
2. Add parent and child directed edges. The baseline AST has both directions: "each node has edges to its children and also to its parent(s)" (Section 3, p.3). The paper describes the restricted variants this way: "Bottom up loosely resembles TreeRNNs, as it computes its embeddings only from the embeddings of its children. Top down, on the other hand, disallows nodes to see their children, but allows them to see their context." (Section 3, p.3). Inference: in message-passing terms, bottom up passes information from children to parents and top down from parents to children.
3. For subexpression sharing, merge every AST node representing a syntactically equal expression, including type expressions. Keep multiple parent edges to preserve each occurrence (Section 3, p.3; Fig. 1, p.3).
4. For leaf sharing, merge only equal leaves. For variable blinding, replace variable names by `x` after graph construction; distinct variable nodes remain distinct (Section 3, p.3).
5. Optionally add three labeled random outgoing edges per node to approximate an expander, then compare against the structured graph (Section 3, p.3).

The paper's Figure 1 gives a concrete result: sharing reduces the graph for `∀x : x = x` from 27 nodes to 15 (caption, p.3). Its ablation shows that subexpression sharing is substantially stronger than leaf sharing. At 12 hops, subexpression sharing closes 49.95%, versus 45.67% for AST (run with a smaller batch size because of memory constraints) and 30.51% for leaf sharing (Table 2, p.6).

Inference: A Verus proof-state graph could include expression AST nodes, types, binders, ownership facts, quantified triggers, and references to available lemmas. Sharing should be applied only when semantic identity is preserved; this is a proposed transfer, not a result of the paper.

## technique: bidirectional message-passing GNN

When to use it: use message passing when proof-state context must flow across long formula distances and the embedding should depend on both a subexpression and its surrounding occurrences.

How to apply it:

1. Represent the formula as labeled graph `G = (V,E,lV,lE)`. Each token in the vocabulary has a trainable feature vector (size 128); the edge label is a non-trainable binary value, 0 or 1, saying whether the edge goes to the first or the second child (Sections 4.1 and 5.3, pp.4 and 7).
2. Initialize node embeddings with an MLP over token features and edge embeddings with an MLP over edge labels (Section 4.1, p.4).
3. For each of `T` rounds, compute separate messages from parent and child neighbors using edge-aware MLPs. Sum each direction separately, concatenate the node's previous embedding with the two sums, pass the result through an MLP, and add the output to the previous embedding (Section 4.1, p.4).
4. Max-pool transformed node embeddings to obtain a fixed-size graph embedding. The implementation uses 128-dimensional node states and two 1x1 convolutions that expand to 512 and then 1,024 immediately before max pooling (Sections 4.2 and 5.3, pp.4 and 7).
5. Train with dropout (0.5 in the GNN MLPs) and evaluate different hop counts and directional restrictions. The paper uses 0, 2, 4, 8, and 12 hops (Table 2, p.6; Section 5.3, p.7).

The authors report: "While allowing information to flow in both directions results in the best performance, Table 2 shows that top down message passing significantly outperforms bottom up." (Section 5.2, p.6) At 12 hops, top-down sharing closes 48.40% and bottom-up sharing 40.99% (Table 2, p.6). The authors read this as showing that "the context of all the places a subexpression occurs in the larger formula may be more important than the value of the subexpression itself" (Section 5.2, p.6).

Inference: For Verus, a learned encoder could rank candidate proof lemmas or suggest invariant facts from a structured proof state. It should never be treated as a verifier; Verus must still check the resulting proof. This is an inference.

## technique: joint tactic and premise prediction

When to use it: use joint prediction when a proof step needs both a tactic choice and arguments such as lemmas or rewrite rules.

How to apply it:

1. Encode the current goal with GNN-1 and each eligible premise with GNN-2 (Section 4.2, p.4).
2. Predict a tactic from a fixed set of 41 tactics using a softmax classifier over the goal embedding (Section 4.2, p.4).
3. Score each goal/premise pair with a combiner that concatenates goal and premise embeddings and their element-wise multiplication, followed by three fully connected layers and a sigmoid cross-entropy score (Section 4.2, p.4).
4. During search, select the top `k1 = 5` tactics and top `k2 = 20` premises for each tactic application. The database has 19,262 eligible theorems and definitions (Section 4.2, p.4).
5. Apply each candidate in breadth-first proof search. Failed applications are logged and ignored; a goal is closed if each of its subgoals is closed, and search stops when at least one alternative branch closes the top-level goal (Section 4.2, p.4).

Training examples use each human proof step's goal, tactic, and tactic-parameter list. Each batch samples 16 positive goal/premise pairs; each goal is paired with 15 negatives sampled uniformly from theorems used at least once as positive examples, and all 256 embedded premises are reused as negatives for the other goals, giving a batch of 4,096 (Section 5.3, pp.6–7). The total loss weights tactic cross-entropy 1.0, pairwise-scorer cross-entropy 0.2, and AUCROC loss 4.0 (Section 5.3, p.7).

During training, the proxy tactic metric counts a tactic correct only when it exactly matches the single human tactic, even though alternatives may work; running the prover on the validation set is too slow to use during training, so it is applied only to the best checkpoint and is the primary metric (Section 5.1, pp.5–6).

## evidence, limitations, and trust

The best 12-hop shared-subexpression model closes 49.95% of validation proofs, compared with 32.65% for the prior WaveNet baseline, 37.98% for bag-of-words max pooling, and 38.9% for the prior reinforcement-learning result (Table 1, p.5; Section 5.2, p.6). The paper also reports, for the subexpression-sharing models, the percentage of successful tactic applications rising from 33.8% at 0 hops to 38.6% at 12 hops, and slightly longer proofs on average, 1.93 steps for 12 hops versus 1.86 for 0 hops (Section 5.2, p.6).

Variable blinding sharply reduces performance: at 12 hops, shared subexpression with blinding closes 37.36%, versus 49.95% without (Table 2, p.6). The paper says random edges improve the 2-hop network "but not for networks with four or more hops", and that the benefits "ultimately are harmful for networks with more hops" (Section 5.2, p.6). The authors identify a major omission: "In the experiments presented in this paper, we predict tactics and their arguments by looking only at the conclusion of the current sub-goal and ignoring any local assumptions that could be crucial to the proof." (Section 6, p.7)

Inference: the trusted components include the HOL Light kernel and tactics, the HOList proof-search implementation, graph construction, trained parameters, and the human-proof data. The paper trains on human proofs ("We focus on imitation learning, i.e. learning from human proofs", Section 1, p.1) and does not claim that the GNN discovers new mathematical facts independently.

Threat to agent-written verified Rust: Inference: low to medium for soundness, high for productivity. The GNN can suggest useful lemmas or proof contexts but cannot weaken Verus's checker; however, distribution shift, missing local assumptions, and human-proof imitation may reduce usefulness on novel Rust APIs.

## techniques for the catalog

- shared logical graphs — encode ASTs with parent/child edges and merge equal subexpressions, including type expressions
- bidirectional message passing — aggregate parent and child context over multiple hops before graph pooling
- tactic and premise ranking — jointly predict a proof tactic and rank its eligible lemma arguments during search
- proof-search integration — evaluate learned predictions by running the prover and counting closed validation theorems
- representation ablation — compare AST, leaf sharing, variable blinding, random edges, and directional graphs to identify useful context
