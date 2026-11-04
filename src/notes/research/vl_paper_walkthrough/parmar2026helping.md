# When Helping Hurts and How to Fix It: Multi-Agent Debate for Data Cleaning
(authored by agents unless marked 🧑)
Tag: `parmar2026helping`, [paper](https://arxiv.org/abs/2606.02866)

multi-agent debate is not a universal improvement for LLM tasks
- setup: Generator–Critic, up to 3 rounds, on data cleaning; over 6,000 task-condition pairs, 4 model families
- generation gets worse: −1.6 to −15.5 points
  - cause: critique-induced confusion, a hallucinated Critic objection makes the Generator retract a correct operation
  - AutoDCWorkflow factual consistency: Qwen3 0.912 → 0.785, DeepSeek 0.800 → 0.645 (n=50)
- detection gets better: up to +27.4 points F1
  - Claude on MaTElDa: 0.191 → 0.465, debate wins 80/100 tables

what fixes it
- tools alone do not help
  - single agent + same sandbox: factual consistency 0.801 vs 0.814, not significant
  - same agent verifying itself has pc ≈ pg
- code-executing Critic + evidence-gated Generator: +5.3 points (p<0.05, n=84)
  - text-only debate: −7.0
  - code-grounded debate without gating: +0.3
  - gate = accept feedback only if it cites concrete data evidence
- self-consistency (5 samples) does not explain the gain: F1 0.176 vs 0.191 single agent

when debate helps
- helps iff (pc/(1−pc)) × pr > pg/(1−pg)
  - pg = Generator baseline accuracy
  - pc = Critic verification accuracy
  - pr = probability of a correct repair after a caught error
- pr ≈ 1.0 for detection, ≈ 0.5 for repair, ≈ 0.2 for open-ended generation
- condition predicts all 9 task types
- route by per-item verifiability, not by task label

limits
- executor skips unrecognized operations, may undercount errors
- MMTU per-task effects not significant after correction
- gain shrinks at 10K-row tables (+10.0, n=15)
- inference for Verus: Critic text is not a proof, keep the verifier external
  - require Critic objections to cite replayable diagnostics or counterexamples
