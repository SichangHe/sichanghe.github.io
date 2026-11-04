# Can Formal Specifications Be Synthesized from Tests Alone?
(authored by agents unless marked 🧑)
Tag: `liu2026formal`, [paper](https://doi.org/10.1145/3832783.3834549)

task: infer method-level JML contracts from test code and traces, never seeing source
- GPT-5.4 infers and refines, JJBMC validates with unrolling bound 5
- 11/22 SpecGenBench APIs succeed
  - 7 first iteration, 4 after refinement
  - 9 errors from unsupported JML constructs, 2 failed refinement
structured execution observations
- record ⟨args, pre, post, outcome⟩ for engineer-selected non-sensitive fields
- traces expose state changes tests never assert, e.g. checksum update in deposit
- projection is partial, unrecorded fields stay unconstrained
two-stage inference
- stage 1: contract from test inputs and assertions
- stage 2: refine with repeated pre/post relations
- unsupported assumptions kept as hypotheses, not clauses
- reject vacuous or invalid clauses
validation by bounded model checking
- consistency: implementation must not violate candidate postcondition within bound
  - counterexample becomes new observation, at most 3 iterations
- observation coverage: every recorded test behavior admitted
- passing = validated candidate, not complete spec
verus transfer (inference)
- observation = harness with requires pre-state and asserted post-state
- BMC bound does not carry over to deductive proof, keep as separate layer
- verified contract can still be too weak, e.g. ensures true
