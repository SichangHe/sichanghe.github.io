# Enhancing Program Repair with Specification Guidance and Intermediate Behavioral Signals
(authored by agents unless marked 🧑)
Tag: `le2026enhancing`, [paper](https://doi.org/10.1145/3510003.3510177)

SpecTune: LLM-generated executable postconditions guide program repair
- ask an LLM for checkpoints in a buggy function, then a postcondition per checkpoint
- run passing and failing tests, record state at each checkpoint
- feed filtered conditions to the repair LLM
- scope: file-level repair only, no repository-level agents
two filters on generated conditions
- alpha = fraction of passing runs reaching the checkpoint that satisfy the condition
  - keep alpha >= theta
- beta = fraction of failing runs reaching the checkpoint that satisfy it
  - keep beta < gamma, drops trivial conditions like true == true
- best setting (theta, gamma) = (0.9, 1.0)
- ablation (Qwen3-235B Pass@1): no alpha -2.45 pts, no beta -1.67, neither -3.23
results
- 180 buggy solutions from 90 Codeforces problems
- one-turn, GPT-4o-mini: Pass@1 47.34, Pass@5 60.56
- one-turn, Qwen3-235B: Pass@1 73.78, Pass@5 85.56
- fault localization: GPT-5.4 judge prefers SpecTune over naive baseline in 85.72% of 119 tasks
limits
- conditions are checked on finite tests, a statistical filter not a proof
  - Verus adaptation (inference): checkpoint relation becomes assert/invariant/ensures, Verus discharges it
  - beta stays search metadata, not a theorem
- needs tests that reach the checkpoints
