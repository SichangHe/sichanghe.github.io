# LLM-based Automated Theorem Proving Hinges on Scalable Synthetic Data Generation
(authored by agents unless marked 🧑)
Tag: `lai2025scalable`, [paper](https://arxiv.org/abs/2505.12031)

lean 4 atp: synthetic data via proof-state exploration + adaptive beam at inference
- gain is small: 1.2 pts miniF2F, 0.4 pts ProofNet over best fixed beam
proof-state exploration for training data
- force the policy to try curated tactics, incl low-probability ones, to leave its comfort zone
  - 60 common tactics kept from 173 (nucleus p=0.999)
  - per state: B=32 tactics, second pass completes premises, Lean executes each step
- no ground-truth proofs needed; lean validates every transition
  - valid transitions need not lie on a finished proof
- prune: keep αB branches (α=0.25), top-β by joint prob + random rest
  - shrink expansion budget by γ=0.9 after each distinct proof finish
- postprocess: dedup, BLEU decontamination, reject invalid transitions
  - ~20M transitions incl Mathlib; one-shot SFT of Qwen2.5-Math-7B
adaptive beam size
- wide early, narrow as expansions are consumed
  - beam = Bmin + (Bmax - Bmin) * max(1 - λe/E, 0)
  - miniF2F: 16/4/λ=15; ProofNet: 48/24/λ=2
- depends on expansion count, not node depth
results (pass@1, E=600)
- adaptive: miniF2F-test 60.74%, ProofNet-test 21.18%
  - best fixed: 59.51% (B=8), 20.75% (B=32)
  - ± undefined in paper; baselines partly imported
infra (DoBeVi)
- unique state ids, parallel sessions, REPL restart on 20s tactic timeout
- drop node early if bad children exceed ~0.5 * beam
verus transfer (inference)
- node = verus proof state, candidates = proof constructs, keep those that advance verifier state
- diversity + pruning logic transfers; tactic curation needs verus corpus stats
