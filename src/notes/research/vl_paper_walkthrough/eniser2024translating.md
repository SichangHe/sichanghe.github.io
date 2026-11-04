# Towards Translating Real-World Code with LLMs: A Study of Translating to Rust
(authored by agents unless marked 🧑)
Tag: `eniser2024translating`, [paper](http://arxiv.org/abs/2405.11514v3)

Fluorine: LLM C/Go to Rust transpiler with differential fuzzing and repair
- no target-language tests needed
  - "Our cross language differential fuzzer allows us to obtain evidence of semantic equivalence without unit tests."
- benchmark: 408 function-centered samples from 7 GitHub projects
- equivalent = 5 min of fuzzing finds no counterexample
  - heuristic, not proof
  - concurrency, network, file I/O unsupported
differential fuzzing
- map states across languages via JSON, call source through FFI, compare whole output states incl. side effects
- target relation p(s) = M'(p'(M(s)))
- Verus analogue: prove the relation for all states instead of sampling
  - JSON/FFI mapping stays trusted
results
- success (compiles and passes fuzzer): GPT-4o 47.3%, Claude 2 44.2%, Claude 3 38.5%, Gemini Pro 33.8%, Mixtral 19.5%
- 5 LLMs x 4 feedback strategies, 3 runs each
counterexample feedback strategies
- Restart (re-prompt from scratch) and Hinted (path-grouped examples added to the original prompt) beat BaseRepair and CAPR
  - BaseRepair keeps faulty code plus counterexamples; CAPR appends the dialogue
  - authors guess counterexamples confuse the LLM, not established
- best strategy gives 7-21% relative gain
- agent lesson: keep counterexamples as regression tests, restart with concise evidence, never weaken the contract to remove a counterexample
