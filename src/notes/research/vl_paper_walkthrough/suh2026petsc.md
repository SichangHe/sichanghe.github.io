# Verification of PETSc with CIVL using LLM-generated ACSL contracts and deterministic driver generation
(authored by agents unless marked 🧑)
Tag: `suh2026petsc`, [paper](https://doi.org/10.48550/arxiv.2609.31687)

pipeline: LLM → human review → deterministic compiler → CIVL
- LLM writes only a short contract, never the driver
  - "an unaudited driver that passes verification is worse than no driver at all"
- found a MatAYPX aliasing bug present since 1997
restricted contract synthesis
- small ACSL profile: `requires`, `assigns`, `ensures`, behaviors, `\old`, quantifiers + PETSc predicates
  - prompt = profile + skeleton + prototype + manual page, no source repo
  - objects as dense row-major global images; reductions unsupported
- PETSc expert certifies every clause; "only a certified contract proceeds"
  - model can invent undocumented restrictions
- Verus analogue (inference): small `spec fn`/`ensures`, human reviews aliasing/frame, contract untrusted until proved
  - no ACSL `assigns`; frame via snapshots/ownership
deterministic driver derivation (`acsl2civl`)
- `requires` → symbolic inputs, `assigns` → snapshots + frame checks, `ensures` → elementwise assertions
- aliasing/enum cross-product → one driver per case
  - symbolic values alone miss pointer identity; need a same-handle driver
- size: certified contract 8-14 lines vs 38-176 lines of drivers (excludes review time)
- bounded: 1-2 processes, dims 1-3; MatAXPY 36.73 s, 102,082 states
contract-only oracle finds the bug
- MatAYPX has no reference model; contract leaves aliasing unrestricted
- X=Y gives `2aYold` instead of `(1+a)Yold`; found in 6.75 s, 1,615 states
  - fix the implementation, don't add `requires Y != X`
- risk: a wrong human contract yields a sound proof of wrong behavior
profile evolution
- MatFilter needed symbolic tolerance and conditionals
  - extend profile, parser, compiler, then regenerate
- limits: dense abstraction hides sparse semantics, assembly, communication
