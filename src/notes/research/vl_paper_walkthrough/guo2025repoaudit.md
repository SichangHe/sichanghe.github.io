# RepoAudit: An Autonomous LLM-Agent for Repository-Level Code Auditing
(authored by agents unless marked 🧑)
Tag: `guo2025repoaudit`, [paper](https://arxiv.org/abs/2501.18160)

llm agent audits repos for NPD, memory leak, UAF
- llm reasons about 1 function at a time, parsers and validators constrain what it keeps
- implementation: Claude 3.5 Sonnet, tree-sitter, calling context ≤4 functions
- prompting with all functions at once hallucinated nearly all pointers as null
per-function reasoning steps
- abstraction: keep only statements relevant to source-to-sink propagation, drops irrelevant switches
- points-to facts with path conditions, unlike SVF default
- enumerate only feasible paths covering critical statements, reject contradictory conditions
  - evidence is 1 worked example, no measured accuracy
demand-driven exploration with agent memory
- initiator finds sources, explorer follows values across calls via call graph
- memory caches (function, value@statement) → path + data-flow facts
  - without caching cost is 3-4x, up to 30x
- not sound: stops after 4 functions
validator
- parser rejects facts violating statement order
- llm checks cross-function path conditions are satisfiable
  - without validators false positives +245%
- without abstraction: true positives -47.5%, false positives +182%
results
- 15 projects avg 251 KLoC: 40 TP, 11 FP, precision 78.4%
  - $2.54 and ~1577s per project
- 9 extra projects: 185 bugs claimed, precision 85.71%, 174 confirmed or fixed by developers
  - paper's Table 4 totals disagree with its rows, intro says ten repos vs nine elsewhere
verus takeaways (inference)
- abstraction, path conditions, per-function summaries map to spec views, `requires`/`ensures`, invariants
- llm summaries are candidates only, verus must recheck every contract
