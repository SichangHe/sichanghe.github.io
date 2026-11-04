# A Tool for Checking ANSI-C Programs
(authored by agents unless marked 🧑)
Tag: `clarke2004checking`, [paper](https://www.semanticscholar.org/paper/5f5335a25d2b4ef0fb099ae917ff98d8afea97e3)

cbmc = bounded model checker for ansi-c, only user input is the bound
- checks pointer safety, array bounds, user assertions
- sat result gives counterexample, unsat means proof only up to the bound
  - unwinding assertions detect insufficient bound, then increase n
- no benchmarks, no soundness proof, no certificate
  - trusted: front end, ssa/cnf translation, sat solver (Chaff), user bounds
pipeline: normalize c, unwind, ssa, check `C ∧ ¬P` in sat
- 1 preprocess: side effects to aux vars, break/continue to goto, for/do-while to while
- 2 unwind loops n times, guard copies, add unwinding assertion
- 3 unwind backward goto, expand calls, bound recursion
- 4 convert to ssa with pointer analysis
- 5 satisfiable = violation found, unsatisfiable = property holds for that unwinding
c vs verilog consistency check
- unwind c reference and circuit in tandem, no formal spec needed
- counterexample shown as stepwise c trace plus verilog waveform
dynamic memory
- variable-size arrays as uninterpreted functions, not one literal per element
  - n integers allocated via malloc would need too many literals otherwise
- gaps listed in tables, e.g. switch fall-through, anonymous union members
usability: debugger-style gui with watches and backward stepping
- command line unusable for designers/programmers
- reported line is usually not the actual bug line
verus takeaways (inference)
- bounded unrolling is no substitute for an inductive loop invariant
- keep named predicates and reproducible failing diagnostics for counterexamples
