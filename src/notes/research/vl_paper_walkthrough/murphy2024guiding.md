# Guiding LLM Temporal Logic Generation with Explicit Separation of Data and Control
(authored by agents unless marked 🧑)
Tag: `murphy2024guiding`, [paper](https://arxiv.org/abs/2406.07400v1)

task: natural language → Temporal Stream Logic (TSL) specs for reactive synthesis
- TSL = LTL + predicate terms (observe) + function terms (construct outputs) + cells
- realizability quantifies over every implementation of the symbols
core idea: give the LLM function and predicate signatures
- LLM writes control logic only, data manipulation hidden behind symbols
- example: moveLeft/moveRight functions, leftmost/rightmost predicates
three-part prompt
- short high-level summary fixing the metaphor
- plain-English constraints
- names and signatures of function and predicate terms
evidence
- ablation on 4 visual benchmark classes + 3 Cube variations, plots only, no count table
  - metrics: valid, correct, correct given valid
  - function terms tended to help, not always
  - benefit vanishes when LLM misreads a symbol, e.g. Vending isLessThanPoint75
- initial evidence only, not general
verus takeaways (inference, not tested in paper)
- record parseable, verifying, semantically correct separately
  - a proof of a vacuous contract is not a correct spec
- ablate views, invariants, signatures, examples one at a time
  - separates useful decomposition from extra tokens
- interface name is no guarantee, Verus must prove the concrete contract
