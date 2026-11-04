# VeriScale: Adversarial Test-Suite Scaling for Verifiable Code Generation
(authored by agents unless marked 🧑)
Tag: `bai2026veriscale`, [paper](https://arxiv.org/abs/2605.22368)

sparse tests overestimate llm ability at verifiable code gen
- veriscale expands then reduces test suites; instantiated on verina as verina plus and verina lite
  - needs ground-truth precondition and reference implementation per task
- gpt-5.5 on verina plus vs verina
  - code score 96.83 → 86.24
  - spec sound&complete score 68.78 → 44.44
- opus-4.7 spec score bounds gap shrinks 13.23 → 4.76 points, so unknown cases matter less
expansion: type-aware mutation of inputs
- llm seeds candidate inputs, then bounded mutation of one parameter per step with type-preserving schemas
- classify each candidate against ground-truth precondition, both p and ¬p
  - expected if ¬p refuted, unexpected if p refuted, unresolved dropped
  - lean `decide` first, then `simp_all!` plus `plausible`
- verus inference: same typed mutator over rust values, check with precondition predicate
  - lean-specific tooling does not carry over
expansion: adversarial unexpected outputs
- llm writes a spec, a stronger red-team llm writes implementations exploiting its weaknesses
  - if synthesis fails, drop constraints from the ground-truth spec to get an attack target
- keep an output only if it differs from reference yet the generated postcondition accepts it
  - makes negatives specification-relevant, not random
reduction keeps adversary-killing power
- unexpected inputs: bucket by structural signature (empty, zero or negative, length mismatch, ordering), keep representatives
- expected pairs: treat adversaries as mutants, greedy set cover over killed mutants
  - avoids coverage loss of random or diversity-only reduction
costs and limits
- cost $58.89 with gpt-5.3-codex plus six models for specs
- verina plus has 62.83x more expected pairs, 183.08x more unexpected inputs than verina
  - eval time 1.80x for specgen, 1.50x for codegen; lite cuts to 1.38x and 1.05x
- limits: needs trusted reference and precondition, red-team llm quality bounds negatives, compute heavy
  - covering generated adversaries is not test-suite completeness
