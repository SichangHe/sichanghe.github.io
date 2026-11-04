# Worst-Case Symbolic Constraints Analysis and Generalisation with Large Language Models
(authored by agents unless marked 🧑)
Tag: `koh2025worstcase`, [paper](https://arxiv.org/abs/2506.08171)

WARP: solver-checked small cases, LLM generalizes to larger input sizes
- SPF-WCA gives worst-case SMT path constraints at tractable sizes; LLM predicts constraint for a larger held-out `n`
  - correct = Z3 proves equivalence in both directions (`φ★ ∧ ¬φ̂` and `φ̂ ∧ ¬φ★` UNSAT)
  - output must be one canonical SMT assertion in `<answer>` tags
- inference: transferable to Verus: generalize invariants from checked small cases, final proof still discharged by Verus
solver-guided RL (WARP-1.0-3B, from Qwen2.5-3B, GRPO)
- reward = 0.1 × syntactic format + 0.9 × semantic Z3 equivalence
- data: 23,600 instances (17,700 train/5,900 test); benchmark 671 instances from 20 Java programs, n ≤ 30
  - difficulty stratified by jump size
results
- direct GPT-5 prompting 13/100; GPT-5 with WARP prompting 95.47% on 671 instances
- WARP-1.0-3B 41.08% vs Qwen2.5-3B-Instruct 9.79%
- errors are dependent: formatting before syntax before semantics
  - WARP-1.0-3B totals 827 correct, 275 syntax, 497 semantic, 414 formatting
  - some outputs solver-equivalent but missing delimiters
- large extrapolation jumps degrade accuracy
  - Dijkstra 3.57%, BinarySearch 8.75%, TowerOfHanoi 88.99%, MazeSolver 85.92%
caveats
- held-out target doesn't rule out memorization or training overlap
- solver feedback is a training signal, not a substitute for checking the final artifact
