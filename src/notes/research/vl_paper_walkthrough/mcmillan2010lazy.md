# Lazy Annotation for Program Testing and Verification
(authored by agents unless marked 🧑)
Tag: `mcmillan2010lazy`, [paper](https://www.semanticscholar.org/paper/0f7e8234197643b7240c4af76620b743c37b50d8)

idea: learn program annotations from symbolic-execution failure, like DPLL conflict clauses
- CAV 2010; implemented as Impact II with LLVM, FOCI interpolating prover, array-based heap model
- label meaning: no goal reachable from here
- rules Decide, Conjoin, Learn
  - symbolically execute unblocked edges
  - when all successors of an edge are blocked, learn an interpolant label for the edge
  - when all edges of a location are blocked, label it with their conjunction
- interpolants give preconditions without quantifier elimination
- Theorem 1: on termination, reached goals reachable and remaining goals unreachable
  - undecidable in general, so no termination guarantee
loops: bounded to inductive
- auxiliary well-founded variable τ with initial value τ0
  - bounded run is BMC
- substitute bottom for τ, drop unjustified labels to the greatest inductive subset
- if initial state satisfies it, goals unreachable; else increase τ0
  - doubling τ0 gives O(N log N) vs O(N²)
- convergence in practice for unbounded loops left open
procedures: negative summaries
- transition formula φ saying entry state d0 cannot exit in d1
- flag f marks aborts; weakening W(φ) = φ ∧ ¬(f ∧ f')
- rules DecideC, LearnC; summaries reusable across call sites
experiment: InterLA vs DART-style path enumeration on 3 driver benchmarks (104-279 reachable blocks)
- backtracks to saturation/completion, learn vs no learn (ratio)
  - kbfiltr 87/94 vs 1,290/1,811 (15, 19)
  - diskperf 214/221 vs 7,552/15,148 (35, 69)
  - floppy 327/330 vs 13,827/27,788 (42, 84)
- measures test-generation search effort only, not proof effort
trusted: LLVM translation, FOCI, array/alias models, external functions modeled side-effect-free and non-deterministic, goal choice
Verus takeaways (inference)
- failed obligation could trigger candidate lemma/assert/invariant; learned formula stays a candidate until Verus proves it
- Verus has no interpolant API
- measure verifier calls and acceptance with vs without learned summaries
- wrong alias or external contract can make a complete result unsound
