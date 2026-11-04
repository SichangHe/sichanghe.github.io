# Autoformalization with Large Language Models
(authored by agents unless marked 🧑)
Tag: `wu2022autoformalization`, [paper](https://arxiv.org/abs/2205.12615)

LLMs (PaLM, Codex) autoformalize competition math into Isabelle/HOL; not Rust or Verus
- Codex: 38/150 (25.3%) perfect on sampled MATH problems, human judged
- expert iteration lifts MiniF2F test 29.9% to 35.2% (valid 28.3% to 37.3%), over prior SOTA 29.6%
few-shot translation
- prompt: 2 random example pairs for case studies, greedy decoding, no tuning
- BLEU: Codex 57.13 algebra, 43.33 number theory; PaLM 8B 31.49, 22.10; larger PaLM better
- 3,363/3,908 outputs syntactically correct
- an example matters: Codex invents `linear f` without a relevant example
- Verus: pair English requirements with verified contract skeletons, keep only outputs that verify
failure analysis of the 150
- main cause: informal/formal definition misalignment (46 cases)
- others: wrong application 35, incomplete/unclear 26, missing assumptions 26, syntax/type 20, missing definition 15
  - categories overlap, sum 215
- Verus: report generated, type-checked, verified, and human-semantic-reviewed rates separately
expert iteration with proof checker
- formalize statements, prover (700M GPT-2 style, PISA data) proves them, retrain on successes, 2 rounds
  - round 1 proves 782/3,363 (23.3%), round 2 1,011 (30.1%)
- Sledgehammer with 30 s timeout via `<hammer>` token; Isabelle accepts, not model confidence
- cost 3,920 TPU hours
- Verus: need non-vacuous harness, since verification cannot detect a too-weak contract
back-translation
- Isabelle to English: 29/38 (76%) more-or-less correct vs 25% for formalization
- only motivated, not trained
- Verus: back-translate verified contracts so reviewers compare with the requirement
limits
- hard: logical gaps, implicit context, definition alignment
- large theories exceed context windows
