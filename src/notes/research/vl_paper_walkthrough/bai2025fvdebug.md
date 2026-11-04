# FVDebug: An LLM-Driven Debugging Assistant for Automated Root Cause Analysis of Formal Verification Failures
(authored by agents unless marked 🧑)
Tag: `bai2025fvdebug`, [paper](https://arxiv.org/abs/2510.15906)

fvdebug = llm pipeline from hardware formal-verification counterexample (CEX) to validated rtl patch
- 4 stages: causal graph, graph scanner, insight rover, fix generator
- claims first realistic debugger automating the whole fv debug loop
- hardware only (Jasper, waveforms); verus benefit untested
  - transferable: causal dependency graph, for-and-against analysis, competing hypotheses, verified-patch loop
causal graph
- node = signal event (signal, cycle, value); edge = immediate causal dependency
- built by recursive Jasper `visualize -why` from the violated property, depth 20 cycles
- merge duplicate nodes so the tree becomes a dag
  - cva6 lsu failure: 170 nodes, 239 edges (table); prose says 169 nodes, 1145 edges, unresolved
- verus analogue: nodes from failed obligations, call chain, invariant vars, dataflow
graph scanner
- scan nodes by topological level in token-aware batches
  - binary-search the largest batch under a 50k token budget
  - cache rtl, spec, doc context once; fuzzy name match threshold 0.7
- per node, force balanced analysis
  - at least 2 arguments for and 2 against suspicion, 0-1 score, root cause vs symptom
  - require exact file/line and quoted code
  - fixes the failure mode where llm accepts behavior because it matches current rtl
insight rover
- one hypothesis (narrative) per suspicious node: timeline, evidence, confidence, frontier
- explore frontier nodes until confidence 0.9, then llm-rank hypotheses
- claims over 90% search reduction vs bfs; appendix gives 15-20 nodes vs over 100, not enough to establish it
- paper is inconsistent on narrative count (3 vs all suspicious) and ranking weights
fix generator
- 5 context strategies (full, suspicious focus, narrative focus, minimal, bugs-only) plus best-of
- validate that buggy code is locatable in rtl, dedupe by hashed normalized patch, rank by consensus
  - consensus is a ranking signal only; correctness comes from rerunning the verifier
- verus analogue: check patch applies, run verus and tests; guard against weakening the contract
results
- SVA-Eval-Human: 38 real failures, o3-mini for all methods
  - Quality@Best 0.956, Pass@1 71.1%, Pass@5 86.8%
  - Quality@Best is an llm-evaluator score, not a 95.6% verified diagnosis rate
  - removing rover: Quality@Best 0.795, Kendall tau -0.176
  - removing ensemble: Pass@5 0.763
- cva6, 2 failures: Quality@Best 0.713; multi-line fix generation left as future work
- 2 proprietary designs (about 560k rtl lines): 163 and 67 Jasper calls, 4m12s and 6m07s
- diagnosis can confuse implementation bug with spec error
