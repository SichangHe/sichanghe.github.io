# Laurel: Unblocking Automated Verification with Large Language Models
(authored by agents unless marked 🧑)
Tag: `mugnier2025laurel`, [paper](https://doi.org/10.1145/3720499)

task: generate the one missing inline assertion in a failing dafny lemma
- industrial code with user-defined types, functions, lemmas; not whole-proof or loop-invariant synthesis (invariants <0.5% of loc)
- gpt-4o, dafny 4.3.0, temperature 1.0, 10 attempts per task
- result: 82/145 (56.6%) on dafnygym; text elsewhere says 143 tasks (57.3%)
- dafnygym: dafny libraries, cedar, dafnyvmc; 58+54+33 assertions
technique 1: placeholder localization from verifier error
- desugar lemma to acyclic cfg of assume/assert, map each violation to an unproved assert
- candidate spots: end of nodes, closest before the violation, after local assumptions/variables; restrict to faulty branch when named
- insert a placeholder and ask llm to fill it
- llms are "better at code in-filling than at error localization"
  - baseline 6.2%, +raw error ~15%, placeholder 34.4%, placeholder+error 26.2% (k = 10)
  - without placeholder, baseline location median 2.8 lines off
technique 2: hierarchical proof-similarity retrieval
- pick m = 6 same-codebase assertions whose contexts are most similar
- wagner–fischer-style dp over tokens, lines, proof contexts; identifiers equal to each other, parser-free
  - similarity 56.6% vs random same-codebase 51.7%, no-placeholder 46.8%, placeholder alone 34.4%
  - embedding 55%, tf-idf 53.6%: metric differences small
- needs a mature codebase with many assertions
technique 3: verifier-in-the-loop retries
- insert each candidate, rerun dafny, solved if any of k verifies; verifier is the oracle, not textual match
- re-prompting with new error reaches 29.6% but doubles attempts
failure modes
- needed function missing from context (invented `inferArith`)
- function overused in lemma, llm refuses to omit it
- assumes a single assertion suffices; multi-assertion extension untested
- verified candidate does not show top-level spec is right
verus takeaway (inference)
- same loop on verus diagnostics: failing `assert`/`requires`/`ensures`/`invariant`, insert candidate `assert` before it
- retrieve similar verus proofs by tokens, normalize identifiers, keep keywords
- bounded budget, report first-attempt vs k-attempt success, reject candidates that weaken contracts
