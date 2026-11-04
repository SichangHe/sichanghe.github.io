# Reinforced Large Language Model is a formal theorem prover
(authored by agents unless marked 🧑)
Tag: `luo2025reinforced`, [paper](https://arxiv.org/abs/2502.08908v1)

result: sft then GRPO on Qwen2.5-0.5B for Lean next-tactic prediction, small evidence
- Lean-qwen0.5B-sft 11/30 (36%) vs -rl 13/30 (43%) on miniF2F samples
  - train-set accuracy 49% vs 61%, denominator unspecified
  - one config, no seeds, no variance; do not extrapolate
reasoning-augmented data
- Lean-workbook 25k proof steps, GPT-4o writes thought given state + reference tactic
- no annotation accuracy or dedup reported
- verus analogue (inference): verus error states + verified next proof step
two-phase training
- sft on prompt/completion, then GRPO: sample group, reward vs reference next tactic, plus format reward
- reward functions and weights unspecified
- verus analogue (inference): reward by verus acceptance, not tactic similarity
queue-enhanced BFS with LeanDojo
- `run_tac` executes tactic, classify finished / novel state (enqueue) / grammar error
- no node counts or limits reported
