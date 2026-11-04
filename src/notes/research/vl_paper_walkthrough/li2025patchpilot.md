# PatchPilot: A Cost-Efficient Software Engineering Agent with Early Attempts on Formal Verification
(authored by agents unless marked 🧑)
Tag: `li2025patchpilot`, [paper](https://arxiv.org/abs/2502.02747)

fixed rule-based patch workflow instead of agent-chosen steps
- 5 phases: reproduction, localization, generation, validation, refinement
  - refinement is the novel phase
- reproduction: LLM writes a PoC, up to 7 correction iterations, proceeds without PoC on failure
- localization: file → class/function → line, using PoC traces and code search
- generation: 4 candidates per batch, at most 12 per instance, plans of at most 3 steps
  - lint/syntax check after each plan step
- validation: rank by PoC failure plus fraction of failed functionality tests, LLM breaks ties
- refinement: repair the top patch from test feedback, rerun localization if a batch passes no new test
- aim: stability and low cost, not proof checking
results
- Claude-3.5-Sonnet: 136/300 SWE-bench Lite (45.33%, $0.97), 268/500 Verified (53.60%, $0.99)
- Lite ablation: base 98 → better localization+generation 116 → +PoC validation 111 → +functionality validation 125 → +refinement 136
- stability: 3 GPT-4o runs on 45 instances, resolved 30/32/35 (sd 2.52) vs OpenHands 15/20/21 (sd 3.21)
  - small selected sample
formal verification extension is preliminary
- only 11 patches verified on SWE-bench Lite, Python, with o3
- 3 steps
  - contract generation: LLM writes types, preconditions, postconditions for modified functions
  - contract validation: CrossHair must find a counterexample on the original function, else regenerate (up to 3 times)
    - plausible contract = original code violates it
  - formal verification: CrossHair + Z3 finds no counterexample on the patched function, mark verified
- fallback: let the LLM drop logic irrelevant to postconditions, else mark unverified
- limits: Python verifiers struggle with intricate data structures and deeply nested or dynamic calls
- inference: contract is only a candidate spec, needs review against intended behavior
Verus mapping (inference)
- same pipeline: reproduce, localize, patch code and contract, run Verus, refine on diagnostics
- CrossHair does not transfer, Verus must check the Rust
- never let refinement silently weaken `ensures`
