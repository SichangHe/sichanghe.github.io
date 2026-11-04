# InvGen: An Efficient Invariant Generator
(authored by agents unless marked 🧑)
Tag: `gupta2009invgen`, [paper](https://www.semanticscholar.org/paper/2780dd83b79ed76ed21f641264582126cd803cf5)

InvGen: linear-arithmetic loop invariants from user templates
- template = boolean combination of linear inequalities with unknown coefficients
- default: conjunction of 2 inequalities per cut point
  - too weak template finds nothing, too rich is slow
  - not practical for disjunctive invariants
- cut points = loop entries, start = `true`, error = `false`
- each path between cut points gives a Hoare triple, turned into constraints on coefficients
  - nonlinear, solved by case analysis of existential vars mostly 0 or 1
  - incomplete but effective
  - multiple error paths solved one at a time, reusing earlier invariants
- example: `αx·x + αn·n ≤ α` solves to `x − n ≤ 0`
speedups
- dynamic analysis: reached states substituted into template give cheap linear constraints
  - concrete testing or bounded symbolic execution, symbolic never worse
  - 17 random programs: never worse, 4 improved by 100x
  - not always faster on the benchmarks, slower on 4 rows of Table 1
- static abstract interpretation (interval, octagon, polyhedra via InterProc)
  - facts too weak alone, but eliminate transitions and focus synthesis on missing invariants
- minimization: collapse cut-point-free paths, drop unsatisfiable ones, simplify constraints locally
results
- 12 challenge programs: 11 solved in 6.3s total, 1 timeout
- baseline without static and dynamic analysis times out (10 min) on several rows, full InvGen takes 0.4-170s
- Blast + InvGen: Blast diverges on 4 programs, finishes in 3-43 steps
trust
- depends on CIL frontend, InterProc, executors, solver, template choice
- no overflow model
verus takeaways (inference)
- solver and sampled states only propose candidates for `invariant`
  - never turn samples into `assume`
- verus check is the acceptance gate
- analyzer facts need proving before use as premises
