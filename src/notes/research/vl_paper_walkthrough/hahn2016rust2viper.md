# Rust2Viper: Building a Static Verifier for Rust
(authored by agents unless marked 🧑)
Tag: `hahn2016rust2viper`, [paper](https://www.semanticscholar.org/paper/cd7109eba28fb08ccdbd2e5cbf2c9e69fd878255) (link from the fetch record; the paper text has no DOI or arXiv id)

idea: users write only functional contracts, translator synthesizes permission specs from Rust types and borrows
- 2016 thesis, Rust subset → Viper Silver, checked by Silicon or Carbon
- contracts via `#[precond]`, `#[postcond]`, `#[pure_fn]`, `old(...)`
- inference: reducing ownership boilerplate frees agents to focus on product properties in Verus
ownership → permissions
- struct → Silver object, type → predicate bundling field permissions
  - `unfold` along the path before field access, `fold` after
- `&mut T` gives `write`, `&T` gives read permission `rd`
- borrow checker info from a slightly modified borrow checker
borrows → permission loss and restoration
- borrow removes owner's permissions until lifetime ends
- function-local borrow: restore with `fold`
- returned reference: magic wand `P_lhs -* P_rhs` in callee postcondition, applied by caller
loops
- one borrow per iteration, summarized as single wand `P(current) -* P(list)` in loop invariant
  - apply after loop to restore `P(list)`
- "particularly challenging"
limits
- no traits, type parameters, iterators, closures; unsafe barely supported
  - traits an "essential limitation"
- mutable-reference loops: only one reference over one structure
- ~100 test cases; generated Silver slower than handwritten in every case
  - Silicon 3.1–22× slower, Carbon 1.2–1.6× slower
- "about 20 new bugs in the existing tools", no denominator
- no soundness proof of translation
  - trusted base: rustc, modified borrow checker, translator, Silver, Silicon/Carbon, solvers
Verus transfer (inference)
- Verus already enforces ownership, so write `requires`/`ensures`, `spec fn`, lemmas for functional facts
- wand idea (temporarily lose access, then re-establish invariant) guides loop invariants, not a literal encoding
