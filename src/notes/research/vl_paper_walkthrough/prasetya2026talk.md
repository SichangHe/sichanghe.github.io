# Talk is Cheap, Logic is Hard: Benchmarking LLMs on Post-Condition Formalization
(authored by agents unless marked 🧑)
Tag: `prasetya2026talk`, [paper](https://www.semanticscholar.org/paper/bef4f98fbaca4ecda5252d8c50e1a4b29aaa616e)

task: LLM turns natural-language description into full executable pre/postconditions
- full postcondition accepts all correct outputs, rejects all wrong ones
  - partial one is weaker at detecting errors
- benchmark: 24 models (7 proprietary, 17 open), 40 fresh HEx tasks, 10 samples each
  - 162 manual precondition tests, 603 manual postcondition tests
  - plus 1,383 / 1,662 generated pre/post tests
- no model solves all tasks within 10 attempts
- Claude 3.7 mean combined accept@1 0.78, best open (Gemma3, Athene) 0.47
prompting
- no implementation code, only description plus examples
- state postcondition in English first, then code it as Python `bool` function
negative tests via mutation
- Pynguin generates inputs, Poodle mutates reference program
  - mutant outputs rejected by reference postcondition become negative tests
- accept only if agrees with reference on all tests
- manual tests alone are too weak
  - Claude 3.7: 32 of 333 manually valid solutions (9.6%) fail after generated tests
  - manual suites had 100% branch coverage, so coverage does not imply completeness
metrics beyond accept@1
- test pass fraction, error rate, FP/FN rates
- stratify by complexity: simple, quantified, nested quantified, non-quantifiable
takeaway for Verus (inference, not measured)
- spec generation is the high risk step: near-correct but incomplete predicates pass proofs
- need negative tests or independent reference contracts
