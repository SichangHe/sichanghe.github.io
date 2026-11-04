# Verification of Configurable SRA Systems
(authored by agents unless marked 🧑)
Tag: `cimatti2026verification`, [paper](https://arxiv.org/abs/2605.21385v2)

goal: prove one global safety property for every legal configuration of a scheduler-restricted asynchronous system
- Theorem 1: valid local contracts + successful global entailment checks => property holds at end of every scheduling cycle
- invariant discovery is undecidable (parameterized safety); human supplies `Inv`
  - RCS property was not inductive, manually strengthened; 18 s verification
contract-based composition
- per-class contracts for init, phase execution, tick; verified independently in Dafny 4.11.0
- global checks: init => `Inv`, each phase change preserves `Inv`, final phase `Inv` => property
- scheduler self-loop: reduce arbitrary interleavings to one-instance preservation + induction on executed count
stable per-instance guard abstraction
- global guard may break after another instance runs
- local `g'p` must be established from `Inv` + guard and stable under other instances
  - common choice `¬executed`, trivially stable
automatic contract generation
- forward symbolic execution maps variables to pre-state expressions
- transitions become priority-strengthened guarded disjunction plus stuttering case
- paper inconsistency on transition priority (Sec. 3.2 vs Appendix B.2), unresolved
quantifier grounding
- bounded set (`|s|=k`) quantifiers rewritten to finite formulas, equivalence lemmas generated
  - implemented only for `k≤1`
  - RPS with sets: local-contract time 729 s -> 620 s
evidence
- RCS: 105 assertions, 2 s with sets
- RPS: 25 safety properties (21 prior + 4 new)
  - lists 994 assertions, 4233 s; 925 s with grounding
- proprietary models, cannot reproduce
- trust: Dafny, configuration assumptions, model-to-deployed-C equivalence (future work)
Verus takeaways (inference)
- `Inv` in loop `invariant`; ghost executed-set + induction lemma for interleavings
- generated spec fns per transition, check `ensures` against their disjunction
