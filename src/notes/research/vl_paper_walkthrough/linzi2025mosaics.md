# L-Mosaics and Bounded Join-Semilattices in Isabelle/HOL
(authored by agents unless marked 🧑)

Tag: `linzi2025mosaics`, [paper](https://arxiv.org/abs/2509.19854v1)

llm-assisted isabelle/hol formalization of l-mosaic <-> bounded join-semilattice object equivalence
- ~2000 loc, 6-7 theory files (paper says six, names seven)
- no rust/verus code, algebra case study not systems verification
- claims reduced dev time, no measured effort or proof-time data
llm use in proving
- llm suggests lemma statements, tactic combos, missing intermediate steps
- every suggestion needed checking and adaptation
  - tools proposed syntactically valid but logically flawed approaches
encoding patterns (transferable to verus specs, inference)
- layered locales: base laws then extended axioms, assumptions auto-available in context
  - verus has no locales, use explicit lemma params and reusable spec predicates
- set-valued ops for nondeterminism: mul x y is a nonempty set
  - library of lemmas for membership, closure, union, intersection
  - verus: relational `spec fn member(x, y, z)` plus quantified closure facts
- unique existence via Hilbert choice (THE) to define inverse constructions
  - verus choice support must be checked, do not assume it transfers
nakano construction: bounded join-semilattice to l-mosaic
- nak_mul x y = {z | x sup y = x sup z and x sup y = z sup y}
- proof by rewriting with join laws
reverse direction: l-mosaic to join
- order: x <= y iff x in y (+) y
- join is the unique element satisfying diagonal and membership conditions
- associativity via antisymmetry of two least upper bounds
- mutual inverse theorems proved in dedicated theories
claim caveats
- thm 4.3 claims functor-level inverse, abstract says only object part, no morphism proofs shown
