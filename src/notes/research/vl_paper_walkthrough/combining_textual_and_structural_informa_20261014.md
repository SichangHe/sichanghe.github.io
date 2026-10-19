# Combining Textual and Structural Information for Premise Selection in Lean
(authored by agents unless marked 🧑)
Tag: `petrovčič2025combining`, [paper](https://arxiv.org/abs/2510.23637)

## what the paper does

Premise selection retrieves premises that will be used in the next tactic. This paper augments text retrieval with a heterogeneous dependency graph and a relational graph convolutional network (RGCN). Its abstract claims, “We present a graph-augmented approach that combines dense text embeddings of Lean formalizations with graph neural networks over a heterogeneous dependency graph capturing both state–premise and premise–premise relations.” (abstract, PDF p. 1)

The input is the LeanDojo Mathlib benchmark. A proof-state node contains local hypotheses and a goal; premise nodes represent definitions, lemmas, theorems, and axioms. Directed typed edges represent references in signature hypotheses, signature goals, and premise proofs. Premises used by the next tactic are state labels. The authors merge states and premises into `G=(V,X,E)`, where `V=P∪S`, `X` is code text, and `E⊆V×R×V` (section 2.1, PDF pp. 2–3). During evaluation, a separate import/file graph restricts candidates to imported premises and premises defined before the current entry. The model does not use this graph during training.

## technique: extract a typed dependency graph

Apply this before training a premise retriever.

1. Parse Lean source with LeanDojo's extraction framework and query definitions, proof states, local hypotheses, goals, and tactic-used premises (section 2.1, PDF pp. 2–3)
2. Create one node for each premise and proof state; store its Lean text representation
3. Add typed edges for signature-local-hypothesis and signature-goal references, plus premise-to-premise proof dependencies; keep next-tactic premises as state labels (Table 3, PDF p. 7)
4. Preserve the separate file/import graph and entry-to-file map
5. At evaluation time, filter candidates to imported or earlier definitions (section 2.1, PDF p. 3); exclude proof-relation edges during training (section 3.2, PDF p. 4)

The paper's example theorem uses `rw [← not_or]` and `exact h`; the initial state links to `Or` and `Not` through its hypotheses and to `And` and `Not` through its goal. The theorem proof creates a proof-dependency edge to `not_or` (Listing 1 and Figures 1–3, PDF p. 2). The authors explain: “We treat the underlying navigation links as references in our graph.” (section 2.1, PDF p. 3)

Verus form. Inference: build an analogous graph from Rust/Verus modules: nodes for `spec fn`, `proof fn`, lemmas, datatype definitions, traits, and proof states or failing obligations; typed edges for symbol references, `requires`/`ensures` dependencies, `assert` triggers, and imported modules. Candidate filtering should respect Rust/Verus availability rules. The graph only recommends lemmas; Verus remains the authority.

## technique: RGCN-refined text retrieval

The method uses ReProver's ByT5 dual encoder for initial embeddings, then propagates information over the graph. The paper's three explicit steps are: “Step 1: initial text embeddings”; “Step 2: GNN-based refinement”; and “Step 3: GNN-refined state encoding.” (section 3.1, PDF pp. 3–4)

1. Encode premise text `xp` and state text `xs` with the ByT5 dual encoder, yielding initial vectors `hp(0)` and `hs(0)`
2. For `L` layers, update each premise with an RGCN sum over typed incoming premise edges, using relation-specific trainable matrices, degree normalization, a transformed self-vector, and an activation (section 3.1, PDF pp. 3–4)
3. At retrieval, treat the new state as a temporary node and perform one message-passing step from referenced premises, with separate state weights
4. Score each candidate by cosine similarity between the refined state and premise vectors
5. Prevent information flow from states to dependencies or from future premises to earlier dependencies through edge direction (section 3.1, PDF p. 4)

Train with InfoNCE over each state's valid premise list against all other premises. The GNN is trained transductively on the full premise graph, excluding proof-relation edges to avoid trivial memorization (section 3.2, PDF p. 4). The authors ensemble six independently trained models and use exponential model averaging (EMA) (section 3.3, PDF p. 4).

Verus form. Inference: use the same architecture to rank candidate Verus lemmas for a failing proof state. Encode the goal, local assumptions, and surrounding Rust code; propagate over verified dependency edges; then present top-k lemmas to an agent. Include source revision and visibility in the candidate key. Do not let retrieval invent a lemma or bypass the Verus check; its output is search guidance.

## evidence and ablations

The experiment uses the LeanDojo Mathlib random train/validation/test split, `L=2`, Optuna hyperparameter tuning, and ReProver with ByT5-small as baseline (section 4.1, PDF p. 4). On the test set, baseline Recall@1 is 13.42%, Recall@10 39.60%, and MRR 0.3283. The GNN model reaches 17.98%, 50.04%, and 0.4095; with EMA it reaches 18.31%, 50.33%, and 0.4140. These are retrieval metrics (Table 1, PDF p. 5). Table 1 reports relative improvements of 33.98%/26.36%/24.73% without EMA and 36.44%/27.10%/26.10% with EMA. Inference: the abstract's “over 25% across standard retrieval metrics” holds for the EMA row; the non-EMA MRR improvement is 24.73%.

Ablations remove context-premise or premise-premise graph edges and run without ensembling. No ablation gives 17.43%/48.52%/0.4010 for R@1/R@10/MRR; context-graph removal gives 17.30%/49.99%/0.4008; premise-graph removal gives 17.45%/49.30%/0.4008. With EMA, the corresponding rows are 17.74%/48.70%/0.4048, 17.58%/50.13%/0.4057, and 18.18%/49.98%/0.4096 (Table 2, PDF p. 5). Removing graph parts sometimes improves a metric. The authors therefore write, “This leads to the possibility that the utilization of the graph structure is not the main factor behind the superior performance, but rather that this is caused by the different choices of the loss function and sampling strategy.” (section 4.3, PDF p. 5)

The experiments used three NVIDIA A6000 GPUs (48 GB each), two Intel Xeon Silver 4410Y CPUs (24 cores, 48 threads each), and 512 GB RAM. Initial tuning took about a day, the second stage about 12 hours, and final ensemble training roughly one day; EMA added negligible time (Appendix C, PDF p. 7). Appendix B describes architecture tuning against first-batch training Recall@10, followed by regularization tuning against validation Recall@10, with 120 training epochs and selection by best validation Recall@10 (PDF pp. 7–8). Inference: the random split may share neighboring library patterns between training and test. The authors write: “Finally, the model will be evaluated on more realistic splits, such as the LeanDojo "novel" split or a split based on the creation time of premises.” (section 5, PDF p. 5)

## Verus transfer, trusted boundary, and product threat

Inference: in VL, graph extraction, tokenization, RGCN weights, InfoNCE training, ensemble averaging, and candidate ranking are untrusted search components. The Verus verifier and its trusted specification remain authoritative. The graph can also encode a wrong dependency or leak a future lemma; source-order filtering and held-out temporal splits reduce that risk but do not establish semantic relevance.

Inference: premise selection is a direct product threat when an agent relies on a retrieved lemma whose statement is weaker, differently quantified, or tied to an unintended trait implementation. Require the agent to display the complete lemma signature and let Verus reject any mismatch. Cache retrieval by source revision and invalidate it when a lemma or specification changes.

Inference: VL could reuse typed dependency extraction, visibility-aware candidate filtering, graph-aware ranking, and ablations that test which edges matter. It should not claim that graph augmentation alone caused the gains: the authors explicitly identify loss and sampling as confounders, and Table 2 omits the ensembling used in Table 1.

## techniques for the catalog

- typed formal-library graph — extract premise and proof-state nodes with relation-typed references and source-order availability
- graph-augmented premise retrieval — combine text embeddings with RGCN message passing over premise dependencies
- contrastive premise training — train with InfoNCE against valid premises and all other candidates as negatives
- ensemble retrieval — average six independently trained retrievers and apply exponential model averaging
- availability-aware evaluation — restrict candidates by imports and prior source position; temporal or novel splits are proposed future work
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Note that the edge directions prevent information flow from states to dependencies or future premises to prior dependencies."): checked all study quotations, numbers, section/page references, and technique steps against all eight paper pages; corrected the paper link, graph relations and state labels, training terminology, page references, and interpretation of results; removed unsupported denominator claims and marked transfer recommendations as Inference; did not inspect code, reproduce experiments, or verify the proposed Verus transfer.
