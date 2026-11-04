# Different Maps for Different Uses. A Program Transformation for Intermediate Verification Languages
(authored by agents unless marked 🧑)
Tag: `dietsch2019different`, [paper](http://arxiv.org/abs/1901.01915v1)

IVL maps (Boogie, Why, CHC) cause exponential case splits on index aliasing
- each pair of accesses to one map splits on same/different index
- fix: transform P to equivalent P' by splitting maps by last-write dependency
last-write relation LstWr: write w may supply value of read r
- assumes unique written values (timestamps)
- computed via ghost map a-lw per map a, stamped with write-statement symbol
  - havoc/constant assignment sets ⊥; copy b:=a copies a-lw
- static analysis over Map Equality Domain gives overapproximation LstWr# ⊇ LstWr
  - false dependencies cost precision only; a missed dependency would be unsound
split-map transformation
- partition writes into blocks = equivalence closure of may-affect-same-read
- one map per block, ⊥ block for never-written reads
- copy copies all blocks; havoc havocs all and assumes them equal
- proof: bisimulation with instrumented program, then transitivity gives equivalence (Theorem 1)
evidence: synthetic, tailored to case-split problem
- 2 to 20 index variables, Ultimate Automizer, 1800 s timeout
- transformed: 0.9-8.8 s, nearly constant
- untransformed: fails at 10 or more index variables
- transformation and analysis not cheap; no timings given for the full toolchain
takeaways for Verus (inference)
- ghost last-write stamps and split ghost maps can mimic it; Verus ghost state is erased
- do not swap executable memory for split maps without a refinement proof
