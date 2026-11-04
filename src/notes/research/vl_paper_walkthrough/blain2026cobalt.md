# COBALT-TLA: A Neuro-Symbolic Verification Loop for Cross-Chain Bridge Vulnerability Discovery
(authored by agents unless marked 🧑)
Tag: `blain2026cobalt`, [paper](https://arxiv.org/abs/2604.12172)

cobalt-tla: llm + tlc loop for cross-chain bridge ordering bugs
- globally invalid state despite locally valid transactions
llm writes bounded tla+ and tlc cfg from protocol description
- finite ranges, `MaxTokens = 3`
- inverted convention: model flawed system, safe result means modeling error
- small-scope hypothesis, violation traces depth at most 4
  - argued for 3 models only, no bound sweep
tlc as oracle and error source
- exit 0 safe, 12 violation, else compile error
- structured trace parsing turns counterexamples into repair directives
  - no precision/recall for parser
repl correction loop
- t1 0 llm iterations (human spec), t2 1, t3 (nomad) 1-2
  - t3 trace reproduces nomad post-mortem
- tlc 0.26-0.30s, llm generation 17-28s
- three targets only, no statistical analysis
trust boundary
- protocol abstraction, bounds, wrapper, parser, human reading of trace
- findings are protocol evidence, not proofs about deployed code
