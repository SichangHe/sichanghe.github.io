# The Verifier is the Curriculum: Precision Sets the Return on Search in Code Self-Distillation
(authored by agents unless marked 🧑)
Tag: `zhou2026verifier`, [paper](https://arxiv.org/abs/2607.09709)

empirical study, proves nothing, no formal verifier
- question: how does gate precision affect self-distillation of a code model
- gates: Godot headless launch (GameCraft-Bench, 140 tasks), APPS hidden unit tests
- relevance: Verus run is the same kind of fixed-predicate check
- terms: fuel = admitted self-outputs, π = precision, FP/FN = wrong admitted/correct rejected, Kh = candidates per task
all-or-nothing gate, no score
- STRICT-LAUNCH: `godot --headless --quit-after 5`, exit 0 and no parse/load/resource error in stderr
  - lenient BUILD check admits 887/888 candidates, STRICT 73 (8.2%)
- gameability test: cheap change that raises score without changing behavior
  - swapping rectangles for sprites gave 1.8x judge art score
- Verus form (inference): exit 0 is not enough
  - reject added `assume`, `admit()`, `external_body`, changed `requires`/`ensures`, missing target function
  - gate has no notion of spec, so cannot catch a proof of a weakened goal
gated self-distillation with gold anchor
- per round: sample 8/task, keep at most 2 deduped passing, add to gold, retrain fresh LoRA from base
- Qwen3-14B clean launch rate 8.8% to 13.6% to 30.9% to 42.2% over 3 rounds
  - held-out tasks with a clean candidate in 32: 84% to 100%
  - 8B: 3.5 to 17.0%
- needs a base that already passes sometimes (2.1-9.6% in tests)
matched controls isolate the filter
- gold duplication 5.6% (below M0)
- BUILD-gated fuel 8.6% = M0, 81% of its fuel STRICT-broken
  - "what transfers depends on the acceptance signal"
- fuel from later model 22.4%
- 8 projects of fuel 11.3%
precision prices fuel linearly
- APPS, Qwen3-4B: gain ≈ π × clean gain
  - +7.39, +6.32, +5.37, +3.59, +1.89 at π = 1, .875, .75, .5, .25
  - no loss threshold, measured only for π 0.25-1
- harvested: all-tests fuel 20.4 to 25.5% pass@1, half-tests 22.5%, syntax-only 20.3%
- Verus form (inference): fraction f of false-positive proofs costs about f of the gain
only FP hurts filtered fine-tuning
- FN75 -0.03 points, FP25 -1.58
  - reason: FP writes a wrong row, FN withholds one of many right ones
- Verus form (inference): harsh limits and rerun-must-pass are cheap if each function keeps a surviving proof
rule reverses under GRPO
- gate as reward: FN arm clean reward 0.608, FP 0.629, clean 0.696
  - FN gives more gradient and pushes away from correct rollouts
- Verus flaky timeouts then punish correct proofs
search pays only behind a strict gate
- Kh 8 to 32: +1.62 strict, +0.31 partial
- strict at Kh=8 beats partial at Kh=32 by +1.78
- cost of strictness is yield, 1/yield more generation
unoptimized readouts with negative controls
- grounding probe and blind brief judge, calibrated on gold and bad artifacts
- do-nothing project: launches cleanly, judge 0/25 vs gold 19/25
- share of clean launches that implement the brief falls 57% to 34% (inference)
  - model learns to pass the gate faster than to do the task
  - Verus: spec must be fixed outside the loop; keep a check training never touches
task-clustered statistics
- ICC 0.63 among candidates of one task: permute within task, bootstrap over tasks and seeds
- coverage at K = 1 - C(n-c, K)/C(n, K)
- proof attempts for one function are correlated too
weak points
- single engine, 25 held-out tasks, ≤14B, ≤3 rounds
- single-run 30.9% sits ~3 sd above the 3-seed mean 26.4±1.6 at round 2
- code and adapters promised "upon publication", not linked
