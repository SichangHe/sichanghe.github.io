# Learning an Effective Premise Retrieval Model for Efficient Mathematical Formalization
(authored by agents unless marked 🧑)
Tag: `tao2025premiseretrieval`, [paper](https://arxiv.org/abs/2501.13959v3)

## scope and result

This paper trains a lightweight retriever that selects useful Lean premises for a proof state. It extracts Mathlib data, trains a domain tokenizer and pretrains BERT encoders, retrieves candidates by a dense model, then reranks them with a context-aware cross-encoder. The abstract says the model “embeds queries (i.e., proof state provided by Lean) and premises in a latent space, featuring a tokenizer specifically trained on formal corpora.” Inference: the retrieval scores rank lemmas; they do not establish that a lemma applies to a proof state. The abstract reports: “Experimental results demonstrate that our model outperforms existing baselines, achieving higher accuracy while maintaining a lower computational load.”

## technique: extract a proof-state/premise corpus

Use this when a formal library has declarations and proof traces but retrieval training data is sparse.

1. Extract theorem declarations, stepwise proofs, and tactic-premise pairs from Mathlib4 tag v4.10.0 using an extended LeanDojo extraction script (section 3.1, PDF p. 3; Appendix A, PDF p. 12)
2. Represent each premise p as arguments Γp and goal Gp; represent a state s as context Γs and goal Gs (section 3.1, PDF p. 3)
3. Associate both the state before and the state after a tactic with the premises used in that step; group relevant premises Pi by distinct state (section 3.1, PDF p. 3)
4. Build the searchable theorem corpus and training pairs; the paper extracts 149,549 premises (Figure 3, PDF p. 4)

Appendix A (PDF p. 12) states: “The proofs are lists of tactics, with the state before/after the tactics and premises used in each step.” Inference: for Verus, extract Rust/Verus proof states, lemma declarations, `requires`/`ensures`, and successful lemma-call traces into query-premise pairs. A retrieved lemma is a suggestion; Verus must still check its application and contract.

## technique: formal-language tokenizer and masked pretraining

Use this when a general tokenizer poorly represents formal syntax.

1. Train a WordPiece tokenizer on the formalized corpus (section 3.3, PDF p. 5)
2. Use it for both context-free retrieval (CFR) and context-aware reranking (CAR) modules (section 3.3, PDF p. 5)
3. Pretrain both encoders with masked language modeling on training-set states and all corpus premises’ argument lists and goals (sections 3.3–4.1, PDF pp. 5–6)
4. Fine-tune the modules separately on state-premise pairs using contrastive objectives (section 3.3, PDF p. 5)

Section 4.3 (PDF p. 7) reports: “This table shows a performance improvement when the model is pre-trained on the Lean corpus compared to not performing pre-training.” Holding the new tokenizer and equation (3) fixed, Table 3 reports random-split CFR R@10 of 30.33 without pretraining and 37.70 with pretraining. These are retrieval recall percentages, not theorem-proving success rates. The ablation does not show improvement on every metric: equation (3) gives R@5 of 25.81 versus 25.87 for equation (2).

Inference: a Verus retriever should train its tokenizer on Rust and Verus syntax, including specification and proof constructs. Pretraining does not prove semantic equivalence, and a domain tokenizer cannot repair an incorrect lemma contract.

## technique: context-free dense retrieval with fine-grained similarity

Use this for fast first-stage retrieval over a large premise library.

1. Remove theorem names and normalize premise text by prepending `<VAR>` to each context element and `<GOAL>` to its goal; apply the same format to proof-state context and goal (section 3.2, PDF p. 4)
2. Encode state and premise with a shared BERT-style encoder and average-pool the last hidden states (section 3.2, PDF p. 4)
3. Encode a premise's arguments Γp and goal Gp separately
4. Score a state-premise pair with the average of cosine similarity to Γp and to Gp, rather than one undifferentiated embedding (equation 3, section 3.2, PDF p. 4)
5. Retrieve the top-k1 candidates from the vector index (section 3.2, PDF p. 5)

The reason for separate fields is that a state may match either a premise's hypotheses or its conclusion; the paper says the design “aims to explicitly measure the similarity from both perspectives” (section 3.2, PDF p. 4). Inference: for Verus, separate assumptions, function signatures, and postconditions when embedding lemmas. Keep k1 large enough for recall, then pass only candidates to the expensive reranker. Cosine scores rank candidates but do not establish that a lemma is applicable.

## technique: context-aware hard-negative reranking

Use this when embedding similarity misses interactions between the current proof state and a candidate premise.

1. Concatenate the state and each top-k1 premise with `[SEP]` (section 3.2, PDF p. 5)
2. Feed the pair to a BERT cross-encoder; classify relevance from the `[CLS]` embedding through an affine layer and sigmoid (equation 4, section 3.2, PDF p. 5)
3. During training, keep one positive and hard negatives sampled from the CFR top-k1 list (section 3.3, PDF p. 5)
4. Optimize cross-entropy over the positive-versus-negative probability set (equation 6, section 3.3, PDF p. 5)
5. At inference, rerank the top-20 CFR candidates and return top-k2 results (section 4.1, PDF p. 6)

Section 3.3 (PDF p. 5) states: “We sample hard negatives from the top-k1 premises selected by the retrieval model and they will be used in the re-ranking model training process.” The implementation selects top-100 results as hard-negative candidates for training, then reranks top-20 candidates at inference (section 4.1, PDF p. 6). Inference: a Verus reranker can classify whether a candidate's contract likely matches the current state, but it must not be allowed to bypass Verus checking. Cache embeddings and rerank only a bounded candidate set to control latency.

## technique: contrastive learning and in-batch negatives

For every training state si and relevant premise pij, construct P'ij with one positive and sampled negatives. Minimize the temperature-scaled softmax loss over similarity (equation 5, section 3.3, PDF p. 5). The implementation uses homogeneous in-batch negative sampling: for batch size B, the paper states that each query receives B×|P'ij|−1 negatives, excluding its other positives (section 3.3, PDF p. 5). The CAR module uses the same framework but samples harder negatives from CFR results.

Inference: the same loss can train retrieval over Verus proof states and lemmas, with negatives from unrelated modules and near-matching contracts. Negative labels are a dataset assumption; a lemma omitted from a proof trace may still be valid, so recall metrics should distinguish “not observed” from “proved irrelevant.”

## technique: retrieval-augmented tactic generation

Train the tactic generator independently of the retriever. Section 3.3 (PDF p. 5) states: “As a substitution of the retrieval model, we randomly select the positive and negative premises from the library and prepend them to the state, thereby creating premise-augmented state-tactic pairs.” This is the paper’s generator-training procedure. Add up to ten premises per tactic: choose the positive count randomly from one to min(available positives, ten); fill the remaining entries with negatives, half from the positive premises’ module and half from other modules. Fine-tune ByT5 with cross-entropy on these pairs. At evaluation, supply retrieved premises to the generator (sections 3.3 and 4.5, PDF pp. 5 and 8).

## evaluation design and evidence

The authors evaluate on four splits: random (RD), reference-isolated (RI, validation and test premises absent from training), proof-length weighted (PL), and premise-frequency weighted (PF). Each split has 65,567 training theorems, 2,000 validation theorems, and 2,000 test theorems (section 4.1, PDF p. 6). Metrics are Precision, Recall, F1, and nDCG with relevance scores 1 for a premise used by the tactic, 0.3 for another premise from the same module, and 0 otherwise (Table 1, PDF p. 6).

On RD, the method's R@1/R@5/R@10 are 15.17/38.20/46.53 and n@10 is 0.5163; ReProver is 11.79/28.78/36.69 and 0.4617 (Table 2, PDF p. 7). On the harder RI split, the method is 7.79/23.38/30.91 at R@1/5/10 and 0.4322 n@10, versus ReProver's 5.05/14.26/19.48 and 0.3563 (Table 2, PDF p. 7). The recall entries are percentages; nDCG is a normalized ranking score. The paper gives the number of test theorems but does not specify the precise aggregation of these metrics over extracted proof states. A denominator of 2,000 for these recall values is therefore unsupported.

Robustness tests perturb a subset of test queries by shuffling context or, for states with at least 15 context elements, removing 20% of context. Section 4.4 (PDF p. 8) reports “a maximum drop of approximately 6% when k = 5, 10 compared to the unperturbed case” and notes that “performance even improves when k = 1.” Figure 6 normalizes these results to the no-perturbation value. On MiniF2F, retrieval-augmented tactic generation reaches pass@1 30.74% versus ReProver 28.28%; the paper does not state the MiniF2F task-count denominator in the cited paragraph (section 4.5, PDF p. 8). The experiments use eight RTX 4080 servers; both retrieval and reranking BERT models have six layers, 12 attention heads per layer, hidden size 768, intermediate size 3,072, and vocabulary size 30,522 (section 4.1, PDF pp. 5–6).

Section 4.5 (PDF p. 9) qualifies the proving results: “However, on the RD test sets, our model performs slightly worse than ReProver, despite the improvement in retrieval accuracy.” The authors suggest that longer contexts can burden smaller generators; this is an explanation they propose, not a demonstrated cause. The conclusion calls for evaluation with stronger provers (section 5, PDF p. 9). Inference: evaluating retrieval against recorded tactic usage assumes those traces adequately represent relevance; a useful but unused premise can be missed by such labels. These experiments do not establish transfer to Verus.

## techniques for the catalog

- formal-corpus extraction — build premise/state pairs from declarations, proof steps, and tactic usage
- domain tokenizer pretraining — train WordPiece and masked-language encoders on formal syntax before retrieval fine-tuning
- fine-grained dense retrieval — score state similarity separately against premise assumptions and goals
- hard-negative reranking — cross-encode top dense candidates and learn from near-miss premises
- in-batch contrastive learning — train one positive against sampled and batch negatives with temperature-scaled loss
- retrieval-augmented proving — append selected premises to a tactic generator while keeping retrieval independently trained
- isolated evaluation — test on premises absent from training to measure generalization rather than memorization
