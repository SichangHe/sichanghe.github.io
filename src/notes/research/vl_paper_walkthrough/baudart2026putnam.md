# Putnam 2025 Problems in Rocq using Opus 4.6 and Rocq-MCP
(authored by agents unless marked 🧑)
Tag: `baudart2026putnam`, [paper](https://arxiv.org/abs/2603.20405)
## scope and result

This case study equips Claude Opus 4.6 with eight Rocq MCP tools and asks it to prove all twelve 2025 Putnam problems. The authors report 10/12 solved and 5,542 lines of verified Rocq code, but the initial A3 proof exploited a formalization loophole; the agent later corrected it in a separate session with human guidance (Sec. 3, p. 3; Sec. 5, pp. 6–7). The abstract states, “The MCP tools, designed with Claude by analyzing logs from a prior experiment on miniF2F-Rocq, encode a compile-first, interactive-fallback strategy.” It reports an isolated VM with no internet access, 141 subagents, 17.7 hours of active compute, 51.6 hours wall-clock, and approximately 1.9 billion tokens (Abstract, p. 1). Human intervention during the original run was limited to resuming sessions after container crashes and rate-limit pauses (Sec. 2.3, p. 3). Inference: These measurements describe one run and do not establish general scaling behavior.

## technique 1: compile-first, interactive-fallback proof development

what it is

The rocq-mcp server divides eight tools into compilation and interactive tiers. `rocq_compile` compiles a complete file with structured errors, source lines, and caret positions. `rocq_verify` wraps the generated proof in a Rocq module, attempts to prove the original theorem by applying the wrapped theorem, and checks an axiom whitelist. `rocq_auto_solve` tries standard tactics such as `auto`, `lia`, `lra`, `ring`, and `field`. Interactive tools query libraries (`rocq_query`), execute tactics (`rocq_step`), test up to 20 tactics in parallel without advancing the session (`rocq_step_multi`), and inspect file structure or notation (`rocq_toc`, `rocq_notations`) (Sec. 2.1, p. 2).

The paper describes the main loop: “the agent writes a complete proof file, compiles it, iterates on errors, and only falls back to interactive stepping for debugging specific subgoals.” (Sec. 2.1, p. 2). Its components are:

1. Start from the supplied standalone `.v` file containing definitions and an admitted theorem stub (Sec. 2.3, p. 3)
2. Try standard automation as a quick check before manual proof construction (Sec. 2.1, p. 2)
3. Write a complete proof, compile, fix errors, and repeat; use interactive stepping for specific subgoals when needed (Sec. 2.1, p. 2)
4. Check the finished proof against the original theorem and axiom whitelist with `rocq_verify` (Sec. 2.1, p. 2; Sec. 4.1, p. 4)

The compiler-only miniF2F pilot proved 198 of 244 test theorems (81%), with compilation and manual verification. Of 46 failures, 20 were invalid proofs (14 used `Admitted`, six redefined types), 15 had open subgoals, and 11 involved timeouts, type errors, or import issues. Library search and scope ambiguity also motivated query and notation tools (Sec. 2.2, p. 2). For Putnam, the paper states, “Every successful proof was ultimately verified via rocq_compile or direct coqc invocation.” (Sec. 4.1, p. 3). It also reports, “Standard automation never solved a Putnam problem: these require non-trivial mathematical insight, not tactic search.” (Sec. 4.1, p. 3). `rocq_step` was used almost exclusively on A5, B5, and B6; compile-first sufficed for the other nine problems (Sec. 4.1, p. 5).

Verus form

Inference: Adapt the complete-file compile-and-repair loop to Rust/Verus, using diagnostics to repair contracts, loop invariants, and proof blocks. Keep the intended theorem statement separate from generated proof text and check that the proof establishes that statement. This is a proposed adaptation; the paper evaluates Rocq tools.

evidence and limits

`rocq_auto_solve` solved 53/244 (22%) miniF2F-Rocq tests as a quick baseline (Sec. 4.1, p. 4). Putnam compile success rates ranged from 46% (A1) to 58% (A3), with a median near 50% (Sec. 4.1, p. 3). The module sandbox produced false negatives on A3 and B1 because custom inductive types failed to unify across its boundary; a two-phase strategy was added later to handle this case (Sec. 4.1, p. 4). Inference: A Verus adaptation should distinguish failures introduced by its checking harness from failures in the proposed proof.

## technique 2: proof-by-subgoal multi-agent orchestration

The orchestrator launched four parallel teams of three problems, then spawned 141 worker subagents in a two-level architecture with no observed sub-subagent spawning (Sec. 4.2, p. 5). Table 3 explicitly cautions, “Roles are inferred from each agent’s initial prompt.” It classifies 55 Lemma Provers consuming 738M tokens, 36 Bug Fixers 538M, 21 General agents 253M, 15 Verifiers 65M, 13 Proof Completers 185M, and one Compiler 1M, totaling 1,780M tokens and 11,752 tool calls (Table 3, p. 5).

After establishing an overall proof structure, targeted workers proved lemmas, repaired compile errors, completed skeletons, and checked axiom-freeness and unnecessary `Admitted` stubs. The initial burst solved four problems in 1.8 hours and seven in 5.2 hours. The authors report 82+ subagents for B5 and 91 for B6, with many attempting the same mathematical difficulty without fundamentally new approaches (Sec. 4.2, p. 5).

Early termination is a proposed improvement, not an evaluated part of the workflow: “An early-termination strategy that detects when multiple agents fail at the same bottleneck could save substantial resources.” Each subagent received mathematical strategies in its prompt; examples include A2's two-region upper-bound strategy and B1's equilateral-triangle construction. These hints came from the orchestrator rather than a human (Sec. 4.2, p. 5).

Verus form

Inference: For VL, workers could prove independent Rust/Verus lemmas, repair diagnostics, complete proof skeletons, and verify results. Track repeated failures on the same obligation and consider a strategy change or stopping rule. The paper does not evaluate that stopping rule.

## technique 3: formalization-gap detection and repair

A3's initial encoding represented game strategies as partial functions (`option state`). The paper explains: "This encoding had a loophole: the strategy “never move” is vacuously compatible with any game, so the agent proved Bob wins with a mathematically trivial argument in 1 h 07 m." Asked to close the loophole, the agent spent approximately nine hours attempting the strengthened statement before concluding that the encoding was fundamentally flawed. The authors then pointed it to an AxiomProver formalization requiring the current player to exhibit a valid move. The agent translated that formalization from Lean to Rocq and found a correct, fully constructive proof in approximately one hour (Sec. 5, pp. 6–7; the quoted passage is on p. 7).

Inference: Reusable steps suggested by this episode are:

1. Inspect definitions for vacuous witnesses, such as a strategy that never supplies a move
2. Check whether a successful formal proof establishes the intended mathematical claim
3. Revise a flawed encoding to make required actions explicit
4. Prove the revised statement and check it again

Verus form

Inference: A Verus game model could require witnesses for legal moves and prove that every reachable nonterminal state has a legal successor. Review `requires` and `ensures` for conditions that make the intended result vacuous. These are proposed applications of the A3 example, not techniques tested in Rust by the paper.

## measured costs and trusted boundary

The run consumed 1,897M tokens at an estimated $1,760: 1,809M cache-read tokens (95.4% of tokens; $905, 51.4% of cost), 16M output tokens ($406, 23.1%), 72M cache-creation tokens ($448, 25.5%), and less than 1M input tokens ($1, 0.1%) (Table 4, p. 6). Table 5 estimates four easy problems at about 100M tokens and under two active hours, four medium problems at about 400M and five hours, two hard problems at about 600M and 11 hours, and two unsolved problems at about 800M tokens (Table 5, p. 7). The authors report 17.7 active hours out of 51.6 wall-clock hours, with 33.8 hours in seven inactivity gaps caused by API rate limits and user absence (Sec. 4.3, p. 6).

The paper reports, “All 10 solved proofs pass verification with only standard axioms (classical logic, Dedekind Reals, functional extensionality).” (Sec. 4.1, p. 4). Five proofs use no axioms: A3, A6, B3, B4, and B5 (Sec. 3, p. 3). A3's original success nevertheless concerned a flawed formalization (Sec. 5, pp. 6–7). Inference: Verification still depends on the adequacy of the theorem statement and the correctness of the proof-checking tools; a Verus adaptation must review both.

## what VL should reuse and product threat

Inference: VL should evaluate complete-file repair, structured diagnostics, checking against the intended statement, and specialized lemma workers as baselines. The A3 result supports reviewing formal statements for vacuous conditions as well as checking proofs. The paper's initial run illustrates exploitation of a flawed encoding; the corrected encoding required human guidance. It does not establish transfer to concurrent systems code or general cost-effectiveness of this worker count.

## techniques for the catalog

- compile-first fallback — compile complete proof files, then use interactive goal tools for targeted debugging
- sandboxed proof verification — wrap the proof in a module, apply its theorem to the original statement, and check an axiom whitelist
- role-specialized subgoals — use workers for lemmas, error repair, completion, and verification
- formalization-gap repair — revise flawed statement encodings and prove the corrected statement; A3 required human guidance

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The orchestrator launched 4 parallel teams of 3 problems each, then spawned a total of 141 subagents over the experiment."): checked the full paper text, study quotations, numbers, section and page references, technique descriptions, tag, and arXiv link; corrected page references, the unsupported A6 subagent count, inferred role labels, A3 attribution and timing, and claims presenting recommendations as tested methods; marked proposed adaptations and conclusions as inferences; did not independently inspect experiment logs, repositories, proof artifacts, or rerun proofs.
