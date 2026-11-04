# Leveraging LLMs for Formal Software Requirements: Challenges and Prospects
(authored by agents unless marked 🧑)
Tag: `beg2025leveraging`, [paper](https://www.semanticscholar.org/paper/ca89f3d1febfe099bc396707f3e2b168c1556576)

position paper (VERIFYAI) on nl requirements to formal specs
- key challenge: ambiguous nl requirements to specifications
- proposal: nlp + domain ontologies + artefact reuse + llms, with json-ld spec storage
- five challenges: semantic ambiguity, no ground-truth datasets, tool interoperability, traceability, explainability/trust
- pipeline is mostly prospective, evidence is a literature synthesis plus one small experiment
local assertions beat full contracts
- small-scope, well-defined tasks verify more reliably (AssertLLM 89%, Laurel above 50%)
  - figures from different studies, no shared benchmark
- jml contracts and temporal formulas often fail verification even when they look sound
- verus form (inference): generate small `ensures` or `assert` first
verification feedback
- SpecGen: prompt mutation + verification feedback, 279 of 384 programs
- in their Tritype experiment solvers only checked output after generation
  - feeding solver feedback (e.g. unsat path conditions) into generation is future work
human review stays essential
- every llm-generated acsl spec was checked by an expert for semantic alignment and logical completeness
- traceability links are manual, llm-proposed links are future work
- interoperability uses custom scripts to acsl/jml, "not generalisable"
symbolic execution as context
- tritype.c with PathCrawler path/io examples, then acsl via llm, then Frama-C WP
  - pathcrawler covered 11 of 19 paths, all 11 tests had unknown verdicts
  - baseline: 2 goals, all proved by 4 provers
  - augmented: 20 goals, proved 13 to 15 per prover
  - more goals do not mean better translation
- caveat: heading says 36 examples but table lists 29
takeaway for agent-written verified rust
- review whether specs capture requirements, not only whether code satisfies them
