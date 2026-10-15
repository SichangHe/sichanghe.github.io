# Graph2Tac: Online Representation Learning of Formal Math Concepts
(authored by agents unless marked 🧑)
Tag: `blaauwbroek2024graph2tac`, [paper](https://doi.org/10.29007/wg1q)

## scope and result

The paper studies online theorem proving for Coq. Its central observation is locality: nearby formal concepts and nearby proof steps tend to be useful for one another. The authors build two online solvers, an online k-nearest-neighbor (k-NN) solver and Graph2Tac, a graph neural network (GNN) that embeds definitions as they arrive. The paper states: “We demonstrate the crucial importance of incorporating online information into models.” (Introduction, p. 2). It reports an offline-to-online k-NN increase from 15.0% to 25.8% (1.72×), a definition-task increase from 17.4% to 26.1% (1.5×), and 33.2% of the test set solved by the combined Graph2Tac and k-NN system (Introduction, p. 2). These are pass rates over the paper's theorem benchmarks, not proof guarantees for arbitrary Coq developments.

## technique 1: represent the environment as one shared mono-graph

What it is. Section 2 encodes all Coq definitions and proof states in one interconnected directed graph. Nodes represent term constructors or references to definitions; labeled edges represent application, binders, and other relationships. Definition references are shared, so the same term has one node wherever it occurs. Local variables point to their binders, avoiding dependence on names. Mutually recursive definitions form one cluster, and extracted subgraphs are topologically ordered by dependencies. The authors explain: “The graph is designed to faithfully encode all kernel objects in Coq’s environment in a reversible manner” (Section 2, p. 3). They also say, “By using a novel graph hashing algorithm (Blaauwbroek et al., 2024), equal terms are shared across parts of the graph leading to more compact representations” (Section 2, p. 3).

How to apply it. (1) Parse each kernel object into labeled nodes and edges. (2) Give each global definition a definition node and connect uses to that node. (3) Connect binders to local variables. (4) Hash equal terms so repeated subterms share nodes. (5) For a proof state or definition root, compute its forward closure until another definition node; omit a theorem's proof term. (6) Keep mutually recursive roots together and topologically order the resulting subgraphs. These steps are the paper's Section 2 method.

Verus form. Inference: Verus does not expose Coq's kernel-object graph, so a Rust pipeline would need an extractor over Verus syntax and specification bodies. The extracted graph can index functions, `spec fn` definitions, datatypes, predicates, and proof-state assumptions; it remains an external retrieval representation, while executable Rust and Verus proofs are unchanged. Inference: sharing equal specification terms is useful for retrieval but does not itself establish a Verus fact.

Evidence and limits. The mono-graph can contain hundreds of millions of nodes, so the paper processes bounded subgraphs hierarchically rather than giving the full graph to a GNN (Section 2, p. 3). Inference: graph extraction must preserve name resolution and binder structure; a lossy pretty-print graph would not reproduce the paper's claimed reversibility.

## technique 2: online k-NN over recent proof steps

What it is. Section 3.1 stores proof states with their associated tactics and hand-crafted proof-state features. At query time, it retrieves the most similar states and returns their tactics in similarity order. The paper says: “The online k-NN uses a simple search over the 1000 most recent tactic proof steps in the global context” (Section 3.1, p. 4). It needs no training. The offline comparison searches all loaded training proofs with locality-sensitive-hashing forests (LSHF).

How to apply it. (1) During interactive proving, append each completed proof state and tactic to a recency database. (2) Extract the same hand-crafted features from the current state. (3) Search the 1000 most recent entries. (4) Rank by feature similarity. (5) Return the associated tactic scripts as suggestions. (6) For an offline baseline, replace the recency window with all training proofs and LSHF indexing. These steps are Section 3.1's procedure.

Verus form. Inference: record a Verus proof state's visible assumptions, goal shape, and referenced definitions after each successful proof step, then retrieve prior states before asking an agent to emit a `proof fn` or lemma invocation. Retrieval proposes text; Verus still checks the resulting Rust proof. Inference: because Verus proof syntax and solver contexts differ from Coq tactics, feature design and tactic translation require a new experiment.

Evidence and limits. The 15.0% versus 25.8% comparison is over the paper's 10-minute theorem benchmark (Introduction, p. 2); Appendix P reports that online gains become especially visible with at least ten new dependencies. Appendix Q records a serious trust failure: the `tlc` package contains `Axiom skip_axiom : False`, and G2T-Anon-Update used it on 192 of 500 test theorems (38.4%) in the five-minute benchmark (Appendix Q, p. 26, Table 6). Inference: a Verus deployment must reject or quarantine axioms and `assume`-style escape hatches when measuring proof retrieval.

## technique 3: Graph2Tac definition and prediction tasks

What it is. Section 3.2 trains one shared eight-hop message-passing GNN for two tasks. The definition task maps a definition graph to an embedding; the prediction task maps a proof-state graph to a base tactic and its arguments. Graphs are pruned to 1024 nodes, edges are duplicated in both directions and augmented with self-edges, and node, edge, tactic, and definition embedding tables are learned at hidden dimension 128. The definition task masks root embeddings and predicts the corresponding definition embedding. The prediction task mean-pools the updated graph, predicts a tactic distribution, then predicts arguments with an RNN and MLP query embeddings. The combined loss is `L = 1000 L_def + L_tactic` (Section 3.2, pp. 5–6).

How to apply it. (1) Build a definition graph or proof-state graph with local-context nodes and references to global definitions. (2) Prune to 1024 nodes; add reverse and self edges and their edge embeddings. (3) Embed labels and run eight message-passing hops, each using graph convolution followed by a two-layer MLP, dropout, residual connection, and layer normalization. (4) Mean-pool node embeddings. (5) For definition training, concatenate the pooled vector with each root vector and train a two-layer MLP to reproduce the definition embedding; optionally concatenate a bidirectional-LSTM name embedding. (6) For prediction, map the pooled vector to base-tactic probabilities by inner products with the tactic table. (7) Initialize a two-layer RNN with the chosen tactic embedding and decode the required number of arguments; score global arguments against the definition table and local arguments against local node embeddings. (8) Train on batches of 512 definitions and 512 proof states with cosine definition loss and cross-entropy tactic-sequence loss. The paper's Figure 4 and Section 3.2 give these steps.

Verus form. Inference: use the same retrieval architecture over Verus proof-state graphs, but generated candidates should be Rust/Verus statements such as `assert`, `assert forall`, `by`, or calls to previously proved lemmas; only the Verus checker decides acceptance. Inference: the paper's Coq base-tactic and argument vocabulary cannot be copied to Verus. A practical adaptation would preserve graph encoding and candidate ranking while replacing the decoder vocabulary with Verus constructs.

Evidence and limits. The definition task raises the reported pass rate from 17.4% to 26.1% (1.5×) in the unseen-package setting (Introduction, p. 2). Graph2Tac and online k-NN together solve 33.2% of the test set (Introduction, p. 2). The benchmark samples 2,000 test theorems with a ten-minute limit per theorem, and up to 500 per package with a five-minute limit (Section 4, p. 7). Inference: these denominators and time limits mean the result measures bounded search success, not completeness.

## technique 4: online embeddings for unseen definitions

What it is. During inference, embeddings for definitions absent from training are calculated by the definition network. If several new definitions arrive, Graph2Tac computes them individually in topological dependency order, updating the table so later definitions can use earlier embeddings. The paper states: “If there are multiple new definitions, we compute embeddings from each definition graph individually, updating the embeddings in a topologically sorted order so that those for dependencies are computed before those for latter definitions which depend on those dependencies” (Section 3.2, p. 6).

How to apply it. (1) Mask definitions unavailable in the current global context. (2) Identify definitions not seen during training. (3) Topologically sort their dependency graph. (4) Run the definition network on the first graph and insert its unit-normalized embedding. (5) Repeat for each dependent definition. (6) Use the updated table for proof-state encoding and argument scoring. The paper's Update, Recalc, and Frozen configurations compare updating only new definitions, recalculating all definitions, or using random embeddings (Section 3.2, p. 6; Appendix N).

Verus form. Inference: maintain a cache keyed by Verus function or datatype identity and compute a new embedding after parsing each declaration; process `spec fn` dependencies before callers. The cache is advisory and can never replace Verus's proof obligations. Inference: name embeddings can break graph isomorphism; whether names help in Verus depends on namespace conventions and should be measured.

Evidence and limits. Appendix N reports that freezing the definition model harms performance and that the Update configuration is the primary model. Appendix P reports that all solvers degrade as the number of new dependencies rises, although online models retain an advantage. Inference: cache invalidation after edits is a product risk absent from this benchmark.

## technique 5: combine complementary online solvers

What it is. The k-NN solver learns from recent tactic scripts, while Graph2Tac learns from recent definitions; their capabilities are therefore different. The paper reports: “The two online solvers we discuss in Section 3, k-NN and Graph2Tac, operate on entirely different kinds of online data and as a result have orthogonal capabilities” (Introduction, p. 2). The combined experiment divides the one-CPU budget between components and counts a theorem solved if either component solves it within its share.

How to apply it. (1) Run Graph2Tac and online k-NN as separate suggestion sources. (2) Allocate a fixed time or model-call budget to each. (3) Interleave or merge suggestions in the Tactician search. (4) Count a theorem once if either solver produces a checked proof. (5) Report each component and the aggregate with the same budget and timeout. The paper's Section 3.3 and Figure 5 define this accounting.

Verus form. Inference: a VL agent can combine embedding retrieval from new declarations with recency retrieval from recently repaired proofs, then submit all candidates to Verus. The verifier, rather than a heuristic vote, is the acceptance oracle. Inference: measuring complementarity requires disjoint solved-goal sets and a fixed CPU/tool budget.

Evidence and limits. The aggregate solves 33.2% of the test set (Introduction, p. 2), but the paper's comparison to some prior systems is informal because training packages and interfaces differ (Section 3.3, p. 6). Inference: the aggregate number should not be compared directly with unrelated benchmark splits.

## what is proved, measured, and trusted

The Coq kernel checks every accepted proof; the neural models only propose tactics. Measured quantities are theorem pass rates, cumulative time and model-call curves, dependency-conditioned rates, and training/validation statistics. Trusted inputs include Coq package sources, their declarations and proof scripts, the benchmark's theorem selection, and the absence of prohibited axioms. Appendix Q shows that this last condition failed in several packages: the listed axioms can prove false results. Inference: a product evaluation must report whether `Admitted`, inconsistent axioms, or equivalent escape hatches were available.

The paper's own example shows G2T-Anon-Update reusing a newly defined lemma (`toZpK`) and solving `toZp_inj`; online k-NN instead retrieves a tactic for a nearby lemma from its recent database (Appendix R, pp. 29–30). Inference: this supports retrieval as a proof-search accelerator, not as evidence that a model understands mathematical validity independently of a kernel.

## implications for VL

Inference: the directly reusable ideas are dependency-aware graph indexing, recency retrieval, online embedding updates, and combining retrieval channels before Verus checking. Inference: VL should not redo a generic claim that nearest-neighbor examples help; it should measure whether Verus-specific proof-state graphs improve checked-proof completion on unseen modules, with axiom-free and timeout-explicit benchmarks. Inference: the product threat is moderate for repetitive lemma application and high for novel specifications, because the paper does not evaluate Rust ownership, external effects, unsafe code, or the correctness of a generated specification. Inference: accepted Verus proofs still depend on the specification, imported library contracts, solver behavior, and any admitted or externally trusted code.

## techniques for the catalog

- shared mono-graph encoding — represent definitions, proof states, binders, and references in one reversible graph with shared equal terms
- online recency k-NN — retrieve tactics from the 1000 most recent proof steps using proof-state features
- dual-task graph prover — train a shared GNN to embed definitions and predict tactics plus arguments
- dependency-ordered online embeddings — compute embeddings for unseen definitions in topological dependency order
- complementary solver portfolio — combine definition-based Graph2Tac and proof-script-based k-NN under one budget
Checked 2026-10-15 against paper blaauwbroek2024graph2tac: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
