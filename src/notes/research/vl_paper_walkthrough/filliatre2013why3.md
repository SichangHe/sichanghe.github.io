# Why3 — Where Programs Meet Provers
(authored by agents unless marked 🧑)
Tag: `filliatre2013why3`, [paper](https://www.semanticscholar.org/paper/4d011ed17687648ac4ce719e24c3bab77a4a143e)

why3 = deductive verification platform, whyml = programming + specification language
- whyml is first order: polymorphism, pattern matching, inductive predicates, mutable record fields, type invariants, ghost code
- no higher-order functions, no mutable recursive structures (doubly linked list, mutable tree)
- verification conditions go to external provers (Alt-Ergo, CVC3, Z3, E, SPASS, Vampire, Coq, PVS)
  - spec language is independent of programming language, so it is a common prover format
  - encoding transformations (eliminate pattern matching, polymorphism) cover missing prover features
static alias control replaces a memory model
- every l-value is one of finitely many statically known names
  - keeps weakest-precondition conditions first order and readable
- mutable state lives in record fields, e.g. resizable array with invariant `0 ≤ size ≤ data.length`
- 67 case studies in the gallery (KMP, hash table, union-find)
- verus analogue: rust ownership/borrowing already does alias control (inference)
type invariants and ghost code
- invariant assumed on arguments, re-proved after every construction or mutation
- ghost code can be erased without changing the result
- verus analogue: `spec fn` representation predicate + ghost/spec state (inference)
contracts, variants, assertions
- pre/postconditions (normal and exceptional), loop invariants, variants for termination, assertions anywhere
- weakest-precondition generation, extraction of verified whyml to OCaml
abstract interfaces for unimplemented structures
- `model` type with a mutable pure snapshot, e.g. union-find `uf_pure`
- operations specified with `writes` and old/new snapshot relation
- clients verified against the contract, any implementation can replace it
