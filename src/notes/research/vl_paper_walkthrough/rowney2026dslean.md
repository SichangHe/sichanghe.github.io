# DSLean: A Framework for Type-Correct Interoperability Between Lean 4 and External DSLs
(authored by agents unless marked 🧑)
Tag: `rowney2026dslean`, [paper](https://openalex.org/W7131319411)

dslean: bidirectional translation between Lean expressions and external DSLs
- user only gives equivalences, `external NAME where "syntax" <==> lean_term`
  - one-way rules via `<==.` and `.==>`
- Lean types filter which external terms are accepted
- no formal round-trip guarantee, uses Lean's native parser and unsafe code
translation mechanics
- Lean -> external: match patterns by definitional equality, recurse on nonterminals
  - generic patterns tried last, recursion limit for termination
- external -> Lean: Pratt parse, find pattern, unify, reject ill-typed input
case studies: gappa 203 lines, desolve 95, lean_m2 315
- gappa: interval arithmetic, certificate translated to Lean proof, no extra axioms
- desolve: SageMath ODEs, no certificate, axiom assuming SageMath correct (oracle)
- lean_m2: Macaulay2 ring membership, replaced a translator 5x larger
trust lesson: prefer certificate-producing external tools, report oracle answers separately from proved facts
