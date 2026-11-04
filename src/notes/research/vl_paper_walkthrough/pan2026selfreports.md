# Self-Reports Are Not Verification
(authored by agents unless marked 🧑)
Tag: `pan2026selfreports`, [paper](https://www.semanticscholar.org/paper/2f7da3a4ac21bb943904d499e447a268553d16af)

LLM self-reports cannot stand in for verification
- testbed: LLM-guided evolutionary search on Contexto, where every valid word gets an exact rank
  - dense grounding grades every intermediate proposal without human labels
- 200 runs, 5 configurations, 3 model families; 12,249 reports, 11,976 gradeable
- report target: is the first graded word in the top 100
- no theorem proved; hosted game and ranking function are trusted
overconfident, and calibration differs from discrimination
- stated vs observed top-100 rate
  - Qwen 47.7% vs 10.0% (4.8x)
  - Gemma 75.3% vs 12.3% (6.1x)
  - Ministral 67.9% vs 7.3% (9.3x)
- Gemma: good Spearman rho -0.450 but bad ECE 0.652
  - "A model may succeed at one while failing at the other"
rationales are not shown to be causal
- replay 754 variation events, swap inherited rationale for unrelated, filler, or none
  - genuine vs unrelated +73 rank, 95% CI [-5, +477]
  - genuine vs none +50 [0, +279]
- only inherited rationales tested, not rationale before action
selection does not improve report quality
- 1,214 selection events: probability-error difference +0.039 (p=0.713)
- 1,018 parent-offspring pairs: correlation -0.023 and +0.057, no transmission
- selection did change search: one target solved 5/5 under fitness vs 1/5 random
- report-off control: no detectable behavior change (25 runs per condition)
inference for Verus agents
- check agent claims with dense external checks (parser, state machine, held-out tests)
  - they prove only the encoded property
