# Proving at Scale for Universal Algebra
(authored by agents unless marked 🧑)
Tag: `araujo2026proving`, [paper](https://arxiv.org/abs/2610.02500)

SEMIBASE: finite identity bases for small semigroups, found by LLM agents, checked by Lean kernel
- covers all 1,309 semigroups of order <= 5 and all 15,973 of order 6, incl. 4 certified nonfinitely based
- roles: workers propose bases / counter-models / Lean proofs, referee agent rebuilds from source, humans pick targets and approve repo changes
- trust: referee triages and settles disputes, never verifies
  - a class is accepted only when the Lean kernel re-checks it in the whole-corpus audit
counter-model screening before Lean
- refute a candidate basis with a semigroup satisfying it but violating a target identity
- 76 candidates refuted pre-Lean (8 Aug to 6 Sep)
  - one 9-identity candidate refuted by an order-20 semigroup, larger than any the screens examine
- verus analogue (inference): cheap counterexample filter before proof, finite search is no completeness
shared family proofs
- all successful completeness proofs share a shape
  - normal form for words, rewrite rules from the basis, every word rewrites to it, finite table features (first/last occurrence order, letter parity) determine it
- order 6: 15,524 sealed by family proofs, 445 own generated proofs, 4 nonfinite-basis proofs
- family proof files: median 170 Lean lines, max 9,568
- sharing a basis across families plus counter-model search saved the most work
transfer proofs
- S with basis B embeds in a direct power of T, or is a quotient of a subsemigroup of T, and T satisfies B, then B is a basis for T
- also subdirect products, inflations, nilpotent enumeration
- generated certificates are heavy-tailed: median 334 lines, mean 7,227, p99 126,350, max 333,557
  - 9 exceed 100,000 lines, largest took more than a day on 1 core
  - budget throughput for the tail, not the mean
whole-corpus clean rebuild and kernel audit
- steps: clean rebuild, assemble corpus, check theorem table equals catalogue table, inspect axioms, record theorem names and file hashes
- result: 15,973/15,973 sealed, 9,329 files, 6.94M lines, Lean 4.28 without Mathlib
  - only `propext`, `Classical.choice`, `Quot.sound` used
- verus analogue (inference): clean-checkout `verus` run, pinned verifier and dependency hashes
  - trusted still: external libs, compiler, catalogue adequacy
- distinguish kernel-checked results from Vampire-derived or other externally trusted computations
