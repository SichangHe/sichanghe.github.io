# Proving the Coding Interview: A Benchmark for Formally Verified Code Generation
(authored by agents unless marked 🧑)
Tag: `dougherty2025fvapps`, [paper](https://doi.org/10.1109/llm4code66737.2025.00014)

fvapps: apps interview problems as lean 4 `def` plus theorems with `sorry`, model fills all
- 4,715 samples (unguarded), 2,089 guarded, 1,083 guarded and plausible
  - unguarded = valid theorem statements only
  - guarded = solution passes unit tests
  - plausible = theorems also pass lean Plausible pbt, no llm call
- statements not trusted specs: vacuous or inapplicable theorems remain possible
  - plausible is a filter, not a proof
staged curation pipeline
- llm writes python pbt, pytest must pass, then llm writes lean theorems typechecked with `sorry`, then unit tests, then Plausible
- at most 5 llm attempts per stage, 10 for the unit-test stage
verifier-scaffolded agent loop
- run `lake build` in a pinned env, send full stdout/stderr/return code back for repair
- solve the definition first, then append and prove each theorem independently
- prompt with env differences from pretraining and multiple examples (higher success, no numbers)
baseline on 101 problems: claude 3.5 sonnet vs gemini 1.5 pro
- theorems completed: sonnet 121/406 (30%), gemini 74/406 (18.5%)
- sonnet solved many via `Id.run do`, which hides inductive structure needed for proofs
- one human sample: 10 hours, definition plus no nontrivial proofs, so no full human baseline
verus transfer (inference)
- verus as final oracle, rust tests as filter, pinned toolchain
- solve executable code first, then one contract or lemma at a time
