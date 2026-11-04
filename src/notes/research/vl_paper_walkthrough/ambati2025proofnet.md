# ProofNet++: A Neuro-Symbolic System for Formal Proof Verification with Self-Correction
(authored by agents unless marked 🧑)
Tag: `ambati2025proofnet`, [paper](https://arxiv.org/abs/2505.24230v1)

llm + symbolic proof tree + checker feedback loop, on Lean 4 and HOL Light (not Verus)
- every generated step is checked before continuing
  - tree nodes = lemmas, edges = dependencies
  - 8 s proof timeout
- curriculum: linearized mathlib/HOL Light trees sorted by syntactic complexity and depth
- verifier-guided rl: reward +1 verifiable step, -1 otherwise
  - PPO or A3C (paper does not say which), n-step returns for delayed subtree feedback
- repair: on rejection extract the failed subtree, propose replacements, verify, resume
  - verus inference: feed diagnostics + local spec to a repair model, rerun verus
- cost: batching 2.4x, subtree caching, graph-transformer branch pruning (~35% skipped), async eval 1.7x
reported numbers (table 1)
- FPSR 68.4% miniF2F, 74.9% mathlib-extract, 63.5% HOL Light
- 36% lower tree edit distance, +12% proof success from repair
- ~120k normalized proofs, 23% flawed
weak evidence
- abstract promises convergence analysis and code/data release; paper has neither
- no baseline or ablation table behind the sota claim
- 94.7% is attributed to different outcomes in different passages
- neural and symbolic parts loosely coupled: llm output parsed post-hoc
- kernel acceptance proves only the submitted statement, not that the spec is right
