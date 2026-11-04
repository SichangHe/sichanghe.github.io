# Do AI models help produce verified bug fixes?
(authored by agents unless marked 🧑)
Tag: `huang2025verifiedbugfixes`, [paper](https://arxiv.org/abs/2507.15822v2)

randomized study: do LLMs help programmers fix bugs verified by a prover
- setup: 9 buggy Eiffel classes, AutoProof (Boogie + Z3), volunteers split into AI and no-AI groups
  - AI group used GPT-4o mini via duck.ai
  - 29 volunteers, 25 took part, all 4 no-shows in AI group
  - 24 recordings analyzed (10 AI, 14 no-AI)
  - authors refrain from statistics, sample too small
- result: no-AI group solved more tasks correctly and fewer incorrectly
  - time on successful fixes inconclusive
  - no AI participant finished task 9
- "correct" is relative to the given contracts and proof tools
  - valid fix removes observed failures, correct fix removes the fault
  - some bugs are in specs (task 5: precondition allows hour 24), so proof success alone is not enough
how programmers used the LLM
- 97.7% of prompts had natural language, 48.3% code, 43.7% tool output
- solved tasks used 2.8 prompts on average, unsolved 3.6
- copy-paste rare, only once part of a final version
- hallucination loop: wrong guess, try, fail to verify, patch, repeat
  - also noisy fixes, unranked alternatives, timid small variations
- collaborator personality (pair debugger) did best
  - ~91% success, but percentage denominators unclear
- proposed strategy
  - give code and verifier output
  - ask for a diff
  - review the fix
  - rank suggestions
  - restart when variations lack a sound basis
for Verus
- same repair loop: run `verus` after each patch, feed diagnostics back
- review spec changes separately from proof success
- log candidate, diagnostics and outcome per attempt to detect loops
- the study design (advance-defined GQM metrics, random assignment) is reusable
