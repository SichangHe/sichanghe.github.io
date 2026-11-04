# Diversifying to Verify: When Task-Equivalent Programs Differ in Verifiability
(authored by agents unless marked 🧑)
Tag: `yu2026diversifying`, [paper](https://arxiv.org/abs/2607.09366)

claim: for one task, data representation (array/list) and control (recursion/loop) change whether a verifier can prove the program
- Diversify2Verify: 73 LeetCode-style tasks, Why3/WhyML, 4 variants per task, 292 artifacts, 2 repair rounds
  - models: Codex agent, GPT-5.5 for contracts and proofs, GPT-5.4 for implementations
- artifacts verified: 96/292 (32.9%) initially, 154/292 (52.7%) after repair
- tasks with at least 1 verified variant: 49/73 (67.1%), vs 44 for the best single family (array-recursive)
  - only 5 tasks gained, no same-budget control (4 samples of 1 family), no variance reported
- per family verified: array-rec 44, list-rec 40, array-imp 35, list-imp 35 (of 73)
  - recursive 84/146 vs imperative 70/146
  - explanation: recursive code mirrors recursive logical functions, so call contracts line up with the proof
- benchmark filtered toward SMT-friendly tasks with accepted contracts, not representative
- Verus form (inference): control axis transfers (decreases recursion vs while + invariant), representation axis mostly does not
  - recursive executable Rust costs stack, may need loop-equivalence proof
frozen contract, 3 stages
- stage 1 contract, validated then frozen
- stage 2 implementation, may change code only within its family
- stage 3 proof, may add invariants, variants, assertions, ghost code, lemmas
  - may not weaken the contract, add preconditions, change signature, switch family
- prompt is not an enforcement mechanism, only an LLM judge checked preservation
  - judge flagged 1/292, added preconditions
- Verus form (inference): mechanical freeze check
  - compare signature, requires, ensures, reachable spec fn bodies token-for-token before and after stage 3
  - reject new `assume` and `external_body`
example-derived test lemmas
- each input/output example becomes a lemma that the contract holds for it, prover must discharge
- 146 accepted contracts, 85 needed no repair, 61 needed 1 repair
  - tasks without 2 accepted contracts were filtered out, so stage 1 success rate is unknowable
- weakness: only shows the expected output is allowed, a contract allowing every output passes
  - no negative lemmas (wrong output rejected)
- audit: 10 flagged mismatches, 1 genuinely too weak
contract shape: what, not how
- requires = input assumptions, ensures = output requirements
- optimization: witness achieves the value and no valid witness beats it
- small named predicates, bounded quantifiers for arrays, Nil/Cons structure for lists
proof repair
- tests dropped before proof stage, 20 executable tests act as pre-proof filter
- repair prompt: failing file, verifier log, task text, frozen contract, tested code
- 2 repair rounds: 35 then 23 new verifications, yield not collapsed (17.9%, 14.3%)
- 138 unverified artifacts, 62 with 1 unproved root goal, 110 with at most 3
  - closeness measure = count of unproved root goals
- scan-optimum invariant triple
  - witness for current best
  - bound over the processed part
  - why the skipped part cannot beat it
- hand-fixed example: 2 proof-only lemmas (suffix shortening, lifting the bound) closed a goal without touching code or contract
verifier ladder
- 3 solvers (Z3, Alt-Ergo, CVC4) with 10 s timeout, then split conditions, then inline helpers, only for open goals
trust and gaps
- proved: safety, termination, contract
- trusted: that the LLM-written contract matches the task, array and list contracts not proved equivalent
- unclear: whether flagged artifacts are counted among the 154, no cost reported
- moderate signal for a verified-Rust product: textbook tasks, Why3, about half verified
- paper asks for a Verus replication
