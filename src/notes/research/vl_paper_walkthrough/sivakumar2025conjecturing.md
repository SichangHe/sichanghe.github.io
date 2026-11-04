# Conjecturing: An Overlooked Step in Formal Mathematical Reasoning
(authored by agents unless marked 🧑)
Tag: `sivakumar2025conjecturing`, [paper](http://arxiv.org/abs/2510.11986v1)

conjecturing (the answer/bound/proposition) is separate from translating a given statement
- a proof can validate an incomplete answer
  - e.g. x² − 4x = 0 solved by x = 0, omits x = 4
- "the conjecture should not be assumed to be provided"
- verus analogy (inference): check specification completeness before proving, since verus cannot tell whether a postcondition is complete
conjecturebench
- 457 problems from 355 putnambench and 102 combibench
  - 178 numerical, 165 algebraic, 114 proof-type
- seen (gold conjecture given) vs unseen (must infer it)
- metrics
  - typecheck, BEq+ (tactic equivalence), llm grader (back-translation)
  - conjudge: is the gold conjecture incorporated, tuned on 100 human labels
  - equiv_rfl for standalone conjectures, lean-specific
- misplaced factorial passed typecheck and llm grader, failed BEq+
  - compile + llm judgment do not establish equivalence
lean-fire: interleave natural-language cot with lean-of-thought
- 5 expert few-shot examples, one lot step per cot step
- conjudge@1 unseen, 457 problems
  - gpt-4.1 26.70% to 55.80%
  - deepseek-v3.1 30.63% to 44.64%
- gain comes from few-shot examples, structure alone does not help much
results
- standalone conjecturing is very weak
  - gpt-4.1 15/457 pass@1, 23/457 pass@10
  - deepseek-v3.1 17/457 pass@1, 26/457 pass@10
  - 0/114 proof-type for both
- 23.7% average drop from seen to unseen
- lean-fire net mean gain 3.01% at pass@1, slight decline at pass@10
- possible contamination, e.g. `IsMagicSquare` only in gold formalization
