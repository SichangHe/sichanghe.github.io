# The Imandra Automated Reasoning System (system description)
(authored by agents unless marked 🧑)
Tag: `passmore2020imandra`, [paper](http://arxiv.org/abs/2004.10263v1)

Imandra = prover over a pure, terminating subset of OCaml
- combines bounded and unbounded verification
- first-class computable counterexamples
- system description, no independent benchmarks

conservative definitions need termination
- recursive functions need an ordinal-valued measure (ordinals up to ε₀)
  - Ackermann: [@@adm m,n], ack m n ↦ m·ω + n
  - left_pad: [@@measure Ordinal.of_int (n − List.length xs)]
- termination proof is reused to synthesize induction principles
- Verus analogue: decreases clause or a spec fn measure
  - ordinals and automatic mining are Imandra-specific

ground first-order specialization
- lambda lifting, specialization and monomorphization turn higher-order polymorphic goals into ground first-order ones
  - e.g. length (map f l) = length l becomes length_int (map1 l) = length_int l
- Verus has no automatic whole-program monomorphization
  - state specialized ensures or helper lemmas explicitly

bounded unrolling is the default strategy
- recursive calls start uninterpreted, each guarded by a reachability literal
- SMT refinement loop
  - SAT with all literals false → return counterexample model
  - UNSAT with empty core → UNSAT, no call needs expanding
  - otherwise expand a call picked fairly from the unsat core
  - stop at SAT, empty core, or the expansion bound
- authors almost always unroll first to find counterexamples before induction
- hitting the bound with neither result establishes nothing beyond the explored expansions
- Verus analogue: bounded tests or finite lemmas first, then invariants
  - a test counterexample is bug evidence, not a proof
