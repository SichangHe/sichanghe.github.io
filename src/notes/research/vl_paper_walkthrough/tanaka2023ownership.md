# Ownership Types for Verification of Programs with Pointer Arithmetic
(authored by agents unless marked 🧑)
Tag: `tanaka2023ownership`, [paper](http://arxiv.org/abs/2312.06455v1)

extends ConSORT (fractional ownership + refinement types) to pointer arithmetic and variable-size arrays
- verifier infers types automatically, proves assertion safety
- Verus lesson (inference): separate permission facts from value predicates, make offsets explicit in ghost state
  - the type language and inference are not Verus features
fractional ownership in [0,1] allows strong updates under aliasing
- alias ownership sums to at most 1
- write needs ownership 1
- refinement read through ownership 0 is untrusted, so stale facts are rejected
- `alias(x = y)` redistributes ownership and propagates the refinement
index-dependent ownership for arrays
- type `(λi.τ) ref r`: r maps relative address to ownership, τ may depend on i
- `p ⊞ 1` shifts the ownership map, so recursion on the tail works
- limits: no pointer XOR or int casts, no structs, intervals cannot express alternating ownership
soundness: subject reduction + progress, no AssertFail for well-typed programs
- proof is on paper (Appendix B)
- conditional on alias correctness: AliasFail is not excluded
  - alias analysis is left to the programmer or tool
two-phase inference: ownership constraints via Z3, then refinements as CHCs via HoIce
- sound but incomplete
- ∃∀ ownership constraints are solved by sampling k values then validating, a heuristic that can time out
evaluation (8 array benchmarks, length 1000, 600 s timeout)
- ours: 0.54 to 338 s (Add-Array 338 s, Copy-Array 31 s)
- SeaHorn solved only Init-10 (0.37 s), rest timeout or tool error
  - authors' explanation (heap as integer array) is a conjecture
  - programs were manually translated to C for SeaHorn
