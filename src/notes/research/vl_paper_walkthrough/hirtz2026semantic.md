# Sage: Formalization with Semantic Correction
(authored by agents unless marked 🧑)
Tag: `hirtz2026semantic`, [paper](https://www.semanticscholar.org/paper/693e219a8682693cd7e72ec451de263764280429)

autoformalization as translation, not solving
- 3 requirements: Lean typechecks with one final `sorry`, meaning preserved, assertion vs open question preserved
- discovery/verification gap: Lean checks a claim, does not find the answer
assertion vs question statements
- assertion ("show that") carries a claim, question ("find") asks for a value or witness
- 3 encodings for questions
  - explicit answer injection: clean, needs an oracle
  - placeholder `def x : α := sorry`: keeps openness, breaks read-only prover contract
  - existential `∃ x, P x`: no oracle, can be logically weak
- Verus analogue: separate a supplied postcondition from an underspecified request, do not invent a value to pass
type-theoretic locks against trivial proofs
- `Prop` existentials admit shortcuts
  - yes/no query closed by `Classical.em`
  - `∃ S : Set α, ∀ x, x ∈ S ↔ P x` closed by `S := {x | P x}`
- fix: target a `Type` with subtype `{x : α // P x}`, or `List`/`Finset` for finite characterization
four-stage generation
- distiller: domain, statement kind, inferred goal or answer-free rewrite
- preprocessor: structured declarative normal form (definitions, hypotheses h1..hn, target)
- formalizer: typed Lean with Mathlib, one terminating `sorry`
- formatter: imports, namespaces, strip chat text
dual-signal correction loop
- compile alone misses dropped hypotheses, altered bounds, vacuous statements
- rater scores component match, holistic match, code quality
- corrector gets first 5 compiler errors, rationales, mismatch snippets, precompiled rater draft, failure history
- stop when compile ∧ semantic match, or budget exhausted
results
- Omni-MATH answer-aware (N=300): 96.0% compile, 93.7% in-loop compile ∧ Sage-SM, 77.3% compile ∧ Goedel-SM
- IMO-FORMALIZED answer-agnostic (N=223): 94.2% compile, 61.4% compile ∧ Goedel-SM
- Omni-MATH answer-agnostic: 94.7% compile, 50.3% compile ∧ Goedel-SM, 2.7% answer leakage
  - monolithic baselines guessed answers in 70.9% of signatures
  - external judges rejected 76.8% of Sage drafts for preferring explicit numbers, so external score is a lower bound
- semantic gate agreed with Lean annotators on 71.1% of 45 adversarial drafts (ρ=0.63)
limits
- measures statement formalization only, not proofs, Rust, or Verus
- trusted: Lean, Mathlib, rater model, supplied informal proof in answer-aware mode
