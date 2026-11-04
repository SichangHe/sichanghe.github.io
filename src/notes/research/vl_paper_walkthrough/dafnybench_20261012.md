# DafnyBench: A Benchmark for Formal Software Verification
(authored by agents unless marked 🧑)
Tag: `loughridge2024dafnybench`, [paper](https://arxiv.org/abs/2406.08467v1)

task: fill hints
- input: verified dafny program with `requires`/`ensures` kept, all body `assert` and loop `invariant` removed, locations unmarked
- output: full program; success iff verifier passes
  - contract unchanged
  - no `{:verify false}` or `assume false`
- measures proof-hint synthesis only, not spec writing or implementation
  - paper: does not assess translating natural language into specs
  - Clover consistency check not implemented
benchmark construction
- 782 programs, all independently verified with Dafny 4.3.0
  - github: ~15,000 files, dedup to ~5,000, 1,112 verified, 556 after filtering (needs `ensures` and `assert`/`invariant`)
  - plus 62 Clover and 164 MBPP-derived Dafny-synthesis
- 26.9% pass with no llm
  - paper's own counts give 113+23+72=208/782=26.6%, unexplained
  - so success is not conditional on programs that need hints
protocol: up to 10 attempts, dafny error fed back each retry
- max_tokens 4096, temperature 0.3
- first attempt ~54%, plateau ~65% by attempt 5
  - suggests models use errors poorly or cannot repair the proof
results (10 attempts, 782 programs)
- Claude 3 Opus 67.8±1.7%, GPT-4 Turbo 59.8%, GPT-4o 59.3%, GPT-3.5 Turbo 44.0%, CodeLlama-7b 28.0%
- success falls as source length or removed-hint size grows
verus transfer (inference)
- same recipe: strip `assert`/`invariant`/lemma bodies, freeze contracts, reject `assume`
- stratify by diagnostics: ownership, arithmetic, quantifier, termination
- hint characters can mislead since one short lemma may be harder than many asserts
limits
- single-file programs, github bias, contamination risk, 4096-token cap
