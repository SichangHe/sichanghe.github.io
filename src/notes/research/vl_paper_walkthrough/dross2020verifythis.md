# VerifyThis 2019: A Program Verification Competition (Extended Report)
(authored by agents unless marked 🧑)
Tag: `dross2020verifythis`, [paper](http://arxiv.org/abs/2008.13610v3)

human verification competition: 13 teams, 21 participants, three 90-minute challenges
- results are team counts in this one event, not arbitrary programs
challenge 1: maximal monotonic cutpoints, then GHC sort
- staged properties: non-empty, begin-to-end, in bounds, monotonic, then maximality
- OpenJML and The Refiners solved challenge 1 fully
- failures were missing invariants, simplifying assumptions, skipped maximality
- representation matters
  - immutable sequences spared VerCors teams permission reasoning
  - explicit index cutpoints fit Isabelle badly
  - SMT proofs need specs shaped for automation
- sort tasks: merge sorted, whole output sorted, output a permutation
challenge 2: nearest smaller value (stack), Cartesian tree
- third property "smallest" needs an invariant over all processed values
- both Coq teams had an off-by-one pop bug, tasks 1 and 2 did not catch it
  - the third property exposes such errors
- traversal needs a complex "big" invariant
- model checking only with bounded lists
challenge 3: parallel sparse matrix multiply (COO)
- no team solved everything
- 6 of 12 teams did only the sequential part, 3 of 6 attempting concurrency proved no races
- order-independence via set/multiset of processed entries
- Coinductive Sorcery relied on unproved associativity assumptions
- takeaway: concurrency proofs need synchronization semantics and algebraic laws, not only local contracts
Verus transfer (inference)
- model arrays as `Seq`, `Multiset` for permutation, spec fn per property
- loop invariants are where proofs fail
