# Precondition Inference via Partitioning of Initial States
(authored by agents unless marked 🧑)
Tag: `kafle2018precondition`, [paper](http://arxiv.org/abs/1811.06771v1)

infer sufficient preconditions (SPs) for both safe and unsafe terminating states
- CHC encoding with init, safe, unsafe predicates
  - correct only relative to user-encoded states, e.g. overflow and float exceptions unmodeled
- necessary precondition (NP) = over-approx of initial states reaching a target
- SP_safe = NP_safe ∧ ¬NP_unsafe, SP_unsafe = NP_unsafe ∧ ¬NP_safe
- NP_safe ∧ NP_unsafe unsatisfiable ⇒ optimal, necessary = sufficient
iterative partition-and-refine
- analyse safe and unsafe goals with PE, CS, TE
- accumulate the disjoint SPs, restrict initial clauses to the overlap, repeat
- stops when overlap is empty or no longer shrinks
- cost: DNF conversion of the overlap may blow up initial clauses
- side effect: states outside both NPs are candidate nontermination
evidence
- PI-Horn on 261 integer programs: 176 optimal, 83% non-trivial, 9% timeout
  - 300 s timeout, fixed PE→CS→TE
- soundness proved by sketch (Theorem 1)
- Table 1 columns overlap, counts are not a partition
Verus relevance (inference)
- SP_safe is a candidate `requires`; SP_unsafe describes bug-triggering inputs
- Verus has no CHC machinery, so inference stays external
