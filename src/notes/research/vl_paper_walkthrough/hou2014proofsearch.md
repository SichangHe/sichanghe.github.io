# Proof search for propositional abstract separation logics via labelled sequents
(authored by agents unless marked 🧑)
Tag: `hou2014proofsearch`, [paper](https://arxiv.org/abs/1307.5592)

modular cut-free labelled sequent calculus and prover (Separata) for propositional abstract separation logics (PASL)
- PASL: BBI (separating conjunction, unit, magic wand) plus partial-determinism and cancellativity
  - model is a partial cancellative commutative monoid, ternary relation R(h1,h2,h3) plus unit
  - validity is undecidable, prover is a complete semi-decision procedure under fairness
- sequent `G; Γ ⊢ Δ`, G holds relational atoms (a,b ⊲ c), formulas are labelled by worlds
  - structural rules: E, A, U, Eq1/Eq2, P, C
  - soundness and cut elimination proved, proofs mostly sketched or in appendix
modular extensions
- extra properties added as structural rules: indivisible unit IU, disjointness D, splittability, cross-split
  - eleven calculi from combinations of P, C, IU, D
  - splittability and cross-split need framework changes
completeness
- label substitution blocks saturation, so isolate it into equivalence entailment `G ⊢E (a=b)`
  - substitution-free intermediate calculus ILSPASL
- Hintikka saturation with a fair scheduler builds a counter-model from the limit sequent
proof search (LSPASL + D)
- order: close branch, unify labels, invertible rules, `*R`/`−*L`, then structural rules on atoms
  - focusing, AC not implemented since admissible
- optimizations: back-jumping on unsat core, no repeated `*R`/`−*L` on same principal pair, associativity heuristic
verus takeaways (inference)
- model ownership as ghost resources with a split relation
- parameterize ghost lemmas by the exact algebraic laws assumed
- abstract worlds do not model addresses, bytes, or lifetimes
