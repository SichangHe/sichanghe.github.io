# TacticToe: Learning to Prove with Tactics
(authored by agents unless marked 🧑)
Tag: `gauthier2018tactictoe`, [paper](https://arxiv.org/abs/1804.00596)

hol4 prover that learns tactic choice from recorded human proofs, searches with MCTS
- result: proves 4,760/7,164 (66.4%) hol4 library theorems, 60s limit
  - e prover alone 2,472 (34.5%), union 4,946 (69.0%)
  - eval set excludes 440 "hard" (`let` in proof) and 1175 "easy" (`save_thm`) theorems
  - e in auto-schedule with 128 premises; tactictoe without async e calls
- all proofs are hol4-verifiable, replay averages 0.37s
  - search is only a proposer, hol4 kernel is the checker
recording: parse proof scripts instead of modifying kernel
- extract tactic units (sml expressions of type tactic, root not infix)
- globalize local names, wrap each unit in a recording function, save (tactic, goal) pairs
- rebuild library with recording proofs
goal-feature k-NN prediction
- features: constants, type constructors, variable-normalized subterms, variable names
  - assumptions and conclusion tagged differently
- tf-idf weighted overlap, weights to 6th power
  - rule of thumb: rarer shared features means more similar goals
- same predictor ranks tactics, theorem arguments, goal lists
mcts over tactic applications
- productive tactic: no failure/timeout (0.05s), no ancestor goal, not redundant
- prior policy over up to 500 ranked tactics
  - PriorPolicy(a_i) = (1-c)^i * c
- metis with predicted premises tried first on each goal
- e prover called async with 128 premises, 5s
  - premises it uses are replayed in hol4 via metis
dependency-aware preselection
- keep 500 tactic-goal pairs, 500 theorems
- each object inherits max of own and parent similarity
  - similarity to original conjecture alone fails when goals drift
orthogonalization
- compare 20 nearest tactic-goal pairs, keep subsuming tactic with largest coverage
- new tactics kept only if contribution differs
argument abstraction
- replace sml subterm with placeholder, instantiate from goal-ranked predictions
  - theorem lists: 16 predicted theorems; 199 vs 156 solved on 273 training theorems
  - single theorem/term: 16 instantiations chained with `ORELSE`
  - only evaluated for theorem-list type
proof extraction and minimization
- combine child proofs with `THENL`
- drop redundant tactics and list elements only when replay has same effect
verus transfer (inference)
- rank candidate lemmas/assertions by `requires`/`ensures` features
  - syntax features miss semantically equivalent formulas and ownership shape
- verus/z3 stays the only checker
- minimize proofs by deleting assertions and re-verifying
