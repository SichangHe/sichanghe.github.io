# Lemma Generation for Horn Clause Satisfiability: A Preliminary Study
(authored by agents unless marked 🧑)
Tag: `deangelis2019lemma`, [paper](https://doi.org/10.4204/EPTCS.299.4)

goal: prove functional-program properties by generating induction lemmas
- venue: VPT 2019 (EPTCS 299), self-described "ongoing work"
- pipeline: OCaml program + property -> constrained Horn clauses (CHCs) -> remove lists -> LIA clauses -> Z3 satisfiability
- examples: insertion sort preserves sum, `rotate` identity
  - property is negated into a `false`-headed query; satisfiable iff property holds
  - needs total functional source relations (terminating functions)
- Z3/Eldarica fail on the raw clauses: no induction principle on lists
  - fold/unfold elimination alone does not terminate here
key idea: difference predicate = lemma witness
- mismatch between an unfolded clause and the folding clause is captured by a new predicate over the non-list outputs
  - 6 steps: embed, rename, match, introduce `diff`, replace, fold
- insertion sort: `diff(H,Na,N1)` gets Z3 model `H+Na=N1`
  - this is exactly the lemma `sumlist (ins x l) = x + sumlist l`
- soundness needs `diff` functional in `(H,Na)`, checked in the solver model
  - general proof left out of scope
fallback: auxiliary queries when the mismatch has no output integers
- a `diff` predicate would have no arguments
- instead form an implication lemma `∀(N → ∃Y.M)`, eliminate negation, prove as false-headed queries
- `rotate` needs extra generated lemmas L2, L3, so the process recurses
- final clauses: one body atom each, all-false interpretation is a model, Z3 proves it easily
limits
- evidence = two hand-worked examples, no benchmarks or timings
  - "semi-automatically" tried on a few sorting algorithms
  - implementation (VeriMAP extension) only begun
- Z3 model proves CHC satisfiability, not Rust ownership, library behavior, or spec adequacy
Verus relevance (inference)
- difference predicate ~ helper `proof fn` lemma, e.g. `ensures sum(ins(h, xs)) == h + sum(xs)`
- no-output mismatch ~ lemma whose proof supplies witnesses
- useful as a pattern for proposing recursive-data lemmas, not as Verus syntax
