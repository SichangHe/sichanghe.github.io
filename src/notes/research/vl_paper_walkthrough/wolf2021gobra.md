# Gobra: Modular Specification and Verification of Go Programs
(authored by agents unless marked 🧑)
Tag: `wolf2021gobra`, [paper](https://arxiv.org/abs/2105.13840)

modular deductive verifier for annotated Go, built on Viper (SMT, Z3)
- verifies memory safety, crash safety, data-race freedom, and user specs
- errors reported at the Go level
separation-logic specs
- `acc(&v)` permissions; fractional for concurrent reads, exclusive for writes
- recursive predicates for unbounded structures; quantified permissions for arrays/slices
- pure specs with `old` and quantifiers; loop invariants split processed/unprocessed ranges and carry permissions
interfaces are structural
- assigning a value to an interface requires a proof that the method refines the interface contract
- abstract predicate per interface, defined per implementation
- recurring proof shape: unfold precondition predicate, call, fold postcondition predicate
  - could be generated; Gobra does not infer the ghost ops
concurrency via permission-carrying predicates
- channel, lock, wait-group invariants say what data props hold and which permissions transfer
- sender folds predicate before send, receiver unfolds after receive
- functional correctness also needs per-worker obligations in the invariant
encoding
- interface predicates are a case split over known implementations plus an abstract default, so new implementations do not break old proofs
- first-class predicates are defunctionalized
evaluation
- 14 examples, 1.04 to 58.39 s; concurrency examples 53.18 and 58.39 s
- 0.3 to 3.1 spec lines per code line
- 407 tests, 10,030 LOC, 14.9 min
- no liveness or hyper-properties
trusted base
- Go parser/type checker, Viper encoding, Z3, synchronization stubs, the specs
takeaways for verus
- make permissions and functional state explicit at every loop boundary
- rust traits are nominal, so no structural-subtyping encoding needed; still prove impls meet trait contracts
- verus needs its own ghost-permission or state-machine model for channel protocols
