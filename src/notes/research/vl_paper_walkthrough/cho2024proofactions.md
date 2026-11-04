# A Framework for Debugging Automated Program Verification Proofs via Proof Actions
(authored by agents unless marked 🧑)
Tag: `cho2024proofactions`, [paper](https://doi.org/10.1007/978-3-031-65627-9_17)

ProofPlumber: untrusted framework that debugs failed SMT-backed proofs by rewriting source-level assertions and lemmas
- implemented for Verus via rust-analyzer + LSP
- loop: edit source, rerun verifier, show result to developer
- 36 API calls in 3 groups: lookup context, manipulate source proofs, interact with verifier
- source is a TOST (Transformation-Oriented Syntax Tree), no whitespace noise
- verifier API returns failing assertions/pre/postconditions and verification time
- 17 proof actions, 29-177 LoC each
  - Dafny suggests 29 manual rewrites: 16 implemented, 9 not applicable to Verus, 4 inherently manual
  - 7 Verus-specific actions
  - every framework feature used by at least 1 action
transformations stay outside the trusted core
- Verus still checks the final program
- part of `--expand-errors` could move out of the VC generator into proof actions
weakest-precondition stepping
- copy failing postcondition to function end as an assert, move it above the preceding statement
- at a branch, put it at the end of every branch
- rerun, see which branch fails, iterate until proof passes, missing fact found, or bug found
- diagnoses location only, not truth
  - developer does not know if proof is invalid or automation is incomplete
- generalizes 5 Dafny rewrites
inline failing precondition
- copy callee precondition to call site, substitute actual args as assert
- split conjunctions to find the failing conjunct
formula decomposition
- failed assertion: test each conjunct separately
- failed postcondition: insert at every exit, including early returns
- enum: generate match, keep only failing variants
cleanup and scaffolding
- remove redundant assertions left from debugging, check by rerun
- apply induction: base + inductive case, or match with empty proof block per variant plus recursive lemma call
limits
- cannot guess witnesses for forall/exists assertions
- reveal/visibility decisions stay manual
