# AutoCodeRover: Autonomous Program Improvement
(authored by agents unless marked 🧑)
Tag: `zhang2024autocoderover`, [paper](https://doi.org/10.1145/3650212.3680384)

issue-fixing agent that navigates code as AST, not files
- stratified AST search
  - APIs: `search_class`, `search_method(_in_class/_in_file)`, `search_code(_in_file)`
  - class search returns signatures only; code search ±3 lines; keeps context short
  - each stratum's results become arguments of the next
  - LLM judges sufficiency, then emits buggy locations
- patch agent
  - gets issue, locations, full retrieval history
  - must produce applicable diff; lint for indentation; up to 3 retries
  - GPT-4 `gpt-4-0125-preview`, T=0.2
- SBFL option
  - method-level, top-5 suspicious methods given as hints, not replacing search
  - test validation loop reruns patch agent up to 3 times
results (SWE-bench)
- lite (300): @1 19%, @3 26%, SBFL 22%
- full (2,294): @1 12.42%, @3 17.96%
- 51/78 = 65.4% of plausible lite @3 patches manually judged correct
- cost on lite: @1 195s, 37k tokens, $0.43
Verus relevance (inference)
- index Rust modules/fns, return signatures first, bodies on demand
- replace SBFL with verifier-diagnostic localization
- validate with `cargo verus` plus regression tests
