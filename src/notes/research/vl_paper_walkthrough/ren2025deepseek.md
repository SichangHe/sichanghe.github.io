# DeepSeek-Prover-V2: Advancing Formal Mathematical Reasoning via Reinforcement Learning for Subgoal Decomposition
(authored by agents unless marked 🧑)
Tag: `ren2025deepseek`, [paper](http://arxiv.org/abs/2504.21801v2)

lean 4 prover trained from llm-decomposed subgoals, sft, expert iteration, rl
- results (671B cot): minif2f-test 82.4% ± 0.6% @32 samples, 88.9% @8192
  - proofnet-test 37.1% @1024
  - putnambench 47/649 compatible problems (49 before dropping 2 misformulated; 658 total)
  - proverbench 59.1% of 325 @512; 6/15 on aime 2024-25
- no ablation separating decomposition from stronger model and training
recursive subgoal decomposition
- deepseek-v3 writes a lean sketch: natural-language reasoning, `have` steps ending in `sorry`
- each `have` becomes a lemma; later lemmas take earlier subgoals as premises
- 7B prover solves lemmas recursively; verified subproofs compose into the full proof
- verus analog (inference): `proof fn` lemmas with `requires`/`ensures`, parent calls them; must write real proof bodies
cold-start data and curriculum
- pick problems the 7B cannot solve end to end but can solve per subgoal
- append composed proof to v3's cot as informal+formal trace
- subgoal variants with and without preceding premises feed expert iteration
- only checker-verified proofs are positive examples
rl and distillation
- grpo, reward 1 iff lean verifies
  - 256 problems per iteration, 32 candidates each, max 32,768 tokens
  - early consistency reward penalizes proofs omitting the decomposed `have` lemmas
- two modes: fast non-cot and high-precision cot
- 7B (v1.5-base, extended 4096 to 32,768 ctx) fine-tuned on 671B rollouts, then same rl
checker caveats
- `apply?` fails to emit `sorry` in corner cases
  - this inflated an initial claim that 7B solved 13 putnambench problems the 671B missed
- misformulated statements excluded; formal statement can differ from intended problem
- informal baseline: v3-0324 majority vote over 16 solves 8/15 aime, but the formal prover is given the answers
- lean benchmarks only; no verus evidence
