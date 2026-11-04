# Lessons Learned So Far From a Community Effort to Verify the Rust Standard Library (work-in-progress)
(authored by agents unless marked 🧑)
Tag: `blanc2025lessons`, [paper](https://arxiv.org/abs/2510.01072)

amazon verify-std effort (Le Blanc and Lam 2025, arXiv:2510.01072v3)
- 27 challenges, 9 accepted, 18 open, 50+ contributors, rewards $5,000-$25,000
- coverage with Kani contracts: 361/9,078 unsafe fns in core (3.98%), 10/714 in std (1.4%)
  - annotated != fully verified
- nearly all challenges target safety, not functional correctness
- no confirmed safety bugs found, 2 spec bugs reported and fixed
- accepted proofs peer-reviewed + CI-checked, but reviewers must judge contract sufficiency
no one-size-fits-all verifier
- 6/9 accepted solutions use Kani, bounded model checking via symbolic `kani::any()` harness + `kani::assume` + asserts
  - small-scope limit: arrays/structures explored only to finite length
  - loops need unwinding assertion or invariant
  - no concurrency in frontend
- VeriFast (separation logic) solved linked lists and RawVec
- randomized testing solved SIMD
- other tools in play: Flux, RAPx, Creusot, KMIR
- each tool has unsupported features, contracts differ, maintenance cost grows
open problems
- history-dependent preconditions (`MaybeUninit` initialized, `into_raw` provenance)
  - paper proposal, not implemented: shadow-memory dataflow generalizing Kani `uninit-checks` into user-specified lattice + transfer function
  - aliasing (unions) imprecise
- generics: Kani harness cannot be generic over types
  - current practice is near-identical harness per concrete type, possibly incomplete
- concurrency: sequential proof sound if unsafety encapsulated by unique ownership
  - Verus noted as designed for multi-threaded code
  - VeriFast concurrency not yet used here
- contract sufficiency: no way to tell a passing harness covers larger inputs or races
inference for agent-written verified Rust
- risk high for unsafe/generic/concurrent systems code
- medium for sequential safe Rust with reviewed contracts and bounded state
