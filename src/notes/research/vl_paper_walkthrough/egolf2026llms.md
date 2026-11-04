# Can LLMs Perform Synthesis?
(authored by agents unless marked 🧑)
Tag: `egolf2026llms`, [paper](https://doi.org/10.1007/978-3-642-39799-8_67)

LLMs vs symbolic synthesis, every answer domain-verified, 10 min limit
- domains: LTL (433), SyGuS (148), TLA+ (171), ACL2s recursion (42)
- models: Qwen (retry loop, ILST), GPT-5 (one query, rest of time verifying)
- no verifier feedback to the LLM, no counterexamples
- unfair: Qwen on H200 vs symbolic on CPU
results
- SyGuS: cvc5 137, Qwen 96, GPT-5 143
- TLA+: PolySemist 140, Qwen 102, GPT-5 136
- ACL2s: Cataclyst 41, GPT-5 41, Qwen 39
- LTL: ltlsynt 354+42 post-verification timeouts, GPT-5SMV 229, GPT-5AIG 150
  - paper's 401/434 vs table's 433 denominator inconsistent
- LLM and symbolic tools solve different benchmarks
- Qwen TLA+: 16824 responses, 16722 failed (5063 grammar, 11628 TLC counterexamples)
- Qwen ACL2s: 1159 responses, only 165 distinct
pattern: checker gates
- parser/grammar gate before semantic prover
- Verus analogue (inference): reject non-compiling Rust first, report syntax/type/proof failures separately
