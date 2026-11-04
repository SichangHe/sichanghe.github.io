# NL2AGBench: Benchmarking LLM Auto-Formalization for AlphaGeometry
(authored by agents unless marked 🧑)
Tag: `xiao2026nl2agbench`, [paper](https://arxiv.org/abs/2608.28481)

NL2AGBench: LLM auto-formalization of English geometry into AlphaGeometry DSL
- 48 problems chosen from 231 manually formalized JGEX instances
- success iff AlphaGeometry executes it and yields a valid problem spec
  - executable check, not textual match
error taxonomy from execution
- syntax errors: assertion, key, value errors
- logic errors: omitted constraint, wrong relation, wrong target predicate, misread terminology
- >5 min without output counts as logic error
  - modified ag4masses freezes on wrong-but-valid statements
prompting and few-shot
- prompt demands exactly 2 lines (id + DSL), no prose, so output is parser-ready
- 54 few-shot examples lift every model that scored above 0
  - Gemini 3.1 62.5% to 83.3%, GPT-5.4 75.0% to 79.2%
  - Sonnet 4.6 37.5% to 52.1%, Grok-3 52.1% to 62.5%
  - Qwen3:235B 12.5% to 45.8%
  - Mistral:7B, Nemotron-3 Nano:4B, Llama3.2:3B stay at 0%
two-stage human-guided correction
- stage 1: show diagram and ask to reassess
- stage 2: error-specific hint, revise only the faulty part
- gains: GPT-5.4 14.29%, Gemini 3.1 14.63%, Sonnet 4.6 26.47%, Grok-3 32.14%
  - denominator not stated
- needs manual diagnosis, scales poorly
fine-tuning on HAGeo-409
- fixes syntax adherence, not semantics
limits and Verus takeaways
- only 48 problems
- inference: classify Verus failures as parse/type, verifier, verifier-passing but wrong spec
  - passing the checker only validates the spec as written, so the spec still needs review
