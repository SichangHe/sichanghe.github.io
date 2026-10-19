# RocqStar: Leveraging Similarity-driven Retrieval and Agentic Systems for Rocq generation
(authored by agents unless marked 🧑)
Tag: `kozyrev2026rocqstar`, [paper](https://arxiv.org/abs/2505.22846v3)

## scope and result

RocqStar combines proof-aware premise retrieval with a multi-stage agent for Rocq (formerly Coq). It mines intermediate proof states, learns statement embeddings that predict proof similarity, and supplies retrieved proofs to a generator. Its agent separates planning from execution, uses multi-agent debate (MAD), and includes reflection and replanning. The abstract states: “The evaluation of the designed approach shows up to 28% relative increase of the generator’s performance.” (Abstract, p. 1.) The paper version is dated 26 January 2026 and its ACM reference gives 2026, hence the corrected tag year.

The evaluation uses 300 IMM project theorems, grouped by human reference proof length: ≤4 tactics, 131 theorems; 5–8, 98; 9–20, 71. Reference proofs longer than 20 tactics are excluded (Section 4, pp. 5–6; Table 2, p. 6). Rocq acceptance is the success criterion. The full agent solves 60%, compared with 51% for Claude 3.5 Sonnet given 12 attempts (Sections 4.1–4.2, pp. 6–7). Inference: VL can try these retrieval and agent-control patterns in Verus, replacing Rocq states, tactics, and tools with Rust/Verus source, contracts, and diagnostics.

## technique 1: mine intermediate states with BigRocq

what it is and when to use it. BigRocq converts sequential proofs into trees of valid intermediate states and reconstructs a proof for each state from its subtree. The paper states: “Extracting all intermediate statements together with their proofs allows us to expand any given Rocq theorem dataset by a factor roughly proportional to the average proof length.” (Section 2.1, p. 3.) Inference: this is useful when an existing proof corpus is too small for training.

how to do it. (1) Use Rocq and coq-lsp to obtain intermediate proof states. (2) Transform the sequential proof into a tree. (3) Follow subtree edges to reconstruct proofs for intermediate statements. (4) Store statement/proof pairs. (5) Exclude evaluation theorems from training; the authors also restrict the mined training examples to intermediate goals rather than original top-level statements (Sections 2.1 and 4, pp. 3 and 6). BigRocq yields 76,524 statements from 344 files in CompCert, IMM, Promising2Imm, and XMM, an approximately fourfold expansion (Section 2.1, p. 3). The training/validation/test split is 70%/20%/10%, with theorems from the same file kept together (Appendix A, p. 9).

Verus form. Inference: collect verified helper obligations and their proofs with the Rust context needed to replay them. A Verus obligation does not directly supply a Rocq tactic tree; extracting a reusable statement and proof would require a separate implementation. Recheck extracted examples before indexing them.

evidence and limits. Goal selectors break BigRocq's tree-construction heuristic because of limited information from Coq-LSP. The paper attributes the less-than-1% frequency to the older CoqGym dataset, not its own corpus, and says usage has increased (Appendix A, p. 9). Inference: corpus expansion alone does not measure an improvement in proof generation, and excluding evaluation theorems does not establish absence of all related training examples.

## technique 2: proof-aware similarity retrieval

what it is and when to use it. Train statement embeddings to predict similarity between corresponding proofs, then retrieve theorem/proof pairs as examples. The unknown target proof is not needed at retrieval time. In Section 2 (p. 3), the authors test statement similarity against proof distance on all 1,855,701 unordered pairs of 1,927 IMM theorems, reporting Pearson −0.154 and Spearman −0.171. Inference: this weak relationship motivates learning a different retrieval score.

how to do it. (1) Represent each proof as a tactic list. (2) Compute normalized Levenshtein distance `D_L`: insertions and deletions cost one, substitution cost is proportional to the edit distance between tactic strings, and normalization uses maximum proof length. (3) Define `proof_distance = 0.7 D_L + 0.3 D_J + γ`, where `D_J` is Jaccard distance between proofs and `γ` is uniform noise in [−0.001, +0.001]. (4) Mark pairs positive below 0.3 and negative above 0.65; also admit pairs in [0.45, 0.65] as hard negatives with 30% probability. (5) Fine-tune the 108-million-parameter CodeBERT encoder using InfoNCE, cosine similarity of normalized statement embeddings, and 100 negatives per statement (Sections 2–2.2, pp. 3–4; Appendix A, p. 9). Training uses 22,000 steps, batch size 16, embedding dimension 768, maximum sequence length 128, dropout 0.1, and AdamW with 10% linear warmup (Appendix B, p. 9).

For evaluation, rank proven theorems within the target's file, provide the top seven as few-shot context, request 12 proof attempts, and count the theorem solved if Rocq accepts any attempt (Section 4.1, p. 6). This seven-example setting differs from the agent tool `get_similar_proofs`, which returns 15 examples (Appendix C, p. 9).

Verus form. Inference: train a contrastive ranker over verified Rust/Verus statements and a chosen measure of proof similarity. Retrieve helper lemmas with their contracts and proofs, including the types and invariants needed to interpret them. The paper does not supply a Verus proof-distance measure or evaluate this transfer.

evidence and limits. With Claude 3.5, RocqStar retrieval scores 61% ± 4%, 36% ± 5%, and 21% ± 5% across the three proof-length groups; Jaccard scores 58% ± 5%, 28% ± 5%, and 16% ± 5%. RocqStar also exceeds the untrained ModernBert baseline in each group (Table 1, p. 6). The paper states: “The reported values denote mean success rates, and the ± intervals correspond to the standard deviation across three independent runs.” (Section 4.1, p. 6.) Its explanation for smaller gains on longer proofs is that similar proofs are rarer there. Inference: the results support retrieval on this benchmark, without establishing performance on other projects or Verus.

## technique 3: verifier-aware tools and valid-prefix recovery

what it is and when to use it. A REST API over coq-lsp, wrapped by an MCP server, exposes proof checking, context inspection, and search. The paper describes the checker: “It not only verifies whether a proof is valid but, in case of an error, returns detailed diagnostic information: the error message, its exact location, the valid prefix preceding the error, and the remaining goals after that prefix.” (Section 3, p. 4.) Inference: this interface can help an agent continue from partial progress.

how to do it. (1) Start a session with the target theorem's required context and type-check it. (2) Expose theorem/file listing, current-state inspection, `check_proof`, `get_similar_proofs`, `about_term`, `search_pattern`, `print_term`, and `check_term`. (3) Check complete or partial proofs in that session. (4) Return errors or remaining goals, including goals at other depth levels when the current goal is solved (Appendix C, pp. 9–10). The executor uses these tools as atomic actions (Section 3.1, p. 5).

Verus form. Inference: wrap Verus checking, diagnostics, contract inspection, and library search. Rocq's valid-prefix mechanism would need adaptation: a Rust source prefix is not automatically a valid proof state. Replay repairs in the complete Rust item and check the final source with Verus.

evidence and limits. The paper describes the tool interface but does not isolate its contribution in an ablation. Inference: successful transfer depends on preserving the context and meaning of remaining obligations, not merely copying tool names.

## technique 4: multi-agent debate planning and execution

what it is and when to use it. A pro LLM proposes and defends a plan; a con LLM critiques it. A judge receives their debate and produces a final plan. Repeating this yields `k` plans, which a scoring LLM ranks; the top `l` proceed to execution (Section 3.1, p. 5). Inference: the pattern is useful to test when single-pass plans repeatedly lead to failed proofs.

how to do it. (1) Supply the target theorem and its file. (2) Run pro/con debates and ask a judge for final plans. (3) Score the plans. (4) Execute selected plans with domain tools. (5) When the tool-call budget is exhausted, summarize why the plan failed and pass that summary to execution of the next plan. Stop when a proof succeeds or strategies run out (Section 3.1, p. 5). Evaluation uses two debate rounds, four generated plans, two selected plans, and 20 tool calls per plan. Claude 3.5 Sonnet handles planning, execution, and replanning; Claude 3.7 Sonnet is the critic; Gemini Flash 2.0 handles other tasks requiring a large context (Sections 3.1 and 4.2, pp. 5–6).

Verus form. Inference: have agents propose, critique, and score Rust/Verus proof strategies before execution. Plans can identify contracts, invariants, and helper lemmas. Verus acceptance remains the prerequisite check for accepting a candidate proof.

evidence and limits. On IMM-50, the full agent solves 91%, 56%, and 33% across groups of 22, 16, and 12 theorems, totaling 66%. Removing MAD gives 86%, 44%, and 17%, totaling 56%; removing planning entirely gives 58% overall (Table 3, p. 6). Inference: 66% versus 56% is about an 18% relative increase using rounded table values; the paper describes it as 20%. The estimated agent cost is $1.30 per theorem versus $0.25 for 12 plain Claude 3.5 requests (Section 4.2, p. 7). Appendix E (pp. 10–11) gives rough financial estimates and says the agent evaluation ran only once without confidence intervals. It separately estimates retrieval-evaluation Claude requests at $0.12 per theorem; the paper does not reconcile these cost estimates.

## technique 5: reflection-triggered retrieval and replanning

what it is and when to use it. Reflection asks a critic to assess the current proof state, retrieves examples for the remaining goal, and revises the plan. Inference: this may help recover from a strategy that has stopped making progress.

how to do it. (1) Track consecutive erroneous proof attempts. (2) Invoke a critic when the threshold is exceeded. (3) Retrieve theorem/proof pairs whose top-level goals have similar RocqStar embeddings to the remaining goal. (4) Ask an LLM to explain useful tactic sequences. (5) Send criticism and examples to a separate replanner. (6) Return the whole message history to the executor (Section 3.1, p. 5). The trigger description differs within the paper: Section 3.1 says “once this number exceeds a predefined threshold (set to five during evaluation)”; Section 4.2 (p. 6) says “after five proof-checking calls”. Inference: the exact trigger cannot be determined consistently from these descriptions alone.

Verus form. Inference: use repeated Verus failures to trigger obligation-based retrieval and plan revision. Keep the intended contract explicit so that changing a proof does not silently change the property being checked.

evidence and limits. Removing reflection lowers success from 66% to 48% overall and from 33% to 8% in the 9–20-tactic group (Table 3, p. 6). The authors state: “All experiments are performed on the IMM-50 dataset, with all other system components kept unchanged.” (Section 4.3, p. 7.) Inference: this is evidence for the combined reflection mechanism; it does not separately quantify criticism, forced retrieval, and replanning.

## what is proved, trusted, and missing

The experiments measure proof acceptance in Rocq, using the fixed IMM benchmark. Reference proofs of at most 20 tactics cover 83% of IMM proofs; longer proofs were not evaluated (Appendix D, p. 10). The authors acknowledge possible contamination of cloud LLM training because IMM is public. Modified goal presentation and premise-sensitive behavior are their arguments for mitigation, not a demonstration that contamination is absent (Appendix D, p. 10). The agent's full evaluation is a single run; retrieval results average three runs (Section 4.1, p. 6; Appendix E, p. 11).

Inference: Rocq acceptance establishes the submitted proof against its stated theorem under the proof system's assumptions. It does not establish that the specification expresses a desired product behavior. Learned retrieval and LLM plans guide proof search and still require checking. The paper does not evaluate Rust/Verus, dependency changes, or proof maintenance. VL should measure those directly before assuming these patterns improve its own results.

## techniques for the catalog

- intermediate-state mining — expand proof corpora by extracting valid subgoals and their proofs from existing files
- proof-aware retrieval — train a contrastive statement encoder to rank premises by proof similarity
- verifier-aware valid-prefix tools — return diagnostics, remaining goals, and the accepted prefix for incremental repair
- multi-agent debate planning — generate, critique, score, and execute formal-proof strategies
- reflection and replanning — trigger retrieval and plan repair after repeated verifier failures

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "All experiments are performed on the IMM-50 dataset, with all other system components kept unchanged."): checked the full paper, quotations, numbers, page and section references, technique steps, tag year, and paper link; corrected the year, page references, substitution cost, training details, retrieval counts, and reflection-trigger ambiguity, and marked conclusions as inferences; did not check external code, model artifacts, or reproduce experiments.
