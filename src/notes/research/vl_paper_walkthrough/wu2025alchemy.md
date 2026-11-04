# Alchemy: Amplifying Theorem-Proving Capability through Symbolic Mutation
(authored by agents unless marked 🧑)
Tag: `wu2025alchemy`, [paper](http://arxiv.org/abs/2410.15748v2)

synthesize verified lean theorems by symbolic mutation of mathlib theorems
- mutation
  - find invocable theorems by running rw / apply in lean on a seed theorem's state
  - rw: replace a term via equality or iff, 4 templates (forward/reverse, target/assumption)
  - apply: replace an assumption by the antecedents of a matched implication
  - keep valid transitions, drop metavariable results
- proof by reversing the mutation
  - have lemma reconstructs the old assumption, then original proof runs
  - for assertion: prove old assertion with seed proof, rw to new one
  - lake build, delete failing variants, rebuild
  - lean checks correctness, not usefulness or independence
- scale
  - 110k mathlib to 6.3M verified theorems
    - rw: 110657 candidates, 2.83M verified, 56% conversion
    - apply: 78871 candidates, 3.50M verified, 37% conversion
  - cost: 14 days on 4096 cores (rw), 7 days on 2048 cores (apply)
training and results
- continual pretraining on mathlib+variants, then sft on state-tactic pairs
  - dedup one pair per used premise, about 30k per tactic
  - more pairs of one tactic saturates fast
- leandojo novel-premise split (1659): llama3-8b 38.52% to 43.22% (+4.70), deepseek-coder 39.24% to 43.46%
- miniF2F-test: 83 to 89 of 244 (34.01% to 36.48%)
  - synthesized tactics bias prover, competition problems prefer simp, omega, linarith
  - mixing in extracted have pairs gives mixed results
limits
- verus analogue (mutate verified specs/proof states, keep verifier-accepted) is inference, untested
  - must preserve rust typing, ownership, spec semantics
- balance mutation types across lemma kinds
