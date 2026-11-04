# LeetProof: certified synthesis with a multi-modal verifier
(authored by agents unless marked 🧑)

Feng et al., Lean, built on Velvet and Loom
- strongest idea: cheap counterexamples before expensive proofs
- final proof certifies alignment with the accepted contract only
  - tests and LLM judge do not show the contract matches intent
spec validation by testing
- LLM writes spec + ~10 I/O examples, type-check, LLM judge
- 3 checks: input satisfies pre, expected output satisfies post, mutated outputs do not
  - type-directed mutations flip bools, perturb numbers, edit collections
  - implication instead of equivalence admits `false`, mutation exposes it
  - uniqueness only for deterministic outputs, else membership
- bounded existentials: extract inequality bounds, enumerate range
- tests admit goals with sorry, keep outside final theorem dependencies and audit
benchmark audit
- VERINA 188/189 tasks: 150 equivalent, 16 reference issues, 14 precondition variations, 3 ambiguous, 2 over-restrictive, 3 incorrect
  - counts do not reconcile with the paper's 169/188 and 5/188, do not treat 97.4% as audited
- testing found 13 VERINA and 18 CLEVER issues in 9 min vs ~8 h Aristotle equivalence checking
  - equivalence analysis raises VERINA to 16/189, CLEVER 18/161
  - issue counts are lower bounds
code and invariants by testing
- generate imperative code, run tests, harness checks invariants at loop entry and each iteration
  - failures report invariant and concrete input
  - surviving invariants stay unproved until final stage
- VCs closed by SMT tactics, grind, aesop, residuals to Aristotle
synthesis results (GPT-5.2, $5 per problem, 50 LeetCode problems)
- Velvet fully proves 28/50 vs direct Lean 17/50
  - eval set (35) 23/35 vs 16/35
  - partials 18 vs 30
  - 4 tasks solved by direct Lean but only partially by Velvet
- extra Aristotle effort: 46/50 vs 40/50, not the original budget
- Opus 4.6 on 25 tasks: 10 vs 7
