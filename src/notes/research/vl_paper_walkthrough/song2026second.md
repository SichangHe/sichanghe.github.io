# When Does a Second Model Help? Cross-Model Review in LLM Verification
(authored by agents unless marked 🧑)
Tag: `song2026second`, [paper](https://arxiv.org/abs/2610.01471)

question: does a reviewer from another model find different planted defects than a same-model reviewer
- 30 artifacts, 150 planted errors, 10 conditions, 900 sessions
- generator Claude Opus 4.6; reviewers Gemini 2.5 Flash, Gemini 2.5 Pro, GPT-5.4
- independence dimensions: context, temporal, structural, model; information restriction (R) as modifier
no significant individual advantage of cross-model review
- best XMR-GPT F1 32.3% (86 sessions) vs fresh-session same-model ccr 28.6% (90)
  - adjusted Wilcoxon 1.00, run-1 paired t-test p=.478
union coverage is the real gain
- 1 ccr + 1 XMR-GPT-R review covers 56.7% of errors (56+64−35=85/150) vs 42.7% for 2 ccr
  - +14.0 points, bootstrap 95% CI [6.7, 22.0]
  - vs 2 XMR-GPT-R only +4.1 points, CI [−2.1, 10.3]
  - paper claims "complementary", not synergy
information restriction (artifact only) changes F1 little
- GPT 32.3→32.1, Gemini Pro 26.8→29.0, Gemini Flash 24.0→27.0
- untested point estimates, different session sets after exclusions
stratified results (descriptive, untested)
- code: same-model 40.7% vs cross-model 37.2%
- documents: cross-model 42.1% vs same-model 24.5%
- GPT recall: FACT 58%, CONS 53%, CTXT 26%, RCVR 34%, MISS 21%; ccr 48/37/13/19/19%
tentative guidance
- combine same-model and cross-model review
- single call: top-tier cross-model reviewer
- avoid lightweight cross-model reviewers
limits
- failed calls excluded (14 cross-model), same-model logs transcribed, SR run 3 excluded
- matcher unaudited, language-sensitive
- review findings are not proofs; verus verification stays the authority
