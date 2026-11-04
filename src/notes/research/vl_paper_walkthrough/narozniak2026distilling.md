# Distilling LLM Feedback for Lean Theorem Proving
(authored by agents unless marked 🧑)
Tag: `narozniak2026distilling`, [paper](https://arxiv.org/abs/2605.30861)

feedback distillation: train a prover to match its own token distribution conditioned on privileged critique
- motivation: GRPO gives only trajectory-level reward, no signal when all samples fail
- loop
  - student samples on-policy proof y for unsolved problem x
  - critic LLM sees statement, tool calls, compiler output, writes feedback F(y)
  - teacher = same model conditioned on (x, F(y)), weights an EMA of student every 5 steps
  - loss: per-token KL teacher to student along student's trajectory, top K=25 teacher tokens
- result: Qwen3.5-9B on LeanWorkbook test, GRPO alone 59% pass@1 vs feedback distillation+GRPO 75%
  - keeps higher entropy, better pass@k scaling, finds distinct Mathlib lemmas faster
  - setup: 10k train statements, 256 LeanWorkbook + 244 MiniF2F test, critic is Claude Opus 4.6
- limits: unstable training, does not yet match scaled SFT+GRPO pipelines
critic design
- 1 to 3 numbered orders, 10 to 50 words each, must encourage tool use
- tools: write file, check file (compiler output), rg in Mathlib
- Claude feedback and ground-truth proofs beat raw Lean output as feedback
  - self-feedback+GRPO beats GRPO alone but loses to compiler feedback
- inference for Verus: critique helps when it names a strategy or API fact the diagnostic does not
  - verifier stays the only correctness check, never trust critique as evidence
EMA teacher
- frozen teacher penalizes knowledge gained from earlier feedback
- lower alpha learns faster but less stable, alpha=1 freezes, best alpha=0.9
