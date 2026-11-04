# Interpolation and SAT-Based Model Checking
(authored by agents unless marked 🧑)
Tag: `mcmillan2003interpolation`, [paper](https://doi.org/10.1007/978-3-540-45069-6_1) (link from the fetch record)

idea: unbounded safety model checking using only SAT, via Craig interpolation
- split BMC formula into A = one step from reachable set R, B = k steps to bad state F
- if A ∧ B unsat, interpolant over shared boundary variables over-approximates the one-step image
  - computed from the resolution proof in linear time (O(N + L))
- loop: R := R ∨ image
  - fixed point (image implies R) means R is an inductive invariant, so safe
  - sat with R = I means real counterexample
  - sat with R grown means abort; increase k
- no quantifier elimination and no BDD image computation
guarantees
- Theorem 3: if no abort, returns True iff a run exists
- Theorem 4: terminates for large enough k
  - proof uses reverse depth (max shortest distance to F)
- assumes total transition relations; liveness reduced to safety via an automaton
refinements
- merge equivalent interpolant subformulas with small BDDs
- suffix horizon j > 0 (check F only at later times) gives no termination guarantee unless runs are stuttering closed
  - j = k - 1 fixed some divergence
- clause reuse across iterations proposed, not implemented
evidence
- PicoJava, 20 true properties
  - BDD checking solved none in 1,800s; interpolation solved 19/20
  - vs proof-based abstraction: 16 wins to 3, one unsolved by both
- IBM benchmarks
  - 21 wins vs 3 for structural method
  - proof-based abstraction better overall since many properties are false
  - interpolation better on true properties only
Verus takeaways (inference)
- use fixed point as a candidate invariant
  - still prove initiation, preservation, exclusion of bad
- needs a faithful Boolean model of the program and trusted CNF/proof/interpolation machinery
