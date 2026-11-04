# Vero: Can AI Agents Build Formally Verified Software Repositories?
(authored by agents unless marked 🧑)
Tag: `ye2026vero`, [paper](https://doi.org/10.48550/arxiv.2608.13522)

repo-scale Lean benchmark: 43 instances, 743 APIs, 2,705 specs
- 13 from Dafny/Verus/Coq, 30 from Python
- spec = predicate over a `RepoImpl`, not tied to one reference body
- two modes
  - proof-only: prove all specs on fixed reference impl
  - code-and-proof: write every API body, prove specs on own impl
- score only with full spec coverage after clean rebuild
curation pipeline, human-gated
- discover, select, plan, translate, spec-write (Python only), validate
anti-reward-hacking grading
- extract editable regions into fresh copy
- axiom allowlist
- screen declarations for trivializers (bad typeclass instances, `noncomputable choice` + `@[implemented_by]`)
- formal audit: instantiate specs with reference impl / single spec / inconsistent set, feed defects back to curation
results, 90 min per run
- GPT-5.5 xhigh fully solves 27/43 code-and-proof, 25/43 proof-only
  - passes 87.3% / 85.8% of specs, so spec coverage != repo completion
- Claude Opus 4.8 8/43 and 10/43; GPT-5.5 medium 2/43 and 6/43; Claude Sonnet 5 2/43 each
- 172 matched pairs: 26 solved in both, 13 only code-and-proof, 17 only proof-only, 116 neither
- 5 pairs: simpler own impl closes all 250 specs vs 201 on hard reference
  - proof/impl tradeoff, efficiency not checked
- 10 instances unsolved by all 8 configs
proofs are lemma-library heavy
- 82 full solves: helpers hold median 73.6% (code-and-proof) / 71.6% (proof-only) of proof lines
- 80/82 share a helper across ≥2 specs, 65/82 across ≥5
trusted: translation, spec intent, source semantics, Lean toolchain, audit coverage
Verus analogue (inference)
- clean-checkout rebuild, reject `external_body` on target and undeclared axioms
- separate audit that contracts are satisfiable and reference satisfies them
