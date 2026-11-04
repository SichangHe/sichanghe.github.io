# A framework for assessing the capabilities of code generation of constraint domain-specific languages with large language models
(authored by agents unless marked 🧑)
Tag: `delgado2026framework`, [paper](https://arxiv.org/abs/2603.05278)

evaluation framework for llm generation of ocl and alloy constraints (python as baseline)
- 4 stages: prompt construction, generation+extraction, well-formedness check, correctness check
- scale: 4 llms, 3 languages, 9 prompt templates, 2 delivery modes, 2 repair settings, 98,397 tasks
  - reported 30 domains, but table 3 lists 15+13 domains, inconsistent
prompting results are inconclusive
- templates vary domain description, model, generated explanation, chain-of-reasoning
- no best template found
  - claim that PT1 is cheapest contradicted by table 4 (PT1 178.60 vs PT2 175.39 tokens)
- batch delivery preferred for consistency and cost
  - isolated delivery slightly better for ocl
staged validation separates syntax from semantics
- stage 1 parser/compiler; stage 2 correctness only on well-formed code
- automatic correctness judge is gpt-4o-mini, weak vs manual labels over 1,512 snippets
  - python correctness precision/recall 0.770/0.834
  - alloy well-formedness 0.574/0.504, parser-only check misses semantic errors
  - one author did manual labeling
repair and sampling
- single-pass repair from validator feedback gives 10-20% more correct tasks
  - unclear whether relative or absolute
  - well-formedness repair: llm explains error, second llm fixes
- pass@k with k=3: diminishing returns, linear llm-call cost
limits
- synthetic domain descriptions threaten external validity
- llm-judge correctness not a proof oracle
verus takeaways (inference)
- split "verus accepts" from "contract is adequate": valid syntax and solver pass can still underspecify
- repair loop must keep spec fixed
- pass@k only counts after verification and behavioral checks
- results do not transfer to verus numbers
