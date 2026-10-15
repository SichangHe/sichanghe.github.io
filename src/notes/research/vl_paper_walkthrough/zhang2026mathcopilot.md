# MathCoPilot: An Interactive System for Human-AI Symbiotic Paradigm of Mathematical Research
(authored by agents unless marked 🧑)
Tag: `zhang2026mathcopilot`, [paper](http://arxiv.org/abs/2607.14582v1)

## scope and result

The paper presents MathCoPilot, a Lean 4 research workbench whose central unit is an editable proof blueprint. The abstract states: “MathCoPilot unifies three core capabilities: (1) an interactive workbench where the mathematician and AI agents collaborate through a living proof blueprint that decomposes a proof into navigable steps the human can directly inspect, direct, and refine; (2) automated proving skill orchestration with adaptive knowledge base search and Lean-integrated iterative verification; and (3) topic-driven paper retrieval and automated formalization into a verified Lean knowledge base.” (abstract, p. 1). The experiments measure Lean-accepted proofs, not the truth of informal arguments alone. In the PDE experiment, the authors explicitly count opaque analytic assumptions as certificates rather than first-principles formalizations.

## technique 1: interactive proof blueprint

What it is. The target proposition is decomposed into a graph of self-contained nodes, such as lemmas, cases, and intermediate claims. Edges record dependencies, and each node has an intent and status. The paper says the blueprint is “rendered as a flowchart annotated with each node’s natural-language intent and current status (open, in progress, or verified)” (Section 3.1, p. 4).

When to use it. Use this for a proof too large for one opaque model response, or when a human must select the mathematical strategy and inspect local failures. It also supports recursive decomposition when a node cannot be discharged.

How to do it.

1. State the proposition and ask the Brainstorm Agent for several high-level natural-language strategies (Section 3.1, p. 4).
2. Edit, merge, discard, and select one strategy; the paper assigns this choice to the mathematician (Section 3.1, p. 4).
3. Ask the Blueprint Agent to turn the strategy into a dependency graph of nodes (Section 3.1, p. 4).
4. Point at a node to inspect or edit it, then ask the Prover Agent to discharge it (Section 3.1, p. 4).
5. If it is hard, recursively run brainstorming, blueprinting, and proving on that node (Section 3.1, p. 4).
6. Let the Formalizer Agent emit a Lean skeleton of `have` statements with `sorry`, then replace each completed node with Lean and validate it (Section 3.1, p. 5). The `sorry` skeleton is an intermediate artifact, not a passing proof.
7. Aggregate verified node proofs into a linear natural-language proof with the Aggregation Agent (Section 3.1, p. 5).

Verus form. Inference: represent the blueprint as a dependency DAG outside Rust, and make each node a Verus `proof fn` or `lemma` with explicit `requires` and `ensures`. Use `assert` and solver-friendly helper lemmas to close local obligations; use loop `invariant` declarations only on executable loops. A node is complete only after `cargo verus` accepts the complete file without `external_body` on the function being verified. The human-selected strategy remains metadata and review input; Verus checks the resulting contracts and proof code, not the adequacy of the strategy graph itself.

Evidence. On 12 cases GPT-5.4 initially failed, MathCoPilot passed 9/12 on the first system pass and 10/12 after recursive local-lemma refinement (Table 3, p. 7). The denominator is twelve selected GPT-unsolved FormalMATH problems, under Lean 4.30.0-rc2 and Mathlib v4.30.0-rc2 with a 1200-second timeout. The authors report: “Counting this lemma-refinement stage, MATHCOPILOT verifies 10/12 of the targeted GPT-unsolved cases.” (Section 4.3, p. 7).

Failure and assumptions. The blueprint does not guarantee a proof: two of the twelve cases remain open after refinement. The formalizer can expose a local obligation while leaving its mathematics unresolved. Inference: VL must retain human review of contracts and decomposition boundaries, because a well-organized graph can still encode a false or vacuous specification.

## technique 2: feedback-driven proving-skill orchestration

What it is. MathCoPilot chooses among NL-first, formalization-first, and knowledge-grounded proving at each step instead of running one fixed pipeline. The paper describes the verifier loop: “This attempt is then submitted to the Lean 4 environment, which returns either a success signal or detailed error information (e.g., type mismatches, missing hypotheses, incomplete tactics, unsolved goals).” (Section 3.2, p. 5).

How to do it. Analyze the formal statement and retrieve relevant lemmas; select an initial skill; generate a proof; submit it to Lean; parse diagnostics; classify the failure; retry with another skill, refine the approach, retrieve more lemmas, or ask the human; repeat until success or an open goal remains (Section 3.2, p. 5). The FormalMATH comparison gives a concrete choice: NL-first writes a natural-language proof sketch before Lean translation, while formalization-first works directly from the formal statement (Section 4.1, p. 6).

Verus form. Inference: implement the orchestrator as an external driver that generates candidate Rust/Verus patches and invokes Verus. Keep each candidate's `requires`, `ensures`, `assert`, loop `invariant`, and `proof fn` code under version control; feed diagnostics back to the next candidate. The checker result is the acceptance signal. Do not treat a generated proof function as runtime code, and do not repair failures by weakening the contract without human authorization.

Evidence. On 21 FormalMATH problems, each model/skill cell has denominator 21 and the overall skill denominator is 63 attempts. NL-first passes 20/63 (31.75%) versus 10/63 (15.87%) for formalization-first (Table 1, p. 6); the paper's stated improvement is exactly double. The domain heatmap shows Integral, Other, and Sequences/Series at 0/18 across both skills and all models (Table 2, p. 6). The common failure was residual `sorry`, occurring 19 times under FF and 23 under NL (Section 4.2, p. 6).

Inference: the result supports using informal sketches as a search scaffold, but it does not establish that NL-first is universally better for Verus systems code; the benchmark is undergraduate mathematics and Lean.

## technique 3: verified personal knowledge-base construction

What it is. For a topic, the system retrieves papers, arXiv material, and Mathlib, extracts definitions, theorem statements, dependencies, proof sketches, and notation, then formalizes in dependency order. The paper states: “Each formalized Lean file is compiled and verified against the Lean 4 type checker, and only content that passes compilation enters the knowledge base.” (Section 3.3, p. 5).

How to do it. Rank retrieved sources by relevance, citation count, and formalization potential; extract definitions first, then auxiliary lemmas, then main theorems; prompt an LLM with Mathlib context; compile each file; store verified Lean plus the natural-language proof process; index entries by tags, theorem names, dependency graphs, and summaries; re-verify entries after Mathlib updates and flag incompatibilities (Section 3.3, p. 5).

Verus form. Inference: use a repository of verified Rust modules where each entry contains executable code, `spec fn` definitions, contracts, and proof lemmas. Store dependency metadata and rerun Verus after toolchain or library changes. External APIs need explicit modeled contracts; a passing proof establishes the stored contract, not that the extracted paper statement matches the product requirement.

## PDE boundary and trusted base

The PDE study uses three formalization routes and 20 attempts. Table 5 reports 12/20 (60%) Lean-checked certificates, but the paper warns: “Current Mathlib does not contain a full formal development of DG methods, Sobolev estimates, or Gauss–Radau projection theory.” (Section 5.1, p. 9). Successful files therefore use opaque declarations or axioms for deep analysis and verify only assembly. Per-route denominators are 2/8 for GPT-Formalized, 6/6 for Opus-Formalized, and 4/6 for Direct (Table 5, p. 9). Wrong-proof review is separate: Gemini 3.1 Pro and GPT-5.4 reject all four flawed PDE proofs (Table 6, p. 10).

Inference: the largest VL threat is specification and abstraction drift. Agent-written verified Rust can be internally correct while relying on an opaque external contract or a wrong model. The paper's explicit separation of certificate assembly from end-to-end PDE formalization is a useful product boundary.

## what was already done and what VL should not redo

MathCoPilot already combines human blueprint editing, recursive subgoal refinement, verifier feedback, skill routing, retrieval, and verified knowledge-base maintenance. VL should not present those workflow ideas as new by themselves. A distinct VL contribution would need evidence on Rust/Verus contracts, ownership, concurrency, and real maintenance rather than Lean mathematics.

## techniques for the catalog

- editable proof blueprint — decompose a target into human-navigable dependent nodes and recursively refine hard nodes
- verifier-feedback orchestration — select and switch proof skills from checker diagnostics until a candidate verifies
- NL-first scaffold — write an informal proof before formal translation when the formal statement is hard to navigate
- verified knowledge base — extract source mathematics, formalize in dependency order, compile, index, and re-verify on library updates
- abstraction-aware certification — separate opaque domain assumptions from the formally checked assembly and report both

Checked 2026-10-15 against the paper by a Codex agent for mathcopilot_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
