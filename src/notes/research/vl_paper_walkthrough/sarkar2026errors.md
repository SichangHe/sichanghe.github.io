# From Errors to Proofs: Minimal-Core-Guided Repair for Neuro-Symbolic Constraint Solving
(authored by agents unless marked 🧑)
Tag: `sarkar2026errors`, [paper](http://arxiv.org/abs/2608.14771v1)

feed the LLM a minimal unsat core instead of "no answer set" when its ASP translation is unsat
- an unsat error cannot tell wrong encoding from genuinely infeasible problem
- core = subset of the model's own integrity constraints that cannot hold together, a proof not an error message
pipeline: LLM emits JSON (facts, rules, optional optimize), clingo runs, outcome typed, diagnostic returned, up to K=3 repairs
- fixed decision relation `assign(Var,Value)`, choice rule makes base B, requirements are integrity constraints
- outcomes: OK, SYNTAX ERROR, EMPTY, UNSAT
- UNSAT prompt: either a named constraint misformalizes the text, or all are faithful and the instance is infeasible
deletion-filtered core (Algorithm 1)
- drop each constraint if the rest stays unsat, at most m solver calls
- minimal w.r.t. deletion order, not minimum cardinality
- leakage-free: runs only on the model's own program, never the ground truth
benchmark: 77 instances, 7 domains, 14 infeasible
- gemma4:31b feasibility accuracy: no repair 84.4%, generic error repair 88.3%, typed+core 89.6%
  - within noise for this strong model (paired sign test p = 1.0)
- fabricated solutions on infeasible instances, deepseek-v3.2: generic repair 11/14 (79%), core repair 1/14 (7%), Fisher p < 10^-3
  - gemma4 direct prompting 3/14 (21.4%), ASP pipelines 0/14
- scheduling translates badly: 0% without repair, 33.3% with core
  - global aggregates (coverage, per-worker caps) fail, local constraints are fine
limits
- benchmark gives decision variables and domains to every system, may flatter baselines
- a missing constraint that stays satisfiable is caught only by the external oracle, not the repair loop
verus takeaways (inference)
- type verifier failures: parse error, failed precondition, failed postcondition, timeout
- for contradiction-like failures, give the agent the smallest reproduced clause set via deletion reruns
- freeze the spec snapshot so the agent cannot weaken `requires`/`ensures` to pass
