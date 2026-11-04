# SciCoQA: Quality Assurance for Scientific Paper-Code Alignment
(authored by agents unless marked 🧑)
Tag: `baumgartner2026scicoqa`, [paper](https://arxiv.org/abs/2601.12910)

task: find semantic conflicts between a paper's method and its repo code
- discrepancy must alter scientific logic, protocol, or math
  - excludes ordinary bugs, configurable hyperparameter defaults, numerical-stability tweaks
- type: Difference, Paper Omission, Code Omission
- category: Algorithm, Model, Loss, Evaluation, Data, Training
- 635 discrepancies: 92 real (72 papers), 543 synthetic (204 papers)
  - real: 42 from github issues, 50 from reproducibility reports
  - synthetic: GPT-5 generated code diffs, 286 CS and 257 other computational domains
data validation
- real: LLM filter, manual filter, then Gemini 3.1 Pro and GPT-5 validate, manual check on disagreement
- synthetic recall correlates with real recall (r = 0.94 over 22 models)
  - GPT-5 gets inflated synthetic recall since it generated them
  - use real subset for absolute numbers, synthetic for relative comparison
main result: recall is low
- best models (Gemini 3.1 Pro, GPT-5 Mini) detect 46.7% of real discrepancies
  - GPT-5 reaches 70.0% on synthetic
- longer inputs, lower recall
  - median paper+code 56,903 tokens, 73/276 papers over 100k
- paper omissions are hardest (50% of reproducibility cases)
  - code has many details the paper legitimately omits, so no reference to compare against
- code-only ablation drops real recall by 19.2 points on average
  - so detection depends on cross-modal comparison
- precision of unmatched predictions: 94.1% (Gemini 2.5 Pro), 85.7% (GPT-5), 67.0% (GPT-OSS 20B)
  - small sample, 224 predictions from 20 papers
judge: GPT-OSS 20B, F1 87.5% against 1,039 human annotations
- missed discrepancy gives false assurance, so recall matters more than precision
verus relevance (inference)
- a passing proof does not show the spec is complete
  - an omitted requirement is absent from the contract, so verus cannot catch it
- keep an independent requirement set for recall
- code-only ablation tests whether a requirement is recoverable from code alone
