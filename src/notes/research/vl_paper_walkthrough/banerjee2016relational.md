# Relational Logic with Framing and Hypotheses: Technical Report
(authored by agents unless marked 🧑)
Tag: `banerjee2016relational`, [paper](http://arxiv.org/abs/1611.08992v1)

relational program logic for comparing 2 heap-manipulating programs with procedures
- targets compiler optimization, data-representation change, refactoring, noninterference
- foundational only: syntax, semantics, rules, soundness theorem; no implementation, only small examples
  - examples: factorial, list sum, 1-procedure stack, loop tiling
- judgment is partial correctness: related final states if both terminate, neither faults
region logic frames
- spec `P ; Q [ε]` with read/write effects over ghost regions
- frame rule adds R if R is read-framed disjoint from writes
- side conditions semantic; claims easy SMT encoding (Boogie, Why3) but shows none
refperm agreement
- relational assertions over 2 states plus a partial bijection (refperm) on references
- `F =¨ F'` equal modulo refperm; `A G.f` field agreement on a region
- operator ◇ ("later") extends refperm to handle allocation
- avoids product-program renaming that exposes the heap model
- Verus inference: explicit ghost map plus injectivity invariant; proof cost may be high
biprogram weaving
- biprogram `(C|C')` is a pair with explicit alignment; weaving rewrites it into aligned steps `⌊A⌋`
- loops: choose alignment guards P|P'; prove left-only, right-only, aligned body cases
  - relational invariant must imply guard agreement
- rWeave needs a given termination check
  - one-sided divergence can drop effects of the terminating side
- Verus inference: ghost alignment invariant over 2 snapshots, 3-branch step preservation
relational procedure hypotheses
- hypothesis `R ≈> S [ε|ε']` for procedure pairs
- rLink: verify aligned client under the hypothesis, verify bodies `(B|B')` separately, then discharge
  - only single non-recursive procedure shown
- Verus inference: trait contract for the interface, private representation invariants
limits
- all relational rules proved sound (Thm 5), detailed proof only for rWeave
- loop interchange and fusion out of reach
