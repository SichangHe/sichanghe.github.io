# Nazrin: An Atomic Neural Proof Automation Tactic in Lean 4
(authored by agents unless marked 🧑)
Tag: `aniva2026nazrin`, [paper](https://arxiv.org/abs/2602.18767v3)

## scope and contribution
Nazrin uses a finite set of atomic tactics, converts existing proofs into atomic traces, represents goals as symmetry-aware graphs, and learns tactic choices with a graph neural network. The authors claim that the tactic set is complete; their implemented atomizer does not convert every proof. The abstract states: “We first present a set of atomic tactics, a small finite set of tactics capable of proving any provable statement in Lean.” It then introduces “a transposing atomization algorithm which turns arbitrary proof expressions into a series of atomic tactics” and the `ExprGraph` representation (Abstract, p. 1).

Inference: the product lesson for VL is to constrain agent actions to a finite, typed vocabulary of proof edits and to represent a Verus goal with ownership, contracts, and ghost-state relations rather than raw text alone.

## technique 1: atomic tactic design

The authors define an atomic tactic set by finite actions, including finite parameter choices, and completeness for valid Lean theorems (Section IV-A, p. 4). The paper warns that ordinary `simp`, `conv`, and `use` can have unbounded arguments. It requires four properties: “Invariance: No tactic ever changes the value of an assigned metavariable, i.e., once a goal is assigned, its assignment never changes without backtracking.” “Completeness: If a tactic removes a goal, it must assign the goal.” “Progress: It is not possible for a tactic to make no progress, i.e., a tactic never produces a goal state containing only the goal it was applied to.” “Determinism: The atomic tactics yield the same result for the same input goal.” Here, the property called completeness concerns assigning removed goals; it differs from completeness of the entire tactic set (Section IV-A, p. 4).

Table I maps Lean constructors to actions: `intro` for lambda, `exact/apply` for free variables and constants, `inhabit` for sorts and literals, `pi` for function signatures, `tailArg` for applications, and `apply/cases` for projections. Figures 9–10 also include terminal tactics such as `decide`, `contradiction`, and `rfl` (Table I, p. 4; Figures 9–10, p. 11). Parameters are finite: `exact` may use only a constant or free variable already appearing in the goal, including its context, and `apply` chooses one lemma from the finite environment (Section IV-A, p. 4; Appendix A, p. 10).

Verus form. Inference: define an action grammar whose parameters are existing function/lemma names, typed variables, field paths, assertion locations, and bounded expressions. Candidate actions can add `assert`, call a `proof fn`, reveal an `opaque` definition, add a loop `invariant`, or repair a fixed contract. Keep `requires` and `ensures` outside the action vocabulary when they are frozen product specifications. A successful action must reduce or preserve a well-defined verification obligation; all resulting code is rechecked by Verus.

## technique 2: transposing atomization

The algorithm attempts to convert a proof term into atomic goal/tactic pairs and transpose its presentation into a search trajectory. Start with a goal for the proof type and a pending list containing the goal and its known solution. Pop a pair; `atomize_step` tries semigrade tactics before holograde tactics. On success, yield `(goal, tactic)` and push the new goals with their corresponding solutions. Otherwise, yield `defer`, leaving the goal dormant until other progress may make it solvable. The prose prescribes processing successor goals first. Listing 1 computes `descendants := order_predecessor(goals, solutions)` but then iterates over `(goals, solutions)`, leaving that ordering operation unused in the displayed pseudocode (Listing 1 and Section IV-B, p. 5).

The stated invariant is that every goal eventually receives a unique assignment; each paired solution solves the goal's closure, formed by instantiating its predecessors. A goal is a predecessor when it occurs in another goal's target or context, except occurrences beneath a parent expression whose type is `Prop`. Solving successors can instantiate or solve predecessors. When unification would assign an incorrect solution during atomization, `tailArg` and `motivatedApply` avoid unification at the cost of larger cross-sections (Section IV-B, p. 5). The seven grades describe area of effect: terminal, holo-prograde, holo-retrograde, holo-bigrade, semi-prograde, semi-retrograde, and semi-bigrade (Table II, p. 6). Non-conflicting semigrade tactics may be swapped, allowing more tactics to dispatch before deferring to a predecessor. This is goal-level transposition; changing the order of goals is state-level transposition (Section IV-B, pp. 5–6).

Verus form. Inference: normalize a verified function's obligations into nodes for contract facts, loop invariants, arithmetic subgoals, ownership permissions, and lemma calls. Use dependency edges when one obligation mentions another; prioritize successor facts that instantiate borrowed values or ghost state. For a Verus adaptation, a `defer` action could leave an obligation pending while other obligations are processed. Verus has loop `invariant` declarations rather than an `invariant(...)` call; use `proof fn` and `assert` for intermediate facts.

## technique 3: ExprGraph essentialization

Essentialization removes information irrelevant to the current search and builds a heterogeneous graph whose nodes are syntactic elements and whose edges encode relationships. The graph has four stated properties: alpha-equivalent or search-view-equivalent expressions share a graph; subexpressions map to subgraphs; every rewritable locus maps to one vertex; and repeated constants, sorts, or literals share one vertex (Section V-A, pp. 6–7). Variable-reference edges connect coupled goals, while irrelevant certificate construction is erased (Section V-A, pp. 6–7).

Verus form. Inference: construct graph nodes for Rust variables, borrows, mutable references, fields, function calls, contract predicates, loop indices, and ghost sequences/maps. Add edges for data flow, ownership transfer, borrow dependencies, and calls to specification lemmas. Preserve type and lifetime distinctions that Lean's search equivalence may erase. Use graph normalization only for ranking; the accepted Rust source and Verus checker remain authoritative.

## technique 4: neural probabilistic automaton and guidance

Atomic tactics let a GNN choose from a finite action space. Nazrin uses a neural probabilistic automaton (NPA): a `Kind` state selects a tactic, then specialized states select premises, variables, loci, or directions (Section V-B, pp. 7–8; Figure 4, p. 7). A graph network supplies categorical distributions. The implementation has an embedding layer, an equivariant core GNN, a fixed-point invariant GNN for unseen constants, and tactic heads; it uses 32-dimensional embeddings, five four-head attention layers, and 1.5 million parameters on the standard library or 11 million on Mathlib (Section V-B, p. 8).

The paper adds rainbow guidance: if goal `g` precedes goal `h`, the agent gives `h` higher priority; ties use state order. An `abandon` action signals that the agent considers further search on the goal futile or needs progress on its predecessors (Section V-B, p. 8).

Verus form. Inference: use a typed GNN or classifier to rank finite proof edits, with a special abandon action and a verifier call after each edit. Encode goal-state features from the Verus diagnostic, contract, ownership, and ghost graph. Do not let the model emit arbitrary Rust expressions or specifications without a bounded parser and a fresh Verus check.

## evidence, limits, and threat

The authors report processing 170,180 user-defined theorems from Lean's standard library and Mathlib, with about 58% atomization success under a 3,000-step limit. Failure can result from exceeding the limit or from heuristics failing to find a transposition. They topologically sorted the atomized theorems so dependencies precede their users, divided the standard library into two slices and Mathlib into ten, and describe each segment as having about 10,000 theorems. They trained on standard-library slice 1 for 100 epochs and obtained 57% proof completion on a random subset of slice 2 within 15 seconds per theorem. After training on Mathlib slice 3, they obtained 34% on slice 4 (Section VI, p. 8). Despite the introduction's mention of reinforcement learning, the implementation description says: “We train Nazrin Prover with exclusively supervised learning data and no online data.” (Section V-B, p. 8).

The comparison sample includes theorems Nazrin proves that Aesop and Grind do not. Both provers receive 15 seconds. Aesop and Nazrin receive perfect premise selection; the footnote says this ensures fairness and prevents Aesop from proving a theorem using itself. The authors say no easy equivalent exists for Grind and therefore describe Nazrin as disadvantaged in that comparison (Section VI, p. 8; Figure 8, p. 9).

Limitations are explicit: atomization does not work for all theorems, some traces have high cross-sections, later tactic parameters are not conditioned on earlier parameters, and the GNN does not process numbers or strings. The authors work around the last limitation by assigning goals in passing through Lean's type unification (Section VII, p. 9). Inference: the Lean checker determines proof acceptance; atomizer heuristics, graph construction, premise selection, data slicing, and time limits also affect the reported search results. These experimental components should not all be treated as part of the logical trust boundary.

Inference: threat to VL is high for proof-search latency and action-space design, especially for repeated invariant and lemma repair patterns. It does not remove the need for correct specifications, ownership reasoning, or trusted external APIs. Existing VL work should not redo finite-action proof search in the abstract; it should test a Verus-specific action grammar and graph that preserve Rust types, borrows, ghost resources, and contract boundaries.

## techniques for the catalog

- atomic proof actions — use a finite, deterministic, progressing and complete tactic vocabulary
- transposing atomization — convert existing proofs into replayable goal/action traces and reorder non-conflicting steps
- essentialized goal graphs — erase search-irrelevant detail while preserving loci, references, and subgraph structure
- neural probabilistic automaton — generate parameterized finite tactics through graph-conditioned categorical states
- rainbow guidance — prioritize successor goals and use abandon to signal futility or a need for predecessor progress

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The first problem we address is how to represent Lean expressions and goals in a format which is suitable for consumption for a machine learning agent, a GNN in our case."): checked all paper text, quotations, numbers, section/page references, technique descriptions, and limits; corrected page references, constructor mappings, atomization/defer semantics, solution-closure invariant, training details, and experimental interpretation, and replaced the paper link with its arXiv identifier; did not reproduce experiments, inspect source code, or validate the proposed Verus adaptations.
