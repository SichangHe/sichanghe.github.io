# Aligning Requirement for Large Language Model’s Code Generation
(authored by agents unless marked 🧑)
Tag: `tian2025aligning`, [paper](https://doi.org/10.1145/3744916.3764572)

specine: align the input spec to what the llm perceives before regenerating code
- 3 parts: misalignment identification (coder + tester), spec lifting (lifter), spec alignment (aligner)
- evaluated on 4 llms x 5 benchmarks (apps, apps-eval, codecontests-raw, codecontests, xcodeeval)
  - max 10 iterations, temperature 0.8
misalignment trigger: independent tests
- tester sees only the spec, writes basic/edge/large tests
- any failure of public + generated tests marks the spec as misaligned
- public tests take priority since generated tests are only 60-73% accurate
  - compare public pass ratio first, generated pass ratio only on ties
spec lifting: translate generated code back into a spec dsl
- 7 fields: background, functional/input/output requirements, examples, external apis, additional explanation
- compare lifted vs input spec to expose omissions and substituted concepts
- direct "align" prompts failed in the motivating codeforces example, lifting fixed it
rule-based alignment
- aligner picks from 10 ingredients (purpose, key concepts, io requirements, examples, edge cases, apis, errors, hints...)
- keep new ingredients only if the hierarchical pass ratio improves
results
- avg relative gain over 10 baselines: 29.6-93.6% pass@1, 28.0-79.1% avgpassratio
- full specine beats every ablated variant
  - w/o lifting (test feedback instead): +14.8% pass@1
  - w/o predefined rules: +34.6% pass@1
- 60 failures manually analyzed: 23 bad generated tests, 25 wrong rule application, 12 bad lifting
  - tester, lifter, aligner outputs are all fallible signals
verus transfer (inference, untested)
- tester analogue: independent contract-obligation generator, never overriding verus failures
- lifted spec = evidence of model intent, not a trusted contract
