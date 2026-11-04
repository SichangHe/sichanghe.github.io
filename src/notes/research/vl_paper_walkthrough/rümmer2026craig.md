# Craig Interpolation in Program Verification
(authored by agents unless marked 🧑)
Tag: `rümmer2026craig`, [paper](http://arxiv.org/abs/2602.08532v1)

survey chapter: interpolation automates loop invariants and abstractions
- craig interpolant I of A → C
  - A |= I and I |= C
  - uses only symbols shared by A and C
- tutorial with worked Fibonacci examples, no benchmark
invariant from an unwound path
- unroll loop, cut between iterations, SSA-encode prefix A and suffix C
- ask SMT interpolator for ϕ with A → ϕ → C, rename symbols to program variables
- result is only a candidate
  - must check initiation, consecution, sufficiency on the real loop
  - fib: b >= 1 after 2 steps; a >= 0 ∧ b >= 0 is inductive, a >= 0 alone fails consecution
interpolation-based model checking (IMC)
- accelerates BMC into unbounded search
- iterate R_{i+1} = R_i ∨ I_i, I_i interpolating the k-step query
- stop at inductive R_i
  - proves error unreachable at any depth
- infinite-state systems may never stabilize
CEGAR with interpolant predicates
- coarse predicate abstraction, find abstract error path
- if concrete path unsat, sequence interpolants become new predicates
- repeat until proof or real counterexample, may refine forever
constrained Horn clauses (CHC)
- loop invariant or pre/post contract as relation symbol
- clauses: initiation, consecution, error clause
- solver returns formulas for relations
- recursion gives pre/post relations, may be non-linear
relevance to Verus
- inference: interpolant candidates map to loop invariant clauses or ghost predicates
  - Verus must still discharge them
- trusted: SMT interpolation, background theory, SSA encoding, spec
- interpolant strength, size, vocabulary drive performance
