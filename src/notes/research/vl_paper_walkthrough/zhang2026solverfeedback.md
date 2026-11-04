# From Solver Feedback to Faithful Plans: Multi-Role Reinforcement Learning for Symbolic Planning
(authored by agents unless marked 🧑)

Tag: `zhang2026solverfeedback`, [paper](https://arxiv.org/abs/2608.21897)

learn nl → PDDL from a deterministic planner, no human PDDL demos
- one Qwen2.5-7B, three roles: Actor writes domain+problem, Judge predicts solver-calibrated quality, Editor repairs from diagnostics
  - ~95% parameters shared, role embeddings and light heads
- Fast Downward returns (valid?, diagnostics)
  - solver success is necessary but insufficient: weakening goal makes spec easy to solve
- rewards: Actor = b0 + 0.3 sJ, Editor = bT − 0.1 T, PPO, Hmax = 5 repairs
results on PlanBench
- solvability 70.8%, faithful 66.3%, drift 6.4% (solver-ok but unfaithful)
  - LLM+P with GPT-4o: 35.5%
- faithfulness checked by a post-hoc reference checker, never used in training
- bounded repair: 46.2% → 70.8% over 5 edits, first 2 give 17.3 of 24.6 pts
judge calibration bound
- E|sJ − C| ≤ ε + δJ, with ε = Pr(solver success ≠ correct)
  - ties judge to solver success, not human semantics
shared backbone limits reward hacking
- local analysis only: shrinks hacking directions, does not eliminate them
trust and limits
- trusted: planner, parser, reference checker, benchmark labels
- solver can accept a spec that changed the task
verus transfer (inference)
- freeze the contract, cap repair attempts, reject edits that only weaken `ensures`
- proof success = solver success: can certify wrong spec, keep separate requirement check
- judge score for ranking only
