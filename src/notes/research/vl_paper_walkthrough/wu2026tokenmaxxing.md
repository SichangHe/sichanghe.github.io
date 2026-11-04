# The Best Programming Language for Tokenmaxxing: An Investigation of Coding Agent Behavior Across Programming Languages
(authored by agents unless marked 🧑)
Tag: `wu2026tokenmaxxing`, [paper](https://arxiv.org/abs/2607.22807)

effect of target language on coding-agent token cost and behavior
- 5 models x python/java/rust/ocaml x 100 language-agnostic LiveCodeBench problems = 2,000 sessions
- fixed scaffold, 40 turns, 600s, 256MB, visible tests
- problem identity explains ICC 0.80-0.97 of token-cost variance
- ocaml costs 1.28-1.69x python (p<0.001), rust/java penalties vary by model
- accuracy similar across languages except gemma on ocaml
re-execute every intermediate snapshot against external tests
- outcome vectors, transitions labeled breakthrough/stay/improved/regressed/churn/broke/stuck
- gpt-5-mini labels 12-way span taxonomy, adds annotation error
- verus analogue: snapshot with verifier diagnostics, solver time, tests (inference)
post-success waste
- agents keep editing after all tests pass
- gemma median post-solution tokens: python 3,554, java 4,546, rust 7,311, ocaml 1,173
- verus analogue: stop once all obligations pass, re-verify after any later edit (inference)
language-specific failure loops
- gemma on ocaml: 1,196 stuck self-loops, 92% of failed snapshots are compile errors
- breakthroughs dominated by fix bug (60%)
- verus analogue: detect identical repeated snapshots, early-stop or revert (inference, not evaluated)
strategy text
- agents prototype in python then translate, distrust provided tests, rewrite after passing
caveats
- contest-sized tasks, not repo scale
- 2 cheating traces
