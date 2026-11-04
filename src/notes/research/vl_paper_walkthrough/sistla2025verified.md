# Towards Verified Code Reasoning by LLMs
(authored by agents unless marked 🧑)
Tag: `sistla2025verified`: [paper](https://arxiv.org/abs/2509.26546v2)

verify an llm's prose code explanation after generation
- 3 parts: CodeSemantics, AgentClaims (formalized response), VerificationCondition
  - need CodeSemantics ⇒ AgentClaims and AgentClaims ⇒ VerificationCondition
  - only the second is checked, the first is left to future work
  - condition is user-supplied
- success means a consequence of the claims holds, not that the explanation is correct end to end (inference)
- claims are soufflé datalog facts, a deterministic checker does the entailment
msan root-cause explanations
- condition: uninitialized expression, data flow, use
- pipeline: explain, retrieve code, extract trace, formalize with fixed predicates, check
- 20 internal bugs, gemini 2.0 flash x5, human judged 88/100 explanations valid
  - 1 formalization iteration validated 18/88
  - 5 iterations combined 36/88
  - at least one validated run on 13/20 bugs
  - misses from inconsistent fact generation
program-equivalence checking
- condition: every watched variable has an equivalent variable in the other program, both directions
- encode def/use/flow, control dependence, expressions, varMap/entryMap/exitMap
- ask for missing predicate instances, at most 5 calls
- gemini 2.5 pro, 20 examples
  - validated 9 correct answers, caught 6/8 incorrect answers
  - missed 2 incorrect, rejected 3 correct
  - failures from missing function bodies and imprecise predicates
- "we cannot circumvent the undecidability of program equivalence, just because we are using LLMs"
takeaway
- partial check whose reliability depends on retrieval, extraction, vocabulary, condition
