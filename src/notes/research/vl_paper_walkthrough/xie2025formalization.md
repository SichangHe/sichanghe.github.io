# FMC: Formalization of Natural Language Mathematical Competition Problems
(authored by agents unless marked 🧑)
Tag: `xie2025formalization`, [paper](https://arxiv.org/abs/2507.11275v1)

FMC: training-free pipeline from NL Olympiad problems to Lean statements
- 6,980 IMOmath problems, geometry removed and subproblems split, 4,798 kept
- output: 3,922 NL problems, 9,787 Lean statements
pipeline
- few-shot translation, several samples per problem (5)
- Lean compile check, proofs left as `sorry`
- backtranslation to NL and model-judged consistency check
- error-feedback retry on compile or consistency failure
results
- compile pass 4,481/4,798 (93.39%)
  - 4,287 first pass + 194 via feedback
- consistency pass 3,922/4,798 (81.74%)
  - 3,631 first pass + 291 via feedback
- 64.46% rated above average by LLM quality check
- cost 161M tokens (22.5M prompt, 138.5M completion)
- 57-item subset reports 91.22%, a different experiment
limits
- consistency judge errs even with DeepSeek-R1
- geometry excluded, resource-limited sampling
- Lean checks the statement, not that it matches the source
takeaway for Verus
- inference: agents can pass Verus against a weakened contract
  - backtranslation and feedback help generate candidate specs
  - they do not replace an independently checked requirement
