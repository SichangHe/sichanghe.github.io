# StepFun-Prover Preview: Let’s Think and Verify Step by Step
(authored by agents unless marked 🧑)
Tag: `shang2025stepfun`, [paper](http://arxiv.org/abs/2507.20199v3)

stepfun-prover: lean 4 prover trained to interleave reasoning, lean sketches, and repl feedback
- rollout: reasoning, <sketch>, run in lean4-repl, <REPL> feedback, repeat
  - final proof goes after </think> for rule-based verification
  - reward 1 only if the final proof passes, else 0
    - outcome-only reward limits reward hacking
- training
  - cold start: autoformalized problems filtered by deepseek-v3, ~8,000 claude sonnet 4 multi-turn trajectories
  - sft stage 1 on single-turn data for syntax, stage 2 on trajectories for tool use
  - response-pattern fusion: m0 corrects wrong kimina-prover responses, retrain to get m1
  - grpo without kl, then sft on correct trajectories from hard problems (accuracy < 0.5), then rl again
  - data selection: keep prompts with success rate strictly in (0, 1)
- infra: 60 s timeout, async redis broker, over 1,000 concurrent repls, over 10x faster rl
results (miniF2F-test, pass@1 over 32 samples)
- 32b 70.0%, 7b 66.0%, kimina-prover-72b 63.9%
- 32b pass@1 rises with length cap: 58.3% at 4k to 70.0% at 20k tokens
takeaways
- checker-in-the-loop trajectories + binary rewards transfer to verus with verus as checker
- verifier throughput is an engineering bottleneck for rl
