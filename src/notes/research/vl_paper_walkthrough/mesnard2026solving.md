# Case study: solving P-99 with LPTP and an LLM
(authored by agents unless marked 🧑)
Tag: `mesnard2026solving`, [paper](http://arxiv.org/abs/2607.21196v1)

Claude writes pure ISO Prolog, tests, and LPTP proofs for 33 of 88 P-99 problems (37.5%)
- "solved" = code + tests run + reliability properties proved in LPTP
- totals: 58 procedures, 112 clauses, 508 runtime tests, 257 lemmas, about 11,800 proof lines
- human manually checked every generated file
  - auditable but not autonomous
- effort from 15 min (P01) to several hours (P35)
- no replication, no failure denominator for discarded candidates
artifact contract per task
- directory `P99/Pxx/` with `CLAUDE.md`, `pxx.pl`, `pxx.gr` (ground representation), `pxx_test.pl`, `pxx.pr`, experiment report
- shared `lptp-reference.md` collects proof tips, reread before every proof file
- constraints: ISO Prolog, no cut, `.pl` and `.gr` must match exactly
- Verus analogue: one module per task, manifest pinning Verus command, imports, trusted axioms
property portfolio per predicate
- types, groundness, termination, uniqueness, existence, functional correctness, each proved separately
  - P35 prime factorization: 30 properties incl. termination, product preservation, primality, uniqueness
- runtime tests cover edge cases, proofs cover universal claims
  - tests alone cannot establish universal properties
  - proofs can be vacuous if preconditions are too strong
strengthen then weaken induction
- when induction hypothesis is too weak, prove a stronger auxiliary property, then specialize
- Claude used LPTP library lemmas well and logged new techniques
- Verus analogue: `proof fn` with `decreases`, stronger lemma called from target lemma
verifier-native MCP server
- agent is MCP client, submits proof terms, LPTP checks
  - tools: grammar, tactics (induction, case analysis, completion, unfolding), `verify_lemma`, `check_proof`
  - SWI-Prolog answers parsed to JSON
- loop: submit lemma by lemma, then whole file, revise until LPTP certifies
- P14-P24 certified in 40 min to 1 h per batch
  - only Claude produced valid proofs for that subset
