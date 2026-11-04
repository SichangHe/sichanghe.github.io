# Solving Formal Math Problems by Decomposition and Iterative Reflection
(authored by agents unless marked 🧑)
Tag: `zhou2025decomposition`, [paper](http://arxiv.org/abs/2507.15225v1)

delta prover: training-free lean 4 agent on stock gemini 2.5 pro
- 95.9% on miniF2F-test (244 problems), 85.0% on its imo subset
  - same model with best-of-n gets 49.1% at budget 16,384
  - budget = max cost among solved problems
- lean results only, no verus experiment
iterative proof repair
- fresh candidate per round, repaired with lean error + tactic state
- retrieve theorem/definition by the errored identifier name
  - e.g. `sum_le_integral_Icc` retrieves `sum_le_integral_Ico`
  - retrieval effect not ablated
- at fixed budget m×n, accuracy rises with more repairs n; n=1 is best-of-n
  - repair consistently beats best-of-n
reflective decomposition
- informal plan, then dsl sketch, then extract subgoals via `show ... by`
- solve each subgoal with repair loop, regenerate sketch from unsolved goals
- dsl ops: suppose, define, ShowBy, conclude
  - implemented with a `PlayM` monad over `TacticM`
- consolidate: substitute sub-proofs into sketch to emit one proof
- evidence is one problem: imo 2019 p1
  - plain repair failed at 1,024 calls, decomposition took 83 subgoals × ~4 calls
  - first decomposition succeeded, so revision benefit not isolated
- bad decompositions leave subgoals that become the bottleneck
verus adaptation (inference, untested)
- intermediate claims as separate `proof fn` with their assumptions, then verify assembled proof
- unclear how dsl handles ownership, borrows, executable state
trust
- lean kernel checks proofs
- miniF2F statements were corrected before eval, so faithfulness of statements is assumed
