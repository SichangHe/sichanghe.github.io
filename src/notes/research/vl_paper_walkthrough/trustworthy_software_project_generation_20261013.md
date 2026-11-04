# Trustworthy Software Project Generation : a Case Study with an Interactive Theorem Prover
(authored by agents unless marked 🧑)
Tag: `fang2026trustworthy`, [paper](https://arxiv.org/abs/2605.26017)

claim: LLM agents generate a Rocq-proved pure core + thin host, fully automatic
- task: unprivileged RV32I interpreter, 47 instructions, Claude Opus 4.7 High, 30 min, ~21M tokens
  - one run, no repeats
- output: 1,859 lines Rocq (821 functions, 116 types, 922 properties+proofs), 2,848 lines extracted C++, 88 lines host C++
what the proof covers
- kernel-checked: LLM-written lemmas about LLM-written pure functions
- trusted
  - extractor "faithfully preserves the operational semantics"
  - host code (3% of C++)
  - specs: the proving agent states and proves each theorem
    - inference: a true-but-weaker lemma is accepted
    - inference: Z to int64_t has no lemma that intermediates fit
technique 1: pure core, effectful host
- deterministic computation that the requirement makes claims about goes in pure functions
- I/O, allocation, CLI are host obligations, only tested
- whole machine is one record, each instruction one handler state -> state
- fits state transformers; effects that interleave with logic are the failure case
- Verus form (inference)
  - host layer = external_body / assume_specification
  - no extraction gap, but need overflow proofs and spec fn vs exec fn with view relation
technique 2: coding plan with ambiguity as blocker
- plan fixes types, pure function signatures, host obligations, properties
  - both coding and proving agents must follow it
- underspecified choice (language, int width, signedness) stops and asks, never defaults
- no ablation without the plan; number of clarifications not reported
- Verus form (inference): list spec type, exec type, view fn per concept
technique 3: computes clause + frame lemma
- per function: what output equals, and what stays unchanged
  - frame: memory, CSRs, halt, privilege, trace, other registers, register file length
  - "without these, an instruction that writes the correct rd and pc but quietly corrupts an unrelated register ... would still violate correctness"
- Verus form (inference): &mut has no implicit frame, state each unchanged field in ensures vs old(s)
- limit: lemmas go through helpers (jalr_target, sext_from); wrong helper means proved and wrong
technique 4: composition theorems over dispatcher
- invariants of step: if holds of s then holds of step s i
  - reg file length 32, x0 zero, pc in [0, 2^32), non-CSR leave CSRs alone, non-memory leave memory alone
- Verus form (inference): inv spec fn + proof fn with match, one lemma call per arm
- limit: safety/frame only, no theorem that step matches the manual or decoder inverts encoding
technique 5: repair ladder
- type error -> coder with compiler message
- unprovable property -> coder gets plan, body, error
- proof error -> prover with Rocq proof state at failure
- after k failures, reflect: recheck statement, body, types against requirement
  - regenerate deviating one, else rewrite proof from scratch, else hand user the goal
- k and rung counts not reported
- risk: same agent may rewrite the theorem until provable
- Verus form (inference): no residual goal, bisect with assert(...), small lemmas; show regenerated ensures to human
technique 6: backend by failure feedback
- Dafny 4.11.0 same agent, same 30 min: 2,070 lines, no complete verified spec set
  - claimed cause: no local error, agent cycles through conditions, each times out
- one run per backend, no timeout settings or count of verified functions
  - cannot separate SMT feedback from large Dafny methods
- inconsistent: intro disclaims "one verifier dominates", yet boxed claim says Rocq better suited
validation is weak
- 265 LLM-written tests all pass; AFL++ 12 h, 98.2M inputs, no crash/hang
  - inference: shared misreading passes; fuzz oracle is crash only; no reference emulator
paper inconsistencies
- "unprivileged RV32I" has CSR file + privilege mode; 47 likely older RV32I count (current 40)
- related-work citations printed "[?], [?], [?]"
