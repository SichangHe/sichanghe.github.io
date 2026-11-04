# Program Synthesis in Saturation
(authored by agents unless marked 🧑)
Tag: `hozzova2024program`, [paper](http://arxiv.org/abs/2402.18962v1)

vampire proves `A1∧…∧An → ∀x.∃y.F[x,y]` and extracts a recursion-free program `r[x]`
- ~1100 lines c++ in vampire; smt-lib2 `assert-not` marks the spec
answer literals
- add `ans(y)` to skolemized negated spec; never select answer literals for inference
- computable clause `C[σ] ∨ ans(r[σ])` records `r[x]` under `¬C[x]` + earlier assumptions
- group example: saturation derives `ans(i(σ))`, program `i(x)`
branch composition
- nested if-then-else once assumptions + collected `C` clauses are unsat
- last guard omitted since branches cover all cases
- only branches in the empty-clause proof are kept
computable unification
- symbols marked computable/uncomputable (`:uncomputable` option); interpreted symbols computable
- abstract unifier `(θ,D)` keeps disequalities on uncomputable heads
- example: with inverse uncomputable, returns `y*x` not `i(i(x)*i(y))`
- avatar splitting restricted to ground computable clauses without answer literals
guarantees
- soundness needs only a sound inference system; no termination or completeness
- trusted: spec, computability declarations, calculus implementation, theory interpretations
evidence
- cvc5 1.0.4 comparison, 5 min limit
- group examples 0.01 s, 13 s, 0.03 s; not encodable in sygus 2.1
- max of n ints: both reach n=23 (vampire 215 s, cvc5 257 s)
- `y² = (x1+x2)²`: vampire finds `x1+x2` in 26 s, cvc5 fails
verus transfer (inference)
- pure spec relation, generated rust witness, `ensures` check; not evaluated
- computability flags separate spec-only from executable ops
