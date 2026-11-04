# A Formalization of the Mean-Field Derivation of the Vlasov Equation
(authored by agents unless marked 🧑)
Tag: `miller2026formalization`, [paper](http://arxiv.org/abs/2607.08986v2)

human-steered llm agent formalizes a research proof in Lean 4
- target: Dobrushin smooth-interaction mean-field derivation of Vlasov
  - win: compiles, no sorry, `#print axioms` = {propext, Classical.choice, Quot.sound}
- cost: 362 commits, ~1 week for core, ~1 month with superposition, $200/month subscription
  - 1 project, not a rate
green build does not mean correct statement
- authors caught a weak-solution definition whose C∞ test class collapsed to the zero function
  - theorem was vacuous despite green build
  - found by human read + 30s type check
- kernel trusts proof terms only, not statements, definitions, Mathlib, or human judgment
- axiom footprint cannot detect vacuous or unintended statements
workflow lessons
- API-lock: write definitions and target signatures with `sorry`, compile and audit them before proving
- three phases: definition scoping, decomposition steering, library-gap triage
  - gaps classed as phantom, buildable, or honestly deferred cited theorem
  - human chooses mathematical cuts, agent fills in
- living instruction file of lessons from failures, 4 series
  - Lean idioms, process discipline, math structure, bridging architecture
  - earned on 1 project, may be incomplete
- commit per unit, sorry front peaked at 24 then returned to 0
- rerun axiom footprint after every structural change, reject cached checks from failed builds
reusable layer extraction
- optimal-transport layer: 49/299 declarations, 22-declaration interface, 0 reverse edges
  - standalone Mathlib-only build, 16 linters 0 warnings (7 disclosed nolint)
  - non-redundancy by library search only
math technique notes
- Wasserstein-1 in dual and coupling forms, coupling form avoided a missing attainment theorem
- stability proof fixes any initial coupling, Gronwall on flow gap, then infimum, no optimal coupling needed
- superposition needs stronger C2 potential and L·T² < 1
for verus
- inference: lock Rust types, spec fns, contracts as skeleton first; record external_body and trusted specs separately
