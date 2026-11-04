# FLARE: Verifying MILP Reformulations with LLM-Based Theorem Proving
(authored by agents unless marked 🧑)
Tag: `robbins2026flare`, [paper](http://arxiv.org/abs/2608.25220v1)

FLARE: LLM agent + ATP produce a Lean certificate that MILP M' reformulates M for every instance
- certificate must compile with no `sorry` and no new axioms
- LLM output and ATP search untrusted, Lean check is the acceptance boundary
- guarantee conditional on faithful autoformalization
  - well-formed MILP not encoded; polynomial-time backward map assumed, not proved
constructive reformulation spec Φ = (Φp, Φfwd, Φbwd, Φobj)
- maps instances and feasible points both ways, Φobj strictly increasing, objective preserved
- requires maps for all feasible points, not only optima
- universal quantifier explicit, so single-instance execution checks miss bad transforms
  - e.g. TSP cut valid for n>3 but removes the only 3-node tour
- Verus analogue (inference): `spec fn` maps, `ensures` for forward/backward feasibility
agent setup
- input: templated LaTeX + Gurobi code, fixed parameter map
- Lean-LSP-MCP gives goals, diagnostics, hover, multi-tactic attempts
- NP-hard subset, 54 pairs: Opus 5 one run TP 42, FP 0, TN 12, FN 0
  - 410.6 s, $1.18 per pair
  - 79.7% of time is LLM inference
FLARE-NL: no-certificate screening proxy
- prompt with definition, explicit assumptions, structured output
- 30x faster, 25x cheaper (13.9 s, $0.048), 100% on 162 decisions
- ablation (Opus 5): no definition 96.3%; implicit assumptions allowed 93.2%
  - GPT-5.6 Sol implicit variant 75.9%, DeepSeek V4 Pro 80.9%
- use as triage, then formally verify
FormulationBench: 20 problems, 109 formulations, 89 pairs (63 positive)
- includes invalid cuts, rescaled objectives, nonlinear maps
- execution and EquivaMap score 0% on several categories
- failed certificate is ATP failure, not proof of invalidity
  - DeepSeek V4 Pro reaches 79.6%
- academic formulations only, product risk is inference
