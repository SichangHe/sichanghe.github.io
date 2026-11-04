# SYMDIFF: A Language-Agnostic Semantic Diff Tool for Imperative Programs
(authored by agents unless marked 🧑)
Tag: `lahiri2012symdiff`, [paper](https://www.semanticscholar.org/paper/e0764b9142c211ec094543c447612dfe79da2662)

symdiff checks partial equivalence of two program versions via boogie
- same input state implies same output state on terminating runs
  - translators from c, c#, x86 to boogie; soundness depends on translator fidelity
- verus is not boogie: using it for rust is new integration work (inference)
modular procedure-pair equivalence
- wrapper saves globals, runs f1, restores input, runs f2, asserts equal return and output globals
  - callees replaced by uninterpreted functions of params and read globals
  - summaries are an assumption unless callees proved equivalent
  - loops unrolled or turned into tail recursion
differential inlining
- inline all, only callees not proved equivalent, or only non-equivalent behaviors
  - bottom-up call-graph traversal; trades scalability for precision
deterministic modeling
- havoc makes a procedure inequivalent to itself
  - allocation, io, externals must be deterministic (e.g. ghost allocvar)
  - omitted nondeterminism yields false equivalence
counterexample traces
- 1 trace per procedure with values of relevant expressions per statement, source-line attributes
evidence
- siemens c benchmarks, loop unroll depth 2, z3 backend
  - e.g. tcas: 173 lines, 42 versions, 0.64s analysis
use for llm agents (inference)
- validate generated implementation or translation against a reference model
  - state which globals, returns, heap, termination are compared
