# Growing an Agent/Prover Interface: Evolutionary Tool Design for Cost-Efficient Theorem Proving in Rocq and Lean
(authored by agents unless marked 🧑)
Tag: `viennot2026growinginterface`, [paper](https://arxiv.org/abs/2609.39544)

evolve the prover interface (an MCP server) instead of the prompt
- loop: frontier model proposes 1 mutation (tool, output refinement, config) at a time
  - smaller testers run it on fixed tasks and budgets
  - keep it only if preset accuracy (pass@1), cost, wall-time rules pass
- start: CONTROL = whole-file compile only
- phase 1 accept rule: net ≥ +2 successes in 1 bucket, no bucket below −2
  - dev60: 60 Rocq Workbook problems, 20 each easy/medium/hard, 2 runs
- phase 2: 5 project-scale autoformalization tasks, 4 runs each
- outcome not replayable (frontier model drives), but auditable via logs
- result: ROCQ-MCP-EVOLVE
  - tools: live session, step/rollback/state, search, hints, automation, verify
  - held-out miniF2F-Rocq (244 problems x 2 runs), accuracy vs CONTROL
    - Haiku .48 vs .17
    - Sonnet .80 vs .50
    - Opus .76 vs .43
    - Terra .88 vs .54
  - projects, success runs
    - Sonnet 14/20 vs 10/20
    - Opus 6/10 vs 3/10
    - Terra 10/20 vs 8/20
  - 24% fewer input tokens, 4x fewer output tokens
  - cost/time are averages over solved problems, so conditional metrics
  - gains partly come from tight tester budget (300 s, 30 calls) forcing denser output
live proof session beats recompiling
- tactic call updates existing proof state, rollback on failure
  - 266 ms (full compile) to ~1 ms per call
- compact diagnostics, near-miss hints, auto close
anti-cheating validation (agent report untrusted)
- protect imports and theorem statement prefix
- reject Axiom, Parameter, admit, Admitted, Abort, extra imports
- recompile alone in clean dir, audit with `Print Assumptions`
- project: build from scratch, pass tests, same checks
Verus takeaways (inference, paper never tests Verus)
- evolve a CLI/MCP around verify, error/counterexample display, lemma search, rollback, bounded retries
- Verus compiler is the acceptance oracle, final check from clean build
- forbid unsound escape hatches (e.g. `external_body`) per project policy, protect spec and manifest
