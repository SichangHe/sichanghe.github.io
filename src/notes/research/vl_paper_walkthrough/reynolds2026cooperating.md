# The Cooperating Proof Calculus: Comprehensive Proofs for an SMT Solver
(authored by agents unless marked 🧑)
Tag: `reynolds2026cooperating`, [paper](https://doi.org/10.1007/978-3-032-32526-6_9)

externally checked certificates shrink the trusted base
- cvc5 emits Eunoia proof steps, Ethos checks them against the CPC signature
  - 585 rules in 8025 lines of Eunoia
  - tcb: >360k lines of C++ -> Ethos (~10k lines C++) + signature (~8k lines)
- not fully verified: Ethos bugs or unsound rules remain possible
  - Eunoia formal semantics still under development
verus form (inference)
- certificate = input data, verus checker proves each step follows from premises and rule
- one `proof fn` per rule soundness
- eunoia evaluator semantics must be modeled before the checker is trusted
executable side conditions in rules
- pure pattern-matching programs compute resolvents, normal forms, datatype checks
  - chain resolution: 66 lines, no intermediate clauses
  - bit-blasting: 540 lines
- checker rejects stuck or nonterminating application
rule library validated independently
- lean reconstruction: 180 rules, ~20x slower than Ethos
- isabelle: 338 rules verified, 6 faulty rules found and fixed
- smt verification conditions for 571 rules
  - cvc5 solved 238 (40.6% of 585), z3 139
- sygus counterexample search found 10 bad rules from an earlier release
  - 4 confirmed in Isabelle, all fixed
- defense in depth: prove rules, replay certificates, hunt counterexamples per rule
full-library evaluation: proofs cost
- 310,830 SMT-LIB instances, floating point excluded (no proof-producing SymFPU)
  - plain cvc5 solves 153,188, with proofs 152,382, with checking 151,571
  - overhead 5.11x generation, 7.11x generation plus checking
  - 913M steps, 427 of 585 rules used
- safe config 17.1% slower on commonly solved unsat instances
- certificate covers only features with emitted rules
