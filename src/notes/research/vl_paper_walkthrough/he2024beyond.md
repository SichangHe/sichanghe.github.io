# Beyond Code Generation: Assessing Code LLM Maturity with Postconditions
(authored by agents unless marked 🧑)
Tag: `he2024beyond`, [paper](https://arxiv.org/abs/2407.14118)

benchmark: LLM writes postconditions (assertions over `return_val`) for EvalPlus problems
- 164 problems, 1,293 buggy mutants (~8 per problem)
  - mutants inserted by Gemma-7b-it and Mistral-7B-Instruct at temp 0.9
  - kept only if they fail tests, deduped by identical failure pattern
    - same failures ≠ semantic equivalence
- metrics, keep denominators separate
  - Coverage@k, CPC: over problems
  - BDR: over mutants
  - BCR: over problems, all bugs detected
- postcondition correct = holds on legal test inputs, not verified
  - no deductive proof of generated postconditions
  - Verus adaptation: `ensures` checked by Verus, mutant violation vs unresolved proof failure must be separated
taxonomy of 10 postcondition categories, mapped to maturity levels 0-4
- categories: type, NULL, boundary, equality, arithmetic bounds, boolean, string format, container element, container property, other
- no numeric thresholds for levels
  - level 4 on this benchmark ≠ complete specs for stateful or concurrent code
prompting
- few-shot beats zero-shot by a lot (Gemma-7b-it)
  - C@1: 47.44% zero-shot, 98.54% one-shot, 99.76% three-shot
  - CPC: 117, 164, 164 of 164
- category-specific prompts + keyword filter + manual review
  - category-based BCR 18.90 / 31.72 / 29.88%, BDR 60.23 / 72.31 / 75.56% (Gemma-7b-it, Gemma-v1.1-7b-it, Mistral-7B)
  - combined with three-shot: BCR 34.15% (Gemma-v1.1), BDR 77.42% (Mistral)
- prompt rule: no "and" in an assertion, split into atomic parts
limits
- only small open models, relies on few-shot examples, taxonomy may miss cases
- mutation score depends on mutant diversity, cannot show full behavior coverage
