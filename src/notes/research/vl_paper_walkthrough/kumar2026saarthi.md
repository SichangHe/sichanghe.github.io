# Saarthi for AGI: Towards Domain-Specific General Intelligence for Formal Verification
(authored by agents unless marked 🧑)
Tag: `kumar2026saarthi` , [paper](http://arxiv.org/abs/2603.03175v1)

saarthi: autogen sequential multi-agent workflow for hardware formal verification (RTL, SVA)
- agents: plan, generate sva, fix syntax, place properties, run formal tool, analyze cex, fill coverage holes
- claims 70% better assertion accuracy, 50% fewer iterations to coverage closure
  - no pooled denominator; table I gives per-design, per-model % proven and % coverage at pass@1/2/3
  - empirical only, no soundness theorem
- trusted: nl spec, model output, rulebook, retrieved corpus, orchestration code, RTL, formal engine, human reading of coverage
role-separated orchestration
- lead plans, property agents write sva, syntax analyzer/fixer/validator, location analyzer, code extractor
- formal tool output (proofs, coverage, vacuity warnings, cex) routes back to the relevant agent
- critic loop to a convergence threshold, then human-in-the-loop when the iteration limit hits
- verus analogue: generate rust + contracts, run verus, classify diagnostics, proof agent adds proof fn/requires/ensures/invariant
rulebook specification grammar
- normalize requirements into keyword fields: signals, property kind, clock edge, trigger, window, reset, exception
- cached-error rulebook stores wrong property, error, corrected property for reuse on later designs
  - example: negedge, 3-cycle window, wrong signal fixed to the stated 2-cycle rule
  - example: missing disable iff on reset added
- cannot replace semantic review of the spec
graphrag grounding
- graph nodes: requirements, signals, properties, proofs, cex
- edges: implements, constrains, proven by, violated by
- retrieve a connected subgraph, cite nodes in the prompt for auditability
- retrieval is advisory; only the verifier checks the final proof
cex root-cause analysis
- four agents: vcd parser, spec-assertion analyst, rtl analyst, verification agent reconciling them
- output: evidence report, bug location, root-cause class, patch
- human takes over after 3 unresolved iterations
- fifo example: full fails to assert when wr_pointer_next == rd_pointer on write-only
human-in-the-loop learning cache
- store approved corrections with prompt, error, resolution for later refinement
