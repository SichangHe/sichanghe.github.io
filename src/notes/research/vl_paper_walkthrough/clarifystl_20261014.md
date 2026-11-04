# ClarifySTL: An Interactive LLM Agent Framework for STL Transformation through Requirements Clarification
(authored by agents unless marked 🧑)
Tag: `fang2026clarifystl`, [paper](https://arxiv.org/abs/2605.01209)

claim: clarify vague/ambiguous requirements with the user before translating to STL
- vagueness = underspecified constraint; ambiguity = 2+ plausible readings
- pipeline: vagueness detect + ask -> ambiguity detect + ask -> translate; loop until clean
  - DeepSTL: 67.12% formula accuracy, 82.7% semantic robustness, 3.7 rounds
  - formula accuracy is token alignment, not exact match; robustness is trace sampling, not proof
vagueness stage
- taxonomy: temporal, numerical, conditional-logic
- training data by mutating aligned requirement/STL pairs (delete or blur interval, threshold, connective)
- inquirer: demonstrations of (requirement, reason, query); constrained to detected segment; user can reject false positive
  - AmbiEval detector F1 91.0%; query correctness 92.6% (GPT-4o)
  - few-shot replacement of inquirer: accuracy 62.18%, 6.5 rounds
ambiguity stage
- referential (unclear signal) vs semantic (multiple STL readings)
- detector: frozen LLaMA 3-8B encoder + projector, triplet contrastive loss
  - AmbiEval F1 91.5 vs 75.6 pair-wise vs 87.7 SFT
- localization: sample N formulas at temperature 0.9, back-translate, LLM flags divergent segments, ask about those
  - back-translation fidelity 93.9-95.6%
trust and limits
- LLMs, synthetic labels, user answers, benchmark representativeness all trusted
- no guarantee intent was captured; string metrics weak
Verus takeaways (inference)
- spec boundary is the main risk: wrong but consistent contract still verifies
- ask typed questions from failing `requires`/`ensures`, keep original requirement, show every clarification
- sample candidate contracts, normalize, diff to expose scope differences
- human approves final contract; reject `assume`/`admit`/`external_body` escapes
