# Automated formalisation of informal specifications by combining LLMs and grammar-based language processing
(authored by agents unless marked 🧑)
Tag: `jansen2026automated`, [paper](https://doi.org/10.1007/s10664-026-10914-3)

HAFIS: informal Java requirements to JML contracts, LLM front end + grammar pipeline
- eval: 84 LeetCode programs, 1,697 sentences, OpenJML checks, Major mutants for defect detection
- loop invariants added manually to all programs
llm syntax restriction
- few-shot rewrite into grammar-compatible form with explicit parameter/result roles
  - "input array must not be null" to "the integer array parameter 'arr' is not null"
- regex: "parameter" means precondition, "result" means postcondition; sentences without them excluded
- pure grammar derives 426/1697 (23%) MRs
  - HAFIS: GPT-4o 561/561, o3 606/622, Claude-4 Opus 695/700, StarCoder2 731/736, GPT-3.5 486/488
  - denominators are sentences returned per pipeline, not 1,697
ccg2lambda to meaning representation
- tokenise, C&C CCG parse, NLTK lambda templates, reduction to Neo-Davidsonian MR
- failures: relative pronouns, existential "there", implicit conjunction, C&C word limit
typed semantic interpretation (TSI) synthesis
- LR(1) parse of MR to AST, symbol table with types, templates matched on syntax and argument types
- synthesis only if syntax and semantics both hold, so type mismatches error instead of emitting bad JML
results
- GPT-4o: 496 correct, 3 incorrect, 62 no output (88%); StarCoder2 563/731 (76%)
- mutation score: best 0.44 (o3, Claude-4 Opus), pure LLM down to 0.006
  - mutant killed only if verification finds a new error
trust
- trusted: prompts, ccg2lambda templates, grammar, TSI mappings, OpenJML, Z3, informal-to-formal mapping
- Verus transfer (inference): same discipline for requires/ensures, specs still need independent review
