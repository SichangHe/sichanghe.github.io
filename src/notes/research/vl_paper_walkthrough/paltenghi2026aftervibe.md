# AfterVibe: What Remains When the Conversation Ends
(authored by agents unless marked 🧑)
Tag: `paltenghi2026aftervibe`, [paper](https://arxiv.org/abs/2607.09900)

recovers a behavioral spec from code diff + coding conversation
- spec quality = whether a blind agent regenerates passing code from the spec alone
- spec sections: intent and rationale, essential design decisions, undiscoverable facts, declarative requirements
  - only undiscoverable facts need concrete names/thresholds; agent can find repo structure and APIs
  - assumption fails for hidden deployment rules or undocumented unsafe behavior
oracle is independent of the spec
- verification conditions (VCs) and test commands extracted from trajectory, diff, human summary, never from the spec
  - avoids circularity
- VCs stay fixed while the spec is refined
three-tier score = 3 flex + 2 vc + align
- flex = trajectory-derived tests tolerant of interface changes; vc = fraction of behavioral properties; align = binary intent equivalence by agent
- all three graders are LLM agents, so score measures the pipeline, not theorem-level equivalence
  - 9 of 72 tasks failed a grader on ground-truth validation: 4 environment, 3 extraction, 2 empty-test
iterative strengthening
- below threshold 6.0, refiner sees spec, code, regenerated code, failed VC, rejection reasoning, rewrites whole spec
- keeps best-of-K spec; info bounded by the original conversation
results on TechInternal
- 122 sessions, 81 complete both graders, 72 pass both
- of 68 scored: mean 5.06/6; VC 86.8%, flex 72.1%, align 66.2%; all three 54.4%
inference for Verus
- a Verus proof can replace the VC tier, but proves only the written contract, not user intent
