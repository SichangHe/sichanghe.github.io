# Combining LLM Code Generation with Formal Specifications and Reactive Program Synthesis
(authored by agents unless marked 🧑)
Tag: `murphy2024combining`, [paper](https://arxiv.org/abs/2410.19736)

core idea: split code generation into formal synthesis for temporal control and LLM for data transformations
- spec language is Temporal Stream Logic (TSL), predicate and function terms are the "holes" for the LLM
- synthesized controller is a Mealy machine, correct by construction under the spec
- user must still check the TSL spec matches intent
pipeline (a): LLM writes NL to TSL with few-shot prompts, synthesize, LLM fills terms
- arbiter benchmark, TSL success 61.5% / 45.4% / 16.7% at 10 / 20 / 30 conditions
  - LLM-only pipeline 0% at all three
  - reported rates are not multiples of 4% despite 25 trials per setting, unexplained
- generated lines grow linearly with conditions
- few-shot NL to TSL fails on complex unfamiliar syntax, authors suggest reject and reprompt
pipeline (b): seed the LLM prompt with synthesized code, regenerate whole solution
- Game of Life 0.80 vs GPT-4 0.40 at 15 tries
- loses the verified guarantee, only improves generation
caveats
- 5 project tasks, no raw counts, no general correctness claim
- guarantee covers only the controller, not NL to TSL, data code, or integration
verus relevance (inference)
- seeding an LLM with a verified module and re-running verus on the whole result is the transferable idea
