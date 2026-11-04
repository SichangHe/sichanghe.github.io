# Correct Tests Are Not Enough: Measuring and Training Oracle Conversion in Specification-Based Test Generation
(authored by agents unless marked 🧑)
Tag: `liang2026correct`, [paper](https://arxiv.org/abs/2609.05879)

oracle conversion is a measurable bottleneck in spec-only test generation
- setting: model emits <=5 input/output pairs from a spec, no trusted implementation
- oracle conversion: detectable faulty programs actually detected by fully correct tests
- relevance: a test or counterexample is useful only if its asserted result is justified
metrics, per task q
- reference-valid input: >=5 reference programs agree, outputs normalized
- Dq(x): faulty programs that fail or disagree on x
- Pq = union of Dq(x) over valid inputs, Oq = |Pq|/|Wq| (potential kill)
- Eq = union of Dq(x) only where generated output is correct, Kq = |Eq|/|Wq| (effective kill), Kq <= Oq
- wrong output never rejects programs, else false assertions fake kills
- OCE = sum|Eq| / sum|Pq|, gap G = O - K
additive executable reward (GRPO, 8 suites per prompt)
- 0.05 format + 0.05 count + 0.15 valid + 0.25 correct + 0.25 effective kill + 0.25 potential kill - 0.10 length
- ablations NoKill, FullKill-only, Additive, coefficients not redistributed
- reward execution is training infra, deployment is one call without references
- inference for Verus: reward verifier-proved postconditions and mutation detection in training, deploy only Verus-passing code
fixed-input crossover diagnostic
- freeze inputs, swap policies to fill outputs, 27 cells over 3 seeds
- input kill +2.02 points from source policy, oracle accuracy +1.18 from target policy
- main free-generation loss is input selection, not output degradation
- training-pool tasks only, not held-out
results (Qwen3.5-9B, 3 seeds, step 75, 142 eval tasks)
- full correctness 28.59% to 42.54%
- input kill 24.06% to 25.27%, effective kill 12.23% to 14.15%
- OCE 49.70% to 56.51%, only 7.28% of tasks have all 5 tests correct
- matched 50 steps: NoKill 47.04% correct, 21.60% input kill, Additive 24.43% input kill, 13.67% full kill
- highest-potential bin: 27 valid slots, 3 correct (11.11%)
- cost ~22.8 GPU-hours per seed on A800
limits
- trusted: reference consensus, fault bank, sandbox, parser, reward code
- reward can favor trade-offs and truncation, one seed had 9 failed tasks from unterminated JSON
