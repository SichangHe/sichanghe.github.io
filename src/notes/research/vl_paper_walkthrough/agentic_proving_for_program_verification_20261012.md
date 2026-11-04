# Agentic Proving for Program Verification
(authored by agents unless marked 🧑)
Tag: `sosso2026agentic`, [paper](https://arxiv.org/abs/2605.23772v1)

Claude Code (Opus 4.6) as compiler-in-the-loop agent on CLEVER, 161-entry Lean 4 verified-codegen benchmark
- setup: lean-lsp-mcp, lean4-skills `/lean4:autoprove`, fresh Lean project per attempt, 1 h timeout
- claim: tight compiler-in-the-loop agents are currently the most effective approach for foundational verification
- stronger result: CLEVER's isomorphism score is unreliable, reference specs are often defective or one arbitrary reading
- headline rates have different denominators, never merge them
  - 98.8% entries with an arguably valid spec
  - 81.3% accepted by isomorphism score (65/80 on the correct part)
  - 87.5% implementation proofs from correct specs (70/80)
  - 98.1% end-to-end over self-consistent premises
- cost: proving 10-15 min, about $2-2.5 per solve; trusted: benchmark specs, helpers, tests, isomorphism theorem
staged spec certification: SPEC_GEN then SPEC_ISO (prove isomorphic to reference)
- classification of 161: 65 OK, 81 ISSUE, 13 MISMATCH, 2 FAIL
  - only 65 matched ground truth, so isomorphism is a weak score for intent
- ground-truth defects: conjunct-as-guard (15), precedence (12), invalid-domain quantifier (7), wrong semantics (21)
  - 48 of 80 are Lean-encoding hazards
  - Collatz and Fibonacci-primes tasks need open math
- Verus form: propose `requires`/`ensures`, prove implication/refinement vs trusted contract
  - no definitional equality of contracts, use implication lemmas and tests
implementation certification: IMPL_GEN then PROOF_GEN under a fixed contract
- from ground-truth specs 104/161 OK, 9 timeouts, 48 ISSUE
- generated specs 144/161 OK simple, 148/161 guided, 154 with either (95.7%)
- bugs found: bounded fuel in Newton-Raphson, off-by-one, missing stationary-point case, wrong sort key
- Verus form: separate contract and implementation artifacts so a vacuous contract can't hide a bad implementation
issue-aware self-diagnosis
- ISSUE needs rigorous counterexample on a component; MISMATCH = two valid non-isomorphic specs
- cross-checked with harness, only 1 test-compile bug and 1 timeout misreported
- reviewers are the authors, so not an independent audit (inference)
- explanation of the agent isn't proven correct
prompt guidance and multiple interpretations
- examples, tests, boundary policy cut spec issues 10 to 2
- multi-spec prompt: 290 candidates (2.76 per problem), only 15 proved isomorphic across 11 entries
  - more surface area reintroduces errors
- prompting cannot repair ambiguous intent or defective references
