# MathForm: Scaling Mathematical Autoformalization with Knowledge Retrieval and Verification-Guided Refinement
(authored by agents unless marked 🧑)
Tag: `pu2026mathform`, [paper](http://arxiv.org/abs/2608.14221v1)

pipeline translates natural-language math into Lean 4 statements
- retrieval planner decides if library context is needed
  - issues 1-3 queries, LeanExplore returns top 2 results each
  - separating planning from generation: library knowledge used only where needed
- generate, then format check (reject proofs/tactics), then compile
- compiling candidates go to semantic-consistency judge
  - checks dropped assumptions, weakened/strengthened conditions, quantifier order, conclusion
  - judge fallible: gpt-oss-120b accuracy 0.8917, F1 0.8940 on 200 human-labeled examples
- failed candidates revised with compiler/judge feedback, max 3 rounds, unresolved samples discarded
  - round acceptance of retained pairs: ~69% / 20% / 11%
  - retrieval-only ablation (gpt-oss-120b, FATE): 29.00% CC vs 48.00% for full pipeline
syntax pass and semantic pass must be scored separately
- SC@8 = any of 8 candidates compiles; CC@8 = any compiles and is judged consistent
- MathForm-8B macro-avg over 6 benchmarks: 88.06% SC, 72.37% CC
  - FATE-H CC 63%, FATE-X CC 37%
- FormalVerse vs FineLeanCorpus at 100K examples: CC 60.32% vs 46.53%, SC similar (77.17% vs 78.25%)
  - gain is semantic fidelity, not compilation
- verus inference: verifier pass must never stand in for contract-vs-requirement check
training recipe
- FormalVerse: ~367K verified NL-Lean pairs, decontaminated by removing any 13-gram overlap with eval
- trajectory reconstruction: model rewrites clean formalization reasoning from (NL, verified Lean), no proof strategy
  - raw failed-attempt history unfit as target
- SFT Qwen3-8B, then DAPO on 3,000 hard-but-reachable cases
  - binary reward 1 iff compiles and passes consistency
  - RL lifts SC 84.38% to 88.06%, CC 66.53% to 72.37%
  - compile-only reward would teach underspecified contracts
