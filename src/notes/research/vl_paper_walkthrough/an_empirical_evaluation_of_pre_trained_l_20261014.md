# An Empirical Evaluation of Pre-trained Large Language Models for Repairing Declarative Formal Specifications
(authored by agents unless marked 🧑)
Tag: `alhanahnah2025empirical`, [paper](https://arxiv.org/abs/2404.11050v2)

setup: LLM repair of faulty Alloy specs with the Alloy Analyzer as verifier
- 12 settings: single-agent and dual-agent, 4 LLMs (GPT-4-32k, GPT-4-Turbo, GPT-4o, GPT-3.5-Turbo), 3 feedback levels
- data: ARepair (38 specs) and Alloy4Fun (1,936 specs, GPT-4o on a 357 subset)
- up to 6 iterations, Correct@k metric, temperature 0.2
repair loop
- Repair Agent proposes full spec, analyzer checks, failure feedback goes into the next prompt
- guards: reject candidate identical to original, parse or re-request malformed JSON
- accepted only when consistent and all assertions valid
dual-agent auto-feedback
- Instructor Agent turns analyzer report into at most 2 sentences of repair advice
- separate context from the Repair Agent
feedback levels
- none: fixed "did NOT fix the bug"
- generic: templated analyzer errors, counterexamples, instances
- auto: Instructor-generated
results
- ARepair: GPT-4o and GPT-4-Turbo auto-feedback repair 28/38, GPT-3.5-Turbo 18/38 (47.4%) vs 4/38 with no feedback
- Alloy4Fun: GPT-4o auto 201/357 (56.3%), GPT-3.5-Turbo auto 278/1,936 (14.3%)
- auto does not uniformly beat generic
  - GPT-4o generic repaired 206/357 vs auto 201/357
  - paper attributes this to stochasticity
- cannot separate feedback content from adding an agent
caveats
- printed 73.4% for 28/38 should be 73.7%
- counts inconsistent: 1,936 vs 1,938 models, 106,596 attempts is a budget product
- overconstrained/underconstrained labels not independently verified
- possible training-data leakage, static Alloy only
- passing supplied assertions does not show they encode intended behavior
Verus transfer (inference)
- feed Verus diagnostics into the next prompt, second agent summarizes them, keep original diagnostics
- accept only machine-checked verification plus tests
- report repaired obligations over the exact denominator, plus cost
