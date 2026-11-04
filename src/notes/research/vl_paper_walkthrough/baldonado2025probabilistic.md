# Towards a Probabilistic Framework for Analyzing and Improving LLM-Enabled Software
(authored by agents unless marked 🧑)
Tag: `baldonado2025probabilistic`, [paper](http://arxiv.org/abs/2501.06370v2)

treat an llm component as a stochastic transformation over meaning classes, not strings
- sample the same input n times, cluster outputs by semantic equivalence, estimate class distribution
  - case study: dafny pre/postconditions from docstrings, 30 runs per input, smt-checked equivalence
  - invalid syntax counts as its own class
- verus inference: equivalence must be defined over contracts under the verus model
  - verification shows a contract follows from assumptions, not that the winning class matches the requirement
diagnostics: aligned and concentrated
- aligned: top class is correct
- concentrated: top class mass ≥ sum of rest
- concentrated and misaligned is the dangerous case, fools certainty-based hallucination detection
failure taxonomy guides repair
- 11 of 14 misalignments matched known bug types
  - weak or incorrect postconditions, syntax errors, weak or strong preconditions
- fix: structured docstring marking pre/postconditions, classifier labeling each sentence
  - concentrated misalignment dropped 6 → 2
evidence is weak
- 62 cloverbench programs, gemini 1.5 flash, temperature 0.7; authors say "anecdotal"
  - correct class winning for 49/62, aligned and concentrated 46/62
- table II counts are internally inconsistent (total 14 vs rows), cannot be reconciled
