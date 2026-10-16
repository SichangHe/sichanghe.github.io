# RocqStar: Leveraging Similarity-driven Retrieval and Agentic Systems for Rocq generation
(authored by agents unless marked 🧑)
Tag: `kozyrev2025rocqstar`, [paper](http://arxiv.org/abs/2505.22846v3)

## scope and result

RocqStar combines proof-aware premise retrieval with a multi-stage agent for Rocq (formerly Coq). It mines intermediate proof states, learns statement embeddings whose distances predict proof similarity, and supplies retrieved proofs to a generator. Its agent separates planning from execution, uses multi-agent debate (MAD), and triggers reflection after repeated failed checks. The abstract reports “up to 28% relative increase of the generator’s performance” for retrieval and says that debate “increases the proof success rate by 20% overall and nearly doubles it for complex theorems.” (Abstract, p. 1.)

The evaluation uses 300 IMM project theorems, grouped by human reference proof length (≤4: 131, 5–8: 98, 9–20: 71), with no more than 20 tactics per reference proof (Section 4, p. 5). Rocq acceptance is the correctness criterion. Inference: VL can transfer the retrieval and agent-control patterns to Verus, but must replace Rocq states, tactics, and MCP tools with Rust/Verus source, contracts, and diagnostics.

## technique 1: mine intermediate states with BigRocq

what it is and when to use it. Extract every valid intermediate theorem state and its proof from Rocq files to enlarge a scarce training corpus. Use it when projects contain long proofs whose subgoals can serve as reusable examples. The paper says: “Extracting all intermediate statements together with their proofs allows us to expand any given Rocq theorem dataset by a factor roughly proportional to the average proof length.” (Section 2.1, p. 2.)

how to do it. (1) Parse source files through Rocq's system and coq-lsp. (2) Convert a sequential proof into a tree whose nodes are valid intermediate states. (3) Recursively follow subtree edges to reconstruct a proof for each node. (4) Store each statement with its corresponding tactic proof. (5) Exclude evaluation theorems to prevent leakage. BigRocq mines 76,524 statements from 344 files in CompCert, IMM, Promising2Imm, and XMM, producing about a fourfold expansion (Section 2.1, p. 3). Goal selectors break the heuristic because Coq-LSP exposes insufficient information; the authors report they occur in less than 1% of an older dataset but are now more common (Appendix A, p. 10).

Verus form. Inference: instrument Verus runs to capture each verified helper obligation, loop invariant checkpoint, and postcondition proof as a reusable example. Store the exact Rust context and dependency versions. A Verus obligation is not a Rocq tactic tree, so normalize ownership and mutable-borrow context before indexing. Never treat an unproved helper or `external_body` as training evidence.

evidence and limits. The four-project corpus is the evidence for data expansion, not a measured improvement in proof success by itself. Excluding evaluation theorems reduces leakage but cannot remove duplicate mathematics across projects. Goal selectors and unsupported syntax limit coverage.

## technique 2: proof-aware similarity retrieval

what it is and when to use it. Retrieve premises whose *proofs* resemble the target proof rather than only whose statements share words. The paper defines normalized tactic-list Levenshtein distance and learns an encoder score `r(s_i,s_j)` approximating proof similarity. It reports: “However, we show that this implication often does not hold.” for the assumption that similar statements imply similar proofs (Section 2, p. 2).

how to do it. (1) Represent each proof as a tactic list. (2) Compute `D_L`, with unit insertion/deletion cost and substitution cost equal to tactic-string edit distance, normalized by maximum proof length. (3) Build a modified distance mixing `D_L`, Jaccard distance `D_J`, and uniform noise; choose α = 0.7 heuristically and noise U(−1e−3,+1e−3). (4) Mark pairs positive when distance <0.3 and negative when >0.65; sample 100 negatives. (5) Fine-tune CodeBERT (108M parameters) with InfoNCE over cosine-normalized statement embeddings, adding hard negatives with threshold 0.45 and 30% probability (Section 2.2 and Appendix B, pp. 3 and 10). (6) For target `s*`, rank proven `[s_i,p_i]` by `r` and provide the top 7 as few-shot context. Generate 12 attempts; count the theorem solved if Rocq accepts any (Section 4.1, p. 5).

Verus form. Inference: encode verified Rust/Verus theorem statements and their proof obligations, train a contrastive ranker against proof-structure similarity, and retrieve helper lemmas or contracts. Include type parameters, ownership shape, and invariant predicates in the representation; lexical similarity alone can select incompatible APIs. Recheck every retrieved item in the current Verus context.

evidence and limits. On IMM-300, RocqStar retrieval beats Jaccard and untrained ModernBERT in all proof-length groups. With Claude 3.5, success is 61% ± 4% for ≤4 tactics, 36% ± 5% for 5–8, and 21% ± 5% for 9–20; Jaccard gives 58% ± 5%, 28% ± 5%, and 16% ± 5% respectively (Table 1, p. 5). These are mean success rates over three independent runs; the denominator is the group size, and ± is standard deviation. Statement/proof correlation on 1,855,701 IMM theorem pairs is weakly negative (Pearson −0.154, Spearman −0.171; Section 2, p. 3), supporting the retrieval motivation. The model still has little room on long proofs where few proofs are similar.

## technique 3: verifier-aware agent tools and valid-prefix recovery

what it is and when to use it. Expose domain-specific commands through an MCP server so the agent can check proofs, inspect context, search definitions, and recover a valid prefix after failure. The proof checker returns the error, location, valid prefix, and remaining goals. This supplies structured progress rather than forcing a restart.

how to do it. (1) Wrap coq-lsp in a REST API and MCP server. (2) Provide `check_proof`, context inspection (`Print`, `Search`), theorem/file listing, and current-target-state calls. (3) Submit a proof or partial proof. (4) If it fails, preserve the valid prefix and remaining goals. (5) Ask the next model call to continue from that state. The paper calls proof checking “the most important” tool and says its diagnostics let the agent “maintain awareness of the current proof state and leverage partial proof progress.” (Section 3, p. 4.)

Verus form. Inference: provide wrappers for Verus compilation, diagnostic parsing, current function contracts, library search, and valid source-prefix extraction. A prefix must be replayed in the full Rust item because ownership and macro expansion can alter obligations. Keep tool orchestration outside the verified product; only final source and proof obligations are accepted after a fresh Verus run.

evidence and limits. The tool interface is a system design, not an isolated ablation. Rocq diagnostics are richer and more stable than arbitrary compiler text; Verus diagnostics may require version-specific parsers. A “valid prefix” is useful only if the remaining goals and context are represented faithfully.

## technique 4: multi-agent debate planning and execution

what it is and when to use it. Generate several proof strategies before invoking the verifier, then execute the highest-scoring plans with a separate model. RocqStar uses a pro LLM and con LLM for several debate rounds, a judge to select a plan, and a scoring LLM to rank `k` candidates; the top `l` plans go to execution (Section 3.1, p. 4).

how to do it. (1) Give the target theorem and retrieved examples to pro and con models. (2) Run the configured debate rounds. (3) Ask a judge model to produce each final plan. (4) Score plans numerically and select the top two. (5) Let an executor follow each plan via atomic MCP tool calls, up to 20 calls in evaluation. (6) Summarize a failed plan and pass the summary to the next execution stage. The evaluation used two debate rounds, four generated plans, two selected plans, Claude 3.5 for planning/execution, Claude 3.7 as critic, and Gemini Flash 2.0 for other large-context tasks (Section 4.2, p. 5).

Verus form. Inference: have separate agents propose contract decomposition and proof strategies, critique them, and execute only the selected Rust/Verus plan. Require each plan to name the function, preconditions, postconditions, invariants, and helper lemmas. Debate scores are heuristic; Verus acceptance remains the gate.

evidence and limits. On IMM-50, the full agent solves 91% (≤4 tactics), 56% (5–8), and 33% (9–20), total 66%; removing MAD gives 86%, 44%, 17%, total 56% (Table 3, p. 5). The gain is largest for complex theorems. The table's denominator is 22, 16, and 12 per group, 50 total. Multi-agent calls cost about $1.30 per theorem versus $0.25 for 12 pure Claude requests (Section 4.2, p. 6), so throughput and cost must be measured together.

## technique 5: reflection-triggered retrieval and replanning

what it is and when to use it. Monitor consecutive failed proof checks; after a threshold, force a critic to inspect the current state, retrieve proofs for similar remaining goals, and revise the plan. This recovers from an early strategy that is locally plausible but globally wrong.

how to do it. (1) Execute a plan and count erroneous proof attempts. (2) After five failures, call a critic. (3) Embed the remaining top-level goal and retrieve similar theorem/proof pairs. (4) Ask a model to explain useful tactic sequences. (5) Send criticism and retrieved context to a replanner. (6) Continue or switch plans, stopping on acceptance or exhausted strategies (Section 3.1, pp. 4–5).

Verus form. Inference: trigger after repeated Verus failures, retrieve helper proofs by normalized obligation, and ask a replanner to alter contracts or proof steps. A failure counter should distinguish a solver timeout from a changed specification. Never “repair” by weakening a postcondition without recording the change and reviewing its product meaning.

evidence and limits. Removing reflection lowers full-agent success from 66% to 48% overall and from 33% to 8% on 9–20-tactic problems (Table 3, p. 5). The paper reports these as IMM-50 ablations with all other components held unchanged. Reflection can add cost and may repeatedly retrieve irrelevant examples when embeddings are poor.

## what is proved, trusted, and missing

Rocq checks accepted proofs in the fixed benchmark environment. Trusted or heuristic parts include theorem statements, Rocq/coq-lsp, the embedding model, LLM planning and criticism, retrieval-index construction, and the financial/runtime infrastructure. The benchmark contains 300 IMM theorems; the full agent's 60% in Table 2 therefore means 180/300 if interpreted as an exact rounded count, while the table does not give raw solved counts, so that multiplication is an inference. Table 1 reports percentages over three runs and group denominators from Table 2; the paper's “up to 28% relative” claim refers to its retrieval comparison, not to the full agent.

Inference: the threat to agent-written verified Rust is moderate for proof search and high for specification and dependency mismatch. Proof-aware retrieval, valid-prefix recovery, debate, and reflection could improve VL's candidate quality and repair time. They do not establish that a retrieved lemma's contract matches an evolving Rust implementation or that a non-vacuous product property was specified. Existing work already covers retrieval-augmented theorem proving, multi-agent debate, and verifier-in-the-loop agents; VL should measure Rust-specific accepted contracts, dependency upgrades, and proof-maintenance failures before claiming novelty.

## techniques for the catalog

- intermediate-state mining — expand proof corpora by extracting each valid subgoal and its proof from existing files
- proof-aware retrieval — train a contrastive statement encoder to rank premises by proof similarity, not word overlap
- verifier-aware valid-prefix tools — return diagnostics, remaining goals, and the accepted prefix for incremental repair
- multi-agent debate planning — generate, critique, score, and execute several formal-proof strategies
- reflection and replanning — trigger retrieval and plan repair after repeated verifier failures

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
