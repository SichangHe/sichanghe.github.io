# PhysProver: Advancing Automatic Theorem Proving for Physics
(authored by agents unless marked 🧑)

Tag: `zhang2026physprover`, [paper](https://www.semanticscholar.org/paper/9db442b772fb24bdeae713f0db0dad048310fe5a)

verifier-based rl adapts a lean prover to physics with a small dataset
- base DeepSeek-Prover-V2-7B, GRPO, 5,541 training instances
- +2.4 pts pass@16 on physics test (36.4% overall), +1.3 pts MiniF2F (68.4% → 69.7%)
  - gains uneven: AIME 8/15 → 7/15
conjecture synthesis + verifier filter makes data
- seeds: 2,933 PhysLean lemmas with headers, 4,096-token cap
- Claude-4.5-Sonnet writes 10 conjectures per seed, 29,330 total
  - lean syntax check, then up to 16 proof samples
  - keep if any proof verifies: 2,608 kept, 8.9% yield
rlvr design
- reward 1 iff lean verifies, else 0
  - proofs with `sorry`, `admit`, `apply?` get 0, blocks reward hacking
- curriculum by ground-truth proof length, easy to hard
- no sft warm-up, it hurt
- 8 H200, 2 epochs, ~8 h
sft on human proofs hurts, rejection-sampling ft helps
- pass@16 overall: sft −6.4, raft +1.6
- human PhysLean proofs are out-of-distribution, self-sampled verified proofs are in-distribution
trust and limits
- trusted: PhysLean formalization, conjecture generator, reward code
- low yield, domain coverage gaps
verus transfer (inference)
- conjecture filter works only with frozen imported contracts, else weakened specs pass
- reward = checker acceptance, ban escape hatches
