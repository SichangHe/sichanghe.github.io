# ProofOptimizer: Training Language Models to Simplify Proofs without Human Demonstrations
(authored by agents unless marked 🧑)
Tag: `gu2025proofoptimizer`, [paper](http://arxiv.org/abs/2510.15700v1)

proof simplification as verified optimization
- given valid lean statement s and proof p, find p* minimizing deterministic complexity L
  - L = lean token count, comments/newlines ignored; method is metric agnostic
- lean compilation preserves correctness, no human labels
- motivation: rl provers emit bloated proofs
  - seed-prover imo 2025 p1 proof is 4357 lines, 16x informal length
system = 7b model + lean linter + iterative inference
- linter: lean `linter.unusedTactic` removes tactics that do not change proof state
- model proposes rewrites, lean accepts only valid ones
- iterative shortening: sample k, keep shortest valid, repeat from it
- repair (feed errors back to goedel-prover-v2-32b) is weak
  - only 4.8% miniF2F, 1.8% putnam repairs beat best direct simplification
training without demonstrations
- data from proof sketches
  - nl solution to sketch of 2-10 `have` steps with `sorry`
  - extract each `sorry` goal as theorem: 518k, filter trivial by auto tactic to 307k
  - goedel-prover-v2-32b, 4 attempts each, 145k proved become targets
- expert iteration
  - sample 4 simplifications per proof, keep shortest correct
  - keep pair only if len(y) <= 0.8 len(x)
- online rl and test-time rl
  - async grpo, reward = relative length change if valid and not longer, else 0
  - printed reward sign looks inverted vs stated goal
results
- 194 miniF2F proofs: mean 334 to 75 tokens (87.9% mean per-proof reduction)
- 75 putnambench proofs: mean 1468 to 811 tokens (57.2%)
- 4 seed-prover imo proofs shrink 43.8-53.8%
  - cost about 3000 h100 hours per problem
  - safeverify confirms same spec as original
- training on shortened proofs: about 2% better miniF2F
limits
- shorter can be slower
  - replaces fast algorithm with brute-force cases
  - heartbeat objective gives more speedup (138/194 miniF2F >10%)
- longer proofs harder to simplify
- no verus eval, no human readability measure
- verus transfer is inference only
  - needs spec and exec behavior preserved
  - needs own dead-assertion linter, no `unusedTactic` equivalent
