# VerifyThisBench: Generating Code, Specifications, and Proofs All at Once
(authored by agents unless marked 🧑)
Tag: `deng2025verifythisbench`, [paper](https://arxiv.org/abs/2505.19271v2)

benchmark for nl problem -> spec + verification-aware code + machine-checked proof
- from VerifyThis competitions 2011-2024: 41 challenges, 154 tasks
  - solutions up to 648 lines (prior end-to-end lean work: max 225)
- 7 tools incl. Verus, Dafny, Frama-C, VerCors, VeriFast, Why3, CBMC; 9 llms
- pass = verifier returns no error, 1 min timeout
- 5 attempts: zero-shot, then 4 repairs with full history + verifier feedback
verifier pass is not spec-intent alignment
- coherence checked by llm over passed outputs only: avg 43%
  - upper bound: self-assessment is overconfident (o3-mini)
results are low
- strict: o3-mini 3.62% -> 9.37% with refinement; all models 0.28-3.62% -> 1.11-9.37%
- Verus mean 3.32% -> 8.15%; CBMC 4.76% -> 18.11%; VeriFast ~0
- no model dominates: o3-mini best on CBMC/Verus, Claude on Dafny/Frama-C, Gemini on VerCors
VerifyThisBenchXS ablates one artifact
- 580 tasks: 226 code-gen, 233 spec-gen, 121 loop-invariant-gen
- Dafny 1.35% -> 21.47%, Verus 7.52% -> 17.28%, VeriFast 5.22% -> 9.93%
failure taxonomy: nogen / compile error / timeout / partial / success
- compile errors dominate
  - relaxed templates cut them, raise partial results; timeouts stable
