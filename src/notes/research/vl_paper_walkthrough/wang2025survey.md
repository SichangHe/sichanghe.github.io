# A Survey on Large Language Models for Mathematical Reasoning
(authored by agents unless marked 🧑)
Tag: `wang2025survey`, [paper](https://arxiv.org/abs/2506.08446)

## scope and claims

Wang et al. organize mathematical reasoning into comprehension and answer generation. Comprehension covers mathematical concepts, representations and theorem formalisms; generation covers deduction, exploration and final answers. The survey is a synthesis rather than a new verifier implementation, so its formal-verification material is a set of reusable patterns and reported results from cited systems. Its discussion distinguishes CoT from rigorous logical entailment: “Current LLM-generated CoT does not constitute rigorous chains of logically entailed steps but rather resembles heuristic processes that leverage recursive CoT structure to generate sufficiently rich intermediate content, increasing effective model depth and supporting final answers despite intermediate step errors.” (§3.2.2, p. 9)

The paper’s formal-reasoning context is theorem proving with formal logical analysis, axioms, theorems and proof strategies (§3, p. 6). It lists ProofPile as a general-math pretraining corpus (Table 1, p. 9), NaturalProofs and Lean Workbook as theorem-proving SFT datasets (Table 2, p. 10), and LeanDojo’s 98,734 mathlib theorems/proofs and miniF2F’s 488 Olympiad-level formal problems (Appendix A.3, p. 31; Table 3, p. 32). Inference: these resource counts do not establish that a model proves every example.

## technique: chain-of-thought with self-checking

What it is. Chain-of-thought (CoT) asks a model to emit intermediate reasoning before its answer. Zero-shot CoT can be triggered by “Let’s think step by step” (§2.4, p. 5; §3.2.1, p. 8). Self-consistency samples multiple paths and chooses the most consistent answer (§2.4, p. 5). Long CoT adds exploration, reflection, inconsistency detection and backtracking during test-time scaling (§3.2.1, p. 8).

When to use it. Inference: use CoT for multi-step arithmetic, symbolic or logical tasks where intermediate state can expose an error. The survey states, “CoT prompting induces LLMs to produce intermediate reasoning steps prior to generating final answers.” (§3.2.1, p. 8) Use self-consistency when independent paths are affordable; use long CoT and backtracking when the search space is large. The survey reports that competition-level generated processes have error rates “reaching 51.8%” (§3.2.2, p. 9). Inference: a plausible final answer does not establish the correctness of its reasoning.

How to apply it. Inference: (1) prompt for explicit intermediate steps. (2) Generate several trajectories or a long trajectory with planning, exploration and reflection. (3) Compare candidate answers, or ask the model to identify inconsistencies and backtrack. (4) Validate every consequential step with a checker; retain only a candidate whose checks pass. Steps 1–3 combine the survey’s prompting, self-consistency and long-CoT descriptions (§2.4, p. 5; §3.2.1, p. 8). Step 4 is a proposed formal-checking extension, not a requirement specified by the survey.

Verus form. Inference: represent each candidate operation as a Rust/Verus function whose postcondition states the mathematical relation, then use `requires`, `ensures`, `assert`, `assert forall`, `invariant` on loops, and proof functions to discharge each step. A generated CoT becomes a sequence of calls and assertions; branch exploration becomes separate candidate proof paths. Verus checks logical entailment of specifications, while the natural-language trace remains explanatory text. Inference: a Verus adaptation would require Rust specifications and verifier results rather than relying on an unannotated prose chain.

Evidence and limits. The survey says CoT improves multi-step performance and can reveal inconsistencies, but it also reports unreliable intermediate steps and the error rate reaching 51.8% (§3.2.2, p. 9). Inference: CoT can aid planning but does not guarantee soundness. The survey does not give a Verus experiment or a denominator for the 51.8% beyond “competition-level tasks”; do not transfer that percentage to Verus code.

## technique: outcome, process and rule-based verifiers

What it is. An outcome reward model (ORM) scores a complete solution; a process reward model (PRM) scores each reasoning step; a rule-based reward gives deterministic correctness or format rewards. ORMs are trained as binary classifiers on correct and incorrect solutions using binary cross-entropy (§4.2.1, p. 11). PRMs score each step with labels and a per-step loss (§4.2.1, p. 12). Rule-based rewards return one exactly when the final answer equals the ground truth and can add format checks (§4.2.1, p. 12).

When to use it. Inference: use an ORM when only final correctness is available. Use a PRM when intermediate mistakes must be localized. Use a rule checker when an executable specification can decide correctness; the survey argues rule-based rewards mitigate reward hacking through deterministic task-specific feedback (§4.2.1, p. 12).

How to apply it. Inference: (1) build `Dcorrect` and `Dincorrect` solution pairs for an ORM, or label each step for a PRM. (2) Train the scorer with the stated binary losses. (3) During generation, score complete trajectories (ORM) or each reasoning step (PRM). (4) For deterministic tasks, compute an exact-match and format reward instead of a learned score. (5) Optimize the policy with PPO, ReMax, RLOO or GRPO; GRPO uses group-normalized rewards without a critic (§4.2.2, p. 13). (6) Audit reward hacking and distribution shift. These steps combine the survey’s reward-model and policy-optimization descriptions; the audit is a proposed addition.

Verus form. Inference: replace the learned correctness score with `verus` compilation and proof checking. A candidate function receives a specification; success is a verifier pass, while failure can be a parsing, typing or proof error. A process score can be attached to each lemma or assertion, but only the final verified function should be accepted. Inference: a fixed verifier configuration can provide a rule-based reward, while external axioms, `assume`, and trusted bodies remain part of the trusted base.

Evidence and limits. The survey states that PRMs outperform ORMs in reasoning tasks, but does not provide a single aggregate denominator in this section (§4.2.1, p. 12). Rule-based rewards supported DeepSeek-R1 improvement beyond 8,000 training steps and performance comparable to or exceeding OpenAI o1 (§4.2.1, p. 12), but the survey supplies no benchmark table or per-task denominator for that comparison. The survey describes offline DPO as lacking RL-style exploration and reports that its implicit reward model has out-of-distribution accuracy drops “reaching 7%” compared with explicit reward models (§4.2.3, p. 14). It attributes this comparison to Lin et al. [2024a] without specifying the evaluation denominator here.

## technique: tree and graph search with executable checking

What it is. Tree-of-Thoughts (ToT) maintains a tree of partial reasoning states and navigates it with depth-first or breadth-first search; Graph-of-Thoughts (GoT) permits cyclic dependencies and iterative refinement (§2.4, pp. 5–6; §4.3, p. 14). Monte Carlo Tree Search (MCTS) expands nodes, simulates future states, then backs up value estimates (§4.3, p. 14). RAP uses an LLM as world model and action generator; AlphaMath adds value models and step-level signals; LLaMA-Berry combines MCTS, self-refinement and pairwise preference ranking (§4.3, p. 14).

When to use it. Inference: use structured search when one greedy chain is unreliable and the verifier can reject partial paths. The paper states, “In the decision-making process of LLMs, structured tree search integration enhances planning through systematic exploration.” (§4.3, p. 14) Use MCTS when branching is large and a value estimate can prioritize expansions.

How to apply it. Inference: (1) define a state as the current proof/program prefix. (2) Define actions as candidate next steps. (3) Expand unvisited actions. (4) Simulate or complete a candidate. (5) Verify the resulting obligation and assign a value. (6) Back up the value and select the next node by the chosen search policy. (7) Stop at a verified leaf or a budget limit. This adapts the survey’s node expansion, simulation and value-backup description (§4.3, p. 14) to proof search. Proof/program prefixes, executable proof checks and stopping rules are proposed additions.

Verus form. Inference: each node can hold a Rust function plus its current `requires` context and proof state; a leaf is accepted only when `cargo verus` verifies it. Candidate actions add statements, lemma calls or loop invariants. Search must account for verifier failures and compile time; Verus does not expose a built-in MCTS over proof states, so orchestration is external.

Evidence and limits. The survey reports that structural search enables exploration and backtracking, but gives no common benchmark denominator across ToT, GoT, MCTS, RAP, AlphaMath and LLaMA-Berry (§4.3, pp. 14–15). It cautions that heuristic search can be inefficient in large spaces (§4.3, p. 14). Inference: a Verus product should cap branching and cache verified prefixes, otherwise proof search cost can dominate generation.

## technique: self-verification, self-refinement and external tools

What it is. Self-Refine iteratively feeds model feedback back into generation; Self-Verification validates an answer; RISE fine-tunes on recursive introspection (§4.4, p. 15). External tools include web search, symbolic computation and code execution. RAG retrieves documents, optionally reformulates queries and reranks or filters retrieved content, then supplies theorem or definition context (§4.5, p. 16). The survey states, “Formal language integration with built-in proof systems (e.g., Lean) enables models to perform self-verification of intermediate steps, ensuring logical consistency while improving reasoning efficiency.” (§6, p. 18)

When to use it. Inference: use self-refinement for cheap iterative correction, a proof assistant for sound intermediate-step checks, and tools or RAG when computation or theorem knowledge is outside model parameters.

How to apply it. Inference: (1) generate a candidate. (2) Ask a critic or checker to identify an incorrect step. (3) Refine the candidate using the feedback. (4) For formal checking, translate the step into the target proof language and run its checker. (5) Retrieve supporting lemmas or execute calculations when needed. (6) Repeat until all obligations pass or the budget is exhausted. The paper describes iterative feedback (§4.4, p. 15), tools and retrieval (§4.5, pp. 15–16), and formal checking (§6, p. 18). Their combination into this repair loop, the Verus translation and the stopping rule are proposed additions.

Verus form. Inference: compile generated Rust with Verus after each repair; use verified helper lemmas and specifications as the feedback signal. RAG can retrieve existing Verus lemmas or syntax patterns, but retrieved lemmas need proof checking and review of their specifications and assumptions. A failed verification obligation is a concrete critic message; a passing build is evidence for the checked properties, subject to the project’s trusted axioms and external bodies.

Evidence and limits. The survey reports that knowledge retrieval guides accurate proof generation and that step-wise references improve word-problem performance (§4.5, p. 16), without a shared number or denominator. It also says tool invocation lacks a universally applicable strategy (§4.5, p. 16). Inference: agent-written verified Rust remains threatened by specification mistakes, unsupported assumptions and tool-selection failures even when generated code compiles.

## what is proved, trusted and already done

The survey proves no new theorem and presents no new formal-verification implementation. Its reported evidence is literature-level observations, dataset sizes, model-training procedures and cited benchmark results. The survey describes formal proof systems (§6, p. 18), theorem-proving datasets (Table 2, p. 10; Appendix A.3, p. 31), process reward models (§4.2.1, p. 12), MCTS reasoning search (§4.3, pp. 14–15), self-verification (§4.4, p. 15) and tool/RAG integration (§4.5, pp. 15–16).

## techniques for the catalog

Inference: the following catalog entries adapt the surveyed methods to formal checking; the paper does not evaluate Verus.

- CoT with self-consistency: generate multiple explicit reasoning paths, compare them, and require executable checks for consequential steps
- process and rule-based verification: score intermediate steps or exact executable outcomes, preferring deterministic rules when available
- structural proof search: explore tree/graph/MCTS states with verifier feedback and backtracking
- self-verification and proof-assistant integration: iteratively repair candidates and run Lean-like checking, mapped to Verus compilation for Rust
- external tools and RAG: retrieve lemmas or execute calculations, then accept results only after formal checking
