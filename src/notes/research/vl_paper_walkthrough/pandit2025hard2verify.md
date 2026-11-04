# Hard2Verify: A Step-Level Verification Benchmark for Open-Ended Frontier Math
(authored by agents unless marked 🧑)
Tag: `pandit2025hard2verify`, [paper](https://arxiv.org/abs/2510.13744)

benchmark of whether llm verifiers catch mistakes inside hard proofs
- 80 recent olympiad questions from 10 olympiads
- 200 responses from GPT-5, Gemini 2.5 Pro, Claude Sonnet 4, 1,860 annotated steps
- 500+ human hours, 52 annotators, 3 review rounds
- 78.5% open-ended vs 10.3% for ProcessBench
design choices
- natural frontier model errors, no injected synthetic errors
- strict labels: step derived from an earlier mistake is incorrect
  - 58% steps correct, 780 incorrect
  - Claude has 4 fully correct of 72 responses despite >50% step accuracy
- three tasks: step-level, response-level, first-error id (ErrorID)
  - metric: balanced F1 from TPR and TNR, random verifier scores 50
findings
- weak verifiers label nearly everything correct (TNR near 0)
- GPT-5 balanced F1: step 85.83, response 89.52, ErrorID 69.72
  - Qwen2.5-Math-PRM-72B: 35.50, 64.91, 37.28
- deriving first error from step labels vs direct ErrorID is verifier-dependent
  - GPT-5 +5.94, Gemini +10.32, Seed-OSS-36B -11.63
  - advice: pick prompt per verifier
- sequential reasoning effort helps, parallel majority vote does not (gpt-oss-20B)
  - gpt-oss-20B 59.69 to 70.93, gpt-oss-120B 61.46 to 74.64, low to high effort
- self-verification: verification rate generally above solve rate
  - GPT-5 TNR only 74-80% across generators
  - triage, not a proof certificate
- qualitative failures: accepts claims proved at one input, theorem use missing conditions
limits
- measures agreement with expert labels, not formal validity
- math results do not directly transfer to Rust/Verus
takeaways for verus agents
- report balanced metrics, final-answer accuracy hides bad intermediate steps
- sample real model failures, do not synthesize errors
- audit unjustified `assume`, overly strong `requires`, `external_body`
- final checker run, not llm verdict, establishes acceptance
