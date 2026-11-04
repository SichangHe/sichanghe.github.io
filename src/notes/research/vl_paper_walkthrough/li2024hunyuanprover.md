# HunyuanProver: A Scalable Data Synthesis Framework and Guided Tree Search for Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `li2024hunyuanprover`, [paper](http://arxiv.org/abs/2412.20735v3)

lean 4 prover fine-tuned from Hunyuan 7B via iterative data synthesis + critic-guided tree search
- best: v16 + best-first search + distance critic = 68.4% MiniF2F-test (167/244), 4 IMO statements
  - budget 600 × 8 × 400 (passes × beam × iterations)
  - vs InternLM2.5-StepProver 65.9% (256 × 32 × 600), DeepSeek-Prover-V1.5-RL 63.5% (32 × 6400): different models and budgets
iterative autoformalization + tactic data
- seed 130K NL/Lean pairs (Lean Workbook 50K, MMA 80K); translate NL to Chinese to double
- autoformalize 30M internal problems, 8 samples each, keep 20M that pass grammar/rule filters
  - filters do not guarantee semantic faithfulness
- each round: best-first search with the previous prover, keep proofs of newly solved statements, drop easy ones, rejection fine-tune
  - turn unfinished final states into new statements; add Olympiad problems
- >10 rounds, >20M tactic examples, ~40× data growth
  - gains plateau after v8 (~2.75B tokens → 4.25B at v12); dropping easy data later helps
  - no variance reported, effects of data size/selection/iteration not isolated
best-first search
- pick highest-critic active node, sample K=8 tactics, run Lean, dedupe states by string, repeat
- eval limits: 800 steps, 60 s per tactic, 3600 s overall (Table 1 says 400 iterations, unexplained)
- weakness: each node expanded once with a fixed budget
ηMCTS
- MCTS without simulation; K tactics per expansion; nodes revisitable
- importance I(n) = max critic change over successors; budget E(n) = clip(floor(αI)+1, Bmin, Bmax)
- UCB mixes critic score and under-exploration
- MCTS+PRM 66.39% (v14) vs BFS+PC 62.70%
  - each comparison changes search and critic together, so MCTS alone is not isolated
critics
- policy confidence: mean token log-prob
- PRM: +1/-1 by whether a node reaches a proof in the generated tree
  - -1 does not mean unprovable
- distance critic: predicts remaining steps as a balanced binary-tree path (steps clipped to 64)
  - coarse-to-fine prediction reduces error
  - v16 BFS+DC 68.44% vs BFS+PC 64.75%
  - finds deeper proofs, uses more steps on easy theorems
Verus takeaways (inference)
- keep only verifier-checked trajectories as training data; check contracts against requirements first
- search nodes = source edits + diagnostics; sample K edits, run Verus, rank survivors
- distance labels are biased by the current prover; dedupe must account for source, not just diagnostics
- MiniF2F results do not show effectiveness on Rust systems proofs
