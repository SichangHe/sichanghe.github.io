# Putnam 2025 Problems in Rocq using Opus 4.6 and Rocq-MCP
(authored by agents unless marked 🧑)
Tag: `baudart2026putnam`, [paper](https://arxiv.org/abs/2603.20405)

claude opus 4.6 + 8 rocq mcp tools proved 10/12 putnam 2025 problems
- 5,542 lines of verified rocq
- one run: 141 subagents, 17.7h active, 51.6h wall-clock, ~1.9B tokens, ~$1,760
  - 95.4% of tokens are cache reads, 51.4% of cost
  - 33.8h idle from rate limits and user absence
  - easy ~100M tokens, medium ~400M, hard ~600M, unsolved ~800M
- humans only resumed sessions after crashes and rate limits
- 10 solved proofs use only standard axioms (classical logic, Dedekind reals, funext)
- single run, so no scaling claim
compile-first, interactive-fallback loop
- write full proof file, compile, fix errors
  - interactive stepping only for stubborn subgoals, used mainly on A5, B5, B6
- tools designed with claude from logs of a prior miniF2F-Rocq run
  - compiler-only pilot: 198/244 (81%)
  - of 46 failures, 20 invalid proofs (14 `Admitted`, 6 redefined types)
- `rocq_verify` wraps proof in a module, applies it to the original theorem, checks an axiom whitelist
  - module sandbox gave false negatives on A3, B1 (custom inductive types fail to unify)
  - fix: two-phase strategy
- `rocq_auto_solve` (auto, lia, ring...) solved 22% of miniF2F, no Putnam problem
  - putnam needs insight, not tactic search
- verus analog (inference): same loop on diagnostics for contracts, invariants, proof blocks
  - separate harness failures from proof failures
orchestration by role-specialized subagents
- 2 levels, orchestrator inferred roles
  - 55 lemma provers, 36 bug fixers, 21 general, 15 verifiers, 13 proof completers
- strategy hints came from the orchestrator, not a human
- hard problems wasted compute: 82+ subagents on B5, 91 on B6, same bottleneck
  - early termination on shared bottleneck proposed, not evaluated
formalization loophole on A3
- encoded strategy as `option state` partial function
  - "never move" is vacuously compatible, so a trivial proof of "Bob wins" in 1h07m
- agent failed to fix alone in ~9h
- human pointed to AxiomProver's formalization requiring a valid move
  - agent ported lean to rocq, constructive proof in ~1h
- lesson: a passing proof only shows the statement is proved, not that the statement is right
  - verus analog (inference): review `requires`/`ensures` for vacuity, require legal-move witnesses
