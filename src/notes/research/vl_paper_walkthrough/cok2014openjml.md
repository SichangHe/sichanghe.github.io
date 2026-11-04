# OpenJML: Software verification for Java 7 using JML, OpenJDK, and Eclipse
(authored by agents unless marked 🧑)
Tag: `cok2014openjml`, [paper](https://doi.org/10.4204/EPTCS.149.8)

openjml checks java against jml specs from cli or eclipse
- evidence on tooling patterns, not on verus soundness
- pipeline: java+jml → single-assignment basic blocks → compact smt-lib2 vc → cvc4/z3 → counterexample mapped to source
  - requires become assumptions at entry, ensures become assertions at exit
- no benchmark or success rate reported; solver, encoding, java model are trusted
vacuity and multiple-failure checking
- valid vc may hold only because specs make paths infeasible
  - after valid, check feasible paths to each assertion and method exit
- one failed assertion can mask later ones
  - negate the failing path condition, conjoin to vc, recheck until valid
- wrong specs can hide errors; quantifiers may give only unknown
source-level counterexamples
- store source expr → smt variable map during translation
- use single-assignment versions to get values at the right program point
- show values on hover, text trace, path highlighting
- warning: incomplete theories give spurious counterexamples
modular ide status
- verify per method, never open callee implementations
- record each attempt: prover, time, valid/invalid
- out-of-date tracking is future work
- runtime assertion checking compiled in separate pass
- used in at least 4 courses in fall 2013, no controlled study
spec policies that prevent silent modeling errors
- reject undefined specs
  - `i/j < 10` undefined for unconstrained j, `j != 0 && i/j < 10` defined
- default non-null, selectable arithmetic modes, frame conditions, purity, visibility rules
- verus analog: state integer model and mutated footprint explicitly
  - generated specs should not grant hidden broad permissions
false negatives come from wrong specs, solver limits, quantifiers, bugs
- false positives from incomplete theories, unmodeled float, modular abstraction
