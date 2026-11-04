# Errors are Useful Prompts: Instruction Guided Task Programming with Verifier-Assisted Iterative Prompting
(authored by agents unless marked 🧑)
Tag: `skreta2023errors`, [paper](https://arxiv.org/abs/2303.14100)

clairify: verifier-in-the-loop prompting for data-scarce DSL generation
- no fine-tuning, dsl spec in prompt
- target: xdl (xml chemistry language), plans handed to a task-and-motion planner for robot execution
- loop: generate, verify, regenerate with previous output + errors until pass or timeout (>10 steps = failure)
  - generator is text-davinci-003
  - printed loop condition in algorithm 1 looks mis-stated, prose gives the intended stop rule
what to feed back (ablation, 10 chem-rnd experiments, plan success)
- previous xdl + "not correct, fix errors" only: 0%
- last error list only: 30%
- cumulative errors from all iterations: 50%
- previous xdl + last error list: 100%
  - takeaway: always include the failed candidate with the latest diagnostics
results
- chem-rnd, 108 experiments: clairify 105/108 plans, expert-preferred 75/108
  - baseline synthreader: 92/108, preferred 13/108
- chem-edu, 40 instructions: clairify 40/40, synthreader 0/40
- average verifier passes: 2.58 per chem-rnd plan (max 10), 1.15 per chem-edu plan
verifier is rule-based
- checks xml parse, allowed tags, required/forbidden properties, resources exist in environment
- most caught errors in chem-rnd: 306 missing properties, 174 disallowed properties, 120 wrong tags
- guarantees syntax + known environment constraints only, not semantic correctness
  - plans still contain wrong actions, missing units, vessel reuse
  - only chem-edu plans were run on a real robot, chem-rnd is proof of concept
verus transfer (inference)
- wrap llm candidate with exact source + verus diagnostics, resubmit
- verus stays authoritative, repair may weaken contracts so reject spec changes by policy
