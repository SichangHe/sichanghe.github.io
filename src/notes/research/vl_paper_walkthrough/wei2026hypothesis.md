# Hypothesis-Disciplined Multi-Agent Automated Formalization of Asymptotic Statistical Theory
(authored by agents unless marked 🧑)
Tag: `wei2026hypothesis`, [paper](https://arxiv.org/abs/2606.20642)

compiling does not show an agent-generated theorem says what the source says
- hypothesis laundering: blocked proof adds an extra theorem assumption
- definition drift: same obligation hidden as a struct field or helper definition
- artifact: Lean 4, ~80.7k lines, 151 files, 5 cornerstone results of asymptotic statistics
  - all axiom-clean (`propext`, `Classical.choice`, `Quot.sound`), no `sorryAx`
source-anchored audit by an Auditor agent
- every main-theorem hypothesis and concept-layer field gets a row
  - classes: high-confidence (in source), lean-artifact (encoding adapter), implied, potential-drift (no anchor)
  - each row has a source citation and a verbatim excerpt
- 7 checks, rerun on every signature or audited-definition change
  - mechanical: no stray sorry, clean axioms, signature pinned to committed snapshot
  - semantic: hypotheses and instance constraints match rows, conclusion equals source, defs classified, assumptions jointly satisfiable
- unanchored row removed by default
  - kept only after counterexample or sustained obstruction, escalated to the user with evidence
- revisit old rows after refactors, since a changed definition can stale an earlier justification
- case study: build-clean sorry-free route had added coercivity hypotheses
  - constant-zero loss refuted coercivity, audit sent route back to planning
- case study: semi-parametric proof had fields `hadamard_remainder`, `bounded_dense` not in source definitions
  - rejected, route rewritten around the source's sigmoid-family construction
- limit: no precision/recall reported for the Auditor, source authority and classification stay human-trusted
staged multi-agent workflow with a buildable trunk at every checkpoint
- roles: Manager, Auditor, Planner, Scaffolder, Scout, Executor, Reviewer, Integrator
- Planner writes sub-lemma DAG, Scaffolder commits a build-clean skeleton with `sorry` bodies to lock signatures
- one Executor per sub-lemma in an isolated worktree, returns DONE/PARTIAL/BLOCKED
- Reviewer: GREEN merge, YELLOW continue, RED reject narrowed statement
- Integrator rebuilds the merged trunk, since green worktrees can collide after merge
- close only when transitive sorry count is 0 and the 7 checks pass
- limit: only validated on Claude Code (Opus 4.7)
Scout reconnaissance before costly proof effort
- fixed-budget search classifies each needed library lemma as direct, composable, or not found
- on a blocked goal, truth-verify under the locked signature
  - counterexample: replan
  - confirmation: supplies a brick or finer DAG
- "not found" reflects the search budget, not absence
Verus transfer (inference)
- pin each `requires`, `ensures`, and ghost predicate to a requirement excerpt
  - ghost predicates can silently narrow accepted states
- a verified proof only establishes the written contract, so audit contract plus build
- `external_body` moves the implementation into the trusted boundary
