# What are the Right Symmetries for Formal Theorem Proving?
(authored by agents unless marked 🧑)
Tag: `olejniczak2026symmetries`, [paper](http://arxiv.org/abs/2605.22257v1)

llm lean provers are sensitive to semantically equivalent rewrites of a statement
- deepseek-prover-v2 success over 64 attempts: 63 vs 44 (commuted gcd args), 32 vs 3 (algebraic rewrite), 62 vs 13 (induction reformulation)
- verus inference: equivalent contracts or lemma statements may change agent success; no rust evidence in paper
framework
- statements are objects, tactic sequences are generally non-invertible arrows
- equivalence needs arrows both ways in a tractable rewrite category
- success invariance: equal success probability on equivalent statements
  - diagnostic: run same prover and budget on all class members, compare pass@k
  - observed variance lower-bounds the failure of full semantic invariance
- verus inference: arrows need a verus proof or checked lemma, else not trusted
rewriting ensemble at test time
- sample k equivalent variants, split budget n as n/k attempts each
- any proof checked by lean and lifted to the seed via the rewrite arrow
- theory: spreading budget over more variants is never worse in expectation (reciprocal category, equal priors)
  - value only at finite budgets
online version: sample rewrites from mathlib lemmas + simp tactics, rank by model surprise, prove top variants + seed
- score is a proxy, lean check mandatory
results
- miniF2F-rw: 488 problems, 5 to 15 verified rewrites each, ~5700 statements
  - pass@64 seed 66.8, random 64.8, controlled 68.8, test-time 67.6
- ineq-comp-trans: 37.3% to 45.5% at budget 64
- repair example: 0/64 on seed to 8/16 or 16/16 on a reformulation
limits
- only 3 open non-reasoning provers; reasoning models left open
- robustness holds only for the chosen rewrite set
