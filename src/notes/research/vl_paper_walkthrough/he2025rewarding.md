# Rewarding the Unlikely: Lifting GRPO Beyond Distribution Sharpening
(authored by agents unless marked 🧑)
Tag: `he2025rewarding`, [paper](https://arxiv.org/abs/2506.02355)

problem: GRPO with a perfect Lean verifier has rank bias
- high-probability correct proofs get reinforced, rare correct ones neglected
- result is distribution sharpening: pass@1 up, large-N pass@N below the base model
  - default GRPO falls below static base at large N (Figure 2)
diagnosis: uplift rate by rank
- rank each verified sample by initial-model likelihood, measure how often its probability rose after RL
- high-probability correct samples rise more often (Figure 4)
fix 1: unlikeliness reward
- `ri = R(x,yi)(1 − βrank(G − rank(yi))/G)`, βrank = 0.25
  - rank convention inconsistent in paper (0-based prose, 1..G range)
- incorrect samples stay 0, groups with zero original advantage skipped
fix 2: more PPO epochs per batch
- 2-3 epochs also mitigate rank bias, 4 epochs unstable
  - hypothesis: early steps clip high-rank samples, later steps focus on unclipped rare ones
  - update time ~70 / 140 / 210 s for 1 / 2 / 3 epochs
setup and results
- DeepSeek-Prover-V1.5-SFT, 9.6K Lean Workbook + miniF2F-valid problems, 200 held out
  - listed counts do not reconcile arithmetically
- solved at least once in 32 samples during training epoch: SFT 7,707, GRPO 7,860, unlikeliness-2 8,065 of 9,600
- MiniF2F-test pass@32/128: V1.5-SFT 47.1/49.2%, V1.5-RL 49.2/51.2%, ours 48.8/50.6%
  - gain over V1.5-RL not clear on MiniF2F, clearer on Dval (84.3/88.8% vs 84.8/87.5%)
limits
- no evidence of transfer from Lean to Verus or systems code
- trusted: Lean verifier, REPL wrapper, reward logging, dataset formalization
- Verus relevance: reward oracle = compile and verify each candidate with fixed spec and toolchain
