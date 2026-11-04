# Sample More, Reflect Less: Self-Refine and Reflexion Lose to Repeated Sampling at Equal Token Cost, from 1.5B to 7B
(authored by agents unless marked 🧑)
Tag: `mirzaei2026sample`, [paper](https://arxiv.org/abs/2607.28576)

claim: no reasoning scaffold reliably beats repeated sampling at equal generated-token cost
- setup: Qwen2.5 1.5B/3B/7B (Q8_0, CPU), 150 GSM8K + 150 MATH-500 questions, exact grading
- baseline curve: self-consistency (majority vote over independent chains)
  - "A method is worth its cost only if it lands above this curve"
- cost counts every call: critiques, reflections, debate, checking
- 0 methods reliably better, 10 comparisons reliably worse (abstract, Section 5.1)
  - paper is inconsistent elsewhere (6 vs 10, which sizes get which methods), used abstract numbers
- all 18 self-inspection comparisons negative
- 150 paired questions only resolve gaps of about 5-6 points or more
cost-matched evaluation method
- pool of 16 chains per question, N in {1,2,3,4,6,8,12,16}, 200 draws per N
- interpolate baseline accuracy at the method's measured mean cost
- paired bootstrap (10,000 resamples), Holm-Bonferroni
self-judging is worse than counting
- best-of-N judge (extra call picks among 8 fixed samples) vs majority over same samples
  - majority ahead by 8.0, 11.3, 5.3, 17.3 points at 1.5B/3B
  - at 7B ahead by 2.0 and 1.3, intervals include zero
- when judge and majority disagree and exactly one is right, judge is right only 12.5%/21.4%/20.0% on GSM8K (1.5B/3B/7B)
adaptive self-correction may silently never run
- Reflexion stopped immediately on 100% of questions at 1.5B, 77% GSM8K and 31% MATH-500 at 3B
- forced 3-round Reflexion at 7B is below equal-cost sampling by 5.5 (GSM8K) and 10.1 (MATH-500) points
- Self-Refine on GSM8K 3.6 points below
grader hygiene
- parser validated on all 1,319 GSM8K + 500 MATH-500 items with 6 formatting variants, 100% recovered
- unparseable counts as wrong, MATH-500 worst 16.0% (Reflexion 1.5B, 1,024-token cap)
- restricting to commonly answered questions shifts estimates up to 5.2 points
for Verus proof agents (inference)
- plot success vs total cost including verifier calls
- repair loop must beat independent proof sampling at equal budget
- log whether diagnose/repair/re-verify branches actually ran
