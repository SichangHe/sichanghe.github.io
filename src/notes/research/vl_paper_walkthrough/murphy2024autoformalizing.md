# Autoformalizing Euclidean Geometry
(authored by agents unless marked 🧑)
Tag: `murphy2024autoformalizing`, [paper](https://arxiv.org/abs/2405.17216)

task: LLM translates informal Euclidean theorems and proofs into Lean
- LeanEuclid benchmark: 173 manually formalized problems
  - all 48 Elements Book I propositions + 125 UniGeo (25 per category)
  - UniGeo diagrams' missing details added by hand
- formal system E in Lean + SMT symbolic engine for implicit diagram reasoning
  - SMT results are not certified by Lean, a trust gap
core insight: equivalence checking is feasible in narrow domains with domain knowledge + SMT
E3 semantic equivalence evaluation
- prove Tpred ⇒ Tgt and Tgt ⇒ Tpred separately with SMT
  - also check Tpred for contradiction
  - unproved implication is not a counterexample
- approximate mode when equivalence fails
  - match bound variables by type and count, rank by string similarity
  - count resolved precondition and postcondition obligations in both directions
  - only 10 of 36 GPT-4 5-shot rejections had required bound variables
- result: 18.9% (GPT-4) and 21.0% (GPT-4V) statements proved equivalent, 5-shot
  - manual check of 86: all 16 E3 successes accepted, 3 of 70 failures accepted, false negative rate 15.8%
  - one equivalent prediction was unfaithful to source wording, so equivalence ≠ fidelity
symbolic gap filling
- euclid_apply: missing premise ⇒ ask engine, proved by UNSAT of negated premise
- engine cannot make constructions, those stay explicit proof steps
proof generation
- 5-shot, whole proof in one query, checked as-is
  - UniGeo: 25% (GPT-4), 31% (GPT-4V), zero-shot 0%
  - Elements: only Propositions 1 and 17 formalized by either model
  - combined 143 proofs: 18.8% and 23.1%
- manual repair of failed Elements proofs: median Levenshtein similarity 61.7% / 64.0%
  - similarity is edit distance, not correctness or human time
  - paper inconsistent on counts: 41 vs 43 failed proofs
verus takeaways (inference, not tested in paper)
- evaluate generated specs by mutual implication against reference in a shared theory
  - keep unresolved obligations as partial credit
  - sample-check manually, separate equivalence from fidelity
