# End-to-End Formal Verification of Ethereum 2.0 Deposit Smart Contract
(authored by agents unless marked 🧑)
Tag: `park2020deposit`, [paper](https://doi.org/10.1007/978-3-030-53288-8_8)

verify compiled evm bytecode in K (KEVM), not vyper source
- avoids trusting the compiler, scope: one transaction
- effort 7 person-weeks: 2 algorithm, 5 bytecode
  - spec ~1,000 lines + 200 lemma lines, source ~100 lines, ~3,000 instructions
  - ~20% of bytecode effort was re-verification after fixes
refinement from abstract algorithm to bytecode
- prove abstract state-transition model with reachability logic, loop invariant at abstract level
- refine each abstract transition to a bounded bytecode claim, no bytecode loop invariants
- manually prove simulation via abstraction function α
- abstract model and compiler leave the trust base
  - trusted: KEVM, evm semantics, bytecode spec, non-mechanized proofs
incremental merkle tree
- height-32 tree, O(h) siblings instead of O(2^h)
- proved against full-construction algorithm, 2 person-weeks
  - only major lemmas mechanized in K, rest is trusted
  - full proof in companion tech report
positive and negative specs
- spec covers valid deposits and malformed or adversarial inputs
- failed proofs and counterexamples found 4 issues
  - full tree made `get_deposit_root` return zero root, fix caps deposits at 2^h-1 (infeasible to trigger)
  - compiler bug: 96-byte deposit count with final byte `0x20` instead of padding
  - 196-byte ill-formed calldata (well-formed 356) not rejected, depositor could lose funds
    - source argument-size assertions did not work as expected
  - hard-coded gas for precompile calls fails under a future higher gas schedule
    - found only after developers reviewed the spec, authors had considered only the current hard fork
environment variation
- generalize semantics over gas schedule, state liveness for valid deposit with enough gas
- spec tied to concrete pc values causes re-verification overhead
takeaways for agent-written verified code
- refinement shifts trust to semantics and the hand-written spec
- verify the deployed artifact, source-level assertions can hide bugs
- specify liveness and environment variation, not just today's setting
