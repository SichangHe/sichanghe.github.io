# Learning an Effective Premise Retrieval Model for Efficient Mathematical Formalization
(authored by agents unless marked 🧑)
Tag: `tao2025premiseretrieval`, [paper](https://www.semanticscholar.org/paper/6bd9a9e48eb228a178c63309114f9facec181241)

## scope and result

This paper trains a lightweight retriever that selects useful Lean premises for a proof state. It extracts Mathlib data, pretrains a domain tokenizer and encoder, retrieves candidates by a dense model, then reranks them with a context-aware cross-encoder. The abstract says the model “embeds queries (i.e., proof state provided by Lean) and premises in a latent space, featuring a tokenizer specifically trained on formal corpora.” The method is retrieval infrastructure rather than a verifier: it ranks lemmas, while Lean remains the proof checker. The abstract reports: “Experimental results demonstrate that our model outperforms existing baselines, achieving higher accuracy while maintaining a lower computational load.”

## technique: extract a proof-state/premise corpus

Use this when a formal library has declarations and proof traces but retrieval training data is sparse.

1. Extract theorem declarations, stepwise proofs, and tactic-premise pairs from Mathlib4 (section 3.1, PDF p. 3)
2. Represent each premise p as arguments Γp and goal Gp; represent a state s as context Γs and goal Gs (section 3.1, PDF p. 3)
3. Associate each state with its relevant premises Pi, those used by the tactic or proof step (section 3.1, PDF pp. 3–4)
4. Build the searchable theorem corpus and training pairs; the paper extracts 149,549 premises (Figure 3, PDF p. 4)

The corpus is not just natural language: it preserves Lean context, goals, declarations, and proof-step relationships. Inference: for Verus, extract Rust/Verus proof states, lemma declarations, `requires`/`ensures`, and successful lemma-call traces into query-premise pairs. A retrieved lemma is a suggestion; Verus must still check its application and contract.

## technique: formal-language tokenizer and masked pretraining

Use this when a general tokenizer poorly represents formal syntax.

1. Train a WordPiece tokenizer on the formalized corpus (section 3.3, PDF p. 5)
2. Use it for both context-free retrieval (CFR) and context-aware reranking (CAR) modules (section 3.3, PDF p. 5)
3. Pretrain both encoders with masked language modeling on concatenated states and premise argument/goal text (section 3.3, PDF p. 5)
4. Fine-tune the modules separately on state-premise pairs using contrastive objectives (section 3.3, PDF p. 5)

The authors report that pretraining on Lean text improves retrieval because the model acquires syntax and semantic information before pair training (section 4.3, PDF p. 7). Table 3's random-split CFR ablation gives R@10 29.05 without pretraining, versus 37.70 with pretraining, tokenizer, and fine-grained similarity (Table 3, PDF p. 7); each value is a percentage over the random test split, not a theorem-proving success rate.

Inference: a Verus retriever should train its tokenizer on Rust and Verus syntax, including specification and proof constructs. Pretraining does not prove semantic equivalence, and a domain tokenizer cannot repair an incorrect lemma contract.

## technique: context-free dense retrieval with fine-grained similarity

Use this for fast first-stage retrieval over a large premise library.

1. Normalize premise text by prepending `<VAR>` to context variables and `<GOAL>` to its goal; apply the same format to proof-state context and goal (section 3.2, PDF p. 4)
2. Encode state and premise with a shared BERT-style encoder and average-pool the last hidden states (section 3.2, PDF p. 4)
3. Encode a premise's arguments Γp and goal Gp separately
4. Score a state-premise pair with the average of cosine similarity to Γp and to Gp, rather than one undifferentiated embedding (equation 3, section 3.2, PDF p. 4)
5. Retrieve the top-k1 candidates from the vector index (section 3.2, PDF p. 5)

The reason for separate fields is that a state may match either a premise's hypotheses or its conclusion; the paper says the design “aims to explicitly measure the similarity from both perspectives” (section 3.2, PDF p. 4). Inference: for Verus, separate assumptions, function signatures, and postconditions when embedding lemmas. Keep k1 large enough for recall, then pass only candidates to the expensive reranker. Cosine scores rank candidates but do not establish that a lemma is applicable.

## technique: context-aware hard-negative reranking

Use this when embedding similarity misses interactions between the current proof state and a candidate premise.

1. Concatenate the state and each top-k1 premise with `[SEP]` (section 3.2, PDF p. 5)
2. Feed the pair to a BERT cross-encoder; classify relevance from the `[CLS]` embedding through an affine layer and sigmoid (equation 4, section 3.2, PDF p. 5)
3. During training, keep one positive and hard negatives sampled from the CFR top-k1 list (section 3.2–3.3, PDF pp. 5–6)
4. Optimize cross-entropy over the positive-versus-negative probability set (equation 6, section 3.2, PDF p. 5)
5. At inference, rerank the top-20 CFR candidates and return top-k2 results (section 4.1, PDF p. 6)

The hard-negative rule forces the reranker to distinguish plausible but wrong nearby lemmas. The reported implementation first selects top-100 hard-negative candidates, then reranks top-20 (section 4.1, PDF p. 6). Inference: a Verus reranker can classify whether a candidate's contract likely matches the current state, but it must not be allowed to bypass Verus checking. Cache embeddings and rerank only a bounded candidate set to control latency.

## technique: contrastive learning and in-batch negatives

For every training state si and relevant premise pij, construct P'ij with one positive and sampled negatives. Minimize the temperature-scaled softmax loss over similarity (equation 5, section 3.3, PDF p. 5). The implementation uses homogeneous in-batch negative sampling: for batch size B, each query receives B×(|P'ij|−1) negatives, excluding its other positives (section 3.3, PDF p. 5). The CAR module uses the same framework but samples harder negatives from CFR results.

