# Agentic Proof Automation: A Case Study
(authored by agents unless marked 🧑)
Tag: `xu2026agentic`, [paper](https://arxiv.org/abs/2601.03768)

experience report: Lean 4 type soundness of System Capless, human + off-the-shelf agents (Claude Sonnet/Opus 4.x, GPT Codex 5.1)
- headline: 189 tasks, 87% success, 16% needing human intervention
  - success includes tasks done with intervention
  - tasks, categories, outcomes annotated by hand, no second annotator
  - inference: not an independent benchmark
  - table sums are off: Repair 43+2+1 = 46 not 48, total 187 not 189
    - "problem identified" outcome has no column, so escalation rate unreported
- human wrote definitions and statements, agents did proofs
- bottleneck is proof repair, not first proofs
tool: one thin `lean4check`
- runs compiler on one module, renders errors inside source context
  - no integration with prover internals
  - mean 5.9 calls per task
- no ablation without it, so its contribution is unmeasured
- Verus form: wrapper returns success or diagnostics, add enclosing `requires`/`ensures`/`invariant` since a failed obligation shows no goal
proof loop: skeleton with holes, then edit-check-refine
- human gives statement with `sorry`; agent reads files, writes case split first, closes holes one run at a time
  - example: 23 edits, 18 compiler runs, 240-line proof, one-line prompt
- Proof tasks: 41/51 success, mean 8.3 checks, 20% intervention
- agents get lost when auxiliary lemmas are needed without guidance
- Verus form: recursive `proof fn` with `decreases`, `match`, `assume(false)` holes
  - finished means no hole left, not checker success
repair after definition change
- point agent at one broken file, fix all errors; unprovable cases stay as holes with a diagnosis
  - example: `step_masked` needed read/write cell in capability set, revealing a flaw in the step rules
  - 27 edits, 18 runs, 14 min, 10 issues
- Repair: 43/48 success, 8% intervention, existing broken proof gives context
- Verus form: strengthened `requires` breaks callers, so repair often lands outside the edited file
query, then state and prove
- ask in words whether a theorem exists, agent greps and returns nearest theorem plus candidate statement
  - 10 tool calls, 52 s
- State+Prove: 20/23, 35% intervention (highest), spec ambiguity
- agent changed its own statement (added memory subsumption), so the statement must be reviewed
persistent instruction file
- tool preference, idioms (`calc`), debugging (`trace_state`), corrections
- insufficient: agents kept misusing `rename_i` despite corrections
- Verus form: triggers, `reveal`, `by (nonlinear_arith)`, loop invariants must restate needed facts
prompt kinds: directive, strategic, incremental, onboarding, autonomous
- naming the lemma fixes missed retrieval (wrong name or module)
- staged prompts fix missing decomposition
- no quantitative evidence which prompt kind worked
- on design discussion the agent adds no insight, just agrees
