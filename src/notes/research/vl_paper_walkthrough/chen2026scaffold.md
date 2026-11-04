# SCAFFOLD-CEGIS: Preventing Latent Security Degradation in LLM-Driven Iterative Code Refinement
(authored by agents unless marked 🧑)
Tag: `chen2026scaffold`, [paper](https://arxiv.org/abs/2603.08520)

problem: repeated LLM edits drift from the security spec
- GPT-4o, 96 chains, Semgrep: 43.7% of chains exceed baseline vuln count at iteration 10
  - 28.6% even with explicit hardening prompts
- latent degradation: deleted validation, weakened exceptions, bypassed checks that SAST rules miss
  - measured by Claude Opus 4.5 review (SSDR), trend indicator not exact count
semantic anchors: function / pattern / invariant anchors from regex, AST, data-flow
- hard/soft, priority CRITICAL..LOW, TTL for low priority, migration checks on refactor
four-layer acceptance gate
- tests pass, SAST count and risk non-increasing, diff budget, anchors intact
- retry on failure, rollback when retries exhausted
CEGIS-style failure assimilation
- structured counterexamples generalized to rules fed back to implementer
- results over 24 tasks, 10 rounds (GPT-5-Nano comparison)
  - post-hoc SAST SSDR 20.8%, Hybrid Guard 12.5%, full SCAFFOLD 2.1%
  - fix-success 20.83% (verification only) -> 52.71%; task completion 77.14%
limits
- 24 single-file Python/Java samples, monotonicity only within scanner scope
- trades formal completeness for practicality
takeaways for Verus (inference)
- proofs cover written contracts only, missing contracts need separate review
- anchor mining and diff budget stay outside Verus as CI checks
