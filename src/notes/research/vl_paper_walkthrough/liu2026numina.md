# Numina-Lean-Agent: An Open and General Agentic Reasoning System for Formal Mathematics
(authored by agents unless marked 🧑)
Tag: `liu2026numina`, [paper](https://arxiv.org/abs/2601.14027)
## scope and relation to earlier notes

This paper presents Numina-Lean-Agent, a general coding agent connected to Lean through Numina-Lean-MCP. The closest earlier walkthrough is `forall_lean_agent_for_auditable_reasonin_20261013.md`, which discusses an auditable Lean agent; this study records the distinct architecture, feedback loops, decomposition, and measurements in this paper.

The paper's central claim is that a general coding agent can act as a formal-mathematics reasoner when it can inspect Lean states, compile candidate code, retrieve library facts, and ask other models for informal help. It reports all 12 Putnam 2025 problems solved, and a collaborative Brascamp–Lieb formalization of more than 8,000 Lean lines. Those are Lean results, not Verus results.

## technique 1: connect a coding agent to a Lean tool suite

What it is. Claude Code is the autonomous controller. Numina-Lean-MCP exposes Lean-LSP-MCP, LeanDex, an Informal Prover, and a Discussion Partner. The agent chooses tools from the query rather than following a fixed task-specific pipeline.

When to use it. Use this architecture when a proof task needs both formal-state manipulation and non-proof work such as searching definitions, planning, or discussing a blocked idea. The paper says the coding-agent interface covers “diverse proof engineering tasks beyond proving” (Introduction, p. 2).

How the paper does it.

1. Start Claude Code with a Lean project and Numina-Lean-MCP (Section 2.1, p. 2).
2. Use Lean-LSP-MCP's outline, goal, and diagnostic tools to obtain the actual project structure, current goal, and compiler result (Section 2.2, p. 3).
3. Compile isolated snippets with `lean run code`, and use `lean multi attempt` to try several strategies at one proof node (Section 2.2, p. 3).
4. Search local projects and stdlib with `lean local search`; query Mathlib with `lean loogle` (Section 2.2, p. 3).
5. Ask LeanDex to interpret a natural-language query and retrieve relevant Lean objects from packages including Mathlib and FLT (Section 2.2, p. 3).

Verus form.

Evidence and limits. The paper gives no ablation isolating each MCP component. Its evidence is system-level: all 12/12 Putnam problems under the Section 3 setup. Lean-LSP-MCP is described as grounding decisions in “authentic compilation environment” (Section 2.2, p. 3), but retrieval quality and tool-call error rates are not measured.

## technique 2: verifier-driven iterative refinement of informal solutions

What it is. The Informal Prover has a Generator and a Verifier. The Generator writes a solution; the Verifier critiques it; the Generator revises using that feedback. A candidate is accepted only after three independent verification passes agree.

When to use it. Use this loop before formalization when a difficult theorem needs a detailed mathematical plan and informal reasoning can expose errors early.

How the paper does it.

1. Generate an informal solution with the Generator (Section 2.2, p. 3).
2. Have the Verifier assess the candidate and return error feedback (Section 2.2, p. 3).
3. Feed the previous solution and feedback back to the Generator, and repeat until accepted or 20 iterations are reached (Section 2.2, p. 3).
4. Evaluate each candidate independently three times; accept only if all three judgments call it correct (Section 2.2, p. 3).
5. Use the resulting explanation to guide Lean formalization; for Putnam B4, iterative refinement completed in 5 rounds, while independent sampling failed within 10 rounds under the same search configuration (Section 3.1, p. 4).

The paper's exact statement is: “A solution is accepted only if all three verification passes judge it to be correct.” (Section 2.2, p. 3)

Verus form. Inference: run a planning model to propose a Rust/Verus proof outline, then ask one or more verifier agents to check each claimed invariant, precondition, and postcondition against the actual Verus goal. Feed diagnostics and objections into the next outline. Acceptance must still mean a successful Verus check, not three language-model votes. A 20-round cap can bound cost, while unresolved items remain explicit proof obligations.

Evidence and limits. B4 is one comparison, not a general estimate. The paper says the two approaches used the same total number of calls, but reports no denominator beyond the single B4 problem and no statistical repetition. The informal verifier is Gemini-3-Pro-Preview; the formal checker is Lean.

## technique 3: discussion partner for alternative proof paths

What it is. Discussion Partner lets the primary agent ask other language models about proof bottlenecks, strategy choices, or ambiguous intermediate lemmas. The collaborators return alternative ideas rather than directly changing the Lean state.

When to use it. Use it when the current formalization is stuck at a local lemma or when multiple decompositions are plausible.

How the paper does it. The primary model detects a bottleneck, dilemma, or ambiguity and initiates a discussion; collaborating models inspect the current situation from different perspectives and suggest candidate proof paths (Section 2.2, p. 3). The primary agent then tries the suggestions through Lean tools.

Verus form. Inference: expose the current Verus diagnostic, contract, and relevant Rust definitions to a discussion tool. Ask for candidate `assert` chains, `proof fn` lemmas, invariant strengthenings, or solver-friendly rewrites. Apply suggestions only in a branch and rerun Verus; the external model is advisory and contributes no trusted fact.

Evidence and limits. The paper reports that the mechanism can improve robustness and success rate, but it gives no isolated success percentage or number of discussions. Those statements are therefore system-design claims, not a measured causal effect.

## technique 4: subagent decomposition for long contexts

What it is. For Putnam A5, the system decomposes the proof into independently handled subgoals. A subagent obtains an informal hint from GPT-5.2 and formalizes the difficult lemma separately, repeating until it succeeds.

When to use it. Use decomposition when a long proof context makes the main agent lose focus or repeatedly fail on one key lemma.

How the paper does it.

1. Identify the repeatedly blocked lemma in the global proof (Section 3.2, p. 5).
2. Isolate that lemma as a subgoal handled by a subagent (Section 3.2, p. 5).
3. Ask GPT-5.2 for an informal hint (Section 3.2, p. 5).
4. Formalize the lemma in Lean using the hint; iterate the hint and formalization until the lemma is accepted (Section 3.2, p. 5).
5. Reuse the proved lemma in the parent proof.

The paper reports A5 received about a $1,000 budget and took 2,040 minutes in Table 3, but it does not attribute all of that cost solely to the subagent.

Verus form. Inference: split a large Rust verification task into helper `proof fn`s with explicit `requires` and `ensures`; give each helper only the definitions and facts needed for its subgoal. A parent function calls the helper after establishing its preconditions. Keep mutable ownership and loop invariants explicit because a Lean subgoal can be copied freely while Rust values cannot. A helper is complete only when Verus proves it without `assume` or trusted external bodies.

Evidence and limits. Table 2 marks A5 solved only with the subagent row, while the “without informal” and “with informal” rows leave A5 blank. This is evidence that the reported run needed the additional mechanism, but it is one benchmark problem and has no repeated trials.

## technique 5: blueprint-driven long-horizon formalization

What it is. A blueprint is a design document containing definitions and notation, intermediate lemmas at suitable granularity, the final theorem, and explicit dependency edges forming a DAG. It is revised during proof, rather than generated once.

When to use it. Use a blueprint for a complex theorem with dense dependencies, especially when direct proving causes the agent to commit to a bad formulation.

How the paper does it.

1. List required definitions and notation (Section 4.1, p. 5).
2. Select intermediate lemmas and the final theorem (Section 4.1, p. 5).
3. Record dependencies with `\\uses{...}` and follow the resulting DAG order (Section 4.1, p. 5).
4. Attempt each lemma in Lean and inspect compiler feedback and proof states (Section 4.1, p. 5).
5. When a statement is wrong, underspecified, or badly sized, strengthen assumptions, rephrase it to match Lean interfaces, or insert a missing lemma (Section 4.1, p. 5).
6. Ask an external discussion model for alternative decompositions when bottlenecks persist, then continue with the revised blueprint (Section 4.1, p. 5).

The paper describes the loop as “plan–formalize–refine” (Section 4.1, p. 6).

Verus form. Inference: represent the blueprint as Rust modules and helper `proof fn`s, with each helper's `requires`/`ensures` defining DAG edges. Verify leaves first, then callers. Revise contracts when Verus exposes a missing assumption or an unsuitable abstraction. Use `spec fn` predicates for shared mathematical models and `invariant` clauses for loops; these are the corresponding Verus constructs, not Lean syntax.

Evidence and limits. In the Brascamp–Lieb case the authors say the blueprint plus feedback stabilized long-horizon formalization, but they provide no controlled comparison against direct proving and only present the main theorem statement in Appendix A.1, with `by sorry` still in that displayed statement.

## technique 6: human hints and statement self-correction

What it is. Human experts can write hints and modify the blueprint while the agent formalizes. The agent can also detect that a formal statement is false or ill-posed and revise it, as illustrated by an Appendix A.2 lemma for the dimension-zero case.

How the paper does it. A mathematician, a Lean expert, and the agent collaborated for less than two weeks; the agent introduced approximately 70 definitions, lemmas, and theorems while producing more than 8,000 Lean lines (Section 4.2, p. 6). When it encounters a false statement, it can revise the statement during formalization; the appendix adds `hn : ¬Nonempty n` and `hβ_empty : β = 0` to make the empty case explicit (Appendix A.2, p. 8).

Verus form. Inference: let a human revise a Rust contract or blueprint only through a reviewable diff. A changed `requires` or `ensures` must trigger re-verification of callers. For a discovered degenerate case, add the missing precondition or a separate lemma and prove both branches with `assert` and helper `proof fn`s. This workflow transfers; autonomous acceptance of a changed requirement does not.

Evidence and limits. The 8,000-line and 70-item counts are author reports for one case study, and the paper says the full Lean code was still being simplified by humans. The displayed main theorem contains `by sorry`, so the appendix demonstrates statement shape rather than a complete checked proof artifact.

## what is proved, measured, and trusted

Proved or measured: under the stated run, Numina-Lean-Agent solved 12/12 Putnam 2025 problems (Table 1); the B4 refinement comparison is 5 rounds versus failure within 10 for independent sampling (Section 3.1); Table 3 reports per-problem times and Table 4 reports comment- and blank-line-free Lean code lengths. The tables compare systems on the 12 named problems, not a random sample. Budgets are approximate: the paper says the values reflect relative computational effort rather than exact accounting.

Trusted or assumed: Lean's kernel, Lean-LSP-MCP, the Mathlib and other library contents, model APIs, the formal statements supplied by Seed-Prover 1.5, and the no-internet experimental setting. The authors do not provide a complete end-to-end proof of the agent, retrieval correctness, or model judgment. The human case study also relies on human experts and code still being simplified.

Threat to a product of agent-written verified Rust.

## techniques for the catalog

- tool-grounded coding agent — connect a general coding agent to goal, diagnostic, compilation, parallel-attempt, and theorem-retrieval tools
- verifier-driven refinement — generate an informal proof, critique it, revise from feedback, and require repeated independent checks before formalization
- discussion partner — consult other models for alternative proof paths at bottlenecks, then test suggestions in the prover
- subgoal subagents — isolate a context-heavy lemma, obtain a hint, formalize it independently, and compose it into the parent proof
- recursive blueprint — maintain a dependency DAG of definitions and lemmas and revise it from compiler and proof-state feedback
- human-guided self-correction — permit reviewed hints and contract revisions when formalization reveals a false or degenerate statement
