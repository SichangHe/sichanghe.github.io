# Teaching LLMs Program Semantics via Symbolic Execution Traces
(authored by agents unless marked 🧑)
Tag: `bayer2026teaching`, [paper](https://arxiv.org/abs/2605.06184)

benchmark: 500 C tasks from SV-COMP 2025, binary holds/violated verdict
- 100 tasks each: memory safety, overflow, termination, reachability, data race
- no witness required; 4 runs averaged
- llms miss violations: 4 of 14 models find <50% of violations while >84% on holds
  - Claude Opus 4.7: 98.3% holds, 92.0% violated
  - Qwen3-32B violation accuracy 90.0% (0-25 lines) -> 32.1% (101-200 lines)
  - false negatives: 44% missed edge case, 27% rationalized bug away, 19% wrong reasoning
training: continued pretraining of Qwen3-8B on Soteria symbolic-execution traces
- source: CodeParrot C files, ~1M self-contained, ~34k usable traces
- best set: 3,208 manifest-bug traces (violation on all feasible inputs), HTML format
- violated accuracy: 49.4% -> 56.7% without thinking; 48.0% -> 67.3% with thinking
  - 32B thinking reaches 77.8%
- curation matters: all 34,495 traces -> 39.9%; same 3,208 files without traces -> 40.2%
- format affects parseability: plain-text bug traces with thinking give 45% unparsed responses
- transfers to properties Soteria does not check (termination +16.0, data race +11.5, reachability +5.5)
  - data race and reachability gains not significant at p<0.05
- caveats
  - 13.4% of tasks unevaluated (timeouts/unparseable) vs 1.6% for base
  - no contamination test, no downstream transfer, one engine, C only
verus takeaways (inference, not evaluated)
- try trace supervision from failed verus obligations, then check repairs with verus
