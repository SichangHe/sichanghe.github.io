# Lean Finder: Semantic Search for Mathlib That Understands User Intents
(authored by agents unless marked 🧑)
Tag: `lu2025leanfinder`, [paper](https://arxiv.org/abs/2510.15940)

## what the paper measures

Lean Finder is a retrieval model for Lean and mathlib statements. The target problem is locating a lemma when a user’s question does not match declaration names or a formal goal. The authors report a training corpus of 1.4 million query–statement pairs and 582,102 synthetic user queries across five intent clusters. Test sets contain 1,000 informalized statements, 1,000 formal statements, 1,000 synthetic queries, and 2,224 proof states. Recall@K and mean reciprocal rank are measured; GPT-4o is evaluated separately with exact full-name and relaxed stem matching.

Table 2 (PDF p. 9) reports that on informalized statements, Lean Finder reaches Recall@1/5/10 of 64.2/88.9/93.3 and MRR 0.75. On synthetic user queries it reaches 54.4/84.4/91.4 and 0.68. On augmented statements it reaches 82.7/97.0/97.7 and 0.89. Table 3 (PDF p. 9) reports that on raw proof states, where it was not explicitly trained, it reaches 8.3/30.1/40.0 and 0.19. These denominators are the stated test-set sizes for each modality; the percentages are retrieval rates, not proof success. The user study has five participants and 128 GitHub queries, with ties allowed. Table 4 (PDF p. 10) gives Lean Finder 139 first-place votes, a top-three rate of 81.6%, and normalized Borda 0.67. These are participant rankings, not 139 distinct queries; the top-three denominator excludes “All Bad” and “I don’t Know” ballots (§4.2, PDF p. 9). The paper says: “We present Lean Finder, a semantic search engine for Lean and mathlib that understands and aligns with the intents of mathematicians.” (abstract, PDF p. 1)

## technique 1: discover user intents from real discussions

What it is: model the ways users actually ask for formal code before synthesizing training queries. Inference: use it when existing retrieval data consists only of LLM informalizations and may miss practical questions.

How to do it (paper, §3.1.1): collect discussions from Lean Zulip and GitHub; for Zulip, retain up to the first five messages from threads in five active channels. Ask GPT-4o to retain discussions answerable by Lean statements and paraphrase each main question. The process yields 693 real discussions. Prompt o3 to bootstrap clusters from a subset, then feed additional discussions to iteratively update or add clusters. The five resulting clusters are existing code/lemma search, metaprogramming and tactic questions, type-class/instance/axiom issues, proof engineering/everyday Lean, and library design/large-scale formalization. The paper reports: “We first prompt OpenAI o3 to bootstrap the initial set of clusters from a subset of collected queries. Then, the same model is fed with more user discussions and is prompted to iteratively update existing clusters or introduce new clusters if necessary.” (section 3.1.1, PDF p. 4)

Inference: for Verus, classify Verus-agent requests into analogous intents such as lemma search, invariant debugging, API-contract questions, and library design. Store the classifier’s labels as retrieval metadata. Classification is an auxiliary tool; Verus’s verifier still checks the returned Rust and specifications. The authors collect public discussions but withhold their Zulip/GitHub collections for privacy (§3.1.1, PDF p. 4): “Due to privacy concerns, we do not release either Zulip or GitHub collections.”

## technique 2: reverse-synthesize realistic queries

What it is: start from a formal statement and generate plausible user questions grounded in its content, rather than trying to recover a missing answer for each real question. Inference: use it when genuine question-to-answer pairs are too sparse.

How to do it (paper, §3.1.2): assume each formal statement could answer an unknown query. First ask GPT-4o which intent clusters apply to that statement; this filters irrelevant perspectives. For each selected cluster, provide the formal/informal statement and cluster definition and ask GPT-4o to generate realistic queries. The result is 582,102 synthetic queries. The paper states: “To avoid forcing every statement into all intent clusters, we adopt a two-step procedure.” (section 3.1.2, PDF p. 5)

Inference: for Verus, apply the same procedure to verified Rust declarations, contracts, and proof states; generate requests such as a question about which lemma establishes a sequence index bound and retain the statement as the retrieval target. Treat synthetic wording as search data, never as proof evidence. A reviewer should reject generated queries whose target contract is unrelated.

Evidence and limits: Table 13 (PDF p. 24) reports user-study top-three rates of 76.7% without DPO and 62.9% without both DPO and synthetic queries. Appendix P.2 (PDF p. 31) states: “For informalizations, synthetic user queries, formal statement, the target is the complete Lean statement from which they were derived.” Inference: this target does not establish that a human would ask the generated question or that the statement is its best answer.

## technique 3: build multimodal code-search pairs

What it is: represent one formal declaration through several searchable modalities to support retrieval from partial memory, natural language, or a proof state.

How to do it (paper, §3.2): collect statements from mathlib, GitHub repositories linked to research papers, and domain libraries. Produce (1) GPT-4o informalizations with dependent, related, and neighboring statements as context; (2) augmented proof states; (3) formal declarations without proof bodies; and (4) synthetic user queries. For augmented states, collect unique before/after state pairs whose tactic uses at least one premise, then ask GPT-4o to describe the transition without revealing the exact theorems used (Appendix B.4, PDF p. 17). Pair these queries with the premises used in the transition, rather than necessarily the theorem being proved. The paper states: “In the case of augmented proof states, the target can be one or more Lean statements used in the corresponding proof transition.” (Appendix P.2, PDF p. 31)

Inference: for Verus, index executable signatures, `requires`/`ensures` contracts, proof-state obligations, and neighboring lemmas as separate fields. A retrieval result should include the exact Verus declaration and version so an agent cannot silently substitute a similarly named contract. This is compatible with Verus libraries but does not enlarge the verifier’s trusted language.

## technique 4: contrastive retrieval with in-batch negatives

What it is: train an embedding model so a query is close to its matching formal statement and far from other statements, including statements in the same batch.

How to do it (paper, §3.3.1): use the final hidden state of the final token of DeepSeek-Prover-V1.5-RL 7B as the sequence embedding. Create groups of size G containing one positive code and G−1 negatives; a batch of B groups gives B·G candidates. Replace 20% of formal-query tokens with random vocabulary tokens in the test noise setting; during training apply token-level augmentation. Treat every other code in the batch as a negative and optimize the stated temperature-scaled cosine contrastive loss. The paper says: “As a decoder-only architecture, only the final token in each sequence has access to the full context due to the causal self-attention.” (section 3.3.1, PDF p. 6)

Inference: for Verus, use embeddings only to propose candidate lemmas. Then compile the candidate Rust/Verus code and require verification before accepting it. A proof can establish that a selected lemma’s contract applies; no embedding similarity score is a proof of applicability.

Evidence: Recall@10 on augmented proof states is 67.9, versus 39.6 for Lean State Search and 39.2 for Real Prover Search, over 2,224 proof-state queries. Raw-proof-state Recall@10 is 40.0 despite no explicit raw-state training. Inference: these retrieval rates alone do not establish improved proof success.

## technique 5: align retrieval with user preferences

What it is: fine-tune retrieval rankings from explicit human votes and blinded model comparisons after initial contrastive training.

How to do it (paper, §3.3.2): collect triplets `(q, c+, c−)` where a chosen statement is preferred to a rejected one. Pair upvoted statements with downvoted statements. Refine blinded user comparisons between Lean Finder and Lean Search into statement preferences with GPT-4o, discarding both-bad cases. Also use GPT-4o to label helpful and unhelpful Lean Finder retrievals for Zulip queries (Appendix E, PDF pp. 18–19); the paper reports 1,154 triplets. Define DPO over query–code similarity relative to the frozen contrastive retriever, and jointly optimize `L = L_DPO + λ L_contrastive` to limit general retrieval degradation. Appendix K (PDF pp. 23–24) nevertheless reports lower retrieval metrics across most modalities after DPO; Table 13 gives top-three user-study rates of 81.6% with DPO and 76.7% without it. The paper states: “These preferences are used to further improve Lean Finder via Direct Preference Optimization (DPO (Rafailov et al., 2024), Section 3.3.2), resulting in a human-aligned boosted Lean Finder.” (Figure 5 caption, PDF p. 7)

Inference: for Verus, preference alignment can rank contracts by usefulness, but never bypass compilation or proof checking. Keep the reference index and library version fixed when measuring regressions. Human and LLM votes are trusted labels, not formal correctness evidence.

## techniques for the catalog

Inference: the following are reusable technique labels.

- intent clustering — classify real proof questions into stable user perspectives before data synthesis
- reverse query synthesis — generate grounded user questions from formal statements after filtering applicable intents
- multimodal statement indexing — index informalizations, proof states, declarations, and synthetic queries together
- contrastive lemma retrieval — train embeddings with positives, in-batch negatives, and noisy-query augmentation
- preference-aligned ranking — combine human/LLM retrieval preferences with a contrastive objective via DPO
