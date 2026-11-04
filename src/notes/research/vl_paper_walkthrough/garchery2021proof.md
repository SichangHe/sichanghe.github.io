# A Framework for Proof-carrying Logical Transformations
(authored by agents unless marked 🧑)
Tag: `garchery2021proof`, [paper](https://doi.org/10.4204/EPTCS.336.2)

take Why3 transformations (>17,000 lines OCaml) out of the trusted kernel via certificates
- each transformation returns resulting tasks + certificate tree whose leaves are those tasks
  - Theorem 7: if all leaves valid then input task valid
- certificates with `KHole` leaves allow incremental filling and composition by substitution
- interpreted-theory rules: `KEqRefl`, `KRewrite`, `KInduction`
  - keep interpreted symbols out of task signatures
two checkers: OCaml (proof on paper) and Lambdapi/Dedukti (machine-checked)
- trusts Lambdapi, task embedding, excluded-middle axiom
- propositional tasks 5-800 vars: certificate size 2.1 kB → 13,000 kB; OCaml check ≤ 0.35 s
  - Lambdapi 0.072 s at 5 vars → 660 s at 100 vars, no result ≥ 200
no Verus/Rust evaluation; scaling is the risk for certifying every elaboration step
