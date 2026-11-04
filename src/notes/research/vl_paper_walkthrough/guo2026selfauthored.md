# Self-Authored Verification Is Unreliable in Heuristic Self-Improving Agents
(authored by agents unless marked 🧑)
Tag: `guo2026selfauthored`, [paper](http://arxiv.org/abs/2607.24300v1)

claim: agent-authored tests are debugging evidence, not a release gate
- agent edits both policy and its own tests
- verifier–deployment gap: self-score stays high while hidden deployment score drops or cannot recover
- setting: programmatic Atari policies, 35 valid model–game cells
  - all 35 end with self-score ≥0.70
  - 15 of 35 score below random reference, 6 at Pong floor -21.0
measure the gap
- compare visible self-score vs hidden deployment eval agent cannot edit
- report final truth, peak truth, peak-to-final loss, regression rate
  - separates failure to discover from failure to retain
info limit: endogenous-only gates can't make both errors small
- false reject α + false accept β ≥ 1 − TV(P+, P−)
- when agent-visible evidence looks alike for regressing and non-regressing candidates, no self-gate works
- internal fixes still fail: monotone test edits, discriminative checks, endo-gate vs no-op
SEAL: sealed exogenous acceptance loop
- harness-side audit on hidden instances disjoint from training, self-tests, final eval
- accept candidate only if audit score ≥ incumbent − slack
  - slack = max(δ_min, ρ|incumbent|)
- 4 conditions: exogenous, confidential, 1-bit feedback, conservative update
- Breakout pilot: final truth 7.7 → 15.4, peak-to-final loss 6.9 → 0.4
- 12 other model–game comparisons: better in 9, tie in 2
- leaking audit scores hurts, Doubao 35.1 → 12.7
- limits
  - non-regression gate, not improvement guarantee
  - audit is a finite-sample proxy, one case audit rose 12.7 → 14.2 while truth fell 17.6 → 13.8
  - Atari only
verus takeaways (inference)
- agent-written specs or tests are not an acceptance gate
- keep hidden checks outside the generator, expose only pass/fail
