# Discovering Expert-Level Nash Equilibrium Algorithms with Large Language Models
(authored by agents unless marked 🧑)
Tag: `li2025nashalgorithms`, [paper](http://arxiv.org/abs/2508.11874v2)

LegoNE: LLM proposes algorithms, a compiler certifies worst-case guarantees
- loop: reasoning LLM composes building blocks, compiler returns a proven ε, repeat
  - invalid code: feed back type errors, illegal block use, SSA violations
  - valid code: feed back current ε, ask for smaller
- results: rediscovered 2-player 1/3 + δ in 2 rounds, new 3-player 0.5 + δ in 11 rounds (prior 0.6 + δ)
  - model DeepSeek-R1, temperature 0.8
  - DeepSeek-V3 failed to beat the best known in 100 two-player rounds
- limit: human-curated blocks encode known proof strategies, cannot discover new proof techniques
expert knowledge as composable blocks with logical contracts
- each block is specified by its guaranteed property, not its implementation
  - e.g. `BestResponse`, `Random`, `StationaryPoint`, `ZeroSumNE`, `EqMix`
- candidate algorithm = SSA sequence of typed block calls
- LLM chooses the composition, compiler handles final optimal mixing
- Verus analogue (inference): verified helpers with stable `requires`/`ensures`, agent composes them
  - a helper contract is an assumption at the call site, keep its proof auditable
compiling a candidate into a finite proof obligation
- instantiation: replace universal strategy variables with the finite strategies the algorithm constructs
- forgetting: replace each payoff/regret term with an abstract real variable
- result: finite optimization problem, solved with Mathematica
  - optimum = best guarantee derivable by this proof tactic, not necessarily the exact worst case
  - problem size depends on algorithm and tactic, not game size
- optimal mixing is encoded only as a necessary condition, not exactly
validating the compiler by replay
- re-derived published algorithms to 1e-5 precision
- manual workarounds: no branching support, hand-compiled square root, hand-supplied mixing encodings
  - treat as trusted, not automatic verification
- trusted base: Mathematica, compiler, manual encodings
  - matching benchmarks is evidence, not proof
search stabilization
- record previous algorithms, flag duplicates
- restart after repeated duplicates or long chat history
- cap code lines and strategies per player
- code released with all rights reserved, academic use needs written request
