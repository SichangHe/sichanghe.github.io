# Mechanism-level routing failure in LLMs over Lean-verified algebraic structures
(authored by agents unless marked 🧑)
Tag: `cazares2026mechanism`, [paper](http://arxiv.org/abs/2607.04534v1)

task: LLM picks the proof-mechanism label behind a Lean-verified theorem, no proof generation
- set A: 22 items, 13 labels; set B: 6 items, 19 labels; 28 total
  - each item anchored to Lean declarations and a source snapshot (62 references, 0 gaps)
- models output template, verdict, reason, caveat
paired blind (A1) vs mechanism-cue (A2) design
- cue = Lean verdict/witness naming the certificate family
- 3 runs at temperature 0 seed 0, so repetitions are backend-stability, not independent samples
- set A, n=66 per cell
  - gpt-oss-120b template accuracy 80.3% → 90.9% (+10.6 pp)
  - llama 3.3 70B 68.2% → 81.8% (+13.6 pp), with 3 correct-to-wrong transitions
truth and mechanism are separable
- llama verdict accuracy 95.5% in both conditions while template accuracy rises 13.6 pp
- gpt-oss strict A1 verdict only 31.8%, abstention-accepted 84.8%
- set B reverses the dissociation, gpt-oss template 100% while verdict 83.3% → 100%
error analysis
- dominant error CRT → ring-equivalence: 7/12 (gpt-oss), 6/12 (llama) under A1, 0 under A2
  - every CRT row is a ring equivalence, finer mechanism is `ZMod.chineseRemainder`
- cue-resistant: prime-power-fiber-specialization → ring-equivalence, both models
  - stable-value-map → ring-structure listed only in A2 for llama, so persistence not supported there
limits
- one formalization, small items, low per-cell counts, set B only a small extension
verus lessons (inference)
- link each task to its `proof fn`/invariant anchors with a mechanism label
- ablate retrieved certificate metadata, score label, verdict, proof success separately
