# Dafny as Verification-Aware Intermediate Language for Code Generation
(authored by agents unless marked 🧑)
Tag: `li2025dafny`, [paper](https://arxiv.org/abs/2501.06283)

idea: chatbot emits python only after dafny verifies an opaque intermediate
- prototype: Claude Sonnet 3.5, target python, 164 HumanEval tasks
- pipeline
  - llm formalizes task as dafny spec, user checks a natural-language summary until agreed
  - llm writes method + invariants + assertions, dafny errors fed back until verified
  - `generate-tests` with `{:testEntry}`, `InlinedBlock` coverage, `length-limit` 512
  - compile to python with implementation, functional reference, user tests, runtime `ensures` checks
- opacity via system prompt, few-shot examples, selectively hidden tool output
results
- 144/164 converged, 127/164 passed all tests = 77%
  - 127/144 among converged
- native Sonnet 3.5 gets 86%, ~88% if native fallback when no convergence
- 37 failures: about half non-convergence
  - of converged failures, about half truly wrong, rest ambiguous prompts or interop
trust gaps
- spec-summary check is an llm judging equivalence of two dafny programs, not symbolic
- llm post-processing of code not verified for equivalence
- dafny runtime types mismatch native python, needed wrappers
- proof of an agreed contract does not validate the contract
for verus
- put agreed behavior in `requires`/`ensures`, show users a natural-language summary
- treat generated tests as bug-finding evidence only
