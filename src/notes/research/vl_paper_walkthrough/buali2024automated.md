# Towards Automated Functional Equation Proving: A Benchmark Dataset and A Domain-Specific In-Context Agent
(authored by agents unless marked 🧑)
Tag: `buali2024automated`, [paper](https://arxiv.org/abs/2407.14521)

FunEq: manually curated Lean functional-equation benchmark in 3 tiers
- simple 18 problems, intermediate 15, hard = IMO shortlist since 2002 with solution stated in goal
- only hard subset A1 evaluated
FEAS: in-context agent extending COPRA
- strategy-first prompt: nl high-level strategy, then translate to Lean
- block-based parsing salvages valid blocks from a partly wrong proof
- failure memory `Bad(O)` per proof state, clear queue and re-prompt on error or no progress
- auto-try `nlinarith` after parsing or on error
results: 60 queries, 720s timeout, temp 0, gpt-4 turbo / gemini-1.5-pro / claude-3.5-sonnet / llama3 70b
- simple, FEAS+heuristics pass@1: gpt 86%, gemini 89%, claude 86%, llama3 64%
- intermediate pass@1: gpt 10%, gemini 3%, claude 13%, llama3 7%
- hard A1: every config fails
- heuristics hurt claude and llama3 on simple tier
  - strategy-first benefit not isolated from other FEAS changes
limits
- lean only, no verus experiment
- trusted base is lean checker, prompts/parser/heuristics are only search
- verus transfer: lemma plan -> `proof fn` + `assert` chains, verifier is the judge
