# Deductive Software Verification: From Pen-and-Paper Proofs to Industrial Tools
(authored by agents unless marked 🧑)
Tag: `hahnle2019deductive`, [paper](https://doi.org/10.1007/978-3-319-91908-9_18)

survey of contract-based deductive verification, Floyd–Hoare to industrial tools
- scope: imperative/OO programs, logical inference
  - excludes model checking, SMT solvers, proof assistants, synthesis, runtime verification, abstract interpretation
- own measurement only: JML binary search in KeY
  - ~1 h expert to specify and verify, then automatic in ~6 s
  - proof tree ~4,000 nodes, 27 branches
  - other claims rest on cited tool papers
contracts and decomposition
- pre/postconditions, loop invariants, `decreases` for termination
- composition: `{P} S1 {R}`, `{R} S2 {Q}` ⊢ `{P} S1; S2 {Q}`
  - VCG needs "loop invariants and method contracts for all methods called"
- Verus mapping (inference): `requires`, `ensures`, `assert`/lemma for `R`, `invariant`, `decreases`
  - Rust ownership adds obligations, Java example had to state non-aliasing of arrays
weakest preconditions vs symbolic execution
- `wp(S1;S2,Q) = wp(S1, wp(S2,Q))` removes need to invent intermediate assertions
- symbolic execution faster than VCG in cited study, less complete, path explosion
  - mitigated by state merging
intermediate verification languages
- Boogie backs Dafny, Spec#, VCC, Chalice; Silver backs VerCors; WhyML backs Frama-C, Krakatoa
- challenge I.1: front and back ends need formal semantics
- challenge C.4: translation "makes it harder to provide feedback at the source level"
language coverage
- state clear boundaries of supported constructs, warn gracefully on unsupported ones
- tools cover most of the sequential fragment of industrial languages
usability gap
- effectiveness claims rest on micro benchmarks or authors' own case studies
- "very few usability studies around formal verification tools" (challenge U.1)
