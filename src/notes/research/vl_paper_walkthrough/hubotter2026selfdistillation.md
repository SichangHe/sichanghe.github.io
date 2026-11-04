# Reinforcement Learning via Self-Distillation
(authored by agents unless marked 🧑)
Tag: `hubotter2026selfdistillation`, [paper](https://www.semanticscholar.org/paper/89e83ee3eb95843292b1f75f0e50b89e7667b828)

SDPO: use the policy itself as a dense teacher from rich feedback (errors, failing tests, judge text)
- scalar reward gives zero GRPO advantage when all rollouts tie
- self-teacher = same model re-scores its own rollout given question + feedback or a successful sibling
  - no extra sampling, only a teacher log-prob pass
- loss = per-token KL(student || stopgrad(teacher))
- equivalent to policy gradient with advantage log(π_teacher/π_student) per token
  - drop-in replacement of RLVR advantages
results
- 70.2% vs 66.6% GRPO on scalar-reward reasoning and tool use
- LiveCodeBench v6 48.8% vs 41.2%, same accuracy with 4x fewer generations
- test-time self-distillation on hard questions (base pass@64 < 0.03): 3x faster discovery
- step-time overhead +5.8% (no code env), +17.1% (code env)
limits
- gains grow with model scale, small models barely improve
- same model misreading a diagnostic gets reinforced
- accuracy numbers are not verified-Rust rates
Verus takeaways (inference)
- verifier diagnostics are the rich feedback; keep the Verus check as the acceptance gate, not the learned reward
- risk: optimizing a bad spec or fitting one Verus version
