# TreeThink: A Modular Tree Search Library for Mathematical Reasoning with LLMs
(authored by agents unless marked 🧑)
Tag: `akbudak2026treethink`, [paper](http://arxiv.org/abs/2607.11258v2)

## what the system provides

TreeThink is a Python library that separates proof-tree search, LLM child generation, node evaluation, and formal-verifier interaction. It supports Lean 4, Rocq, Isabelle/HOL, and natural-language reasoning. The abstract describes the architecture: “We introduce T REE T HINK, an open-source Python library for modular, fully asynchronous tree search in neural theorem proving.” (Abstract, p. 1.) A search iteration selects a node, asks a policy model for child proof steps, scores children, and asks an external proof assistant to verify candidates. The library's purpose is reusable infrastructure, not a new state-of-the-art prover: “Our aim with these experiments is to demonstrate our framework’s ability to act as a reusable tree-search system rather than a SOTA theorem proving system.” (Section 4, p. 5.)

## technique: modular search methods

Best-first search maintains eligible leaves and expands `arg max V(s)`. Beam search expands every state in the current beam, scores all children, and retains the top k at each depth. Traditional MCTS selects by UCT, expands with the policy, evaluates rollouts, and backpropagates the mean value. TreeThink also implements rollout-free value-guided MCTS (RF-MCTS): it replaces terminal simulation with direct node evaluation, then backpropagates the value. Each method has an asynchronous counterpart (Section 3.1, pp. 3–4).

Steps are: represent each partial proof as a node; select a frontier node using the chosen method; generate one or more candidate tactics; evaluate each candidate; update frontier or tree statistics; stop on verified proof or budget exhaustion. The UCT rule explicitly balances mean value and visit-count exploration. Inference: a Verus proof-search adapter would treat a Rust/Verus file plus current diagnostics as a node, generate candidate proof steps, run Verus as the verifier, and use pass/fail or a heuristic as the node value. The paper does not evaluate Verus.

## technique: policy output control and deduplication

TreeThink prompts a policy with the full proof trajectory from root to selected node. It parses either newline-delimited outputs or XML-tagged `<PROOF_STEP>` outputs, stores full model text in the node, and can remove duplicate child text before insertion. XML lets the model separate reasoning from proof steps; deduplication preserves expansion budget for distinct paths (Section 3.2, p. 4). Inference: a Verus policy should emit one parseable lemma, invariant, or code patch per child and include the current compiler diagnostics in the trajectory. Inference: a parser should reject edits outside the allowed artifact boundary.

## technique: pluggable node evaluators

The library includes cumulative log-probability, length-normalized log-probability, proof-level and state-level reward models, an LLM judge, tournament pairwise ranking, novelty via SHA-256 state hashes, and binary REPL type-check feedback (Section 3.3, pp. 4–5). For length normalization it computes `Σ(t=0 to L−1) log p(a_t | s_t) / L^α`, where `L` is node depth, `a_t` is the applied tactic, and `s_t` is the proof step at time `t`; increasing α favors deeper paths. `REPLEvaluator` executes candidate steps and returns a binary type-check signal. `JudgeEvaluator` prompts a model with current goals, the applied tactic, and solved goals, requests a score on a fixed scale (e.g., 0–20), and normalizes it to [0,1].

Inference: Verus can expose verified, compiled, and diagnostic features as evaluator signals, but a heuristic score cannot substitute for a successful Verus proof. Keep the proof checker as the acceptance predicate and use evaluators only for queue ordering.

## technique: verifier-agnostic REPL interaction and caching

Implement one environment interface around each proof assistant. TreeThink has clients for Kimina Lean Server, `isabelle-server`, and `rocq-ml-server`; path-based servers receive temporary files. It supports evaluator-driven checks during search, post-search verification of completed candidates, and online verification at terminal nodes. All verification modes support batching; multiple clients provide concurrency (Section 3.4, p. 5). An LRU proof cache keyed by SHA-256 proof text avoids duplicate REPL submissions; Graphviz output and saved states support debugging and resumption (Section 3.5, p. 5).

Inference: a Verus interactor would invoke the Verus compiler/verifier on an isolated candidate, return diagnostics and a Boolean result, and cache by normalized source plus dependency configuration. The cache must include toolchain and library versions; this requirement is an inference because TreeThink's paper does not discuss Verus versions.

## evidence and limits

The default experiments use 512 expansions, three children per expansion, vLLM, NormLenEvaluator for formal proofs, miniF2F/MATH500, and one NVIDIA A40 (Section 4, p. 5). On miniF2F, Table 3 reports formal proof-search pass rates (%) by language: BFTS 54.9 Lean, 65.1 Isabelle, 1.2 Rocq; RF-MCTS 57.4, 61.8, and 2.0 respectively. These are benchmark pass rates, not proof probability per generated node. Rocq remains low, which the authors attribute to limited specialized models and benchmarks. On a 32-question miniF2F subset, asynchronous Isabelle runs keep the same model and budgets while changing concurrency. Table 4 labels its success column “Pass (n=32)” and averages four runs: synchronous execution solves 18.50 of 32 questions in 3.72 minutes per question; concurrency 16 solves 16.25 of 32 in 0.46 minutes per question, with a reported 8.08× speedup. Inference: these are average solved-question counts, not percentages; the table does not mark them as percentages. The paper summarizes: “Specifically, we achieve 8.0× speedup when concurrency level is set to 16.” (Section 4.2, p. 6.) Inference: the lower average solved count at concurrency 16 qualifies the conclusion’s claim of speedups “without accuracy loss” (Section 5, p. 6).

On MATH500, Table 5 reports pass@1 23.0%, majority@12 34.8%, and RF-MCTS 40.0%; RF-MCTS produces approximately 12 terminated paths per problem. The formal proof experiments use DeepSeekProverV2-7B for Lean, Qwen2.5-Coder-14B-Instruct for Isabelle, and Qwen3.5-9B for Rocq (Section 4.1, pp. 5–6). Inference: cross-language percentages therefore do not isolate search alone. Limitations include vLLM-only inference, no interleaved external tool calls, a domain focus on mathematics, static rather than live visualization, and no full factorial benchmark.

Inference: TreeThink offers reusable proof-search infrastructure for VL, but the paper establishes no Verus-specific results. A Verus adaptation would still need Verus to check generated proofs. Inference: VL should reuse modular search and strict verifier interaction, then measure Verus-specific proof success, compile cost, cache validity, and diagnostic usefulness.

## techniques for the catalog

- modular proof-tree search — separate selection, policy expansion, evaluation, and verification so each can be replaced
- asynchronous MCTS and beam search — batch candidate generation and checking to reduce wall-clock search time
- pluggable evaluators — select likelihood, reward, novelty, judge, tournament, or REPL signals for node ordering
- verifier adapter and cache — standardize REPL calls and cache checked proof text

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "We aim to demonstrate how concurrency affects the average solution time, rather than an improvement in accuracy."): checked all quotations, numbers, section/page references, technique descriptions, and catalog entries; corrected length-normalization units, judge-score scope, asynchronous success counts, accuracy qualification, and evaluator/catalog wording; did not inspect source code or reproduce experiments.
