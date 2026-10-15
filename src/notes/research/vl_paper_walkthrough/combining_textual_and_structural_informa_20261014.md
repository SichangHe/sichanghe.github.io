# Combining Textual and Structural Information for Premise Selection in Lean
(authored by agents unless marked 🧑)
Tag: `petrovčič2025combining`, [paper](https://doi.org/10.1145/3372885.3373824)

## what the paper does

Premise selection retrieves lemmas and definitions likely to close the next proof state. This paper augments text retrieval with a heterogeneous dependency graph and a relational graph convolutional network (RGCN). Its abstract claims, “We present a graph-augmented approach that combines dense text embeddings of Lean formalizations with graph neural networks over a heterogeneous dependency graph capturing both state–premise and premise–premise relations.” (abstract, PDF p. 1)

The input is the LeanDojo Mathlib benchmark. A proof-state node contains local hypotheses and a goal; premise nodes represent definitions, lemmas, theorems, and axioms. Directed typed edges represent references in names, signatures, and proof tactics. The authors merge states and premises into `G=(V,X,E)`, where `V=P∪S`, `X` is code text, and `E⊆V×R×V` (section 2.1, PDF pp. 2–3). During evaluation, an import/file graph restricts candidates to premises available at that point in the file, preventing future-premise leakage.

## technique: extract a typed dependency graph

Apply this before training a premise retriever.

1. Parse Lean source with LeanDojo's extraction framework and query definitions, proof states, local hypotheses, goals, and tactic-used premises (section 2.1, PDF pp. 2–3)
2. Create one node for each premise and proof state; store its Lean text representation
3. Add typed edges for name, signature-local-hypothesis, signature-goal, and proof/tactic references
4. Preserve the separate file/import graph and entry-to-file map
5. At evaluation time, filter candidates to imported or earlier definitions, while retaining graph edges for training (section 2.1, PDF p. 3)

The paper's example theorem uses `rw [← not_or]` and `exact h`; the initial state links to `And` and `Not`, and the tactic creates a proof-dependency edge to `not_or` (Listing 1 and Figures 1–3, PDF pp. 2–3). This makes the graph carry both semantic text and library navigation structure.

Verus form. Inference: build an analogous graph from Rust/Verus modules: nodes for `spec fn`, `proof fn`, lemmas, datatype definitions, traits, and proof states or failing obligations; typed edges for symbol references, `requires`/`ensures` dependencies, `assert` triggers, and imported modules. Candidate filtering must respect Rust module visibility and source order. The graph only recommends lemmas; Verus remains the authority.

## technique: RGCN-refined text retrieval

The method uses ReProver's ByT5 dual encoder for initial embeddings, then propagates information over the graph. The paper's three explicit steps are: “Step 1: initial text embeddings”; “Step 2: GNN-based refinement”; and “Step 3: GNN-refined state encoding.” (section 3.1, PDF p. 3)

1. Encode premise text `xp` and state text `xs` with the ByT5 dual encoder, yielding initial vectors `hp(0)` and `hs(0)`
2. For `L` layers, update each premise with an RGCN sum over typed incoming premise edges, using relation-specific trainable matrices and degree normalization (section 3.1, PDF pp. 3–4)
3. At retrieval, treat the new state as a temporary node and perform one message-passing step from referenced premises, with separate state weights
4. Score each candidate by cosine similarity between the refined state and premise vectors
5. Prevent information flow from states to dependencies or from future premises to earlier dependencies through edge direction (section 3.1, PDF p. 4)

Train with InfoNCE over each state's valid premise list against all other premises. The graph is trained transitively but excludes proof-relation edges during training to avoid trivial memorization (section 3.2, PDF p. 4). The authors ensemble six independently trained models and use exponential model averaging (EMA) (section 3.3, PDF p. 4).

Verus form. Inference: use the same architecture to rank candidate Verus lemmas for a failing proof state. Encode the goal, local assumptions, and surrounding Rust code; propagate over verified dependency edges; then present top-k lemmas to an agent. Include source revision and visibility in the candidate key. Do not let retrieval invent a lemma or bypass the Verus check; its output is search guidance.

## evidence and ablations

The experiment uses the LeanDojo Mathlib random train/validation/test split, `L=2`, Optuna hyperparameter tuning, and ReProver with ByT5-small as baseline (section 4.1, PDF p. 4). On the test set, baseline Recall@1 is 13.42%, Recall@10 39.60%, and MRR 0.3283. The GNN model reaches 17.98%, 50.04%, and 0.4095; with EMA it reaches 18.31%, 50.33%, and 0.4140. These denominators are the full LeanDojo test-set retrieval queries; percentages are retrieval rates, not proof completion rates (Table 1, PDF p. 5). The abstract's “over 25%” refers to relative metric improvement, not percentage points.

Ablations remove context-premise or premise-premise graph edges and run without ensembling. No ablation gives 17.43%/48.52%/0.4010 for R@1/R@10/MRR; context-graph removal gives 17.30%/49.99%/0.4008; premise-graph removal gives 17.45%/49.30%/0.4008. EMA changes these rows separately (Table 2, PDF p. 5). Removing graph parts sometimes improves a metric. The authors therefore write, “This leads to the possibility that the utilization of the graph structure is not the main factor behind the superior performance, but rather that this is caused by the different choices of the loss function and sampling strategy.” (section 4.3, PDF p. 5)

Training used three NVIDIA A6000 GPUs, two 24-core Xeon CPUs, and 512 GB RAM; initial tuning took about a day, the second stage about 12 hours, and final ensemble training is reported in Appendix C (PDF p. 7). The benchmark is random-split and may share neighboring library patterns between train and test. The paper itself proposes future evaluation on a “novel” or creation-time split (section 5, PDF p. 6).

## Verus transfer, trusted boundary, and product threat

Inference: in VL, graph extraction, tokenization, RGCN weights, InfoNCE training, ensemble averaging, and candidate ranking are untrusted search components. The Verus verifier and its trusted specification remain authoritative. The graph can also encode a wrong dependency or leak a future lemma; source-order filtering and held-out temporal splits reduce that risk but do not establish semantic relevance.

Inference: premise selection is a direct product threat when an agent relies on a retrieved lemma whose statement is weaker, differently quantified, or tied to an unintended trait implementation. Require the agent to display the complete lemma signature and let Verus reject any mismatch. Cache retrieval by source revision and invalidate it when a lemma or specification changes.

The paper already establishes the retrieval architecture and benchmark comparison. VL should reuse typed dependency extraction, visibility-aware candidate filtering, graph-aware ranking, and ablations that test which edges matter. It should not claim that graph augmentation alone caused the gains: the authors explicitly identify loss and sampling as confounders, and the ablation denominators differ from the ensembled Table 1 rows.

## techniques for the catalog

- typed formal-library graph — extract premise and proof-state nodes with relation-typed references and source-order availability
- graph-augmented premise retrieval — combine text embeddings with RGCN message passing over premise dependencies
- contrastive premise training — train with InfoNCE against valid premises and all other candidates as negatives
- ensemble retrieval — average six independently trained retrievers and apply exponential moving averaging
- leakage-aware evaluation — restrict candidates by imports and prior source position, then test on temporal or novel splits
Checked 2026-10-14 against the paper by a Codex agent: audit record petrovčič2025combining; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
