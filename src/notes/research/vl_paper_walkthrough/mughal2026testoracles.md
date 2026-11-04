# LLM-Based Test Oracles: Source-of-Authority Taxonomy—A Systematic Literature Review
(authored by agents unless marked 🧑)
Tag: `mughal2026testoracles`, [paper](https://arxiv.org/abs/2607.05031)

claim: classify an oracle by source of authority, not mechanism
- authority = "the artifact or agent whose word makes the verdict count as correct"
- seven sources: specification-derived, implementation-derived, reference-differential, regression-from-prior-version, implicit-intrinsic, human-elicited, model-parametric
- a task instruction is not a specification
- model-synthesized relation counts as specification only if externalized as an inspectable artifact: "auditability, not authorship"
- ordering of sources is conceptual, not empirical
- coding is interpretive; boundary cases disputable, anchoring quotes recorded
corpus: 83 studies (54 database + 29 citation), prisma 2020
- 2,436 records screened; auto-exclusion false-omission rate 0.48% (1/207)
- 42 verdicts specification-independent, 35 specification-derived; 34 of the 35 specification-dependent or partly so
- form and mechanism cross, no one-to-one map
  - mechanisms: 56 runtime assertions, 26 exact match, 22 llm-as-judge, 11 human, 6 formal verification
  - llm generated artifact in 65, judged directly in 16, validated an oracle in 2
weak evaluation practice
- 52 compare to ground-truth oracles, 19 manual inspection, only 13 mutation analysis, 3 no fault detection
- weak/missing assertions reported in 38 studies, hallucination as risk in 60
- 46 mitigations led by execution filtering: compile, run on known-correct behavior, drop failures
  - no pooled success rate; filtered oracles can still under-constrain
verus takeaway (inference)
- verus can prove the wrong contract when authority is model-parametric or copied from implementation
- keep an external requirement as authority, gate with verus, test contracts with mutation or reference checks
- never weaken `ensures` or `invariant` to pass
