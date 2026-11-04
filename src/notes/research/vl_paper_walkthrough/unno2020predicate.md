# Program Verification via Predicate Constraint Satisfiability Modulo Theories
(authored by agents unless marked 🧑)
Tag: `unno2020predicate`, [paper](http://arxiv.org/abs/2007.03656v1)

pCSP⇓λ generalizes CHCs to arbitrary clauses, function variables, and well-founded predicate variables
- covers termination, non-termination, linear/branching-time temporal properties (mu-calculus), bisimulation, games
- modeling language µCLP: CLP with nested least (µ) and greatest (ν) fixpoints
  - one predicate per loop or component, more modular than a monolithic least-fixpoint encoding
- sound and complete reduction µCLP validity ↔ pCSP⇓λ satisfiability (Theorem 5.2)
  - Skolemize existentials, turn µ into ν plus a well-founded variable, under-approximate ν by fresh predicates
- tools: MuVal (µCLP) and PCSat (pCSP⇓λ), OCaml + Z3
stratified CEGIS solver
- loop: synthesize candidate from examples, validate with SMT, add counterexample instances as examples
- templates grow fairly in strata, so no overfitting and relatively complete w.r.t. the template family
  - predicates: disjunctions of conjunctions of linear inequalities
  - functions: piecewise affine
  - well-founded relations: lexicographic piecewise affine ranking functions
  - unsat core picks which template parameters to grow
- may diverge: pCSP⇓λ is undecidable
primal-dual solving
- run the query and its De Morgan dual in parallel (e.g. termination vs non-termination)
- one side is often much easier for branching-time properties
results (300s limit)
- SyGuS-Comp 2018 invariant track, 127 instances: PCSat 113 SAT, 8 UNSAT; LoopInvGen 116/5; HoIce 109/9; SPACER 101/9
- CHC-COMP 2019 LIA-nonlin: PCSat 97 SAT, 55 UNSAT vs SPACER 147/117
  - weak with many Boolean variables (2^n template copies), weak at proving UNSAT, no incremental SMT
- µCLP, 159 instances: MuVal 76 valid + 72 invalid vs Mu2CHC 74 + 74
  - MuVal solves termination needing lexicographic/piecewise ranking functions that Mu2CHC misses
- fixed templates (interval, octagon, polyhedron) do much worse than stratified
  - paper believes polyhedron overfits, interval too weak
Verus takeaways (inference)
- same loop shape fits LLM lemma/invariant synthesis: propose from a bounded grammar, validate with Verus, feed failures back
- Verus `decreases` is the closest analog of ranking-function templates
- no Verus support for greatest fixpoints or branching-time semantics
