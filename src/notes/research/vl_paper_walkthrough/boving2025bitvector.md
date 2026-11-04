# Interactive Bitvector Reasoning using Verified Bit-Blasting
(authored by agents unless marked 🧑)
Tag: `boving2025bitvector`, [paper](https://doi.org/10.1145/3763167)

bv_decide: end-to-end verified bit-blaster as a lean tactic
- trusts only lean compiler and kernel (ofReduceBool adds compiler to trusted base)
- pipeline: negate goal, verified rewrites, equisatisfiable aig, cadical, lrat unsat proof checked by verified checker
  - proof certificate parsing and trimming unverified, bugs make checker fail
  - sat answer gives counterexample
- 132 of bitwuzla's 200+ rewrite rules ported, each proved for all widths
width-generic bitvector library
- BitVec w = nat n with proof n < 2^w, not a bool vector
- proofs reduce to toNat/toInt plus omega; msb case split for signed
- circuit lemmas: add = ripple-carry (add_eq_adc), mul = shifted adds (mulRec)
- decide enumeration does not scale to large widths
verified aig
- acyclic by construction: and inputs have smaller indices
- verified hashmap cache for declarations
- lawful operators never shrink or modify prior entries, so compose by local reasoning
lowering and automation
- uintx/intx, structures, enums lowered to bitvectors, codomain bound stops invented constructors
- iff theorems for all smt-lib 2.7 overflow ops
- symbolic widths: ext + simp + bv_decide, ac_nf, ring via commutative-ring structure
verus takeaways (inference)
- verus uses z3, not kernel-checked certificates, so a lrat-style flow changes the trust model
  - near-term: check solver-produced certificates in executable rust, prove checker against spec
- spec fn circuits plus induction proofs for packed-data and crypto code
- normalize algebraic forms with lemmas before smt call
