# Sample, Scrutinize and Scale: Effective Inference-Time Search by Scaling Verification
(authored by agents unless marked 🧑)
Tag: `zhao2025sample`, [paper](http://arxiv.org/abs/2502.01839v2)

sampling-based search: sample many candidates, self-verify each, pick best
- algorithm 1: k_inf samples, k_verif binary verifications per candidate, keep candidates within 0.05 of top mean score
  - if tie remains, pairwise comparisons pick the response with most wins
- defaults: 200 candidates at temp 1.5, 50 verifications per retained candidate at temp 1
- gemini v1.5 pro verification@200 (single run): AIME 8/15, MATH 467/500, LiveBench Math 135/200, LiveBench Reasoning 97/140
- cost: ~130M output tokens (~$650) per AIME question at full scale
  - preliminary scoring (10 scores, drop <0.2, keep top 15 per answer) cuts tokens ~70%, ~$200 per question
  - not used on AIME itself
implicit scaling: more samples raise verification accuracy even at fixed verification budget
- more samples raise pass@k and the chance a high-quality correct response exists
- AIME problem 11: correct answer 601 appears once, score 0.98; wrong answer 1 appears 124 times, score 0.36
  - plurality voting fails, verification succeeds
- pass@200 upper-bounds verification and consistency
compare candidates to localize errors
- disagreements between candidates signal where errors are
- tie-breaking ablation: MATH 467 -> 457/500, LiveBench Math 135 -> 125/200
rewrite before judging
- rewrite each response as theorem, lemmas, proofs, then check for errors
- table 4 false-positive/false-negative: MATH main 14%/17% vs no rewrite 16%/18%; AIME main 7%/7% vs no rewrite 11%/12%
- separate verification threads are worse: MATH 19%/23%
caveats
- tables disagree on AIME denominator (15 in table 1, 14 in table 3)
- generic self-verification gives no proof of soundness
  - inference for Verus: use verifier-style review to rank candidates, but final acceptance must be the Verus result
