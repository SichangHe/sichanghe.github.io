# Automated LTL Specification Generation from Industrial Aerospace Requirements
(authored by agents unless marked 🧑)
Tag: `ma2026aeroreq2ltl`, [paper](https://arxiv.org/abs/2604.21715)

AeroReq2LTL: nl to templated nl (TNL) to LTL, then verify
- pipeline
  - layout-aware pdf extraction of requirement paragraphs and interface tables
  - llm rewrites to TNL, grounded by SpaceKG, structured by SpaceRDL
  - deterministic TNL-to-LTL rules
- downstream tool TRACE: KLEE symbolic execution plus GDB traces
dual-stream context
- target stream: full requirement paragraphs with invocation cycle, e.g. 128 ms
- knowledge stream: interface tables with signal names, types, ranges
- without context llm invents atoms or drops cycle semantics
SpaceKG grounding
- graph of domain terms, aliases, program variables, values
  - BERT term extractor, experts map empirical conditions to atoms
  - e.g. "sun not detected" maps to `flagSP = FALSE`
- ablation GPT-4o: precision 0.85 to 0.69, recall 0.88 to 0.70 without it
verus form (inference)
- kg entries become typed constants and predicates, prove mapping lemmas
  - kg and classifier stay trusted inputs
SpaceRDL templating
- fields: workmode, condition, component, SHALL, timing, action
  - timing: immediately, next, eventually, always, until
- 6 templates: state change, bound check, work-mode change, command process, conditional response, maintenance state
- ablation: precision 0.52, recall 0.54 without it
  - errors: missing implication premises, misplaced or omitted X
- structure carries quality, not just a stronger llm
- example Req39: `G((subMode = INM ∧ flagBD = FALSE ∧ deTCount > 12.8) → (flagSTS = TRUE))`
results
- 79 requirements from 38-page SSCS document, 76 translatable
- GPT-4o: 67 correct, 9 wrong, 3 spurious, 0 missing
  - precision 67/79 = 0.85, recall 67/76 = 0.88
  - baseline NL2SPEC+GPT-4o 0.61/0.61
  - strict scoring: X replaced by F counts as wrong
- end to end: 63 of 67 properties verified by TRACE
  - passing verification does not show formulas match human intent
