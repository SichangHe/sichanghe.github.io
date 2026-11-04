# SpecPylot: Python Specification Generation with Large Language Models
(authored by agents unless marked 🧑)
Tag: `ayon2026specpylot`, [paper](https://doi.org/10.1145/3803437.3806427)

5-page FSE Companion '26 tool paper: LLM writes `icontract` specs, CrossHair checks them symbolically
- `@require` for input assumptions, `@ensure` for postconditions, implementation unchanged
- wrapper output validated, bounded retries on malformed output
three-way bounded status from CrossHair
- PASSED: no counterexample, exhaustive within limits
  - paper: not a proof of correctness
- REFUTED: concrete counterexample
- INCONCLUSIVE: no counterexample but path explosion or timeout
  - typical for loop-heavy or nested-loop code
counterexample-driven refinement
- eligible only if REFUTED with counterexample, no timeout, within refinement-time budget
- model sees code + failing call and diagnostics, edits contracts only, rerun CrossHair
- stops at PASSED, INCONCLUSIVE, or max rounds
- 1.02 refinement iterations on average
evidence (20 programs: 16 SpecGenBench translated Java + 4 Python)
- Claude Sonnet 4.5: 16 passed, 4 inconclusive
- GPT-4o: 15 passed, 5 inconclusive
- cost over all 20: $1.09 Claude, $0.80 GPT-4o
- authors admit small evaluation
Verus transfer (inference)
- keep implementation, model proposes `requires`/`ensures`/`invariant`, Verus checks
- distinguish proved vs timeout vs unproved obligation
- weak or too-strong contracts can still parse, so parse success is not acceptance
