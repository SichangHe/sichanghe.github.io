# Can Large Language Models Transform Natural Language Intent into Formal Method Postconditions?
(authored by agents unless marked 🧑)
Tag: `endres2024nl2postcond`, [paper](https://doi.org/10.1145/3660791)

nl2postcond: LLM turns natural-language description into executable postcondition assertions
- 2 metrics
  - test-set correctness: holds on every reference test, proxy for true correctness
  - bug-completeness: fraction of distinct mutants rejected, plain `true` is correct but scores 0
- results: GPT-4 simple prompt, no reference code, EvalPlus 164 problems
  - 158/164 with a correct postcondition, accept@1 0.77, accept@10 0.96
  - bug-completeness up to 0.85
- Defects4J: 525 bugs, 840 functions
  - GPT-4 with buggy code: accept@1 0.39, 47 bugs distinguished, without: 0.32, 35
  - 64/525 (12.2%) distinguished over all variants
  - no exceptional postconditions, TOGA-caught bugs are mostly exceptional
prompting
- demand symbolic, side-effect-free assertions, else models return point tests or side effects
- simple prompt (one aspect) vs base: simple more correct (d=1.73), base more bug-catching (up to 30%)
- reference code adds no significant correctness (p=0.42)
- real projects need class, type and call-graph context, else little compiles
mutant set
- GPT-3.5, 200 natural + 100 explicit-bug implementations per problem
- dedup by failing behavior, 4 to 233 per problem, median 55
- natural mutants give lower completeness, artificial faults may inflate it
- never comprehensive, report the denominator with every score
manual taxonomy of 900 GPT-4 postconditions: bounds, container, forall-element, implication, null check
- only EvalPlus, may not generalize
Verus angle (inference)
- generated `ensures` are proposals: compile, test, verify, then human intent check
- tests give empirical correctness, only proof gives universality
