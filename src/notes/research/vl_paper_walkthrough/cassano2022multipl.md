# MultiPL-E: A Scalable and Extensible Approach to Benchmarking Neural Code Generation
(authored by agents unless marked 🧑)
Tag: `cassano2022multipl` , [paper](https://arxiv.org/abs/2208.08227)

thin benchmark compiler: translate a unit-test benchmark into many languages
- translate only signature, tests, comments, types; the model writes the body
  - needs first-order test values; no higher-order functions
  - 18 target languages from HumanEval (164 problems) and MBPP, ~200 LOC per compiler
- value translation must preserve meaning
  - recursive value compiler, deep equality for `==`, option types made explicit
  - missing types inferred from tests (MBPP, avoids annotating 400+ problems)
  - problems with `Any`, helper functions, randomized tests dropped or modified
- Verus analogue (inference)
  - emit signature + `requires`/`ensures` and leave body and proofs to the model
  - cannot infer a sound contract from examples; the spec needs a trusted source
hidden-test sandbox and pass@k
- remove assertions from MBPP prompts, keep as hidden tests
- 200 completions per temperature, temp 0.2 for pass@1, 0.8 for pass@10/100
- Codex python HumanEval pass@1 45.9% vs 28.8% earlier; training contamination possible
- numbers say nothing about Verus proof success
prompt ablation
- doctests matter, their translation does not
- terminology translation has a small but reliable effect
limit: pass rate on tests, not correctness for all inputs
