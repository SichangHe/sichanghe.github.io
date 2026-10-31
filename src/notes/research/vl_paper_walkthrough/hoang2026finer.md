# FINER-SQL: Boosting Small Language Models for Text-to-SQL
(authored by agents unless marked 🧑)
Tag: `hoang2026finer`, [paper](https://arxiv.org/abs/2605.03465)

## purpose and result

FINER-SQL trains small language models (SLMs, 0.5B–3B parameters) for Text-to-SQL with dense execution feedback. The paper's problem is that binary execution rewards give no useful signal when an SLM's SQL is wrong. Its framework has two stages: reasoning distillation from large teacher models, then GRPO reinforcement learning with format, execution, memory, and atomic rewards (Section IV, PDF pp. 3–5). The abstract states: “To overcome these issues, we propose FINER-SQL, a scalable and reusable reinforcement learning framework that enhances SLMs through fine-grained execution feedback.” (Abstract, PDF p. 1.)

The reported headline is conditional on the paper's BIRD and Spider development settings. FINER-SQL 3B reaches 67.73% execution accuracy on BIRD Dev and 85.0% on Spider Dev (Table II, PDF p. 8), with 5.57 seconds per sample and about 10 GB VRAM on BIRD Dev (Table III, PDF p. 8). These are benchmark results, not formal-verification results.

## technique 1: reasoning-bank distillation and supervised initialization

What it is. The authors query four large teachers—DeepSeek-R1, GPT-oss-120B, Qwen-2.5-72B-Instruct, and GPT-4o—with a fixed system prompt requiring a `<think>` reasoning trace followed by one executable SQLite statement (Section IV-A-a, PDF p. 3). They aggregate the outputs into a Reasoning Bank, then supervised-fine-tune the SLM only on completion tokens (reasoning and SQL), excluding prompt tokens such as schema descriptions (Section IV-A-b, PDF p. 4). The canonical mapping is “⟨q, schema⟩ → ⟨< think > reasoning < /think > SQL⟩” (Section III-B/IV-A, PDF pp. 2–3).

How to apply it.

1. For each question-schema pair, prompt each teacher with the fixed output format and SQLite constraints (Section IV-A-a, PDF p. 3).
2. Keep the generated reasoning and SQL, including failed executions; the paper says this stage exposes diverse reasoning trajectories rather than selecting only correct outputs (Section IV-A-a, PDF p. 4).
3. Aggregate teacher traces into the Reasoning Bank (Section IV-A-a, PDF p. 4).
4. Fine-tune the SLM for two epochs on completion tokens with the paper's loss, excluding prompt tokens (Section IV-A-b and Experimental Setup, PDF pp. 4, 8).
5. Use this policy as the initial policy for GRPO (Section IV, PDF p. 4).

Evidence. The authors generated 37.6K distillation samples from four teachers and report a cost of about $30, using GRAST-SQL to restrict each input to the top 30 columns (Section IV-A-a, PDF p. 4). Teacher execution accuracy on BIRD training is stated as around 50–60%, so the bank intentionally includes imperfect traces (Section IV-A-a, PDF p. 4).

Verus form. Inference: a proof-oriented analogue would collect verified proof traces (successful lemma applications, invariant strengthening, and counterexample repairs) from trusted projects, then train or prompt an agent to emit a structured proof plan plus Rust/Verus code. The trace should be marked as guidance; only the verifier's check establishes the contract. Verus has no direct equivalent of teacher chain-of-thought training in the paper.

Assumptions and failures. The approach assumes teacher traces are diverse and useful even when their SQL fails. It also assumes that completion-only fine-tuning teaches general reasoning rather than memorizing schema text. The paper does not isolate these assumptions with a separate causal experiment.

## technique 2: dense composite reward with GRPO

What it is. For each training instance, the policy samples a group of rollouts and scores each with four rewards: format, execution, memory, and atomic. The paper defines the total as “R = Rformat + Rexec + Ratomic + Rmem” (Section IV-B, PDF p. 5). GRPO estimates relative advantages within the rollout group and avoids a separate critic or reward model (Section IV-B, PDF p. 5).

How to apply it.

1. Sample 32 rollouts per training example under the stated training configuration (Experimental Setup, PDF p. 8).
2. Give format reward 1 when the `<think>`–SQL structure is valid and 0 otherwise (Section IV-B, PDF p. 5).
3. Give execution reward 0 for SQL that fails, 1 for executable SQL with an incorrect result, and 2 when the result exactly matches the gold result (Section IV-B, PDF p. 5).
4. Compute memory and atomic rewards for incorrect outputs (Sections IV-C–D, PDF pp. 5–7).
5. Sum the components without learned reward-model weighting and update the policy with GRPO (Section IV-B, PDF p. 5).

Evidence. On BIRD Dev, FINER-SQL 3B scores 67.73% EX, 1.5B 63.17%, and 0.5B 50.85%; on Spider Dev the respective scores are 85.0%, 80.0%, and 70.2% (Table II, PDF p. 8). The setup uses Qwen2.5-Coder at three sizes, two NVIDIA A6000 GPUs, bfloat16, learning rate 8×10^-6 for GRPO, global batch size 32, and less than two days for 3B training (Experimental Setup, PDF p. 8).

Verus form. Inference: use a vector of proof-progress signals for an agent-generated change: contract parsed, code type-checks, targeted lemmas discharge, loop invariants hold, and regression tests pass. A failed proof should receive partial diagnostic credit only when the signal is sound (for example, a verified sublemma), never because a heuristic text similarity looks plausible. GRPO itself is outside Verus; a Verus run remains the acceptance oracle.

Limits. The reward sum is unweighted, and execution correctness is denotational: equivalent SQL may receive different structural signals unless reference enrichment handles it. The method remains dependent on the correctness of the database executor, gold SQL, and reward implementation.

## technique 3: memory reward from cross-database verified traces

What it is. Memory reward scores a generated reasoning trace against a centroid of semantically similar, verified traces from other databases. The paper says: “Memory Reward evaluates the semantic alignment of a generated reasoning trace with a set of verified reasoning prototypes, particularly when the SQL execution fails.” (Section IV-B, PDF p. 5.) A persistent ChromaDB vector store is managed by INIT, RETRIEVE, and INSERT (Section IV-C-c, PDF p. 6).

How to apply it.

1. INIT: retain DeepSeek-R1 traces whose SQL executes correctly; extract `<think>` text, embed with Qwen3-Embedding-0.6B, and store embeddings plus metadata in ChromaDB (Section IV-C-c, PDF p. 6).
2. RETRIEVE: for a training trace, retrieve the top-k traces from databases other than the current database (Section IV-C-c, PDF p. 6).
3. Form the centroid of retrieved embeddings and compute cosine similarity to the current trace (Section IV-C-d, PDF p. 6).
4. Return memory reward 0 for invalid format, cosine similarity for an incorrect SQL, and 1 for a correct SQL (Section IV-C-d, PDF p. 6).
5. INSERT successful student traces after quality filtering: length 30–2000 tokens, schema density at least 0.05 with at least two distinct column mentions, at least 60% unique consecutive word pairs, and cosine similarity below 0.9 to the nearest existing entry (Section IV-C-c, PDF p. 6).

Evidence. The authors retrieve 20 traces in their main configuration (Experimental Setup, PDF p. 8). Cross-database retrieval outperforms same-database and mixed retrieval at high k (Section V-D, PDF p. 9). For the 0.5B model, adding memory raises Self-BLEU from 0.674 to 0.724, reduces mean execution groups from 8.07 to 5.59, and raises execution accuracy from 46.28% to 50.85% (Section V-F, PDF p. 10). These numbers use BIRD Dev and the paper's ablation settings.

Verus form. Inference: maintain a library of verified proof patterns indexed by specification shape, data structure, and invariant purpose. Retrieve lemmas from different modules to avoid copying module-specific names; instantiate them only after Verus checks their preconditions. A proof trace that merely resembles a successful proof should not increase acceptance; it can guide search but must not substitute for the verifier.

Assumptions and failures. The paper explicitly assumes that distilled teacher patterns are “already high-quality” (Section IV-C-b, PDF p. 6). The memory can reinforce a bad prototype, and embedding similarity can be misleading. The cross-database restriction is intended to reduce schema-token overfitting, not to prove semantic correctness.

## technique 4: atomic operation reward

What it is. Atomic reward decomposes SQL into clause-level operations and scores set overlap with reference SQL using Jaccard similarity. The paper's decomposition builds an AST and extracts primitives such as SELECT, FROM, JOIN, predicates, grouping, ordering, limits, set operations, and subquery markers (Section IV-D, PDF pp. 6–7; Table I, PDF p. 7). It then computes the maximum Jaccard score over enriched references and applies “ϕ(x) = λ x + (1 − λ) β xγ , with λ=0.05, β=0.79, γ=0.20.” (Section IV-D, PDF p. 7.)

How to apply it.

1. Parse predicted and reference SQL into ASTs (Section IV-D, PDF p. 7).
2. Extract an operation set for each query, flattening nested subqueries into a comparable list (Section IV-D, PDF p. 7).
3. Compute Jaccard overlap `|A(s) ∩ A(g)| / |A(s) ∪ A(g)|`, or 0 if the union is empty (Section IV-D, PDF p. 7).
4. Take the maximum score over the reference pool (Section IV-D, PDF p. 7).
5. Apply the shaping function and activate atomic reward when execution is incorrect (Sections IV-B and IV-D, PDF pp. 5, 7).
6. Enrich references by sampling 30 candidates at temperature 1.0 from the distilled 3B model, executing them, and retaining candidates whose denotation matches the gold query (Section IV-D, PDF p. 7).

Evidence and contradiction check. The paper reports that 670 of 9,428 BIRD training samples (7.1%) have empty gold results and says a manual audit of 100 additional non-empty cases found no hack-like patterns (Section IV-D, PDF p. 7). The fraction is arithmetically consistent to one decimal place (670/9,428 ≈ 7.1%). The authors acknowledge that empty results could admit degenerate `WHERE 1=0` queries and explain that their retained candidates still had high structural overlap (Section IV-D, PDF p. 7).

Verus form. Inference: decompose a target proof into typed obligations—precondition facts, ownership/borrow facts, loop invariant clauses, postcondition clauses, and required lemmas—and use overlap only to prioritize search. Unlike SQL set similarity, a proof obligation cannot be accepted for partial overlap: Verus must discharge the full `ensures` and invariant obligations. The decomposition can still produce a useful failure report naming the missing obligation.

## inference-time selection and measured trade-offs

FINER-SQL generates candidates and selects by majority vote. The paper reports that increasing candidates from 1 to 50 improves Pass@K and EX%, with gains saturating beyond 30; its stated operating point is 20–30 candidates (Section V-D, PDF p. 9). Temperature 1.0 with 50 candidates gives the best reported configuration in that analysis (Section V-D, PDF p. 9). Table III reports 5.57 s/sample for FINER-SQL 3B at about 10 GB VRAM, versus 1,800–2,500 s/sample and up to about 80 GB for Alpha-SQL 14B/32B under the listed deployment settings (Table III, PDF p. 8).

## what is proved, measured, and trusted

The paper measures execution accuracy, Pass@K, latency, memory, reward ablations, candidate and temperature sensitivity, training-step progress, and reasoning length on Spider and BIRD development sets (Section V, PDF pp. 7–10). It does not prove SQL semantic equivalence mathematically, and it does not provide formal verification of the reward functions or memory store. Its acceptance signal trusts SQLite execution, the benchmark's gold queries and databases, AST parsing, embedding behavior, and implementation of the reward code.

The 3B model improves from 42.9% to 49.3% EX after 2,000 GRPO steps for the 0.5B model's reported curve, while Pass@K rises from 55.9% to 66.3% (Section V-E, PDF p. 10). The exact model and BIRD Dev setting should be retained with those numbers when comparing runs. Inference: these are empirical outcomes under one training recipe, not a guarantee that dense rewards transfer to other tasks.

## techniques for the catalog

- reasoning-bank distillation — collect structured teacher traces and fine-tune only completion tokens to initialize an SLM
- GRPO dense reward — optimize groups of rollouts with format, execution, memory, and atomic rewards
- memory reward — compare failed reasoning with cross-database verified prototypes using centroid cosine similarity
- memory quality gate — filter traces by length, schema density, lexical diversity, and similarity deduplication before insertion
- atomic operation reward — AST-decompose SQL and use shaped maximum Jaccard overlap against equivalent references
- reference enrichment — sample candidates, execute them, and retain denotationally matching SQL as structural references
- candidate selection — tune candidate count and temperature, then select by majority vote under measured latency/accuracy trade-offs
