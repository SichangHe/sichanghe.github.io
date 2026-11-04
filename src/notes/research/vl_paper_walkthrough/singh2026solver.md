# Beyond Solver Verdicts: Generative Reward Models for Autoformalization
(authored by agents unless marked 🧑)
Tag: `singh2026solver`, [paper](http://arxiv.org/abs/2609.11085v2)

solver verdict alone cannot certify faithful formalization
- VPU (verdict-preserving unfaithfulness): encoding parses, same verdict as reference, different meaning
  - e.g. flipping `>` to `<`, both satisfiable
- "a sound solver certifies what follows from the supplied encoding, it does not certify that the encoding accurately represents the source problem"
- prop 1: on matched pairs with identical verdicts, any verdict-only score has AUROC 0.5
- verus analogy (inference): a proof can establish the contract while the contract omits a requirement
bidirectional z3 oracle labels equivalence
- Eq(s, s*) = both A(s) ∧ ¬A(s*) and A(s*) ∧ ¬A(s) unsat
  - needs a gold reference s*
  - relative to the chosen reference and signature
  - unsat formulas are vacuously equivalent
- mine hard negatives: mutate s* (flip operators, change constants, reverse implications)
  - keep only parsable, same-verdict, non-equivalent mutations
- verus has no general mutual-implication API (inference)
  - would need refinement lemmas or a shared logical model
genv: distill oracle labels into a reference-free yes/no score
- score = P(yes) / (P(yes) + P(no)) from the next-token distribution, one forward pass
- lora on a frozen 27B backbone, loss on answer token only
- genv+hn adds 732 oracle-certified negatives to 2,591 translator candidates
- 950-row benchmark AUROC
  - genv+hn 0.961, genv 0.956
  - 5-sample self-consistency 0.863
  - process rm 0.756, outcome rm 0.762
  - solver-only 0.500
- zero-shot AUROC on shifted styles 0.642 (LogicNLI) to 0.964 (ProverQA)
- downstream agentic accuracy +11.3 points overall
  - claude opus 4.7 +2.6, gpt-oss-120b +5.8, gpt-oss-20b +42.6
limits
- negatives are synthetic single-edit mutations
- z3 equivalence disagrees with human intent on contested slice
  - genv+hn AUROC 0.907 vs z3 label, 0.679 vs panel-majority intent
- gradient/SAE diagnostics are not causal evidence
