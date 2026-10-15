# Proving Equivalence Between Complex Expressions Using Graph-to-Sequence Neural Models
(authored by agents unless marked 🧑)
Tag: `kommrusch2021proving`, [paper](https://www.semanticscholar.org/paper/6437aab9075d2a06d277146db10b4f4135432212)

## problem and guarantee
The paper treats equivalence of typed linear-algebra expression graphs as a proof-search problem. An input pair is equivalent when semantics-preserving axioms can rewrite one graph into the other. The system predicts an ordered list of axiom applications and graph-node locations; a deterministic checker applies that list. The paper's central guarantee is: “If the sequence is verified to be valid, and S(P1) is structurally equivalent to P2, then we have proved P1 ≡ P2” (section 2, p. 2). The learned model searches; the checker carries the proof obligation.

The language has scalar, vector, and matrix variables, 16 operators, and 147 distinct axioms in the test language (section 1, p. 1; section 4, p. 6). The implementation uses 102 axiom schemas across 14 categories (Table 1, p. 6). It represents each expression as a directed data-flow graph with one root/output node.

## technique: turn rewriting into a proof path
Use this when equivalence has a trusted, semantics-preserving rewrite system and direct symbolic normalization is difficult. The paper's example starts with `a*(1*b + 1*c)` and reaches `a*c + a*b` by neutral-element, distributivity, and commutativity rewrites (section 2, p. 2).

Steps from the paper:
1. Define each axiom as a local graph rewrite, including its pattern, replacement, types, and legal node positions. For example, A1 is `1_N*x = x`; A2 distributes multiplication over addition; A3 commutes addition (section 2, p. 2).
2. Build the equivalence graph whose vertices are all language expressions and whose edges are one legal axiom application. The paper states: “Any two programs connected by a path in this graph are therefore semantically equivalent” (section 2, p. 2).
3. Represent a proof as the axiom and node-position sequence along a path. Apply each rewrite to a temporary expression and compare the final graph structurally to the target (section 2, p. 2).
4. Reject a candidate immediately when an axiom is inapplicable or the final structure differs. Non-equivalent pairs therefore cannot obtain a verified sequence.

Verus form (Inference): encode an expression as an immutable Rust enum or indexed tree, define executable rewrite functions for each axiom, and prove each rewrite's semantic preservation with `proof fn` lemmas and `ensures`. A proof sequence can be a `Seq` of tagged rewrite steps; a verifier function can use `requires` for valid node paths and `ensures` for semantic equality. Verus will not automatically accept an arbitrary neural output: the rewrite checker and axiom lemmas must be verified, and graph mutation/indices need explicit invariants.

Evidence: the paper reports that “The correctness of the rewrite rule is deterministically checkable in all cases and in negligible time” (abstract, p. 1). This validates sound acceptance, not completeness: a failed search gives only non-equivalence confidence under the available model and axioms.

## technique: generate supervised proofs automatically
Use this when hand-labeling proof paths is too expensive. The paper first samples legal programs from a grammar, then applies randomly selected legal axioms to create a target and records the path.

Steps:
1. Randomly generate grammar-conforming ASTs, limited to 50 nodes and depth 7 (section 4, p. 5).
2. Pick a node and an applicable axiom; apply it repeatedly to produce an equivalent second program and the exact rewrite sequence (section 4, p. 6).
3. Remove duplicates and form tuples `(P1, P2, S)`. The final corpus contains 1,000,000 training, 10,000 validation, and 10,000 test samples (section 4, p. 5).
4. For the incremental AxiomStep10 set, split an N-step proof into N examples that each predict one next axiom while feeding the newly rewritten intermediate expression back into the model; proofs are capped at 10 steps (section 4, p. 6).

Inference: this generator is a proof-producing oracle, so its labels are trusted only if the axiom implementation and applicability checks are correct. Random walks can underrepresent hard regions even when they have nonzero probability.

## technique: graph-to-sequence proof search
Use this when tree structure and rewrite positions matter. The model is a gated graph neural network encoder plus LSTM decoder, implemented by extending OpenNMT-py (section 5, p. 7).

Steps:
1. Initialize each graph node with its AST level and language token; use nine directed edge types plus reverse edges for child, root, and grandchild relationships (section 5, p. 7).
2. Run ten graph-message-passing iterations. Each edge type has a separate weight matrix, preserving structural roles (section 5, p. 7).
3. Feed the final root embedding through a bridge to initialize the decoder, while attention reads all node embeddings to predict axiom tokens and a left/right path to the application node (section 5, p. 7).
4. Apply the predicted axiom to construct an intermediate program. If it is not the target, infer the next step on the pair `(P', P2)` (section 5, p. 8).
5. Keep up to ten beam candidates. Check every candidate sequence deterministically; only a valid path ending in the target is accepted (section 5, p. 8).

The paper contrasts incremental AxiomStep models with WholeProof models that emit the entire sequence in one inference. Table 5 shows why incremental prediction matters: for proof lengths 6–10, AxiomStep10 reaches 88%, 87%, 82%, 74%, and 66% pass rates respectively, whereas WholeProof10 reaches 90%, 83%, 73%, 63%, and 46% on its corresponding test columns (Table 5, p. 9). The table's percentages are pass rates by proof length, not percentages of all pairs.

Verus form (Inference): the neural network can propose a `Seq<Rewrite>` outside the proof; verified Rust should implement the checker, not trust the proposal. Use `spec fn` for graph semantics and `proof fn` lemmas for each rewrite category. A mutable implementation may be refined after proving an index/path invariant. The paper's LSTM/GGNN internals remain ordinary untrusted computation unless separately verified.

## evidence, assumptions, and failure modes
The main AxiomStep10 model proves 93% of 10,000 equivalent test pairs, with expressions up to 50 terms (abstract, p. 1). Table 4 reports 9,300/10,000 overall for AxiomStep10 and 9,300/10,000 on depth-7-inclusive AS10; the 93% denominator is the full 10,000 test set. On depth 7 alone, it passes 92% (3,135 samples), while a model trained only through depth 6 passes 86% (3,135 samples) (Table 4, p. 8). The graph model reaches 93% at beam 10 in the mini-ablation, versus 75% for bidirectional RNN sequence-to-sequence (Table 3, p. 8). Inference: these are in-distribution synthetic linear-algebra results, not evidence for arbitrary Rust equivalence.

The authors test hand-written matrix-algebra exercises: AxiomStep10 proves all 15 equivalent pairs with beam width 1 and above; WholeProof10 proves 12/15 with beam 10 (section 6, p. 9). Non-equivalent pairs are guaranteed to be rejected only relative to the axiom system and checker. The search space is large: for an average five-step sample, about 340,000 legal proofs exist and a random legal path has roughly 1/10,000 chance to be the target (section 4, p. 6).

The system assumes a complete, correctly typed axiom set and exact structural comparison. It does not establish equivalence when no path exists in that set. Inference: for VL, the key reusable design is proof-carrying generation: let an agent suggest local transformations, then have verified Rust replay and check them. Existing work already demonstrates this pattern for expression equivalence; VL should measure the trusted checker and axiom library rather than claim that a neural model itself proves code.

## techniques for the catalog
- rewrite-path proofs — represent equivalence as a sequence of locally valid, semantics-preserving graph rewrites ending in structural identity
- proof-producing data generation — sample grammar programs and legal rewrites to obtain exact training paths automatically
- graph-to-sequence search — encode expression graphs, decode axiom/location tokens, and feed back intermediate graphs
- deterministic proof checking — replay each candidate rewrite and accept only a valid path to the target
- incremental proof decoding — predict one axiom at a time to generalize to longer proofs

Checked 2026-10-15 against the paper by a Codex agent for proving_equivalence_between_complex_expr_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
