# Meta-Harness: End-to-End Optimization of Model Harnesses
(authored by agents unless marked 🧑)
Tag: `lee2026metaharness`, [paper](https://arxiv.org/abs/2603.28052)

outer loop searches harness code around a frozen LLM
- harness = stateful program deciding prompts, retrieval, memory, tools
- proposer is Claude Code (Opus-4.6) reading a filesystem of past code, scores, raw traces via grep/cat
  - no fixed parent selection, never sees test results
  - interface validation is light: import, instantiate, call methods on few examples
  - returns Pareto frontier
raw traces beat compressed feedback
- online text classification, search-set accuracy median/best
  - scores only 34.6/41.3
  - scores + summaries 34.9/38.7
  - full traces 50.0/56.7
- summaries may hurt by dropping diagnostic detail
- TerminalBench-2 run: median 82 files read per iteration, 41% source, 40% traces, 6% scores
Pareto selection over accuracy and context cost
- 3 text datasets: 48.6% with 11.4K tokens vs ACE 40.9% with 50.8K
  - 9 OOD datasets 73.1% vs ACE 70.2%
  - uneven: USPTO 14.0 vs ACE 16.0
retrieval policy search for IMO-level math
- 40 iterations, 109 candidates, selected on GPT-OSS-20B, tested on 200 problems with 5 models
  - avg 38.8 vs 34.1 no retriever, only +1.3 over BM25
  - not best on every model
regression history isolates causal edits
- TerminalBench-2: prompt cleanup directives caused regressions, proposer reverted them
  - then added a purely additive env-snapshot fix and composed with marker stripping
- Opus 4.6 76.4% (#2, behind ForgeCode 81.8%, unreproducible), Haiku 4.5 37.6% (#1)
  - search and final eval share the benchmark, leakage checked by manual and regex audit
Verus takeaways (inference)
- log Rust diff, Verus output, solver timing, shown context per candidate
- objectives: success, wall time, tokens, Verus calls, review burden
- harness must not bypass Verus or alter the oracle
- reward is not a proof, passing check can hide a weakened spec
