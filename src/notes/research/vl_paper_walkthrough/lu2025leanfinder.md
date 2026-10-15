# Lean Finder: Semantic Search for Mathlib That Understands User Intents
(authored by agents unless marked 🧑)
Tag: `lu2025leanfinder`, [paper](https://arxiv.org/abs/2510.15940)

## what the paper measures

Lean Finder is a retrieval model for Lean and mathlib statements. The target problem is locating a lemma when a user’s question does not match declaration names or a formal goal. The authors report a training corpus of 1.4 million query–statement pairs and 582,102 synthetic user queries across five intent clusters. Test sets contain 1,000 informalized statements, 1,000 formal statements, 1,000 synthetic queries, and 2,224 proof states. Recall@K and mean reciprocal rank are measured; GPT-4o is evaluated separately with exact full-name and relaxed stem matching.

On informalized statements, Lean Finder reaches Recall@1/5/10 of 64.2/88.9/93.3 and MRR 0.75. On synthetic user queries it reaches 54.4/84.4/91.4 and 0.68. On augmented statements it reaches 82.7/97.0/97.7 and 0.89. On raw proof states, where it was not explicitly trained, it reaches 8.3/30.1/40.0 and 0.19. These denominators are the stated test-set sizes for each modality; the percentages are retrieval rates, not proof success. A user study with five participants and 128 GitHub queries gives Lean Finder 139 first-place votes, a top-three rate of 81.6%, and normalized Borda 0.67; the vote counts are across the 128 queries after invalid “All Bad” or “I don’t Know” ballots are removed from the top-three denominator. The paper says: “We present Lean Finder, a semantic search engine for Lean and mathlib that understands and aligns with the intents of mathematicians.” (abstract, PDF p. 1)

## technique 1: discover user intents from real discussions

What it is and when to use it: model the ways users actually ask for formal code before synthesizing training queries. Use it when existing retrieval data consists only of LLM informalizations and may miss practical questions.

How to do it (paper, §3.1.1): collect up to the first five messages from five active Lean Zulip channels and GitHub. Ask GPT-4o to retain discussions answerable by Lean statements and paraphrase each main question. The process yields 693 real discussions. Prompt o3 to bootstrap clusters from a subset, then feed additional discussions to iteratively update or add clusters. The five resulting clusters are existing code/lemma search, metaprogramming and tactic questions, type-class/instance/axiom issues, proof engineering/everyday Lean, and library design/large-scale formalization. The paper reports: “We first prompt OpenAI o3 to bootstrap the initial set of clusters from a subset of collected queries. Then, the same model is fed with more user discussions and is prompted to iteratively update existing clusters or introduce new clusters if necessary.” (section 3.1.1, PDF p. 4)

Verus form (Inference): classify Verus-agent requests into analogous intents such as lemma search, invariant debugging, API-contract questions, and library design. Store the classifier’s labels as retrieval metadata. Classification is an auxiliary tool; Verus’s verifier still checks the returned Rust and specifications. The paper’s use of private Zulip/GitHub collections also creates a data-governance assumption that VL must handle explicitly.

## technique 2: reverse-synthesize realistic queries

What it is and when to use it: start from a formal statement and generate plausible user questions grounded in its content, rather than trying to recover a missing answer for each real question. Use it when genuine question-to-answer pairs are too sparse.

How to do it (paper, §3.1.2): assume each formal statement could answer an unknown query. First ask GPT-4o which intent clusters apply to that statement; this filters irrelevant perspectives. For each selected cluster, provide the formal/informal statement and cluster definition and ask GPT-4o to generate realistic queries. The result is 582,102 synthetic queries. The paper states: “To avoid forcing every statement into all intent clusters, we adopt a two-step procedure.” (section 3.1.2, PDF p. 5)

Verus form (Inference): apply the same procedure to verified Rust declarations, contracts, and proof states; generate requests such as a question about which lemma establishes a sequence index bound and retain the statement as the retrieval target. Treat synthetic wording as search data, never as proof evidence. A reviewer should reject generated queries whose target contract is unrelated.

Evidence and limits: synthesized queries improve alignment in the reported retrieval tests, but the paper’s “ground truth” remains the originating formal statement. It does not prove that a synthetic query is a question a human would ask or that one statement is the best answer.

## technique 3: build multimodal code-search pairs

What it is and when to use it: represent one formal declaration through several searchable modalities so retrieval works from partial memory, natural language, or a proof state.

How to do it (paper, §3.2): collect statements from mathlib, GitHub repositories linked to research papers, and domain libraries. Produce (1) GPT-4o informalizations with dependent, related, and neighboring statements as context; (2) augmented proof states that describe the intended direction of progress; (3) formal declarations without proof bodies; and (4) synthetic user queries. Pair each with the source statement. The paper reports: “We additionally incorporate the following data sources and modalities, releasing the largest code search dataset for Lean and mathlib4.” (section 3.2, PDF p. 5)

Verus form (Inference): index executable signatures, `requires`/`ensures` contracts, proof-state obligations, and neighboring lemmas as separate fields. A retrieval result should include the exact Verus declaration and version so an agent cannot silently substitute a similarly named contract. This is compatible with Verus libraries but does not enlarge the verifier’s trusted language.

## technique 4: contrastive retrieval with in-batch negatives

What it is and when to use it: train an embedding model so a query is close to its matching formal statement and far from other statements, including statements in the same batch.

How to do it (paper, §3.3.1): use the final hidden state of the final token of DeepSeek-Prover-V1.5-RL 7B as the sequence embedding. Create groups of size G containing one positive code and G−1 negatives; a batch of B groups gives B·G candidates. Replace 20% of formal-query tokens with random vocabulary tokens in the test noise setting; during training apply token-level augmentation. Treat every other code in the batch as a negative and optimize the stated temperature-scaled cosine contrastive loss. The paper says: “For a given query qi , we apply token-level augmentation to obtain q̃i , enhancing robustness to noisy or partial queries (e.g., misspellings or incomplete recollection).” (section 3.3.1, PDF p. 6)

Verus form (Inference): use embeddings only to propose candidate lemmas. Then compile the candidate Rust/Verus code and require verification before accepting it. A proof can establish that a selected lemma’s contract applies; no embedding similarity score is a proof of applicability.

Evidence: Recall@10 on augmented proof states is 67.9, versus 39.6 for Lean State Search and 39.2 for Real Prover Search, over 2,224 proof-state queries. Raw-proof-state Recall@10 is 40.0 despite no explicit raw-state training. The cross-modal result supports robust retrieval but does not show that retrieval improves final proof success.

## technique 5: align retrieval with user preferences

What it is and when to use it: fine-tune retrieval rankings from explicit human votes and blinded model comparisons after initial contrastive training.

How to do it (paper, §3.3.2): collect triplets `(q, c+, c−)` where a chosen statement is preferred to a rejected one. Obtain item-level up/down votes and model-level preferences between Lean Finder and Lean Search from users and GPT-4o judgments; the paper reports 1,154 triplets. Define DPO over query–code similarity relative to the frozen contrastive retriever, and jointly optimize `L = L_DPO + λ L_contrastive` to prevent general retrieval degradation. The paper states: “These preferences are used to further improve Lean Finder via Direct Preference Optimization (DPO (Rafailov et al., 2024), Section 3.3.2), resulting in a human-aligned boosted Lean Finder.” (Figure 5 caption, PDF p. 7)

Verus form (Inference): preference alignment can rank contracts by usefulness, but never bypass compilation or proof checking. Keep the reference index and library version fixed when measuring regressions. Human and LLM votes are trusted labels, not formal correctness evidence.

## what remains trusted and relevance to VeruLaw

The Lean kernel, mathlib declarations, data-source licensing, statement informalizations, synthetic-query generation, evaluator matching rules, and human/LLM preference labels remain outside the retrieval proof. The user study has only five participants, and the RAG integration shows mostly consistent rather than decisive prover gains. Inference: the direct VL opportunity is an intent-aware Verus lemma search service trained on real proof failures and verified contracts. The main product threat is retrieval-induced misuse: an agent may select a nearby but semantically wrong contract, then produce a valid proof of the wrong obligation. Require exact declaration/version display and a verifier check before accepting retrieval results. The paper’s search infrastructure is new to this batch; VL should reuse its multimodal indexing and preference feedback rather than build another generic theorem benchmark.

## techniques for the catalog

- intent clustering — classify real proof questions into stable user perspectives before data synthesis
- reverse query synthesis — generate grounded user questions from formal statements after filtering applicable intents
- multimodal statement indexing — index informalizations, proof states, declarations, and synthetic queries together
- contrastive lemma retrieval — train embeddings with positives, in-batch negatives, and noisy-query augmentation
- preference-aligned ranking — combine human/LLM retrieval preferences with a contrastive objective via DPO
Checked 2026-10-15 against paper lu2025leanfinder: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
