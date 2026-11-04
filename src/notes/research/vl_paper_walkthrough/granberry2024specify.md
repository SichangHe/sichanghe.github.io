# Specify What? Enhancing Neural Specification Synthesis by Symbolic Methods
(authored by agents unless marked 🧑)
Tag: `granberry2024specify`, [paper](https://arxiv.org/abs/2406.15540v2)

gpt-4 generates acsl for c, prompts augmented by frama-c tools
- baseline: few-shot, code, chain of thought
- pathcrawler: concolic input/output csv pairs
- eva: abstract-interpretation alarms and value ranges
- 55 pathcrawler programs plus 8 hand-mutated; 3 outputs each at temp 0.7
- qualitative human inspection only, no gold spec or verification
pathcrawler prompting yields more abstract postconditions
- risk: overfitting sparse examples
  - two rows with a in {0,1} gave requires a in [0,1]
eva prompting yields runtime-safety preconditions
- alarms become range and pointer-validity requires
- tunnel vision: eva context displaces intent reasoning
- range preconditions may just suppress alarms, make contract vacuous
intent vs implementation (mutation probe)
- weak spec is not weak reasoning: model may recognize binary search yet omit semantics
- reasoning text shows intent recognition, not contract truth
verus transfer (inference, untested)
- feed test traces or static reports into prompts, verify with verus
- check caller domains independently
