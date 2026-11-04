# interwhen: A Generalizable Framework for Steering Reasoning Models with Test-time Verification
(authored by agents unless marked 🧑)
Tag: `bhat2026interwhen`, [paper](https://arxiv.org/abs/2602.11202v3)

verify a reasoning trace while it is generated, not just the final answer
- loop: extract state, verify, intervene
- single trajectory, no sampling of many traces
- on violation, roll back to the checked prefix, add feedback, resume
  - >5 corrections (§4.1) gives abstain / "No solution"
- guarantee holds only modulo llm state-extraction errors
state extraction from partial traces
- fork an extractor at step boundaries to fill only the variables the checks need
- verifier returns true / false / unknown
  - missing variables give unknown, not a false violation
- agentic tasks: tool calls and responses are the states
asynchronous checking hides latency
- valid traces pay no verification latency
- exception: side-effecting writes must wait for their check
llm-synthesized verifiers proven against a spec
- frontier llm turns policy text into one verifier per rule plus a state-pattern map
- for strongest assurance emit 3 lean artifacts
  - propositional spec, boolean verifier, equivalence theorem
  - verifier accepted only if the proof succeeds
- human review still needed that spec matches the policy
- verus analogue: `spec fn` policy + checker whose `ensures` states equivalence
  - verus proves a wrong predicate exactly, so keep the spec human-reviewed
layered verifiers: policy, trace-derived, prompt-derived
- τ²-bench telecom (114 tasks), Qwen3-30B solo, `Pass^4`
  - cot 32.17%, +policy 42.11%, +trace 71.10%, +completeness 87.70%
  - tokens vs cot: 100.00%, 116.71%, 97.37%, 96.93%
- trace analysis exposed a policy ambiguity ("exactly 2GB" vs "at most 2GB")
- trace-derived check is evidence of a missing requirement, not proof of intent
verifier feedback steers the model
- replay with vs without feedback, mean probability of correct answer
  - Maze 0.4892 to 0.8148 (460 events)
  - SpatialMap 0.1256 to 0.2042 (448 events)
