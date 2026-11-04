# Beyond Compilation: Evaluating Faithful Natural-Language-to-Lean Statement Formalization
(authored by agents unless marked 🧑)
Tag: `zhang2026beyond`, [paper](http://arxiv.org/abs/2606.31002v3)

compiling is not faithful: lean checks well-typedness, not that the statement means what the user intended
- benchmark: 227 graduate-level statements from 4 textbooks, no canonical lean target
- statement-only declaration ending in `:= by sorry`
reference-free faithfulness criterion
- faithful = compiles + GPT-5.2 and Gemini-2.5-Pro both grade >= 9/10
- human audit calibration on Batch B
  - agrees with human majority on 54/59 (91.5%)
  - confirms 44/46 accepted (95.7%), 10/13 rejected (76.9%)
  - baselines: LeanScorer 45/59 (76.3%), BEq certifies 61.4% of accepted pairs
validity-faithfulness gap
- full agent: compiles 198/227 (87.2%), faithful 131/227 (57.7%), gap 29.5 points
  - gap across 8 systems: 1.3 (one-shot Gemini-2.5-Pro) to 29.5
- humans confirm 54/67 compile-pass rejections as real mismatches (80.6%)
- faithfulness decays with trajectory length: 82.9% at 1-2 steps, 11.5% at 19-24 steps
factorial tool ablation (translation prior T, search S, lean feedback F, 2^3 configs)
- feedback: compile +49.3, faithful +27.2, gap +22.1
- search: compile +9.7, faithful +8.5, gap +1.2
- translation prior: compile +4.0, faithful +1.0, gap +3.0
- per-item transitions hide regressions: search adds 30 faithful but 25 unfaithful (net +5)
transfer to Verus (inference)
- report verified rate and spec-faithfulness separately
- do not stop at first verifier pass without a semantic contract audit
- long repair chains risk contract drift, log intermediate specs
