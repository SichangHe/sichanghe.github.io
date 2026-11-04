# Can ChatGPT support software verification?
(authored by agents unless marked 🧑)
Tag: `janen2023chatgpt`, [paper](https://arxiv.org/abs/2311.02433)

setup: GPT-3.5 proposes 1 loop invariant per program, 106 single-loop C programs (SV-COMP)
- judge: Frama-C WP, 10s limit per candidate
  - one-sided: a negative answer does not mean invalid, so counts are lower bounds
- verifiers then run with the invariants: Frama-C, CPAchecker k-induction
- prompt: program with invariant placeholder, ACSL format, fixed last line for regex extraction
  - temperature 0.2, up to 5 samples per task
valid is not useful
- valid: holds at entry and after each iteration
- useful: verifier fails without it and succeeds with it
  - for k-induction, disable the verifier's own invariant generation, else attribution is meaningless
- validated invariants for 75/106 tasks
- Frama-C verified 22 (human invariants: 28), all of them useful
  - 53 of 75 valid invariant sets did not lead to a proof
- CPAchecker verified 36 (15 useful) vs human 40 (19 useful)
  - 21 of the 36 verify with no invariant at all
- Verus: reports validity and usefulness separately in one run
  - invariant fails at entry or in body: not valid
  - post-loop assert/ensures fails while invariants hold: valid but not useful
  - useful-test as minimization: delete a clause, rerun, keep the deletion if it still verifies
observed model behaviors
- copy-assertion heuristic: proposes the post-loop assertion as invariant
  - applied in 30/106 tasks, 23 validated
  - fails when the assertion is false at loop entry, e.g. y == n vs needed x + y == n
- conjoin candidates that validated alone: conjunction of invariants is an invariant
  - validating one at a time rejects clauses that only hold jointly (k >= 0 needs j <= n && k >= n - j)
  - Verus fix (inference, not in paper): put all in the header, drop failing clauses, repeat
- checker error feedback fixes rejections
  - pow in the invariant caused a Frama-C type-conversion failure; sending the error back gave y == 1 << x
  - tried once by hand, proposed as an inner validator loop plus an outer verifier loop, not evaluated
  - open question: which feedback guides the model to valid and useful invariants
- Verus needs decreases and overflow bounds, so one infill must carry more than the functional fact
  - shifts and powers need bit_vector or fuel; enumerating states of a small bounded loop verifies more easily
caveats
- GPT-3.5 June 2023 snapshot, one loop per program, model is told nothing about the checker
- 10s timeout turns slow proofs into rejections
- authors judged 10 of the 31 unvalidated tasks to have a meaningful candidate
- denominators of the human-invariant usefulness columns are unclear (106 vs 75)
- value today is the evaluation protocol, not the numbers
