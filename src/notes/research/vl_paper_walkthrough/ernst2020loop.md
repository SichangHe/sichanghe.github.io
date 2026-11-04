# A Complete Approach to Loop Verification with Invariants and Summaries
(authored by agents unless marked 🧑)
Tag: `ernst2020loop`, [paper](https://arxiv.org/abs/2010.05812v3)

loop contract = safe invariant I + relational summary R(s, sn) from loop-head state to exit state
- invariant pushes forward over one iteration, summary pushes backward
- invariants talk about partial intermediate results, contracts about complete results
  - "contracts offer a particular and useful way to think about the correctness of loops"
  - implicitly turns the loop into a tail-recursive procedure: precondition = requires, summary = ensures
- summary proof obligations
  - exit case: !t(sn) ⇒ R(sn, sn)
  - backward step: t(s) ∧ B(s,s') ∧ R(s',sn) ⇒ R(s,sn)
  - each break: prove R at the break state
  - use at entry: P(s0) ∧ R(s0,sn) ⇒ Q(sn)
- safety (no runtime errors) cannot go in summaries, since they act after the fact; keep it in the invariant
  - so split: invariant for safe, summary for correct
- partial correctness only; return inside loops not formalized
equivalence with invariants (mechanized in Isabelle/HOL, Sects. 4-5; not rerun)
- Prop. 1, contract to invariant: I(s) := ∃s0. P(s0) ∧ J(s) ∧ ∀sn. R(s,sn) ⇒ R(s0,sn)
  - for functional summaries simplifies to remaining-work value = whole-work value
- Prop. 2, invariant to contract: canonical summary says entering with I yields I ∧ ¬guard (or the postcondition) at exit
- Hoare rule LoopContract: verify body then a specification statement for remaining iterations
- so an agent can propose a summary of remaining work and convert it to an invariant
when contracts help
- search-like loops, e.g. binary search, maximum by elimination, where invariants must describe discarded parts
- spec recurses from the front while loop runs forward: state the property over the remaining suffix, avoiding an end-unfolding lemma
- loops that write: add frame equations that remaining iterations leave the written region unchanged
- loops with break: no ¬guard at exit by default; model early return as flag + break
Horn-clause inference (Korn prototype, 459 supported SV-COMP tasks)
- Eldarica: 237 correct with invariants, 232 with contracts
- Z3: 234 with invariants, 201 with contracts
  - Loops 105 vs 75 of 196; Arrays 7 vs 2 of 129
- arrays are where contracts were hoped to help, but both styles solve at most 7/129 (VeriAbs 122)
- authors: not a conclusive assessment; a few incorrect prototype results from unbounded-integer assumption
caveats in the note
- intro claims 90%/70% of invariant performance, but Table 1 gives 97.9%/85.9%
- listings for binary search and bubble sort have typos (stray i, precondition false at entry)
- evaluates C, not Rust or LLMs; no Verus code checked
