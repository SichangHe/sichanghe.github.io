# Verifying the Rust Standard Library
(authored by agents unless marked 🧑)
Tag: `cook2026verifying`, [paper](https://doi.org/10.1007/978-3-032-28079-4_19)

community challenge program makes std verification distributed + CI-checked
- each challenge: target, assumptions, success criteria, reward
- contributors fork, submit pr, technical committee reviews; ci reruns all proofs per pr
- 29 challenges, 450+ prs, 21+ external contributors from 4 institutions
- tools: Kani, ESBMC, VeriFast, Flux (Verus, Creusot, KRust, RAPx under review)
  - "no single tool can discharge all verification conditions"
- found no new memory-safety vuln; found wrong simd results, missing unsafe annotations, wrong safety comments and panic docs
- lessons: consensus + legal agreements took months (schedule, not proof, evidence)
Kani autoharness synthesizes symbolic harnesses at mir level
- eligible: monomorphic, args implement `kani::Arbitrary`, not kani-internal
- 16,748 harnesses, 11,970 (71.5%) pass checked ub classes, 4,778 fail (missing models, timeouts, unsupported)
  - only 295 passing have contracts; +694 manual contract proofs = 989 contract-verified functions
- 17,207 skipped: 56% generic, 22% no `Arbitrary`, 19% kani internals, 3% other
- covers oob, null/dangling, uninit reads, some overflow
  - not aliasing (stacked/tree borrows), data races, inline asm, all provenance ub
validity invariant ≠ safety invariant
- derived `Arbitrary` gives bit-valid values, may break semantic invariants (e.g. `Duration` nanos < 10^9)
- `Invariant::is_safe()` assumed by contract harnesses
  - unannotated types tested over all bit-valid values, failures may be spurious
- verus analogue: `spec fn` predicate + `requires`/`ensures` (inference)
loop reasoning: bounded vs inductive
- default: unroll + unwinding assertion, only covers up to bound
- loop contracts: inductive invariant check, bound-independent
- no loop variant support in the campaign, so termination unverified
separation logic for pointer-heavy code
- VeriFast proved LinkedList: 19 functions, implies 5 more safe ones
- recursive `Nodes` predicate with `&*&` rules out aliasing + cycles
- needs ghost commands + source edits
  - refinement check + diff vs upstream show edits preserve behavior
- assumes `'static` allocator lifetime, tree borrows not fully checked
ci performance
- 16,748 harnesses make compilation the bottleneck
- parallelization, caching, codegen ordering, stubbing: 3.97x speedup
trust and limits
- 565 simd intrinsics validated by randomized testing only (found 2 upstream bugs)
- trusted: mir-to-goto translation, cbmc, solvers, verifast executor, intrinsic/ffi models, contracts
  - none of the tools is itself verified
- "verified" = scoped theorem under these models
