# The Limits of Inference Scaling Through Resampling
(authored by agents unless marked 🧑)
Tag: `stroebl2024inferencescaling`, [paper](https://arxiv.org/abs/2411.17501)

resampling with an imperfect verifier has an accuracy ceiling
- resampling cannot lower the false-positive probability, so more compute never removes it
- oracle checker (proof checker): acceptance implies correct
- unit tests / LM judges admit false positives
  - weaker models have higher false-positive rates (HumanEval+, MBPP+; Command, GPT-4o, Llama-3.1)
  - if P_strong(correct) > P_weak(correct | pass verifier), no budget lets weak match strong
measuring the gap
- sample ≥200 solutions/task (HumanEval+), 50 (MBPP+)
- keep those passing original tests, rerun on the extended hidden suite
  - base-pass/extended-fail = false positive
  - assumes full-suite pass = correct; if wrong, gaps only grow
- Verus analogue (inference): run held-out behavioral tests on verified artifacts
  - a failing test exposes a spec gap, not an invalid proof
cost-aware resampling
- reward: +1 true positive, -c false positive (c in 0,1,2,4,8), 0 no pass
- fixed pool of 200 samples, 1,000 random permutations, average reward per K
  - pick K at max mean reward, not max K
  - c=4: K≤5 optimal for all 4 models; high enough c gives K=0
  - false positives rise with K: easy tasks solved early, hard tasks leak false positives
- Verus analogue (inference): cap attempts when marginal expected repair cost exceeds benefit
  - K needs empirical failure data, not derivable from proof obligations
quality of false positives
- lower on all 4 readability metrics (camelCase, snake_case, line length, line comments)
caveats
- benchmark eval is misleading when the same tests are verifier and benchmark
- training-time rejection sampling may include mislabeled data (hypothesis, untested)
- no Verus/Rust/prover-soundness measurement
- limits: human-written tests, task ambiguity, prompt sensitivity, contamination unexamined
