# Whatever Remains Must Be True: Filtering Drives Reasoning in LLMs, Shaping Diversity
(authored by agents unless marked 🧑)


rlvr (rl with verifiable rewards) collapses diversity because of reverse-kl, not because of the target
- target: p_x(y) ∝ π_base(y|x) v(y,x), filters incorrect outputs, keeps base's relative weights among correct ones
  - needs nonzero verifier acceptance for normalization
  - keeps only diversity already in the base model, invents no proofs
- rlvr with kl penalty β minimizes KL(π_θ || p_{x,β}), mode-seeking
  - p_{x,β} ∝ π_base exp(v/β), tends to the filtered target as β→0
- the paper's claim: the loss is in the divergence used to approximate the target within a restricted autoregressive family
α-dpg
- minimizes an α-divergence to the filtered target
  - α→0 forward kl, mass-covering
  - α→1 reverse kl, mode-seeking
- pseudo-reward min((p_x/π_θ)^(1-α) − 1, M) with leave-one-out baseline
  - M=10, Z_x ≥ 1e-4
  - Z_x estimated by importance sampling, with proposal π_base it is the mean verifier output
  - without clipping unstable for α ≤ 0.5
setup
- lean4 + mathlib, deepseek-prover-v1.5-sft 7B, 10K solvable lean workbook problems, 200 held out
- 4 a100, 512 responses/step, 200 iterations, max 1,024 tokens
- reward: last lean4 block, 1 iff lean verifies
results
- no method dominates all k: pareto trade-off pass@1 vs pass@256
- low α (0.25): best coverage, precision above sft
- α ≥ 0.995: rl-like precision, usually more coverage
- claims sota on the coverage-precision frontier, best on coverage
- narrow evidence: lean only, one 7B model
diversity measurement
- 256 proofs per problem, count tactic and premise choices per proof state
- simpson 1 − Σp² and shannon entropy
- more diversity correlates with higher pass@256, anticorrelates with pass@1
- grpo gave 16 identical sequences on a probe problem
verus implications (inference)
- verus compile plus residual-trust check as the verifier
- track pass@1 and pass@k separately, a rising pass@1 with falling pass@256 signals diversity loss
- verified statement still needs review against the intended requirement
