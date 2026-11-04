# Reliable Use of Lemmas via Eligibility Reasoning and Section-Aware Reinforcement Learning
(authored by agents unless marked 🧑)
Tag: `xu2026reliable`, [paper](http://arxiv.org/abs/2602.00998v1)

RULES: judge a candidate lemma in two ordered sections before applying it
- section 1: precondition check -> l_pre
- section 2: conclusion-utility check -> l_con
- usable = l_pre AND l_con
- targets models importing conclusions while ignoring assumptions
  - e.g. lemma needs bi-invariant metric, statement has only left-invariant
section-aware GRPO: loss mask only the wrong section
- precondition right but final wrong -> only the conclusion section is penalized
- malformed output gets -2 format penalty
- negligible overhead
training data: minimal perturbations that falsify a lemma precondition
- removing them keeps in-domain scores but collapses robustness: 19.1 vs 87.8 on perturbation test
evidence: 4 models (DeepMath-1.5B, OLMo-2-7B, Qwen2.5-Math-7B, Llama-3.1-8B), SC@7
- Qwen in-domain: 88.2/85.8/81.3/92.7 vs vanilla 63.9/71.9/55.5/55.8
- Qwen perturbation test: 87.8 vs 71.9 vanilla, 73.1 for two-section-onetime
- end-to-end: roughly on par with single-label GRPO, sometimes worse on competition/inequality tasks
  - strict gating may trade recall for safety
- only 100 sampled perturbations per split validated (90% and 95% pass)
limits
- judges lemmas only, not proofs, no soundness guarantee
- conclusion labels are strategy-dependent
verus transfer (inference)
- prove precondition before calling a lemma, verifier discharges it, model rationale is not evidence
- on failure, regenerate only the failed proof fragment
