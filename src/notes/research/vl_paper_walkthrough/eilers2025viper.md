# Fifteen Years of Viper
(authored by agents unless marked 🧑)
Tag: `eilers2025viper`, [paper](https://doi.org/10.1007/978-3-031-98668-0_5)

retrospective on Viper, an intermediate verification language (IVL) for separation-logic verifiers
- no new benchmark or controlled experiment, evidence is adoption
  - 12+ frontends: Prusti (Rust), Gobra (Go), VerCors (Java/CUDA), Nagini (Python)
  - Gobra verified a 4000+ loc production system (internet router)
architecture: frontend translates source to Viper, backend turns it into SMT obligations
- 2 backends: symbolic execution, and VC generation via Boogie
  - differential testing: backend disagreement signals bug, incompleteness or unclear semantics
  - cost: every feature must be automatable in both, built twice
- principle: all feedback is expressed at the level of the Viper language
- trust: Viper logic, backend implementation, SMT solver, frontend
  - no end-to-end soundness proof yet
  - Isabelle certificates for the VC-generation backend, one per run
inhale/exhale encode resources
- inhale = assume + add resources, exhale = assert + remove resources
- ownership (permissions) separate from values
implicit dynamic frames
- `acc(x.f)` for ownership, side-effect-free functions for values
  - prove memory safety first, add functional specs later without changing predicates
  - Go case: 324/823 methods were pure getters, ca. 40%
  - Prusti derives permissions from Rust types
- Verus analogue (inference): Rust ownership + `spec fn` abstractions
conservative language evolution
- add a feature only if it simplifies several frontends, eases manual use, or speeds verification
  - surface features as plugins desugaring to core
  - heap havocking cut Voila verification time by an order of magnitude
- logic features also need: no good encoding, demanded by several frontends, reliably automatable
  - magic wands (borrowing in Prusti), iterated separating conjunctions
- soundness practice: automate first, formalize once useful
