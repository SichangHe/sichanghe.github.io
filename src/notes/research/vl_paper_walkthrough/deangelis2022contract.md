# Contract Strengthening through Constrained Horn Clause Verification
(authored by agents unless marked 🧑)
Tag: `deangelis2022contract`, [paper](https://doi.org/10.4204/EPTCS.373.3) (DOI from the paper text; EPTCS 373, 2022, pp. 23–34)

problem: valid contracts too weak for the verifier to prove callers
- example: Scala `rev`/`snoc`, Stainless times out (100 s) on `rev` with the original contracts
- after strengthening, Stainless proves both
technique: 4 steps
- 1 translate program and contracts to constrained Horn clauses (CHCs)
  - contract violation = `false`-headed goal; satisfiable iff contracts valid
  - translation not mechanized, "no specific tool is available"
- 2 remove ADT terms with `Tcata` (VeriCaT)
  - contracts are catamorphisms: structural summaries like `is_asorted`, `hd`, `leq_all`
  - always terminates, yields clauses over basic sorts
  - satisfiable transformed set implies satisfiable original set
- 3 solve with SPACER, get a model for the new predicates (`new3`, `new7`)
  - Eldarica and SPACER fail on the untransformed set: no induction, ignore the `snoc` contract
- 4 turn the model into stronger postconditions
  - substitute model into predicate definitions, simplify with pre/postcondition, conjoin to `ensures`
  - done by hand in the paper
- partial strengthening: keep only a sufficient subset of the model
  - shorter postcondition proves faster in Stainless, at the cost of weaker documentation
  - minimal strengthening left to future work
limits
- evidence = one example (`Reverse`), no benchmarks
- no guarantee the verifier proves the strengthened contract; no characterization of successful cases
- trusts Scala-to-CHC translation, ADT-removal soundness, solver
Verus relevance (inference)
- solver-found relations ~ candidate `ensures` clauses or reusable lemmas
  - need independent review: stronger valid `ensures` proves only the encoded behavior
- recursive data summaries ~ `spec fn` over `Seq`, plus lemmas linking them to the code
