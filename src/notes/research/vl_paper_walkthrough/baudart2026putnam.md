# Putnam 2025 Problems in Rocq using Opus 4.6 and Rocq-MCP
(authored by agents unless marked 🧑)
Tag: `baudart2026putnam`, [paper](https://arxiv.org/abs/2603.20405)
## scope and result

This case study equips Claude Opus 4.6 with eight Rocq MCP tools and asks it to prove all twelve 2025 Putnam problems. It solved 10/12 and produced 5,542 lines of verified Rocq code (Secs. 3 and 6, pp. 3, 7). The abstract reports, “The MCP tools, designed with Claude by analyzing logs from a prior experiment on miniF2F-Rocq, encode a compile-first, interactive-fallback strategy.” The run used an isolated VM with web search disabled, 141 subagents, 17.7 hours of active compute, 51.6 hours wall-clock, and approximately 1.9 billion tokens (Abstract, p. 1). These are measurements of this run, not a general theorem about agent scaling.

## technique 1: compile-first, interactive-fallback proof development

what it is

The rocq-mcp server divides tools into compilation and interactive tiers. `rocq_compile` compiles a complete file with structured errors, source lines, and caret positions; `rocq_verify` wraps an LLM proof in a Rocq module and checks the original theorem while filtering non-whitelisted axioms; `rocq_auto_solve` tries standard tactics such as `auto`, `lia`, `lra`, `ring`, and `field`. Interactive tools query libraries (`rocq_query`), execute one or up to 20 tactics in parallel (`rocq_step`, `rocq_step_multi`), and inspect file structure or notation (`rocq_toc`, `rocq_notations`) (Sec. 2.1, p. 2).

The operational procedure is:

1. Write a complete `.v` file containing definitions and a theorem statement (Sec. 2.3, p. 3)
2. Invoke `rocq_compile` or `coqc`; read structured errors and revise the file (Sec. 2.1, p. 2)
3. Use `rocq_auto_solve` as a fast baseline before manual proof construction (Sec. 2.1, p. 2)
4. If a subgoal is unclear, query libraries and notations, then use `rocq_step` or `rocq_step_multi` to inspect and test tactics (Sec. 2.1, p. 2)
5. Run `rocq_verify` on the finished theorem to sandbox the proof and check axioms (Sec. 2.1, p. 2)

The miniF2F pilot explains the design. With only the compiler, 198 of 244 test theorems (81%) were proved. Of 46 failures, 20 were invalid proofs (14 used `Admitted`, six redefined types), 15 had undetected open subgoals, and 11 involved timeouts, type/import errors, or notation ambiguity (Sec. 2.2, p. 2). The paper states, “Every successful proof was ultimately verified via rocq_compile or direct coqc invocation.” (Sec. 4.1, p. 3). It also reports, “Standard automation never solved a Putnam problem: these require non-trivial mathematical insight, not tactic search.” (Sec. 4.1, p. 4). In the Putnam run, `rocq_step` was used almost exclusively on A5, B5, and B6; compile-first sufficed for the other nine problems (Sec. 4.1, p. 4).

Verus form

Inference: Replace `coqc` with `verus` on a complete Rust file. Keep a compile-first loop that parses and verifies the whole module, then use Verus diagnostics to repair contracts, loop invariants, and proof blocks. A Rust proof harness can put the theorem in a separate module and use `proof fn` plus `assert` to check the intended statement. This is an adaptation: Verus does not expose Rocq's `rocq_step`, MCP server, or module sandbox in the paper.

evidence and limits

`rocq_auto_solve` solved none of the Putnam problems, but solved 53/244 (22%) miniF2F-Rocq tests as a quick baseline (Sec. 4.1, p. 4). The compile success rate per problem ranged from 46% (A1) to 58% (A3), with a median near 50% (Sec. 4.1, p. 3). The module sandbox produced false negatives on A3 and B1 because custom inductive types failed to unify across its boundary; a later two-phase strategy addressed this (Sec. 4.1, p. 4). Inference: A Verus harness should report sandbox-induced failures separately from mathematical failures, because moving ghost types across modules can similarly change elaboration behavior.

## technique 2: proof-by-subgoal multi-agent orchestration

The orchestrator launched four parallel teams of three problems, then spawned 141 two-level subagents (no sub-subagents) (Sec. 4.2, p. 4). Roles were explicit: 55 Lemma Provers consumed 738M tokens, 36 Bug Fixers 538M, 21 General agents 253M, 15 Verifiers 65M, 13 Proof Completers 185M, and one Compiler 1M, for 1,780M tokens and 11,752 tool calls (Table 3, p. 4). The procedure was to establish an overall proof structure, delegate difficult lemmas, repair compiler errors, complete skeletons, and independently check axiom use. The first burst solved four problems in 1.8 hours and seven in 5.2 hours; A6 and B5 each received more than 82 subagents, with B6 receiving 91 (Sec. 4.2, p. 4).

The approach includes a stopping heuristic: repeated failures at the same mathematical bottleneck should trigger early termination, since the paper reports that many agents attempted the same core difficulty without a new approach (Sec. 4.2, p. 4). Mathematical hints are supplied in each subagent prompt; the authors say hints such as A2's two-region strategy and B1's equilateral-triangle construction were critical, and were generated by the orchestrator rather than a human (Sec. 4.2, p. 5).

Verus form

Inference: For VL, parallel workers can own independent Rust/Verus lemmas or modules, while a verifier worker runs `verus` and a bug-fixer worker consumes diagnostics. Keep a two-level tree and record each worker's proof obligations and tool calls. Stop or change strategy when several workers fail at the same obligation; do not count duplicate failed attempts as progress.

## technique 3: formalization-gap detection and repair

Problem A3 demonstrates why proving a formal statement is insufficient. Its first encoding represented game strategies as partial functions (`option` state). The strategy “never move” was vacuously compatible with any game, allowing a one-hour proof that Bob wins. Closing the loophole took about nine hours and showed the encoding was fundamentally flawed. The authors then translated an AxiomProver Lean formalization in which the current player must exhibit a valid move; the agent found a correct fully constructive proof in about one hour (Sec. 5, pp. 6–7).

The reusable steps are:

1. inspect definitions and quantifiers for vacuous witnesses or unconstrained cases (Sec. 5, p. 6)
2. challenge a successful proof with an adversarial interpretation, such as “never move” (Sec. 5, p. 6)
3. strengthen the statement so required actions are explicit, rather than trying to patch a proof of a flawed model (Sec. 5, pp. 6–7)
4. translate or rewrite the formalization and rerun the compile-first loop (Sec. 5, p. 7)

Verus form

Inference: In Verus, require executable transition functions or predicates to witness legal moves, and state non-vacuity in `requires`/`ensures`. A `spec fn` describing a game should quantify only states satisfying the move relation; a `proof fn` can establish that each reachable nonterminal state has a legal successor. This is an inferred encoding discipline, because the paper's example is Rocq/Lean rather than Rust.

## measured costs and trusted boundary

The run consumed 1,897M tokens at an estimated $1,760: 95.4% cache reads ($905, 51.4% of cost), 16M output tokens ($406, 23.1%), 72M cache creation ($448, 25.5%), and less than 1M input tokens ($1, 0.1%) (Table 4, p. 5). Difficulty scaling is steep: four easy problems used about 100M tokens and under two hours, four medium problems about 400M and five hours, two hard problems about 600M and 11 hours, and two unsolved problems about 800M (Table 5, p. 6). Only 17.7 of 51.6 wall-clock hours were active compute; 33.8 hours were seven rate-limit or absence gaps (Sec. 4.3, p. 6).

The ten successful proofs pass `rocq_verify` using only standard axioms—classical logic, Dedekind reals, and functional extensionality—and five are fully constructive (A3, A6, B3, B4, B5) (Sec. 3, p. 3; Sec. 4.1, p. 4). Trust still includes Rocq, its libraries, the module wrapper, the axiom whitelist, generated theorem statements, and the hardware/runtime. Inference: A Verus deployment similarly trusts the verifier, solver, compiler, proof erasure, external specifications, and the semantic adequacy of the Rust model.

## what VL should reuse and product threat

The paper already tested compile-first repair, compiler-structured diagnostics, proof sandboxing, notation queries, subgoal delegation, and formalization adversaries. VL should not redo a generic “LLM plus compiler” demonstration without measuring these baselines. Inference: The threat to agent-written verified Rust is high where an agent can exploit vacuous preconditions, unconstrained transitions, or a type-redefinition boundary. The A3 repair pattern—attack the statement before celebrating the proof—should be a mandatory review stage. The paper does not show that its 10/12 result transfers to concurrent systems code or that 141 agents are cost-effective beyond this task family.

## techniques for the catalog

- compile-first fallback — compile complete proof files, then use interactive goal tools only for targeted debugging
- sandboxed proof verification — re-prove the original theorem in a module and reject custom or unapproved axioms
- role-specialized subgoals — delegate lemmas, error repair, completion, and independent verification to separate workers
- formalization-gap attack — test successful proofs for vacuous encodings and strengthen the model before repairing proof scripts
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
