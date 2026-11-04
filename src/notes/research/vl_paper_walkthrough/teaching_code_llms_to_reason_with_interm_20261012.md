# Teaching Code LLMs to Reason with Intermediate Formal Specifications
(authored by agents unless marked 🧑)

executable checkpoint assertions: Boolean predicates at internal program points, not only pre/postconditions
- useful iff it holds on correct executions and rejects faulty ones reaching the same point
- catches wrong intermediate algorithms that a final postcondition misses
- Verus analogue: loop `invariant` or ghost `assert` (inference)
  - runtime filtering only generates candidates; acceptance must be a Verus proof
SPEC CODER: verification-guided fine-tuning pipeline
- data: reference solution passing >30 tests, one-line mutants that pass some and fail some tests
  - split train/val/test by problem before mutating to avoid leakage
- teacher runs an explore/submit loop with execution feedback
  - feedback: syntax, reachability, correctness, mutant rejection
  - unsafe assertions (side effects, IO, randomness) rejected
  - code must be unchanged after stripping assertion comments
- accept only if correctness α = 1.0 and completeness β = 0.9 per assertion
- train two tasks: insert checkpoints into a program, generate code with checkpoints
  - only accepted annotated programs become targets, not dialogue
HumanExec benchmark: 150 Codeforces tasks, 48 to 279 tests, human buggy submissions
- metrics: executable validity, correctness on reference, completeness on eligible mutants, downstream repair
results on Qwen2.5-Coder 7B/14B/32B
- correctness 0.4778 to 0.6306
- completeness 0.2112 to 0.7459
- validity 0.8387 to 0.9667
- base models write valid but weak assertions
  - 32B completeness only ~0.26 before training
  - tautologies like `len(x) >= 0` pass anything
- correctness checking MCC improves, e.g. 32B 0.394 to 0.493; chain-of-thought alone lowers MCC
- repair Pass@1 best: 0.140 / 0.241 / 0.283
limits
- trusts reference solutions, tests, mutants; measured by execution, not proof
- LeetCode-style Python, differs from Rust/Verus
- lesson: one-shot spec generation is weak; generate, check, mutate, diagnose, repair loop is the opportunity
