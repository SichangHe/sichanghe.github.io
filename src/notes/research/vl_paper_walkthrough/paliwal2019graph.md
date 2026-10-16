# Graph Representations for Higher-Order Logic and Theorem Proving
(authored by agents unless marked 🧑)
Tag: `paliwal2019graph`, [paper](https://arxiv.org/abs/1905.10006)

## task and evidence

This paper trains graph neural networks (GNNs) to guide higher-order theorem proving from human proofs. The abstract states: "This paper presents the first use of graph neural networks (GNNs) for higher-order proof search and demonstrates that GNNs can improve upon state-of-the-art results in this domain." (abstract, p.1) The system is evaluated end to end by inserting predictions into the HOList/HOL Light proof-search environment, rather than only comparing representation embeddings.

The training set contains 10,200 top-level theorems and around 375,000 proof steps; the held-out validation split contains 3,225 theorems. The theorem database has 19,262 theorems and definitions (Section 5.1, p.5). The best model closes 49.95% of validation proofs with a 12-hop GNN using subexpression sharing (Table 1, p.4; Section 5.2, p.6). The denominator is all 3,225 validation theorems, not only theorems with a particular tactic.

Inference: For VL, this is evidence for learned proof-state and lemma-selection heuristics. It does not prove generated Verus code or proof scripts: every successful theorem is still closed by HOL Light tactics, and the model's prediction is only a search guide.

## technique: graph representations of formulas

When to use it: use graph rather than sequence or one-way tree encodings when a logical subexpression's meaning depends on occurrences elsewhere in the formula.

How to apply it:

1. Parse each HOList S-expression into an abstract syntax tree (AST). Make nodes for applications, variables, lambdas, constants, and type constructors; label child edges with left/right positions so the original expression is recoverable (Section 3, pp.2–3).
2. Add parent and child directed edges. The baseline AST has both directions; bottom-up and top-down variants retain only child-to-parent or parent-to-child edges (Section 3, p.3).
3. For subexpression sharing, merge every AST node representing a syntactically equal expression, including type expressions. Keep multiple parent edges to preserve each occurrence (Section 3, p.3; Fig. 1, p.3).
4. For leaf sharing, merge only equal leaves. For variable blinding, replace variable names by `x` after graph construction; distinct variable nodes remain distinct (Section 3, p.3).
5. Optionally add three labeled random outgoing edges per node to approximate an expander, then compare against the structured graph (Section 3, p.3).

The paper's Figure 1 gives a concrete result: sharing reduces the graph for `∀x : x = x` from 27 nodes to 15 (caption, p.3). Its ablation shows that subexpression sharing is substantially stronger than leaf sharing. At 12 hops, subexpression sharing closes 49.95%, versus 45.67% for AST and 30.51% for leaf sharing (Table 2, p.5).

Inference: A Verus proof-state graph could include expression AST nodes, types, binders, ownership facts, quantified triggers, and references to available lemmas. Sharing should be applied only when semantic identity is preserved; this is a proposed transfer, not a result of the paper.

## technique: bidirectional message-passing GNN

When to use it: use message passing when proof-state context must flow across long formula distances and the embedding should depend on both a subexpression and its surrounding occurrences.

How to apply it:

1. Represent the formula as labeled graph `G = (V,E,lV,lE)`. Map each node token and edge label to a trainable or fixed feature vector (Section 4.1, p.4).
2. Initialize node embeddings with an MLP over token features and edge embeddings with an MLP over edge labels (Section 4.1, p.4).
3. For each of `T` rounds, compute separate messages from parent and child neighbors using edge-aware MLPs. Sum each direction separately, pass the concatenated aggregates through an MLP, and add the result to the node's previous embedding (Section 4.1, p.4).
4. Max-pool transformed node embeddings to obtain a fixed-size graph embedding. The implementation uses 128-dimensional node states and expands to 512 and then 1,024 before max pooling (Sections 4.1 and 5.3, pp.4–7).
5. Train with dropout and evaluate different hop counts and directional restrictions. The paper uses 0, 2, 4, 8, and 12 hops (Table 2, p.5).

The authors report: "While allowing information to flow in both directions results in the best performance, Table 2 shows that top down message passing significantly outperforms bottom up." (Section 5.2, p.6) At 12 hops, top-down sharing closes 48.40% and bottom-up sharing 40.99% (Table 2, p.5). This supports context flowing from parent occurrences into a shared subexpression.

Inference: For Verus, a learned encoder could rank candidate proof lemmas or suggest invariant facts from a structured proof state. It should never be treated as a verifier; Verus must still check the resulting proof. This is an inference.

## technique: joint tactic and premise prediction

When to use it: use joint prediction when a proof step needs both a tactic choice and arguments such as lemmas or rewrite rules.

How to apply it:

1. Encode the current goal with GNN-1 and each eligible premise with GNN-2 (Section 4.2, p.4).
2. Predict a tactic from a fixed set of 41 tactics using a softmax classifier (Section 4.2, p.4).
3. Score each goal/premise pair with a combiner that concatenates goal and premise embeddings and their element-wise product (Section 4.2, p.4).
4. During search, select the top `k1 = 5` tactics and top `k2 = 20` premises for each tactic application. The database has 19,262 eligible theorems and definitions (Section 4.2, p.4).
5. Apply each candidate in breadth-first proof search. Failed applications are logged and ignored; a goal closes when one branch closes all of its subgoals (Section 4.2, p.4).

Training examples use each human proof step's goal, tactic, and tactic-parameter list. For each goal, 16 positive goal/premise pairs are sampled; 15 random negatives per goal and cross-goal reuse create a batch of 4,096 examples (Section 5.3, pp.6–7). The total loss weights tactic cross-entropy 1.0, pairwise premise loss 0.2, and AUCROC loss 4.0 (Section 5.3, p.7).

The model's proxy tactic metric counts a tactic correct only when it exactly matches the single human tactic, even though alternatives may work; end-to-end proof closure is therefore the primary metric (Section 5.1, p.5). Inference: this warning matters for VL training data, where many different lemma sequences may prove the same obligation.

## evidence, limitations, and trust

The best 12-hop shared-subexpression model closes 49.95% of validation proofs, compared with 32.65% for the prior WaveNet baseline, 37.98% for bag-of-words max pooling, and 38.9% for the prior reinforcement-learning result (Table 1, p.4; Section 5.2, p.6). The paper also reports successful tactic applications rising from 33.8% at 0 hops to 38.6% at 12 hops, and average proof length rising from 1.86 to 1.93 steps (Section 5.2, p.6). These denominators are tactic applications and closed proofs in the same HOList validation setup, respectively.

Variable blinding sharply reduces performance: at 12 hops, shared subexpression with blinding closes 37.36%, versus 49.95% without (Table 2, p.5). Random edges help at two hops but hurt at four or more (Section 5.2, p.6). The authors identify a major omission: "In the experiments presented in this paper, we predict tactics and their arguments by looking only at the conclusion of the current sub-goal and ignoring any local assumptions that could be crucial to the proof." (Section 6, p.7)

The trusted components include the HOL Light kernel and tactics, the HOList proof-search implementation, graph construction, trained parameters, and the human-proof data. The paper does not claim that the GNN discovers new mathematical facts independently; it imitates human proof steps and relies on tactic execution for correctness.

What VL should not redo: the paper already demonstrates AST versus sharing ablations, directional message passing, joint tactic/premise ranking, negative sampling, and end-to-end closure metrics. Inference: a VL project should adapt these ideas to Verus proof states and measure kernel-checked proof success, rather than report only classifier accuracy.

Threat to agent-written verified Rust: Inference: low to medium for soundness, high for productivity. The GNN can suggest useful lemmas or proof contexts but cannot weaken Verus's checker; however, distribution shift, missing local assumptions, and human-proof imitation may reduce usefulness on novel Rust APIs.

## techniques for the catalog

- shared logical graphs — encode ASTs with parent/child edges and merge equal subexpressions, including type expressions
- bidirectional message passing — aggregate parent and child context over multiple hops before graph pooling
- tactic and premise ranking — jointly predict a proof tactic and rank its eligible lemma arguments during search
- proof-search integration — evaluate learned predictions by running the prover and counting closed validation theorems
- representation ablation — compare AST, leaf sharing, variable blinding, random edges, and directional graphs to identify useful context
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
