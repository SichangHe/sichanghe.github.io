# Learning to Prove, Not Just to Answer: Reinforcement Learning from Formal Verification for Natural-Language Logical Reasoning
(authored by agents unless marked 🧑)
Tag: `zhang2026learning`, [paper](https://doi.org/10.48550/arxiv.2609.37203)

proof-r1: RL where every proof step is verified before later steps may use it
- setting: natural-language logical reasoning (ProverQA, FOLIO), not code
  - transfer to Verus is inference only, not evaluated
- action = (dependency ids, conclusion, declared rule), emitted as JSON list
  - final action binds the chosen candidate answer
step admission via mcfv (machine-checkable formal verification)
- semantic check: dependencies ∧ ¬conclusion is UNSAT by SMT
- rule-schema check + proof-progress check (rejects repeats, restatements, tautologies)
- graded reward: 0.0 schema fail, 0.1 semantic fail, 0.3 rule/progress fail, 1.0 all pass
- only admitted conclusions can support later steps
asdc (answer-supporting dependency closure) for credit assignment
- traverse dependencies backward from the final conclusion
- outcome advantage only for actions inside the closure
  - valid but irrelevant branches get no outcome credit
- ablation on ProverQA-Hard, Qwen2.5-7B: removing asdc drops Avg@3 44.89 → 41.37, FVR 58.74 → 44.18
optimization
- action advantage mapped to its exact token span, KL-regularized clipped PPO
- per-rule moving-average baseline for the verification signal
  - held-out prediction error 0.18 vs 0.24 for a global baseline at step 100
results
- ProverQA-Overall, Qwen3-8B: FVR 96.56, RVR 94.36 vs backbone 81.82, 61.68
  - FVR/RVR are percentages of eligible steps, not problems
- unseen quantifier rules on FOLIO: FVR 86.21, RVR 63.08 vs 63.24, 34.92
soundness is conditional
- acyclic trusted dependencies + semantic UNSAT on the closure ⇒ premises entail the answer
- assumes faithful formalization, trusted parser/solver/rule checker
- benchmark is controlled english deduction, no ambiguity
