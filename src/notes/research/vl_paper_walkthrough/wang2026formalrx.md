# FormalRx: Rectify and eXamine Semantic Failures in Autoformalization
(authored by agents unless marked 🧑)
Tag: `wang2026formalrx`, [paper](http://arxiv.org/abs/2607.04655v1)

turns autoformalization checking from binary verdict into diagnosis
- 4 outputs: aligned/misaligned, error category, error location, corrected statement
- 28-category taxonomy, 3 dimensions: semantic, constraint, implementation
  - specific category beats location-based fallback (e.g. connective error over generic conclusion error)
  - implementation categories are Lean-specific
- taxonomy from ~2000 manually reviewed misaligned pairs
data pipeline
- 17,825 aligned seed pairs (MiniF2F, ProofNet excluded for known alignment issues)
- LLM injects one error per applicable category, ~70k candidates
- drop Lean compile failures, so only semantic errors remain
- second LLM re-tags, 52,521 kept
- one model fine-tuned to emit all 4 fields in one pass
results
- in-distribution 8B: verdict F1 0.881, category F1 0.709, localization 0.750, correction 0.729
  - baselines zero-shot, so comparison is asymmetric
- out of domain, verdict only: ConsistencyCheck F1 0.596 vs Qwen3-8B 0.565
  - verdict F1 sensitive to class priors
limits
- taxonomy coverage not provably complete
- trusts error-injecting LLM, re-tagging LLM, LLM judge for non-exact matches
takeaway for Verus
- vocabulary for spec mismatches: vacuous `ensures`, missing `requires`, wrong quantifier domain, wrong loop `invariant`
- collect real Verus failures before adding Verus-specific categories
- correction is only a proposal until Verus accepts it and a human confirms intent
