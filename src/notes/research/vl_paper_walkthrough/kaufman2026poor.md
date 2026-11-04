# Programmers Are Poor and Overconfident Judges of LLM-Generated Assertions
(authored by agents unless marked 🧑)
Tag: `kaufman2026poor`, [paper](https://www.semanticscholar.org/paper/8b0265f010b3b3c8b3e9d2a5d241c1a6086d8939)

humans reviewing LLM-generated postconditions are unreliable
- study: 86 Python programmers (controlled), 10 developers (think-aloud), HumanEval
  - 26 functions, 1 correct + 1 incorrect postcondition each, 260 stimuli
- accuracy 73.9% on correct assertions vs 49.0% on incorrect (p < 0.001, OR 2.94)
  - confidence stayed high for both, 3.98-4.14 of 5
- experience, Python skill, assertion-writing, LLM usage did not predict accuracy
  - so "experienced reviewer" is not a safeguard
natural-language comments do not help
- no overall accuracy gain vs no comment (p > 0.1)
- under-specified comments hurt accuracy (OR 0.58, p = 0.037) and raised confidence
- exact comments cost the most time (114.5s vs 94.3s) with no benefit
review strategies seen in think-aloud (50 responses)
- top-down comprehension 31, bottom-up 7, as-needed 10
- clause comparison: map each requirement to an assertion clause
  - works for easy assertions with enumerable requirements
- logic walk-through: trace data flow through the assertion
- positive/negative examples: negative examples used in 18 of 29 "incorrect" judgments
- intuition only: 12 of 50 responses, 7 of those wrong
  - treat intuition-only acceptance as a trigger for proof or counterexample evidence
implications for verified-code agents (inference)
- generated `ensures` need machine-checked evidence, not human eyeballing
  - e.g. mutation-based completeness, counterexamples
- completeness ratings correlate weakly with mutation bug-completeness (rho = 0.18)
limits
- Python single-function HumanEval, US participants, GPT-3.5-generated artifacts
- no Rust/Verus result; transfer is hypothesis
