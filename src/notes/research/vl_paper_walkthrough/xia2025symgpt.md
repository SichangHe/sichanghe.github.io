# SymGPT: Auditing Smart Contracts via Combining Symbolic Execution with Large Language Models
(authored by agents unless marked 🧑)
Tag: `xia2025symgpt`, [paper](https://doi.org/10.1145/3798217)

symgpt checks solidity contracts against erc20/721/1155 natural-language rules
- pipeline: llm rule extraction, llm to dsl, constraint synthesis, symbolic execution (slither + z3)
- finds violations, not proofs; engine unsound
  - loops and recursion bounded at 2, no assembly, no unavailable external calls
- 132 rules identified manually: 32 erc20, 60 erc721, 40 erc1155
rule extraction
- split standard at each function/event declaration, prompt one rule family at a time with typed json schema
- got all 132 real rules plus 6 spurious ones
  - ignore rules violated by every contract (heuristic, may hide real universal violations)
- inference: for verus, yields candidate requires/ensures, needs source spans and human review
dsl translation
- ebnf with 5 forms: throw, call, emit, assign, follow
- anchors: ercs fix no field names but require public read-only getters, llm picks one per rule to locate fields
- return-value-generation rules (24) not translatable
violation constraints
- negate required action so condition is true exactly on violating paths
  - throw rule: if-condition and not check
- z3 sat means rule violated
evidence
- 4,000 contracts: 5,783 violations, 122 false positives
  - false positives: 116 unavailable external code, 5 assembly, 1 transferFrom
  - stated 2.0% fdr does not match either denominator (2.07%, 2.11%)
- false negatives checked only on top-50 violating contracts (254 found, all detected)
- 40 labeled contracts, 159 violations: symgpt 157 tp, 1 fp, 2 fn; slither 39 tp
- 57 of 58 violations in erc3525/4907 set were injected by authors
