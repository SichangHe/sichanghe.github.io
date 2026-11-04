# GenOS: Compositional Certificates for Semantic Robustness in AI Code Generation
(authored by agents unless marked 🧑)
Tag: `priami2026genos`, [paper](https://arxiv.org/abs/2608.03588)

models coding agent as probabilistic workflow of finite-distribution Markov kernels
- layers: prompt interpretation, contract generation, sampling, validation, repair, commit
- compatibility: equivalent inputs give equal mass on equivalent outputs
  - measured property to test, not assumed of LLMs
- Theorem 1-2: compatible kernel descends to quotient, composition preserves it
  - Corollary 1: equivalent prompts give equal probability on quotient-closed end-to-end events
observer-relative equivalence
- define observer h (return value, post-state, exceptions, proofs, tool calls), equivalence c R c' iff h(c)=h(c')
- weak observer merges distinct behaviors
  - return-value observer merges copy-sort with in-place sort
- compared events must be quotient-closed
guarded commitment
- commit requires Check accept, and accept implies s |= c
  - Theorem 4: every committed artifact satisfies contract for any generator or repair policy
  - no completeness, correct programs may be rejected
  - tests/learned judges give only probabilistic soundness
- repair: if conditional success prob >= p>0 per attempt, no acceptance in n tries <= (1-p)^n
  - no independence assumption
approximate robustness
- quotient total variation distance, layer defect
  - final distance <= initial distance + sum of layer defects (Theorem 7)
- estimation: freeze model/context/decoding/tools, sample N per pair
  - N >= m^2/(2 tau^2) log(4mM/delta)
audit
- insertion-sort variants on 121 arrays, 10,000 random kernel trials, no violations
  - authors say this does not replace proofs
- Verus: prove deterministic contract/observer lemmas, sampling stays external evidence (inference)
