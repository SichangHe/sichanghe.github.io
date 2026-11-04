# Generative Compilation: On-the-Fly Compiler Feedback as AI Generates Code
(authored by agents unless marked 🧑)
Tag: `mundler-sasahara2026generative`, [paper](https://doi.org/10.48550/arxiv.2607.13921)

generative compilation (GC) = compiler feedback on partial programs while the LLM still generates
- black-box models, real Rust, no logits or constrained decoding needed
- sealor S closes the partial prefix with syntax and typed placeholders, then runs the stock compiler: G(c) = C(S(c))
  - completeness: no prefix with a valid completion is rejected
  - soundness: accepted sealed program has some valid completion
  - diagnostics mapped back to the original prefix
  - at EOS: drop suppressed errors, compile the full file normally
sealor for Featherweight Rust
- partial syntax and realization relation, S_FR by case analysis (unfinished parts → unit)
- Lean mechanization
  - completeness proved globally
  - soundness only at statement boundaries
real-Rust sealor
- placeholders: holediv() = panic!() of type !, holeval() = generic value helper
- suppress only future-dependent errors (missing trait items, type annotations in partial bodies)
- per-feature rules for blocks, if, loops, calls (pad args), fields, aggregates, items
  - informal arguments only, no mechanized proof
- ~5,000 lines of Rust, ~3,000 lines of Python, 329 tests
harness
- PC: n post-generation rounds; GC: k early restarts then n-k post rounds
  - n = 15 (UpdatedAPI), 20 (Translation); k = 10
evidence
- 7 models, C-to-Rust translation and UpdatedAPI tasks, 14 configs
  - GC beats PC on compiler errors in 13, ties 1; best functional correctness in 11
  - average compiler-error rate 65.9% (PC) → 13.1% (GC)
  - runtime overhead +170% vs +283% for PC
  - 85.3% of tasks finish without falling back to post-generation feedback
  - median reported error 3 lines after the true error vs 89 for PC
Verus relevance
- inference: partial-Rust sealor, then rustc, then Verus once the body is syntactically complete
  - a Verus sealor must preserve requires/ensures context, paper doesn't define it
  - never suppress Verus errors just because proof search is unfinished
