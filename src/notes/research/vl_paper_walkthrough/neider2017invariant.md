# Invariant Synthesis for Incomplete Verification Engines
(authored by agents unless marked 🧑)
Tag: `neider2017invariant`, [paper](http://arxiv.org/abs/1712.05581v2)

cegis for invariants when the checker is sound but incomplete (undecidable theory U reduced to decidable D)
- failed reduced vc gives a D-model, not a real counterexample
  - mine the model for non-provability information (npi) instead
- engine must be normal: monotone in pre/postcondition strength
  - then a failure rules out stronger postconditions / weaker preconditions
- hypothesis class h = positive boolean combos over a finite predicate set p
  - predicate discovery left open; missing predicate means failure
cd-npi constraints from a failed triple, read from predicate ghost valuations v (pre), v' (post)
- failed {α}s{γ}: weakening, disjunction of predicates false in v'
- failed {γ}s{β}: strengthening, conjunction of predicates true in v
- failed {γ}s{γ}: pair (η, χ) from true in v and false in v'
  - next candidate must not be implied by η or must not imply χ
- guarantee: if some annotation in h is provable, converges in finite time
  - says nothing about spec correctness
reduction to ice learning, then houdini
- weakening → positive example, strengthening → negative, inductivity pair → implication
- houdini converges in at most n+1 rounds or reports no conjunctive invariant over p
- worked inverse-array example: ice implication ((1,0,0),(1,0,1)) fixes γR = b3
evidence 1: heap programs, dryad + natural proofs + boogie + houdini
- predicate templates over all program variables: shape, keys, sizes, heaplets
- holes: erased loop invariants, weakened recursive contracts, deleted postconditions
- solved all 82 routines in 10 suites, median under 10s for most suites
  - no comparison to other tools, by design
evidence 2: bounded quantifier instantiation, 12 programs
- from ironfleet, vscomp, expressos, sparse matrix mult
- templates: contracts over variables + octagonal predicates ±x ± y ≤ c
- e.g. inverse: 414 candidates, 126 iterations, 73 invariant predicates, 9.04s
- average under a minute per routine
trusted: u-to-d approximation, d-model construction, normality, templates, specs
- timeout-only engines excluded: need model construction in d
verus takeaways (inference)
- external synthesis loop writing houdini conjunctions into loop `invariant` clauses
- verus reports failed obligations, not d-models; need explicit ghost booleans to get v, v'
- value is template-driven predicates + solver feedback, not dryad syntax
