# Reviving DSP for Advanced Theorem Proving in the Era of Reasoning Models
(authored by agents unless marked 🧑)
Tag: `cao2025reviving`, [paper](http://arxiv.org/abs/2506.11487v1)

DSP+: inference-only draft-sketch-prove pipeline for Lean 4
- models: QwQ-32B/R1 draft, DeepSeek-V3 sketch, BFS-Prover-7B + Aesop prove
- results: miniF2F 80.7% (1024 attempts, 244 problems), ProofNet 32.8%, PutnamBench 24/644
  - ensemble miniF2F 83.6%
  - fewer tokens than Kimina-Prover at same 80.7%
  - pass rate = benchmark coverage, not completeness
- Lean checks proofs; statement fidelity untrusted
  - 8 miniF2F-test problems unprovable or mistranslated
techniques, with miniF2F pass@128 ablations (all 244 problems)
- concise draft: formal statement to formula-only steps, `<think>` stripped
  - 74.2% concise vs 75.4% no format, so not clearly helpful
- hypothesis-hinted sketch: `have` subgoals with `prove_with [h]`
  - prover budget split: hinted hypotheses only (`clear * -`) vs all
  - 71.3% without hints vs 74.2%
  - hints sometimes inaccurate
- error-line masking
  - bad subgoal statement: comment out line and dependents
  - bad proof line: replace with `sorry` plus dependents
  - avoids re-running sketch
- tree search mixing Aesop symbolic rules and BFS-Prover tactics
  - common tactics only 47.5% vs 74.2% with BFS-Prover
- ensemble with buffered pipelined phases
Verus transfer (inference)
- keep: verifier-in-the-loop bounded search, error-line repair, plan before syntax
- not shown: no Verus implementation or eval
