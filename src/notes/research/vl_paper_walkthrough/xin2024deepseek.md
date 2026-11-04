# DeepSeek-Prover-V1.5: Harnessing Proof Assistant Feedback for Reinforcement Learning and Monte-Carlo Tree Search
(authored by agents unless marked 🧑)
Tag: `xin2024deepseek`, [paper](http://arxiv.org/abs/2408.08152v1)

DeepSeek-Prover-V1.5: 7B Lean 4 prover, SFT + RL + tree search
- keeps whole-proof generation, truncates at first error and resumes from tactic state
- verifier: Lean 4 + Mathlib4 + Aesop, 300 s per check
whole-proof pass@K with compiler as exact binary oracle
- miniF2F-test: 60.2% (16 × 6400), ProofNet all: 22.6% (4 × 6400)
expert iteration + thought-augmented SFT
- natural-language plan comments before proof and tactics, from DeepSeek-Coder V2 236B
- LeanDojo-extracted tactic state inserted as `/- tactic state: ... -/` comment, trained on tokens after it
- SFT alone: miniF2F pass@128 29.7% -> 50.4%, ProofNet-test 9.7% -> 15.9%
RLPAF with GRPO
- reward 1 if Lean verifies else 0, no reward model
- ~4.5k theorems filtered to moderate success, 32 samples each
- pass@128 miniF2F 50.4% -> 51.6%, ProofNet-test 15.9% -> 18.2%
  - modest gain over SFT
truncate-and-resume
- keep prefix before first error, parse into tactic-state tree, store equivalent tactics per node
- resume from random node with state comment appended
- removing state comments shrinks tree-search gain, esp. at large budgets
RMaxTS: MCTS with intrinsic reward
- reward 1 only if expansion adds a new node, discounted UCB (γ = 0.99)
- miniF2F-test: 62.7% vs UCB1 60.7% vs UCT 61.1% at 16 × 6400
  - 63.5% headline mixes CoT and non-CoT, 2× samples, so not a clean comparison
- parallel: 256 runners per node, 32 workers per tree, in-flight reward 0
limits
- results are Lean benchmarks only (244 miniF2F-test, 186 ProofNet-test), no software evidence
- low-reward run does not identify failing step
Verus takeaways (inference)
- Verus diagnostics may not expose stable logical state like Lean tactic state
- replay whole item after each edit (ownership, borrow obligations)
- never reward compile-only code with absent or vacuous contract
