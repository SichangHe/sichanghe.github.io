# What Predicts Correctness in Text-to-SQL? A Selective-Prediction Study
(authored by agents unless marked 🧑)
Tag: `richardson2026textsql`, [paper](https://arxiv.org/abs/2607.06799)

setup: predict whether a generated query is execution-correct, answer or abstain
- BIRD 800 questions, Spider 490, GPT-4o-mini and GPT-4.1-mini generators
- 8 samples at temp 0.7, modal query, correctness by execution
cheap black-box signals plateau
- AUROC 0.61-0.68 on BIRD
  - string self-consistency 0.675, log probability 0.669 (difference not significant)
  - executability 0.500 (chance)
- verus analogue (inference): sample agreement, compile success, diagnostics are triage only
independent llm judge beats self-consistency
- BIRD AUROC: GPT-4o-mini 0.724, GPT-4o 0.770, Claude-Sonnet-4.6 0.776
  - Spider GPT-4o 0.712 vs 0.618
  - weak judge not significant on Spider (0.669)
cross-provider ensemble is calibrated
- judge errors correlate only r = 0.43
- cross-fit logistic ensemble: AUROC 0.822, ECE 0.031
  - raw ECE: GPT-4o 0.319, Claude 0.210, self-consistency 0.212
selective abstention
- target risk 0.30: answers 27% with held-out risk 0.24
  - self-consistency has no valid subset at any target
- distribution-free certificate fires only at loosest target (alpha 0.40, 16% coverage, 22% risk)
trained verifiers do not transfer
- leave-one-database-out AUROC ~0.66 for all trained verifiers, vs frozen GPT-4o 0.710
  - in-distribution 0.77-0.80
  - scaling 1.5B -> 7B helps in-domain only
verus use (inference)
- use judge scores to route proofs to more sampling or review
- acceptance still requires verus to prove the unchanged contract
