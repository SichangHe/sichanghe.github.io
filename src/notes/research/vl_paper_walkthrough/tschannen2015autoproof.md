# AutoProof: Auto-active Functional Verification of Object-oriented Programs
(authored by agents unless marked 🧑)
Tag: `tschannen2015autoproof`, [paper](http://arxiv.org/abs/1501.03063v2)

claim: auto-active verifier for sequential Eiffel; user annotates, proof runs push-button
- Eiffel -> Boogie -> VCs -> Z3
- checks contracts, class invariants, loop invariants/variants, framing, termination, overflow, null deref
- sound "modulo bugs in the implementation", incomplete, so failure may be heuristics or missing annotation
specification toolkit
- pre/post, class invariants, loop invariants + variants, inline check
- modify/read framing annotations
- ghost members and Mathematical Model Library (sets, relations, sequences, bags, maps)
- lemma procedures: assertions + ghost state manipulation
- Verus form (inference)
  - requires/ensures, loop invariant, spec fn models, proof fn
  - Rust ownership replaces modify/read framing
semantic collaboration
- framework for invariants across collaborating heap objects
  - ownership model + fine-grained visibility of invariant clauses
- verified: iterators, subject/observer, composite, marriage, doubly-linked list, PIP graphs
- Verus form (inference): ghost fields synced by proof fn; shared mutable graphs need tracked permissions
two-step verification feedback
- on failure, run unsound diagnostic with finite loop unrolling
- unrolling passes but inductive proof fails -> suggest strengthening the loop invariant
- not verification evidence
- Verus analogue (inference): bounded test harness or temporary assertions
evidence
- 27 benchmarks: 2,262 executable lines, 2,165 spec lines, 203.8 s total (Boogie 2.2, Z3 4.3.2, i7 3.5 GHz)
- auxiliary annotations average 2.8 of 10 spec lines, under 58% for every problem
  - descriptive of these 27 only
- unsupported: side-effecting specs, once routines, precise floating point, concurrency
