# Towards Bit-Width-Independent Proofs in SMT Solvers
(authored by agents unless marked 🧑)
Tag: `niemetz2019bit`, [paper](http://arxiv.org/abs/1905.10434v3)

parametric bit-width bit-vector formulas -> quantified UFNIA (non-linear int arith + uninterpreted functions)
- translation T = AX ⇒ CONV
  - AX: each var in range 0 ≤ x < pow2(width), widths > 0
  - CONV: bv ops become integer terms with pow2 and width-indexed UFs
  - each var/const gets same fresh width k
- if result valid, original vc holds for every width
- UFNIA undecidable, so timeout ≠ counterexample
- excludes formulas with multiple widths
- thm 2: full/combined iff valid, partial/qf only sound (if direction)
- proofs need independent check to become a Verus lemma
  - smt result alone is not a certificate
axiomatization modes for pow2, &, |, ⊕
- full = intended recursive semantics
- partial = hand-picked properties (under-approx)
- combined = both, best overall
- qf = quantifier-free subset of partial
- invertibility conditions fully proved (of 160): combined 104, partial 76, full 64, qf 40
conditional inverses for invertibility conditions
- split φc ⇔ ∃x.ℓ[x] into rtl (easy, quantifier-free) and ltr (hard)
- ltr needs symbolic witness; synthesize with CVC4 SyGuS at width 4, check up to 64
  - 143/160 candidates found, 12 not width-independent
- 110/160 fully proved, 19 rtl only, 17 ltr only
alive llvm instcombine equivalences
- 180 of 320 width-independent optimizations kept
- 88/180 proved
  - AndOrXor 60/124, shifts 0/9
- easy when only boolean reasoning + ordering
- shifts fail: mix bitwise and arithmetic, need axioms
rewrite enumeration bootstrap
- add proved rewrites as axioms, rerun to fixpoint
- formulas 94% proved, terms 59%
- bootstrapped axioms are search aid, re-prove before trusting
