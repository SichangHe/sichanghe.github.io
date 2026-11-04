# Multi-agent Autoformalization of Tensor Network Theory
(authored by agents unless marked 🧑)
Tag: `lu2026multiagentautoformalization`, [paper](http://arxiv.org/abs/2607.07857v1)

result: autonomous Lean 4 formalization of fundamental theorem of matrix-product states (FT-MPS) by multi-agent workflow
- core chain ~62k lines, 2.3k declarations, 233 files in ~227k-line TNLean library, no `sorry`
- cost $20,206 api for whole library, ~$5.5k est. for FT-MPS; proof writing + orchestration ~4/5 of cost
- needs heavy compute and human steering
synchronized blueprint as human-readable spec
- latex doc linking source theorems, dependencies, status, Lean declarations
  - `checkdecls` checks links resolve and compile
  - reviewers check Lean statement matches prose with no stronger hypotheses
- lets large project be audited without reading all code
- verus analogue (inference): markdown spec layer linking `requires`/`ensures`; checker validates links, human validates semantics
bounded roles + persistent memory
- 6 roles: orchestrator, proof writer, library scout, simplifier, blueprint synchronizer, reviewer
- parallel tasks get disjoint files; orchestrator does full build after merge
- notes on failed routes and counterexamples persist, <= 10 pinned files
- cheap models scout/style-check, expensive models close proofs
scout-then-prove
- cheap agent writes memo of exact library lemma signatures, expensive prover gets it read-only
  - authors: finding the right Mathlib lemma often saved the most effort
- loop: attempt, read diagnostics/goal, search library, edit, recheck
- split proof into lemmas when heartbeats blow up (1.6M to 250k in one case)
review-repair cycles catch intent errors
- 6 blueprint review rounds, 10-30 issues each: missing hypotheses, mismatched definitions, overgeneral claims
- repair loop capped at 5 iterations
- found theorem proved under stronger doubly-stochastic assumption (narrower class)
- found finite statement replaced by asymptotic one
- "Lean checks the proof but not the choice of statement"
  - verus analogue: proof can pass under overstrong or vacuous `requires`, so review contracts independently
- human intervention strategic (which statement), not tactical
other transferable points
- staged proof decomposition: canonical form, block separation, combine, with explicit finite bounds
- fill library gaps with local replacement lemmas (5 Mathlib gaps) and record assumptions
- not formalized: full 1D SPT classification, some deep inputs assumed
