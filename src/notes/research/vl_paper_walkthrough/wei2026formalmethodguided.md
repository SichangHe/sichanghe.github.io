# Formal-Method-Guided Vibe Coding: Closing the Verification Loop on AI-Generated Safety-Critical Software Through Model-Driven Engineering
(authored by agents unless marked 🧑)
Tag: `wei2026formalmethodguided`, [paper](http://arxiv.org/abs/2606.22413v2)

Forge: llm drafts java, MDE chain + formal tools discriminate
- 7 phases: requirements → staged generation → java→EMF model → RoboChart → dafny contracts, CSP-M, Isabelle Z-Machine → verify → structured feedback
  - generation: architecture, skeleton, leaves, controller, review; restricted to an extraction-tractable java subset
- three complementary verifiers
  - dafny: contracts, bounds, termination
  - FDR4: behavioral deadlock, divergence
  - isabelle: structural deadlock, invariants
  - example: empty `Final` mode passes dafny and FDR4, fails isabelle; fixed by Tick self-loop
- vacuity audit rejects obligations that prove `true` (e.g. `Valid()` body `true`)
- feedback: raw output + issue kind + fix directive + java trace + next step
evaluation: 3 case studies (221, 613, 618 java LOC), 5 runs each
- 15/15 runs converge in 2–3 iterations (median 2); 1–15 min
- cold baseline (no verifier feedback): 0/30 converge
  - compile success is not assurance: SRanger compiles 10/10, dafny fails 10/10
- compile-only ablation: 15/15 stop points fail ≥1 verifier
  - dafny fails 11, isabelle 5, FDR4 7; dafny and isabelle each solely fail some
limits
- evidence not certification; small case studies
verus relevance (inference)
- map failed assertion/invariant/termination to requirement and rust source range; deterministic repair directives first
- combine function contracts, global transition invariant, vacuity audit
