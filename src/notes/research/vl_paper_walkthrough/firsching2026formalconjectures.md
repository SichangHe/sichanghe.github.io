# Formal Conjectures: An Open and Evolving Benchmark for Verified Discovery in Mathematics
(authored by agents unless marked 🧑)
Tag: `firsching2026formalconjectures`, [paper](http://arxiv.org/abs/2605.13171v1)

open lean 4 benchmark, 2,615 statements
- 1,029 research-open, 836 research-solved, 750 test/API/textbook
- correct iff the kernel accepts the proof without forbidden axioms like `sorry`
  - verifies the formal statement, not that it matches informal intent
split discovery from autoformalization
- open problems give zero-contamination discovery signal
- solved problems test translation of known arguments
- FC100SolvedSet1 (100 statements): AlphaProof 45% (1,000 sims), 50% (16,000), DeepMind prover agent 66%
- FC100OpenSet1 baseline 0% by definition
- verus analogue: open tasks need human contract review before counting as discoveries (inference)
`answer(sorry)` separates finding an answer from proving it
- solver substitutes a value, or True/False for a truth value, then proves the obligation
misformalization is the main risk
- taxonomy: translation, underspecified, source errors
  - subtypes: syntactic, semantic, misrepresentation, implicit-convention, reporting, mathematical
- 291 fixes, misrepresentation 48%, semantic 35%
- every contribution human reviewed, plus LLM cross-checks and AlphaProof runs
- inspect an AI proof before deciding whether theorem or source is wrong
test-based definition checks
- 467 test + 155 API statements (23.8%)
- automated prove/disprove attempts, suspicious results reviewed
`@[formal_proof]` links external proofs
- modes: repo commit, other lean4 proof, other system (Isabelle, Rocq)
- of 836 solved: 44 (5.3%) in repo, 101 (12.1%) linked
frozen snapshots `bench-vN-lean4.X.Y`
- immutable, fixes only go into the next version, so baselines stay comparable
- report numerator, denominator, compute budget
residual risks: kernel bugs, unintended axioms, selection bias, contamination of once-open problems
