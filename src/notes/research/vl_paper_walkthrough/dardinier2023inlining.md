# Verification-Preserving Inlining in Automatic Separation Logic Verifiers (extended version)
(authored by agents unless marked 🧑)
Tag: `dardinier2023inlining`, [paper](https://arxiv.org/abs/2208.10456)

problem: bounded verification (inline calls, unroll loops) finds bugs without specs or invariants
- classic logics: modular success implies inlined success
- automatic SL verifiers (Caper, GRASShopper, RefinedC, Steel, VeriFast, Viper-based) break this
  - their heuristics depend on the resources currently owned
- verification-preserving for a program and bound n: modular success w.r.t. some annotation implies inlined success
  - so an inlined error is a real error, not a missing annotation
  - guarantee is per program and per bound, not per verifier
2 failure mechanisms
- automatic instantiation of existential parameters
  - VeriFast `crLock`: extra caller resource `Q(b)` makes it instantiate `x` with `b`, later `acquire(l, a)` fails
- automatic rule selection
  - RSL-Viper greedy atomic read consumes `P(l)` on the first read, second read fails
- red flags: `perm` inspection, imprecise assertions, exact resource bounds, leak checks
semantic condition, sufficient not necessary
- whole inlined bodies satisfy bounded framing
- call-free segments between calls satisfy bounded monotonicity
  - safety monotonicity: success in a state implies success in a larger state
  - output monotonicity: final state in the larger run is at least the smaller one
- bounded by set T of possible states at that point
- partial annotations handled by asserting pre/postconditions around calls and callee body
proofs
- Isabelle/HOL: condition implies verification-preserving inlining, also with partial annotations
- dual completeness theorem proved on paper only
  - an error beyond the inlining depth can stay unseen
- requires the verifier model to have local, deterministic heuristics, so Caper is not covered
checking the condition, since mono and framing are hyperproperties
- syntactic check: reject `perm` and imprecise-assertion features
- structural check: self-composition in Viper
  - run the statement in a smaller and a larger state, guard the first run's assertions
  - assert safety and final-state ordering
  - structural condition implies the semantic one, proved in Isabelle
evidence on VeriFast, GRASShopper, Nagini, RSL-Viper tests (1562 files)
- 1053 files (67%) violate the syntactic condition
- of 72 manually analyzed violators, 50 are always-preserving
  - semantic condition validates 49, structural 47
- seeded errors: all found with bounds 1 to 4, except N4 and G2 needing 10 and 11 (loops of 10 iterations)
  - no spurious errors, 1.4 to 42 s
  - modular without annotations: at least 1 spurious error each
  - annotations for modular success took 256 lines for 1152 lines of code
- threats: suites may be unrepresentative, errors seeded by authors, 72 files not a random sample
Verus relevance (inference)
- audit ownership-sensitive proof helpers and ghost-state choices
- a proof under one ownership context does not justify reuse in every caller context
- self-composition check would be new work
