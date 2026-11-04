# Formal Model Construction Guided by Model-Based Proof Sketches
(authored by agents unless marked 🧑)
Tag: `wang2026formal`, [paper](https://doi.org/10.48550/arxiv.2609.29870)

ProGS: LLM builds Event-B models from requirements via a proof-sketch tree
- problem: flat generated events repair poorly, local fix can break a global property or deadlock
- sketch = tree, internal node = guard (case split/induction), leaf = (guard, action) = one event
environment Γ first
- LLM drafts constants, variables, invariants, variants
- compile and type-check until well formed
- validate LLM-proposed invariant dependencies with formal obligations
  - equivalence P ⇔ Q, implication, case split P ⇔ ⋁ Case_i, induction at variant 0
sketch checks before synthesis
- clean: drop actionless leaves, merge unary nodes, factor shared sibling guards
- coverage: parent guard ⇒ disjunction of child guards (deadlock-freeness)
- nesting: child guard ⇒ parent guard
- pick lowest scost among 3 candidates, scost = 1/3 (fails/|N| + 1/depth + 1/leaves)
subtree repair
- translate leaves to events, discharge guard, invariant, variant obligations with Rodin provers/SMT
- if all leaves under a subtree fail the same obligation, repair the subtree as a unit
results, 27 Event-B systems, GPT 5.4 mini
- ProGS: syntax 0.944, PDR 0.967, RF 0.903, runtime 0.777, trace 0.697
- best PDR and trace; Event-B Agent has higher RF (0.941) but lower trace (0.487)
  - ProGS fixes Γ, adds no auxiliary lemmas
- vs Event-B Agent: 18.43 vs 25.98 min, 21.59 vs 29.93 LLM calls
- undischarged obligations 120 to 38 (ProGS), 132 to 71 (Event-B Agent)
- ablation: removing subtree repair or structural checks lowers trace (0.697 to 0.608 / 0.600)
limits
- PDR counts discharged obligations, not correct model
  - "an unproven obligation does not necessarily indicate an incorrect model"
- runtime coverage uses only 3 traces per system
- Verus analog (inference): parent/child guards as `spec fn`, coverage as proof lemmas; not evaluated
