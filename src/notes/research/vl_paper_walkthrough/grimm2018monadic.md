# A monadic framework for relational verification: applied to information security, program equivalence, and optimizations
(authored by agents unless marked 🧑)
Tag: `grimm2018monadic`, [paper](https://arxiv.org/abs/1703.00055)

relational verification in F* by reifying effectful code into pure monadic functions
- "model effectful computations using monads and ... prove relational properties on their monadic representations"
- steps
  - effect-specific monad with unary weakest-precondition calculus
  - reify terminating computation into pure state-passing function
  - state relation over reified terms, prove by induction + SMT
- reify breaks abstraction, so limited to Ghost/spec code
- example: sum_up vs sum_dn equal final heap
  - needs ternary aux lemma, induction on mid - lo
- Verus (inference): no reify, use separately defined spec model proved to match the executable code
footprints
- writes c ws (unary), reads c rs ws (relational), composed by >>
- derived rules: idem, swap, redundant_writes
- Benton relational Hoare logic: 16 of 20 rules need ≤5 annotation lines, ~1500 F* lines
- fixed-domain finite memory only, no dynamic allocation
crypto and information flow
- RAND monad = state (random tape) + exception
  - proves one-time pad perfect secrecy, ElGamal mult_pad equivalence via tape bijection
  - examples simpler than EasyCrypt/FCF
- noninterference: low_equiv on stores, ni_com = no_write_down + low-equiv preservation
  - termination-insensitive
  - delimited release assumes initial states agree on the declassified term
  - certified typechecker tc_com, runtime monitor
optimization refinement
- memoization equals original function extensionally
- union-find: union_by_rank and find_compress refine the reference ops
  - rank_independence 4-ary, union_by_rank_refinement 6-ary relations
- Verus (inference): abstract functional spec + ghost parent forests/ranks, trusts solver behavior and pointer encoding
