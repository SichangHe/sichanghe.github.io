# Doc2Spec: Synthesizing Formal Programming Specifications from Natural Language via Grammar Induction
(authored by agents unless marked 🧑)
Tag: `xia2026doc2spec`, [paper](https://doi.org/10.1145/3798217)

doc2spec turns natural-language api docs into checkable formal specs via staged agents
- design: every intermediate result structured and deterministically checked
- stages: entity localization, rule extraction, grammar induction, formalization
- gpt-oss-20b, 3 solidity standards + 3 rust std files
  - avg precision/recall 0.73/0.78
  - grammar-in-one 0.45/0.41, spec-in-one 0.43/0.30
- removing any one agent drops precision to 0.06-0.26, recall to 0.04-0.13
entity localization
- llm infers regexes per 80-line chunk, python applies them
- validate matches, prune irrelevant patterns
rule extraction
- copy candidate clauses verbatim, substring-check against source
- two llm scoring passes, sigmoid score above 0.5 means rule
grammar induction
- fixed ebnf template, llm fills predicates and sorts
- one predicate per atom, reject predicates encoding a whole rule
- inference: predicates map to verus spec fn; semantics still need review
formalization
- llm fills predicates and modality only, no re-deriving boolean structure
- lark parser rejects out-of-grammar output, retry up to 3
downstream
- llm adds ghost state and assertions, then symbolic execution (symgpt backend for solidity, klee for rust)
- 142 real violations, 21 false alarms over 200 contracts and 20 crates
  - rust: 24 violations, 0 false alarms; six specialized tools: 13 tp, 90 fp
  - llm-on-docs and llm-on-rules: 324 and 602 false alarms
trust
- parser checks grammar only, not that predicates match the text
- llm extraction, gold labels, instrumentation, executors all trusted
[[xia2025symgpt]]
