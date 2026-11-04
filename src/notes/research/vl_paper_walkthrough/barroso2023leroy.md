# Leroy and Blazy Were Right: Their Memory Model Soundness Proof is Automatable
(authored by agents unless marked 🧑)
Tag: `barroso2023leroy`, [paper](https://arxiv.org/abs/2212.02425)

result: CompCert memory-model soundness proof ported from Coq to Why3, mostly automated
- Coq: ~1070 lines spec + ~970 lines proof script
- Why3: ~1040 lines spec; 114 of 125 VCs auto at level 3 (~870 Coq proof lines, 89.6%)
  - paper counts inconsistent (125-114 ≠ 9; later 115 of 124 = 92.7%)
- interactive remainder: 117 transformations vs 220 in Coq (-46.8%)
- caveat: compared to the original Coq proof; modern Coq has more automation
three techniques for the last lemmas, taking manual steps to 0
- induction as recursive lemma function
  - `requires` = premises, `ensures` = conclusion, `variant` = termination
  - recursive call mirrors the spec function's update, so the IH is generated automatically
  - Verus: terminating `proof fn` with decreasing arg, spec recursion kept in `spec fn`
- assertions as solver-visible intermediate facts
  - each assert makes its own VC
  - Verus: `assert(...)` in a proof fn
- witness-returning lemmas for existentials
  - replace `exists m2'. P` with a returned value and `ensures P(result)`
  - Verus: proof fn returns the witness in ghost form
other
- Why3 extracts OCaml for the concrete model
  - undefined functions (`alignof`, `enough_free_memory`) moved into a functor
  - executable correct only relative to supplied implementations
