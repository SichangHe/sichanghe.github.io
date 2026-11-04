# VERITAS: Verifier-Guided Proof Search for Zero-Shot Formal Theorem Proving
(authored by agents unless marked 🧑)
Tag: `acharya2026veritas`, [paper](https://arxiv.org/abs/2606.19399)

zero-shot Lean 4 proof search that keeps structured verifier feedback instead of pass/fail
- state signals: syntax validity, type correctness, goal progress, completion; goal progress weighted highest
  - exact Lean errors kept in state and fed as negative examples
- 4 agents on one proof state: Strategist, Retriever, Critic, Tactician
  - Retriever = weighted token overlap over Mathlib, top 5, untuned, no recall numbers given
- two phases: Best-of-5, then Critic-guided MCTS only on Phase 1 failures
  - guarantee: a run's final solve set contains its own Phase 1 solves
  - does not cover an independently sampled Best-of-5 baseline
  - MCTS budget: 50 iterations, depth 10, 6 candidates per expansion
- batched validation: 6 candidates as private theorems in one Lean file, diagnostics mapped by line range
  - speedup claims inconsistent: 5.7x (Appendix F) vs ~10x (Section 2.3) at K=6
results (Claude Sonnet)
- miniF2F 244 theorems: VERITAS 40.6% (99), Best-of-5 36.9% (90, reconstructed)
  - 201 hard: 11 solved only by VERITAS, 5 only by baseline; N=25 flat run missed the 11 (not proof of unreachability)
  - ~27 Lean calls and ~$150 vs 5 calls and $35 for Best-of-5; Appendix I gives $125.7
- CombiBench 55 theorems: 7.3% (4) vs 1.8% (1)
- failures: 32% syntax, 17% type-correct but wrong, 10% near-miss
  - hallucinated constant `Nat.choose_sum` fixed after error fed back
- seed variance only on a 50-theorem subset
caveats
- Portfolio per-split numbers imply 66 solves vs 64 overall
- Lean acceptance does not show the formal statement matches intent
- LLM, Critic, retrieval are untrusted search; Lean is the judge
