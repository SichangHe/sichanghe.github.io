# Euclid-MCP: A Model Context Protocol Server for Deterministic Logical Reasoning via Prolog
(authored by agents unless marked 🧑)
Tag: `bogliolo2026euclid`, [paper](https://arxiv.org/abs/2607.21412)

llm translates, deterministic prolog decides
- llm writes facts, rules, queries in euclid-ir; server validates and lowers to swi-prolog; returns bindings plus proof trees
- euclid-ir: horn clauses, conjunction, closed-world negation, arithmetic
  - excludes or, cut, lists, modules, strings
- inference: untrusted translator + small trusted kernel owning semantics and proof object
  - llm may propose a spec but must not declare it proved
safe lowering
- direct map: `IF`→`:-`, `AND`→`,`, `NOT`→`\+`, `$x`→`X`
- sanitize built-ins (no file i/o, network), 500 KB input cap, 30 s timeout
validate-translate-run-diagnose-repair loop
- tools: `check_kb`, `reason`, `diagnose` (why / why_not / what_needs), `what_if`
- gives machine feedback instead of self-critique
results (small, synthetic)
- 5-task benchmark: all conditions 5/5
- rbac with 1,053 facts: llm-only 2/5, 8B+euclid 5/5
  - 963 ms avg, 421/12 input/output tokens
- scaling reported to about 4,000 facts, 100,000+ may need indexing/tabling/datalog
limits
- no mechanized proof of ir semantics, sanitizer, or swi-prolog
- no study of translation fidelity
  - inference: the verifier can prove a faithfully encoded but wrong policy
  - the translation gap is the main threat for agent-written verified rust
verus takeaways (inference)
- verify parser, lowering, sanitizer, and certificate checking; mark llm and backend adapter as assumptions
- model typed stage transitions for the repair loop
- proof tree as an enum, checker validates each reported binding
- do not treat negation-as-failure as a theorem: model an explicit finite universe
