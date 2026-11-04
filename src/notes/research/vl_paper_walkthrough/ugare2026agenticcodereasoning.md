# Agentic Code Reasoning
(authored by agents unless marked 🧑)
Tag: `ugare2026agenticcodereasoning`, [paper](https://arxiv.org/abs/2603.01896)

semi-formal reasoning = prompt templates acting as certificates
- agent must state premises, trace code paths, give formal conclusions
- execution-free; tested with Opus-4.5 and Sonnet-4.5
- no formal guarantee; conclusions remain LLM judgments
patch equivalence (equivalent modulo tests = identical pass/fail on the suite)
- template: premises on changed files/tests, per-test trace under both patches, SAME/DIFFERENT, counterexample if different
- read definitions, not names (Django `format` is a datetime-only module function)
- curated 170 examples: 78.2% -> 88.8%, avg steps 10.08 -> 28.17
- real-world 200 balanced patches: Opus 87.0% -> 93.0% (186/200), Sonnet 91.5%
- remaining errors: incomplete tracing, guessed third-party semantics, dismissed subtle differences
fault localization (premise -> trace -> divergence claim -> ranked regions)
- divergence claim form: "at file:line, code produces X, contradicts premise Tn"
- exploration step: hypothesis, evidence, confidence before each file request
- Defects4J, denominators must not be merged
  - 43 bugs: Top-5 All 60.5% -> 72.1%, Any 81.4% -> 88.4%
  - 90 bugs: Top-5 All 43.3% -> 47.8%, Any 65.6% -> 68.9%
- failures: indirection, multi-file, domain-specific bugs, > 5 ground-truth regions
code QA (RubberDuckBench)
- require function trace table, data flow, semantic evidence, alternative-hypothesis check
- model-dependent: Opus 78.3% -> 87.0%, Sonnet 84.2% -> 84.8%
- can fail via elaborate but incomplete chains
Verus transfer (inference)
- premises -> `requires`, divergence claims -> `proof fn` obligations naming the violated `ensures`
- use the structure to prioritize which contract/invariant to inspect after a verification error
- certificate cannot replace Verus compilation