Inference: the same loss can train retrieval over Verus proof states and lemmas, with negatives from unrelated modules and near-matching contracts. Negative labels are a dataset assumption; a lemma omitted from a proof trace may still be valid, so recall metrics should distinguish “not observed” from “proved irrelevant.”

## technique: retrieval-augmented tactic generation

After training retrieval independently, concatenate retrieved premises to each proof state and fine-tune a tactic generator. For a fair comparison, the paper trains the generator independently from retrieval and, in a substitution baseline, randomly selects positive and negative premises (section 3.3, PDF pp. 5–6). It adds up to ten premises per tactic, with the number of positives randomly selected up to the available positives or ten; remaining entries are negative (section 3.3, PDF p. 6).

Inference: VL can prepend retrieved Verus lemmas to a generation prompt or internal context, but should keep retrieval training and proof generation evaluation separate to avoid leakage. The final Rust proof must compile and verify; retrieval-augmented generation is a search aid, not evidence.

## evaluation design and evidence

The authors evaluate on four splits: random (RD), reference-isolated (RI, test premises absent from training), proof-length weighted (PL), and premise-frequency weighted (PF). Each split has 65,567 training theorems, 2,000 validation theorems, and 2,000 test theorems (section 4.1, PDF p. 6). Metrics are Precision, Recall, F1, and nDCG with relevance scores 1 for a premise used by the tactic, 0.3 for another premise from the same module, and 0 otherwise (Table 1, PDF p. 6).

On RD, the method's R@1/R@5/R@10 are 15.17/38.20/46.53 and n@10 is 0.5163; ReProver is 11.79/28.78/36.69 and 0.4617 (Table 2, PDF p. 7). On the harder RI split, the method is 7.79/23.38/30.91 at R@1/5/10 and 0.4322 n@10, versus ReProver's 5.05/14.26/19.48 and 0.3563 (Table 2, PDF p. 7). These percentages are retrieval metrics over the 2,000-test-theorem denominator per split; nDCG is a normalized ranking score, not a percentage.

Robustness tests shuffle context or remove 20% of context for states of length at least 15; all metrics show a moderate decline, with a maximum drop of about 6% at k=5 or 10 relative to the unperturbed subset (section 4.4, PDF p. 8). On MiniF2F, retrieval-augmented tactic generation reaches pass@1 30.74% versus ReProver 28.28%; the paper does not state the MiniF2F task-count denominator in the cited paragraph (section 4.5, PDF p. 8). The experiments use eight RTX 4080 servers; the BERT encoder has six layers, 12 heads, hidden size 768, and 3,072 intermediate size (section 4.1, PDF p. 6).

The work measures ranking and downstream proof pass rates, while trusting Mathlib extraction, proof-trace relevance labels, the Lean kernel, and generator training. A retrieved premise may be useful but absent from the recorded proof, so labels are incomplete. The paper itself notes that retrieval augmentation can hurt on random splits when longer prompts overwhelm smaller generators (section 4.5, PDF p. 8). Existing ReProver and LeanDojo retrieval work is prior art VL should reuse rather than rediscover.

Inference: threat to VeruLaw is moderate. Lemma retrieval is a high-value component for agent-written Verus proofs, especially for large local libraries, but ranking quality cannot replace contract checking or prove completeness. VL should adapt the three-stage corpus/CFR/CAR pipeline, formal tokenizer, hard-negative training, and isolated evaluation split. It must add Rust ownership and trait context, Verus trigger/quantifier information, and exact applicability checks.

## techniques for the catalog

- formal-corpus extraction — build premise/state pairs from declarations, proof steps, and tactic usage
- domain tokenizer pretraining — train WordPiece and masked-language encoders on formal syntax before retrieval fine-tuning
- fine-grained dense retrieval — score state similarity separately against premise assumptions and goals
- hard-negative reranking — cross-encode top dense candidates and learn from near-miss premises
- in-batch contrastive learning — train one positive against sampled and batch negatives with temperature-scaled loss
- retrieval-augmented proving — append selected premises to a tactic generator while keeping retrieval independently trained
- isolated evaluation — test on premises absent from training to measure generalization rather than memorization

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
