# Ilinva: Using Abduction to Generate Loop Invariants
(authored by agents unless marked 🧑)
Tag: `echenim2019ilinva`, [paper](http://arxiv.org/abs/1906.11033v1)

ilinva: loop invariant synthesis by abduction, Why3 + GPiD
- lazy: all invariants start at `⊤`, strengthen only to prove a failed assertion
  - generic: needs only a decision procedure for the theory
- loop
  - abduce hypothesis ξ from failed vc (conjunction of abducible literals entailing it)
  - back-propagate ξ to earlier loops with weakest precondition
  - check loop entry; `Ind` repairs preservation by abduction + forward strongest-postcondition
- search control
  - order literals simple -> complex (bool, equalities, predicates, function terms)
  - bound literal count, implicant size, disjunction size (1-2); iterative deepening
- completeness only under terminating, complete decision procedure
  - solver timeout treated as satisfiable, can miss solutions
evidence
- mixed benchmarks, some hand-translated to WhyML; 20 min timeout
- O01: 9.68 s; O06: 6 min 13.6 s (conj); O09: no solution
- authors: slow, smt calls and search tree are the bottleneck; useful mainly interactively
- cannot handle problems needing a combination of solvers
for verus
- inference: keep abduction external as candidate generator, verus re-proves each candidate as loop `invariant`
