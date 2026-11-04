# Reasoning About Vectors using an SMT Theory of Sequences
(authored by agents unless marked 🧑)
Tag: `sheng2022reasoning`, [paper](http://arxiv.org/abs/2205.08095v2)

native SMT theory of sequences (cvc5) for dynamic vectors
- arrays have fixed size; sequences expose length |s|, nth, concat, extract, update
- array encoding needs an uninterpreted vector sort + length/content functions + quantified axioms
  - sequence encoding needs none, so clearer and faster
- swap example: pre/post as s and sout, reads as nth, writes as nested update, negate postcondition, unsat = verified
- bounds must be stated explicitly, else nth is unconstrained and spec can be vacuous
calculi BASE and EXT
- BASE: saturate sequence + arithmetic constraints
  - length intro/validation, concat splitting (C-Split), congruence, disequality extensionality, extract/nth/update reductions
- EXT: adds array-style read/update distribution over concat, bounds, read-update matching
- sound if terminating, no decision procedure claimed
  - saturated configuration yields a model
  - C-Split can loop on cyclic constraints, may return unknown
  - proofs on paper only, not mechanized
evaluation vs Z3 4.8.14, 300 s limit per benchmark
- ARRAYS (551, from QF_AX): solved cvc5 242, cvc5-a 390, Z3 170
  - cvc5-a slower on commonly solved easy instances (303 vs 162 s)
  - translated benchmarks not equisatisfiable with originals (sequences model out-of-bounds)
- DIEM (558, Move Prover VCs): solved cvc5 542, cvc5-a 547, Z3 443
  - cvc5 used modified encoding with update, Z3 default without
relevance to Verus (inference, not from paper)
- Seq<T> ghost field for Vec<T> with refinement invariant to concrete storage
  - invariant is the main added proof work
- gain needs backend support of Seq as native sequences, not a library-only annotation
- does not cover ownership, aliasing, unsafe, concurrency, spec adequacy
