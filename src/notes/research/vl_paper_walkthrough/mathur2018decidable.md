# Decidable Verification of Uninterpreted Programs
(authored by agents unless marked 🧑)
Tag: `mathur2018decidable`, [paper](http://arxiv.org/abs/1811.00192v4)

problem: programs with uninterpreted functions, equality/disequality tests, correct under every interpretation
- undecidable in general (reduction from 2-counter machine halting)
- coherence restores decidability: memoizing + early assumes
  - memoizing: recomputed term is still stored in some variable
  - early assume: assume(x=y) happens before superterms of x or y are dropped
  - either condition alone stays undecidable
- coherent verification PSPACE-complete, coherence check PSPACE
- k-coherence: add up to k write-only ghost variables to retain dropped terms
- recursion via visibly pushdown automata: EXPTIME-complete
method
- program → regular language of executions (NFA linear in size)
- feasible iff congruence closure of equalities has no disequality violation
- stream coherent executions with finite state (equivalences, disequalities, partial interpretation)
- intersect program NFA with feasibility automaton, nonempty ⇒ counterexample
- coherence checker: table E of computed tuples rejects non-memoizing/late-equality runs
evidence is theorems only
- no benchmarks, no implementation timings
inference for Verus
- uninterpreted functions = spec fn, ghost vars = proof-only state
- Verus checks supplied invariants but does not build the automata
  - the analysis would be an external tool emitting contracts
