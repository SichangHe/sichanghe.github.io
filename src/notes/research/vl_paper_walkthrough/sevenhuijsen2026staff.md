# STAFF: Towards Translating Formal Verification Benchmarks between Formal Specification Languages
(authored by agents unless marked 🧑)
Tag: `sevenhuijsen2026staff`, [paper](https://doi.org/10.1145/3843777.3844531)

staff: llm translates verified dafny + tests to acsl-annotated c, checked by frama-c
- translation correctness is not proved, only the generated acsl contract
  - five checks give evidence of semantic preservation
- pipeline
  - reject source unless dafny verification and tests pass
  - translate implementation and tests separately, ideally with different model families
  - acsl needs memory facts dafny lacks: \valid, \separated, assigns
  - repair loop: give only the failing c + frama-c errors, not the dafny source
    - max 3 iterations, restart translation instead of repairing longer
results (162 mbpp-dfy-153 files, gpt-5.5)
- 113/162 verified initially, 130/162 after repair
  - repair fixed 17 of 48 failures, 12 in iteration 1
  - fixes memory safety and postconditions, struggles with assertions
- five checks, weak agreement
  - clause counts identical in 25/161
  - round-trip back to dafny passes 105/161, exact text equal 1/161
  - mutation (dextool): 83/157 kill all mutants
  - translated tests: 67/161 pass, 31 skipped from signature mismatch
  - only 5 files pass all five
takeaways
- verifier success alone is weak evidence of faithful translation
- combine complementary checks: structural, round-trip, mutation, tests
