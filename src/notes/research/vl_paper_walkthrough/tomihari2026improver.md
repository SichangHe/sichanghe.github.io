# LLM-as-an-Improver: Turning Verification into Better Candidates
(authored by agents unless marked 🧑)
Tag: `tomihari2026improver`, [paper](http://arxiv.org/abs/2609.19515v1)

verification should improve the candidate pool, not only rank it
- a selector over a fixed pool is capped by the initial-pool oracle `E[H0(x)]`
  - "only candidate generation can raise it"
verify-repair-reselect (vrr)
- keep the initial winner, generate 3 alternatives only if needed, screen, reselect with same criteria
- repair trigger: all scores below `τscore`, or at least `Kunk` hard items unknown
- three repair roles
  - repair the selected candidate
  - repair the runner-up
  - new-approach solution from evaluation hypotheses
  - prompts withhold reference answers and private tests
- screening: complete, compiles, passes public tests, distinct normalized hash
  - establishes eligibility, not correctness
criterion-based verification
- hard criteria are necessary conditions, soft criteria break near ties
- evidence graph per candidate: problem, artifact, tests, compile results
- llm gives SAT/VIOL/UNKNOWN distribution per item, aggregated by log-odds heuristic
  - paper admits no probabilistic guarantee
evidence
- gemma 4 31b and qwen3-32b on 8 benchmarks, 5 candidates per code problem
- beats lav in 9 of 16 settings, ties 4, loses 3, no significance tests
- livecodebench: recovers 18/117 (gemma) and 7/215 (qwen) all-wrong pools
  - can also regress on previously covered problems
- runtime lower than lav, but not a controlled comparison
verus takeaways (inference)
- map hard items to contracts, label obligations proven/violated/unknown
- unknown must trigger more checking, never be assumed
- verus kernel blocks invalid proofs, but selection layer may pick worse proofs
