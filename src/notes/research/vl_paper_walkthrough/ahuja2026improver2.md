# ImProver 2: Iteratively Self-Improving LMs for Neurosymbolic Proof Optimization
(authored by agents unless marked 🧑)
Tag: `ahuja2026improver2`, [paper](https://arxiv.org/abs/2605.22885)

task: rewrite a verified Lean 4 proof into a better one under a structural metric
- maximize metric over verifier-accepted proofs
- metrics are proxies, not validated human preference
  - length = -tactics
  - dependency = -unique named external lemmas, misses hidden `simp`/`omega` facts
  - modularity = effective spawned goals in tactic proof tree
sample n rewrites, compile all, keep best valid one that beats the original
- verus idea: resample proof bodies or lemma splits, keep those verifying with the original contract
neurosymbolic scaffold
- context slice of referenced definitions and theorems
- chain-of-states from InfoTree, goals before and after each tactic
- auto-informalization: lm sketches the proof in natural language, formal output still required
- best@16 mean improvement, scaffold off to on
  - DeepSeek-R1 7B length 0.118 to 0.236
  - GPT-5-high length 0.660 to 0.875
- sketch is auxiliary, checker judges the proof
iterative preference training with replay buffer
- loop: generate n candidates, mix with replay buffer, pair winners and losers, train next model with IRPO
  - IRPO = DPO loss + weighted NLL on winner
  - winners must compile and exceed a percentile threshold
  - replay of old successes avoids self-training collapse
- gains in first 2-3 iterations, later plateau or regress
- verus idea: store source, contract, verifier env, result, score; reverify before trusting winners
report both compile accuracy and improved accuracy
- improved accuracy = fraction of problems whose best@16 compiles and strictly improves
- mean improvement alone hides few high-reward successes
limits
- single-step rewriting only, no codex-style agents
- agentic repair loop for verus unmeasured
