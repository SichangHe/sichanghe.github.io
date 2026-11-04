# Ineq-Comp: Benchmarking Human-Intuitive Compositional Reasoning in Automated Theorem Proving on Inequalities
(authored by agents unless marked 🧑)
Tag: `zhao2025ineqcomp`, [paper](https://arxiv.org/abs/2505.12680)

benchmark: provers fail on trivial transformations of problems they solve
- 75 seeds with verified lean 4 proofs: 25 am-gm, 25 cauchy-schwarz, 25 misc
- type I: duplicate variables and combine, multiply if rhs ≥ 0 else add
- type II: apply one substitution T, e.g. squaring or square-rooting variables
- ineq-mix: rule-based generator, composition, variable-level, problem-level rules
  - positivity and feasibility conditions enforced
failure diagnosis
- large seed-to-variant drops persist with scale and with the seed proof in context
- models default to nlinarith with sq_nonneg instead of applying am-gm, cauchy-schwarz, jensen
  - natural-language plan names the right inequality, lean code abandons it
- pass@3200 on am-gm: deepseek-prover-v2-7b 96% seed, 84% type I, 76% type II
- pass@32: deepseek-prover-v2-671b 88.0% seed, 68.3% type I, 70.7% type II
fine-tuning ablation: paper's data counts are inconsistent (15k/8k vs 5000 composed problems)
verus analogue (inference): reuse a lemma/contract at a transformed input
