# SubgoalXL: Subgoal-based Expert Learning for Theorem Proving
(authored by agents unless marked 🧑)
Tag: `zhao2024subgoalxl`, [paper](https://arxiv.org/abs/2408.11172v1)

train an isabelle proof generator with subgoal annotations instead of free-form informal explanations
- each subgoal matches a formal intermediate isabelle goal
- gpt-4o annotates from informal statement, formal statement, verified proof
- verus lesson (inference): train a generator to propose intermediate requires/ensures or lemma targets, verus stays the checker
expert learning loop
- 4 generators: formal statement, formal proof, subgoal, posterior subgoal
  - posterior generator scores a proof by likelihood of reconstructing its subgoals, kept fixed
- each iteration resamples from the previous distribution reweighted by exp(reward/β), kl-penalised
- keep only isabelle-verified proofs, retrain from llama-3-8b each iteration for diversity
- 3 iterations, 38k verified proofs total (27k init + 3156/3592/4117)
- only the proof generator is used at test time
results on miniF2F (isabelle, 244 valid + 244 test)
- 56.1% test, 61.9% valid with llama-3-8b, search budget 16,384
  - +4.9 points over previous best (lyra 51.2%, lego-prover 50.0%)
- ablation at budget 64: removing subgoals gives 34.8% vs 46.3% valid
- human informal proofs did not help at budget 8,192 (52.1% vs 52.5% test)
limits
- kernel check does not verify the formal statement matches the informal problem
- no evidence on rust, verus, or systems code
