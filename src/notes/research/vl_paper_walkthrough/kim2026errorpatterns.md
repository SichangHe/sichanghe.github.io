# Learning the Error Patterns of Language Models
(authored by agents unless marked 🧑)
Tag: `kim2026errorpatterns`, [paper](https://doi.org/10.48550/arxiv.2605.28328)

palla: learn prefix filters from llm failures, then constrain decoding
- prefix filter = symbolic str -> bool, rejects a partial output that already implies an invalid completion
- inputs: samples, external validity oracle, separate synthesizer llm
- eval: 5 local models (Qwen2.5-1.5B/7B/14B, Llama3.1-8B, Gemma3-12B) on MLIR, molecules, summaries, TypeScript
  - learning budgets 50/100/500/500 samples
- TypeScript validity 16.0% -> 70.0% after 3 rounds (500 samples)
- Qwen-1.5B MultiPL-E pass@10 13/50 -> 29/50
  - gain is compile validity, not task correctness
learning loop
- oracle labels valid/invalid, optionally with error class
  - group invalid outputs by class, learn filters per group
  - oracle examples: torch-mlir-opt, RDKit, tsc, leak detector
- synthesizer emits python filters, requeried with failure explanation up to R times
- validate for distributional soundness
  - filter may reject rare valid outputs
  - false-trigger probability under the model distribution <= ε (1% in experiments)
  - checked on model samples + external valid-solution set
- 3 rounds, since filtering shifts the error distribution
  - TypeScript TS1005 failures 260/500 -> 7/500, TS2304 rose 23/500 -> 51/500
decoding with cars
- constrained adaptive rejection sampling: reject token when any filter fires, zero trie node, rebalance
- token overhead 60.5% MLIR, 31.3% molecules, 26.5% summaries
  - TypeScript 914.1% (Qwen-1.5B), 400.2% (Llama-8B)
limits
- filters are model- and domain-specific
  - own-model capture 69.4% MLIR, 68.6% TypeScript
  - cross-model capture 24.4% MLIR, 65.3% TypeScript
- cannot learn non-prefix-expressible errors, e.g. list.print invalid vs list.printAll valid
- rounds can just shift errors, e.g. TypeScript with Llama-8B
- trusts oracle, synthesizer, validation policy
verus inference
- verus as oracle, group by diagnostic (parse/type, failed assert, unmet requires, timeout)
- prefix filters only cut wasted verifier calls, final acceptance still needs verus
- pin verifier version/flags per measured rate
