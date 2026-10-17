# Formal Premise Selection With Language Models
(authored by agents unless marked 🧑)
Tag: `tworkowski2022formal`, [paper](https://doi.org/10.5281/zenodo.7823669)

## method
The paper addresses premise selection for interactive theorem proving. The Abstract defines the problem: “Premise selection, the problem of selecting a useful premise to prove a new theorem, is an essential part of theorem proving” (Abstract, p. 1). The Abstract says “Existing language models cannot access knowledge beyond a small context window”, so the system combines a premise-selection model (PSM) with a premise-guided language model (PGLM). The authors describe the two-stage procedure as follows: “Firstly, a premise selection model (PSM) picks a handful (e.g. 8) of premises from a database. These are then presented, along with a proof state, to a premise selection guided language model (PGLM) responsible for generating a proof step” (Section 1, p. 1).

### retrieval model
Use this when the proof environment has a large lemma database and a current proof state. Steps in Section 2:
1. Encode each proof state and premise text into vectors.
2. Train the PSM with batch contrastive learning; cosine similarity estimates relevance.
3. Precompute and cache premise embeddings so queries do not re-encode the full database.
4. At inference, retrieve the top-k premises (the main result in Appendix A.1 uses `k = 4`; Section 2 and the Abstract give `k = 8` only as an example, "e.g. k = 8", and the paper reports no proof-rate result for `k = 8`, only recall@8 in Table 2).

The paper states: “It encodes proof state and premise text into embeddings. The cosine similarity of a given premise embedding and a proof state embedding estimates their mutual relevance” (Section 2, p. 1). Appendix A.2 modifies the InfoNCE loss to use only a row-wise softmax (the paper says column-wise softmax “is ablated” but reports no result for it), with a batch of 512 proof states and 2,048 premises per batch, so each proof state has exactly one positive and 2,047 negatives; 1,536 of the premises are additionally sampled negatives, which the paper says it finds “helpful to the score”. The PSM is a non-pretrained six-layer decoder-only transformer with 15M non-embedding parameters.

Verus form (Inference): index Verus `lemma` and specification declarations by normalized text or syntax embeddings. At a proof obligation, retrieve candidate lemmas and expose them selectively to the solver or to an LLM that proposes Verus proof steps. Retrieval proposes facts; Verus's verifier must still check `requires`, `ensures`, loop invariants, and proof blocks. The Isabelle/PISA proof-state encoding does not transfer directly, and the premise database must preserve Verus types and namespaces.

### premise-guided generation
Freeze the trained PSM, then train PGLM to generate the next proof step from the current state plus selected premise names and statements. The paper says, “We first train the PSM, then freeze the weights and use it in the training process of PGLM” (Section 2, p. 2). By design, the PGLM receives a small context of k premises and selects the relevant ones to apply in the generated proof step (Section 2); Appendix B describes a proof step as “a proof tactic or part of a declaration”. The state-only model receives only the proof state and is the baseline.

The appendix gives a reproducible setup: a 30M-parameter decoder-only transformer, GPT-J-compatible initialization, a pretrained BPE tokenizer, 500K pretraining steps on The Pile GitHub+arXiv data, context length 2,048, and total batch size "217 tokens per update" (Appendix A.1, p. 5; Inference: the text extraction probably dropped a superscript and this means 2^17 tokens, not 217). The dataset contains 220K lemmas and 2.4M proof-state/proof-step pairs; for the premise selection task, the authors kept only proof steps that used at least one premise, giving 400K training examples (Appendix B, p. 5). The main PGLM+PSM model uses top k = 4 premises (Appendix A.1); Appendix E shows an example input with 4 premises.

Verus form (Inference): provide retrieved candidate lemma names and signatures in an LLM prompt, ask for a proof block, then compile and verify the generated Rust. Candidate facts should be imported with explicit `use` or qualified names; do not treat generated text as evidence. A failed Verus check is the rejection signal and can feed retrieval or repair.

## evidence and ablations
Table 1 evaluates a best-first-search solver on 1,000 test theorems. Full proof rates are Sledgehammer 22.4%, state-only 39.8%, PGLM+PSM 43.1%, and the union of PGLM+PSM with state-only 47.2%. For the subset requiring at least one premise, the corresponding rates are 17.7%, 14.7%, 19.6%, and 22.6%; for zero-premise theorems they are 27.5%, 67.1%, 68.6%, and 73.9%. The denominator is the 1,000-theorem test set, split by premise use; the table's timeout note says Sledgehammer uses 50 seconds per proof. The paper reports that the method “performs significantly better on theorems that require at least one premise” (Section 3, p. 2), and that “both methods have complementary strengths” (Section 3, p. 2). The paper does not say how the union row is computed. Inference: the union gains suggest retrieval does not replace state-only reasoning.

Table 2 measures top-k retrieval recall on the test dataset, defined as the percentage of proof states whose ground-truth premise appears among the top k. The six-layer model with extra negatives reaches recall@1 0.230, @4 0.446, @8 0.561, @16 0.656, @64 0.793, and @128 0.839. Removing extra negatives gives 0.203, 0.408, 0.516, 0.621, 0.781, and 0.832; a one-layer model gives 0.168, 0.347, 0.447, 0.565, 0.663, and 0.809. Table 2 is on p. 6. The paper says, “We observe a significant drop in recall with the changes” (Appendix C, p. 5). Appendix D (pp. 6–7) gives two example proofs: Proof 1 is shorter than the original, and in Proof 2 the state-only model failed while PGLM+PSM found “a fundamentally different proof without using metis”. These are examples, not a success denominator.

## techniques for the catalog
- embedding premise retrieval — encode proof states and lemmas, cache vectors, and rank by cosine similarity
- contrastive negative sampling — train with one positive and many negative premises per proof state, 1,536 of them additionally sampled
- premise-guided proof generation — freeze retrieval, condition an LLM on top-k premises, and generate the next proof step
- retrieval-plus-baseline union — report the union of PGLM+PSM and state-only results (Table 1; the paper does not describe how the union is formed)
