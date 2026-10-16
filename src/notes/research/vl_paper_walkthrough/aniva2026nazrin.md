# Nazrin: An Atomic Neural Proof Automation Tactic in Lean 4
(authored by agents unless marked 🧑)

Tag: `aniva2026nazrin`, [paper](https://www.semanticscholar.org/paper/067f3a29cdd2784f1e25049c812428e8c0e29c73)

## scope and contribution
Nazrin reduces Lean proof search to a finite set of atomic tactics, converts existing proofs into atomic traces, represents goals as symmetry-aware graphs, and learns tactic choices with a graph neural network. The abstract states: “We first present a set of atomic tactics, a small finite set of tactics capable of proving any provable statement in Lean.” It then introduces “a transposing atomization algorithm which turns arbitrary proof expressions into a series of atomic tactics” and the `ExprGraph` representation (Abstract, p. 1).

Inference: the product lesson for VL is to constrain agent actions to a finite, typed vocabulary of proof edits and to represent a Verus goal with ownership, contracts, and ghost-state relations rather than raw text alone.

## technique 1: atomic tactic design

A tactic set is atomic when it has finite actions, including finite parameter choices, and is complete enough to prove any valid theorem (Section IV-A, p. 5). The paper warns that ordinary `simp`, `conv`, and `use` can have unbounded arguments. It requires four properties: “Invariance: No tactic ever changes the value of an assigned metavariable”; “Completeness: If a tactic removes a goal, it must assign the goal”; “Progress: It is not possible for a tactic to make no progress”; and “Determinism: The atomic tactics yield the same result for the same input goal” (Section IV-A, pp. 5–6).

The core set maps Lean constructors to actions: `intro` for lambda, `exact/apply` for variables and constants, `inhabit` for literals, `pi` for binders, `tailArg` for applications, `cases` for projections, and `decide`/`contradiction`/`rfl` for terminal cases (Table I, p. 5; Figures 9–10, pp. 14–15). Parameters are finite: `exact` may use only a constant or free variable already in the goal context, and `apply` chooses one lemma from the finite environment (Section IV-A, p. 5; Appendix A, p. 14).

Verus form. Inference: define an action grammar whose parameters are existing function/lemma names, typed variables, field paths, assertion locations, and bounded expressions. Candidate actions can add `assert`, call a `proof fn`, reveal an `opaque` definition, add a loop `invariant`, or repair a fixed contract. Keep `requires` and `ensures` outside the action vocabulary when they are frozen product specifications. A successful action must reduce or preserve a well-defined verification obligation; all resulting code is rechecked by Verus.

## technique 2: transposing atomization

The algorithm converts an arbitrary proof term into a sequence of atomic tactic/goal pairs and reorders dispatch to reduce coupling. Start with a goal for the proof type and a pending list containing the goal and its known solution. Pop a pair; if `atomize_step` finds a tactic, yield the `(goal, tactic)` pair, compute descendant goals and solutions, order them by predecessor relations, and push them back. If no tactic is found, yield `defer` (Listing 1, Section IV-B, p. 6).

The algorithm maintains the invariant that every goal eventually receives a unique assignment and that each solution has the goal's type (Section IV-B, p. 6). It preferentially processes successor goals, because their solutions can instantiate or solve predecessors. It also uses seven grades based on area of effect: terminal, holo-prograde, holo-retrograde, holo-bigrade, semi-prograde, semi-retrograde, and semi-bigrade (Table II, p. 7). Non-conflicting semigrade tactics may be swapped, allowing more tactics to dispatch before a coupled predecessor is solved (Section IV-B, pp. 7–8).

Verus form. Inference: normalize a verified function's obligations into nodes for contract facts, loop invariants, arithmetic subgoals, ownership permissions, and lemma calls. Use dependency edges when one obligation mentions another; prioritize successor facts that instantiate borrowed values or ghost state. A `defer` action means abandon the branch and retain diagnostics, never silently assume the goal. Verus has loop `invariant` declarations rather than an `invariant(...)` call; use `proof fn` and `assert` for intermediate facts.

## technique 3: ExprGraph essentialization

Essentialization removes information irrelevant to the current search and builds a heterogeneous graph whose nodes are syntactic elements and whose edges encode relationships. The graph has four stated properties: alpha-equivalent or search-view-equivalent expressions share a graph; subexpressions map to subgraphs; every rewritable locus maps to one vertex; and repeated constants, sorts, or literals share one vertex (Section V-A, pp. 8–9). Variable-reference edges connect coupled goals, while irrelevant certificate construction is erased (Section V-A, p. 8).

Verus form. Inference: construct graph nodes for Rust variables, borrows, mutable references, fields, function calls, contract predicates, loop indices, and ghost sequences/maps. Add edges for data flow, ownership transfer, borrow dependencies, and calls to specification lemmas. Preserve type and lifetime distinctions that Lean's search equivalence may erase. Use graph normalization only for ranking; the accepted Rust source and Verus checker remain authoritative.

## technique 4: neural probabilistic automaton and guidance

Atomic tactics let a GNN choose from a finite action space. Nazrin uses a neural probabilistic automaton (NPA): a `Kind` state selects a tactic, then specialized states select premises, variables, loci, or directions (Section V-B, pp. 9–10; Figure 4, p. 9). A graph network supplies categorical distributions. The implementation has an embedding layer, an equivariant core GNN, a fixed-point invariant GNN for unseen constants, and tactic heads; it uses 32-dimensional embeddings, five four-head attention layers, and 1.5 million parameters on the standard library or 11 million on Mathlib (Section V-B, p. 10).

The paper adds rainbow guidance: if goal `g` precedes goal `h`, the agent gives `h` higher priority; ties use state order. An `abandon` action ends a futile branch or waits for a predecessor to provide information (Section V-B, p. 10).

Verus form. Inference: use a typed GNN or classifier to rank finite proof edits, with a special abandon action and a verifier call after each edit. Encode goal-state features from the Verus diagnostic, contract, ownership, and ghost graph. Do not let the model emit arbitrary Rust expressions or specifications without a bounded parser and a fresh Verus check.

## evidence, limits, and threat

The authors atomized 170,180 user-defined theorems from Lean's standard library and Mathlib; atomization succeeded for about 58% under a 3,000-step limit (Section VI, p. 10). They topologically sorted data to prevent leakage, trained on roughly 10,000-theorem slices, and evaluated each theorem with a 15-second limit (Section VI, p. 10). Standard-library slice 2 accuracy was 57% on a random subset; Mathlib slice 4 proof completion was 34% (Section VI, p. 10). The paper says Nazrin can prove theorems that Aesop and Grind cannot in the comparison sample, but the experiment gives perfect premise selection to Aesop and Nazrin and notes that Nazrin is disadvantaged against Grind (Section VI, p. 10).

What is proved is Lean acceptance of generated tactic traces. Trusted components include the Lean kernel, atomizer heuristics, graph construction, premise-selection setup, training/test slicing, and the 15-second timeout. Limitations are explicit: atomization does not work for all theorems, some traces have high cross-sections, parameter heads are not conditioned on earlier parameters, and the GNN does not process numbers or strings (Section VII, p. 11).

Inference: threat to VL is high for proof-search latency and action-space design, especially for repeated invariant and lemma repair patterns. It does not remove the need for correct specifications, ownership reasoning, or trusted external APIs. Existing VL work should not redo finite-action proof search in the abstract; it should test a Verus-specific action grammar and graph that preserve Rust types, borrows, ghost resources, and contract boundaries.

## techniques for the catalog

- atomic proof actions — use a finite, deterministic, progressing and complete tactic vocabulary
- transposing atomization — convert existing proofs into replayable goal/action traces and reorder non-conflicting steps
- essentialized goal graphs — erase search-irrelevant detail while preserving loci, references, and subgraph structure
- neural probabilistic automaton — generate parameterized finite tactics through graph-conditioned categorical states
- rainbow guidance — prioritize successor goals and allow explicit abandon/defer decisions

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
