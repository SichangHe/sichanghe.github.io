# On Deciding Local Theory Extensions via E-matching
(authored by agents unless marked 🧑)
Tag: `bansal2015deciding`, [paper](http://arxiv.org/abs/1508.06827v1)

complete SMT decision procedure for local theory extensions using incremental E-matching
- local: quantified axioms need only instances over existing ground subterms, so finitely many
- instances generated during search, not eagerly
  - DT1: E-match patterns against current ground literals modulo equalities
  - skip instances equivalent modulo E to emitted ones
  - empty new set ⇒ sat; else feed instances as lemmas
  - terminates since no new terms are added
- correctness argument is a prose sketch (Thm 4)
- relevance to Verus: trigger design and quantifier instantiation (inference); locality is assumed, no checker given
extensions
- hierarchical layers: UFLIA base, reachability/sets, frame axioms, program-specific
  - experiments used the monolithic approach
- Psi-local extensions add `instclosure(t)` atoms for extra terms
staged optimizations
- instantiate Psi-terms after saturating original terms (CVC4 only)
- add `(a=b) or (a!=b)` to force equality arrangement early
- instantiate equal-variable special cases first for quartic-growth axioms
- EPR: partial E-matching, then Z3 model-based instantiation
evidence on GRASShopper heap-program VCs
- 816 queries (802 unsat, 14 sat) from 108 procedures
- uninstantiated: CVC4 optimized solved 812 in 10,732 s; Z3 804 in 37,430 s
- partially instantiated: CVC4 815, Z3 814
- 4 benchmarks needed 10^10-10^14 eager instances; E-matching baseline needed 0
