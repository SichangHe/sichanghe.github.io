# Benchmarking Agents for Proving Theorems in Quantum Algorithms and Quantum Information
(authored by agents unless marked 🧑)
Tag: `zhang2026benchmarking`, [paper](https://arxiv.org/abs/2607.21533)

2 Lean 4 benchmarks of theorem completion: QAlg-Bench (36 tasks), QIT-Bench (40 tasks)
- best scores 60.4/100 (QAlg), 59.6/100 (QIT)
- score = 100 * sum(d_i v_i) / sum(d_i)
  - d_i = difficulty 1-10, frozen before model runs, from 2 rubric reviews
  - v_i = acceptance bit
  - completion = unweighted fraction accepted
task construction
- researchers pick source results and own scope, assumptions, conclusion
  - agents only help translate to Lean
- task = theorem signature + benchmark-local definitions, body missing, no hints
- verus analogue (inference): fn with requires/ensures, proof body left to agent
acceptance is mechanical and independent
- fixed environment, fresh workspace, 1 attempt, 30 min, no network
- final recompile rejects new axioms, sorry, edits outside theorem body
  - 4 timed-out runs still passed final check
- verus analogue (inference): also reject external_body escapes
semantic review on top of compilation
- kernel checks proof vs statement, not statement vs intended science
- manual audit of high-risk statements
  - objects, quantifiers, assumptions, dimensions, index order, conclusion strength
  - example relaxation: entanglement concentration modeled with product-Kraus separable operations only
library-augmented comparison (LAD vs baseline)
- all 8 LAD-baseline changes positive
  - GPT-5.5 QIT +36.4%, DeepSeek V4-Pro QAlg +42.5%, MiniMax M3 QAlg +100% (6.4 to 12.8)
- runs not matched, so not a causal access effect
field-level scores and cost
- 6 fields, per-field difficulty denominators
  - 1 difficulty-10 task moves the smallest field by about 15 points
  - GPT-5.5 QIT: IME 12.8 vs QCR 75.0 baseline, suite score hides this
- cost reported as dollars and seconds per score point
  - invocation time includes agent Lean checks, excludes final verification
limits
- task sets not complete coverage, difficulty is not objective
