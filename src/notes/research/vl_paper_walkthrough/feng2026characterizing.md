# Characterizing Paraphrase-Induced Failures in Lean 4 Autoformalization
(authored by agents unless marked 🧑)
Tag: `feng2026characterizing`, [paper](https://arxiv.org/abs/2604.23135)

autoformalizers are fragile to meaning-preserving rewording
- 60 deterministic rewrite rules, 11 categories, on ProofNet# (185) and miniF2F (244)
- 4 frontier + 3 open 7B models
- frontier surface consistency 19.1–49.5% ProofNet#, 44.5–55.5% miniF2F
failures are mostly code generation, not semantic drift
- compile rate per direction only 11–24%
- compile-both pairs largely equivalent: GTED median 1.000, mean 0.934 over 401 pairs
- ProofNet#: unknown identifiers 34–50% of compile failures
  - e.g. SimpleGroup instead of IsSimpleGroup
- miniF2F: syntax errors 22–48%, elaboration failures 25–39%
some rewrites change meaning
- o3 discourse rewrite gave strictly weaker existential statement
method
- each rule has pattern, context guards, meaning-preservation reference, math spans masked
- score layers separately: compile, BEq+ (sound but incomplete), GTED
- noncompiling counts as non-equivalent, so consistency is a floor
repair targeting differs by dataset
- retrieval for identifier resolution (ProofNet#)
- compiler-feedback fine-tuning (miniF2F)
- repairs proposed, not tested
limits
- English only, only 7B open models, rules cover 14 (ProofNet#) / 37 (miniF2F) cases
Verus relevance (inference)
- test spec generation under paraphrase, compile and verify both
- classify failures by verifier error: name, type, SMT/trigger, contract
