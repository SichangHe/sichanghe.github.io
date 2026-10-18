# Proving Equivalence Between Complex Expressions Using Graph-to-Sequence Neural Models
(authored by agents unless marked 🧑)
Tag: `kommrusch2021proving`, [paper](https://arxiv.org/abs/2106.02452)

## problem and guarantee
The paper treats equivalence of typed linear-algebra expression graphs as a proof-search problem. An input pair is equivalent when semantics-preserving axioms can rewrite one graph into the other. The system predicts axiom applications and graph-node locations (one per inference step in the main AxiomStep10 model, or a whole sequence in the WholeProof models); a deterministic checker applies them. The paper's central guarantee is: “If the sequence is verified to be valid, and S(P1) is structurally equivalent to P2, then we have proved P1 ≡ P2” (section 2, p. 2). The learned model searches; the checker carries the proof obligation.

The language has scalar, vector, and matrix variables, 16 operators, and 147 distinct axioms (section 1, p. 1; Table 1, p. 6; Appendix C, Tables 8-9, pp. 16-17). Table 1 groups the axioms in 14 categories. The paper also says it implemented "a total of 102 different axioms" built from "the multi-type versions of the 13 core restructuring axioms" (section 3.2, p. 5); the paper does not reconcile 102 with 147 or 13 with 14. It represents each expression as a directed data-flow graph with one root/output node.

## technique: turn rewriting into a proof path
Use this when equivalence has a trusted, semantics-preserving rewrite system and direct symbolic normalization is difficult. The paper's example starts with `a*(1*b + 1*c)` and reaches `a*c + a*b` by neutral-element, distributivity, and commutativity rewrites (section 2, p. 2).

Steps from the paper:
1. Define each axiom as a local graph rewrite, including its pattern, replacement, types, and legal node positions. For example, A1 is `1_N*x = x`; A2 distributes multiplication over addition; A3 commutes addition (section 2, p. 2).
2. Build the equivalence graph whose vertices are all language expressions and whose edges are one legal axiom application. The paper states: “Any two programs connected by a path in this graph are therefore semantically equivalent” (section 2, p. 2).
3. Represent a proof as the axiom and node-position sequence along a path. Apply each rewrite to a temporary expression and compare the final graph structurally to the target (section 2, p. 2).
4. Reject a candidate immediately when an axiom is inapplicable or the final structure differs. Non-equivalent pairs therefore cannot obtain a verified sequence.

Verus form (Inference): encode an expression as an immutable Rust enum or indexed tree, define executable rewrite functions for each axiom, and prove each rewrite's semantic preservation with `proof fn` lemmas and `ensures`. A proof sequence can be a `Seq` of tagged rewrite steps; a verifier function can use `requires` for valid node paths and `ensures` for semantic equality. Verus will not automatically accept an arbitrary neural output: the rewrite checker and axiom lemmas must be verified, and graph mutation/indices need explicit invariants.

Evidence: the paper reports that “The correctness of the rewrite rule is deterministically checkable in all cases in negligible time” (section 1, contribution 2, p. 2). This validates sound acceptance, not completeness: a failed search gives only non-equivalence confidence under the available model and axioms.

## technique: generate supervised proofs automatically
Use this when hand-labeling proof paths is too expensive. The paper first samples legal programs from a grammar, then applies randomly selected legal axioms to create a target and records the path.

Steps:
1. Randomly generate grammar-conforming ASTs, limited to 50 nodes and depth 7 (section 4, p. 5).
2. Pick a node and an applicable axiom; apply it repeatedly to produce an equivalent second program and the exact rewrite sequence (section 4, p. 6).
3. Remove duplicates and form tuples `(P1, P2, S)`. The final corpus contains 1,000,000 training, 10,000 validation, and 10,000 test samples (section 4, p. 5).
4. For the incremental AxiomStep10 set, split an N-step proof into N examples that each predict one next axiom while feeding the newly rewritten intermediate expression back into the model; proofs are capped at 10 steps (section 4, p. 6).

Inference: this generator is a proof-producing oracle, so its labels are trusted only if the axiom implementation and applicability checks are correct. Random walks can underrepresent hard regions even when they have nonzero probability.

## technique: graph-to-sequence proof search
Use this when tree structure and rewrite positions matter. The model is a gated graph neural network encoder plus a 2-layer, 256-unit LSTM decoder with global attention (sections 3.1 and 5, pp. 3 and 7), implemented in OpenNMT-py with a new encoder based on gated graph networks (section 6, p. 8).

Steps:
1. Initialize each graph node with its AST level and language token; use nine directed edge types plus reverse edges for child, root, and grandchild relationships (section 5, p. 7).
2. Run ten graph-message-passing iterations. Each edge type has a separate weight matrix, preserving structural roles (section 5, p. 7).
3. Feed the final root embedding through a bridge to initialize the decoder, while attention reads all node embeddings to predict axiom tokens and a left/right path to the application node (section 5, p. 7).
4. Apply the predicted axiom to construct an intermediate program. If it is not the target, infer the next step on the pair `(P', P2)` (section 5, p. 7).
5. Keep up to ten beam candidates (section 5, p. 7). Appendix D (p. 18) says the network beam is set to 3, the system beam width goes up to 10, and the search stops after up to 12 axioms. Each proposal is checked for validity and the first valid one is output (Appendix D, p. 18).

The paper contrasts incremental AxiomStep models with WholeProof models that emit the entire sequence in one inference. Table 5 (p. 9, beam width 10) compares models by proof length. For proof lengths 6–10, the model trained on AxiomStep10 and tested on the AxiomStep10 test set reaches 93%, 87%, 82%, 74%, and 66%. The model trained on WholeProof10 and tested on its own WholeProof10 test set reaches 72%, 63%, 54%, 47%, and 34%, and on the AxiomStep10 test set only 5%, 2%, 1%, 0%, and 0%. (The AxiomStep10-trained model scores 90%, 83%, 73%, 63%, and 46% on the WholeProof10 test set.) The table's percentages are pass rates by proof length, not percentages of all pairs.

Verus form (Inference): the neural network can propose a `Seq<Rewrite>` outside the proof; verified Rust should implement the checker, not trust the proposal. Use `spec fn` for graph semantics and `proof fn` lemmas for each rewrite category. A mutable implementation may be refined after proving an index/path invariant. The paper's LSTM/GGNN internals remain ordinary untrusted computation unless separately verified.

## evidence, assumptions, and failure modes
The main AxiomStep10 model proves 93% of 10,000 equivalent test pairs, with expressions up to 50 terms (abstract, p. 1). Table 4 reports a 93% pass rate for the AxiomStep10-trained model on the full AxiomStep10 test set of 10,000 samples (94% on depths 2-6, 6,865 samples). On depth 7 alone it passes 92% (3,135 samples), while the AxiomStep5-trained model, which never saw programs of depth 7, passes 86% on the same 3,135 samples (Table 4, p. 8). The appendix gives 93.1% for the golden model at beam width 10 (Appendix E.1, p. 19). The graph model reaches 93% at beam 10 in the mini-ablation, versus 75% for bidirectional RNN sequence-to-sequence (Table 3, p. 8). Inference: these are in-distribution synthetic linear-algebra results, not evidence for arbitrary Rust equivalence.

The authors test hand-written exercises from 2 Khan Academy matrix-algebra modules: AxiomStep10 proves all 15 equivalent pairs with beam width 1 and wider; WholeProof10 proves 12 with beam width 10 (section 6, p. 9). Non-equivalent pairs are guaranteed to be rejected only relative to the axiom system and checker. The search space is large: for an average five-step sample, about 340,000 legal proofs exist and a random legal path has roughly 1/10,000 chance to be the target (section 4, p. 6).

The paper presumes matrix and vector dimensions are appropriate for each operation and does not check them (section 3.2, p. 5), and equivalence is defined as exact structural identity after rewriting (section 3.2, p. 4-5). Inference: results hold only relative to the axiom set; when no path exists in it, the system establishes nothing about equivalence. Inference: for VL, the key reusable design is proof-carrying generation: let an agent suggest local transformations, then have verified Rust replay and check them. Existing work already demonstrates this pattern for expression equivalence; VL should measure the trusted checker and axiom library rather than claim that a neural model itself proves code.

## techniques for the catalog
- rewrite-path proofs — represent equivalence as a sequence of locally valid, semantics-preserving graph rewrites ending in structural identity
- proof-producing data generation — sample grammar programs and legal rewrites to obtain exact training paths automatically
- graph-to-sequence search — encode expression graphs, decode axiom/location tokens, and feed back intermediate graphs
- deterministic proof checking — replay each candidate rewrite and accept only a valid path to the target
- incremental proof decoding — predict one axiom at a time to generalize to longer proofs

Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "The WholeProof10 model mostly fails because it was not trained on how to apply repeated transformations at the same point in the AST."): I read the whole paper text including the appendix (Tables 7-17), and checked every quotation, number, table, section and page reference and the technique steps in the study. I changed: the link (now the arXiv page from the paper text); the 102 versus 147 axiom statement (the paper gives both and does not reconcile them); the page for the abstract-attributed quote (it is contribution 2 in section 1, p. 2, with exact wording); the OpenNMT-py and beam-search page references (pp. 7-8); the Table 5 numbers (AxiomStep10 at length 6 is 93%, not 88%; the WholeProof10 figures were the AxiomStep10 model on the WholeProof10 test set, now given correctly); the Table 4 counts (the paper gives percentages, not 9,300); the Khan Academy source of the hand-written test; and I marked the assumptions paragraph as Inference. I did not check the cited external papers, the PDF figures, or the Verus-form Inference paragraphs beyond reading them for consistency.
