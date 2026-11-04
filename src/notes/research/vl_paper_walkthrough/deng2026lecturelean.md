# From Lecture Notes to Lean: Formalizing a Textbook on Probability Theory
(authored by agents unless marked 🧑)
Tag: `deng2026lecturelean`, [paper](http://arxiv.org/abs/2607.27298v1)

scope
- ongoing agent-assisted Lean formalization of a 14-chapter measure-theoretic probability textbook
  - 81 definitions, 127 theorems, 107 examples, 134 problems
  - examples and problems not yet formalized
- single project report, not a proof-generation benchmark
- core problem: mathlib is more general and ordered differently than the textbook
interface bridges
- reuse mathlib theorem if interface matches, else prove a project-local bridge lemma
- keep public statement close to source
- strong law: textbook mutual independence bridged to `ProbabilityTheory.strong_law_ae` (pairwise independent, identically distributed)
- integral: textbook supremum definition identified with `lintegral`, then `lintegral_iSup` for monotone convergence
- verus form (inference): contract keeps source-level api, bridge lemma proves equivalence to existing spec
total-function pitfall
- lean functions are total, so mathlib integral returns a fallback outside its domain
- variance first compiled without integrability hypotheses
- repair: explicit mean witness `IsDiscretePmfMean`, require integrability of centered square, then `PMF.integral_eq_tsum`
- verus form (inference): `requires` must state the domain where the value is meaningful
counterexample source review
- agent flagged Riemann-Stieltjes additivity theorem missing a standing hypothesis, produced a counterexample
  - counterexample and missing hypothesis not given in paper
- formalization forces hidden assumptions explicit
three-artifact workflow
- source artifacts: textbook passages, corrections, errata
- mathematical artifacts: Lean files, imports, pinned Lean/mathlib
- process artifacts: candidates, helpers, build results, reviews, verdicts, repairs
- lean checks validity, not whether the statement is the intended translation
- pipeline
  - source-bound task with declared dependencies
  - agent proposes statement and proof, public theorem file plus task-owned helpers
  - build, admission check, axiom check
  - read-only source-fidelity review of hypotheses and conclusions
  - reviewer hunts special-case theorems, extra hypotheses, changed identities, bypass wrappers, helpers hiding the obligation
  - stale reviews refreshed when source, candidate, helpers, or dependencies change
  - failures routed: local gap to repair, interface mismatch to redesign, source error to author
- favorable review necessary for clean completion, not sufficient
- compile + no `sorry` + axiom footprint necessary, human judgment still decides fidelity
