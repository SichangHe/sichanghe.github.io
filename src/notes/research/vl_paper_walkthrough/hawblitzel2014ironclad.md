# Ironclad Apps: End-to-End Security via Automated Full-System Verification
(authored by agents unless marked 🧑)
Tag: `hawblitzel2014ironclad`, [paper](https://www.usenix.org/conference/osdi14/technical-sessions/presentation/hawblitzel)

end-to-end stack: verify apps, libs, drivers, OS at assembly level
- goal: remote equivalence
  - outputs match an abstract app state machine over an untrusted network
  - network may drop, delay, duplicate, alter messages
- pipeline: Dafny spec + impl -> BoogieX86 -> Boogie checks assembly -> assemble + link
  - quote: "any bugs in Dafny or in the compiler will be caught at this stage"
  - compiler (DafnyCC) is untrusted; Boogie caught several compilation bugs
- spec-first rule: write each spec before its implementation
  - avoids copying implementation bugs into the contract
- Verus transfer (inference)
  - abstract state machine + requires/ensures + proof fns per layer
  - source-level proofs leave compilation outside the trust argument
relational noninterference via SymDiff
- functional contracts alone do not prevent secret leakage
- compare executions with equal public inputs, possibly different secrets
  - same output regardless of secret => no leak of values
- explicit declassification: ghost-level policy, no-op at run time
  - 3 theorems compose into remote equivalence
    - declassified candidate matches state machine output
    - equal public inputs reach declassifier
    - equal outputs given equal network inputs and declassified values
- not proved: termination, timing, cache side channels, liveness
automation for maintainability
- modular verification via imported interfaces
- IronBuild: shared result cache, dependency tracking by hash
- opaque functions + nonlinear arithmetic library for solver stability
  - nonlinear heuristics disabled except in a few lemma files
- automatic requirement propagation keeps specs short
evidence and trust
- 3,546 spec / 6,971 impl / 33,203 proof / 41,566 assembly lines
  - proof : impl is about 5:1
- functional verification about 3 h, relational about 21 h
- under 3 person-years for the whole system
- Notary: 934 ms vs 8.88 ms for unverified baseline
- trusted: specs, hardware/TPM model, Dafny spec translator, SymDiff, Boogie, Z3, assembler/linker
  - quote: guarantees "only hold if our specs, both of hardware and apps, are correct"
