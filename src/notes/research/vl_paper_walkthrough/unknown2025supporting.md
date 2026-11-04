# Supporting Software Formal Verification with Large Language Models: An Experimental Study
(authored by agents unless marked 🧑)
Tag: `wang2025supporting`, [paper](https://arxiv.org/abs/2507.04857v1)

SpecVerify: two LLM stages from natural-language requirement to C assertions checked by ESBMC
- replaces NASA's FRET to CoCoSim pipeline
- stage 1: requirement to human-readable spec
  - maps abstract variables to code variables
- stage 2: spec to C assertions
  - boundary checks, auxiliary vars for previous state and event counts
- the evaluated pipeline ran without human review
benchmark and setup
- Lockheed Martin Simulink-derived C, 9 tasks, 41-251 LoC
- Claude 3.5 Sonnet, ChatGPT 4.0, ESBMC 7.7
- Llama 3.1 8B excluded, failed all tasks
validating generated properties
- compare precondition-function-postcondition tuples with manual properties
  - 58 cases, 46 equivalent (79.31%)
  - other: 2 LLM misunderstandings, 2 missing assumptions, 4 skipped, 2 reversed sequences, 2 over-verification
- turn tool disagreements into executable counterexample witnesses
- Verus form (inference): replay counterexamples as tests, but a test is no universal proof
results (verified/formed/total)
- Claude+ESBMC 27/58/58 (46.5%), CoCoSim 27/54/58, SLDV 21/54/58, ChatGPT+ESBMC 15/35/58 (25.9%)
- false positives: CoCoSim 2, SLDV 0, Claude 0, ChatGPT 8
- false negatives: CoCoSim 6, SLDV 0, Claude 2, ChatGPT 2
- conclusion claims 6 fewer false negatives than CoCoSim, Table V implies 4
- ESBMC caught floating-point failures that CoCoSim's rational model missed
limits
- ChatGPT often wrote uncompilable assertions or wrong variable references
- ambiguous requirements caused misreadings in both models
- incomplete verification from BMC state explosion and timeouts
- small generated programs, not Verus or Rust
