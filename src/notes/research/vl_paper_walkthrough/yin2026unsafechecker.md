# UnsafeChecker: Finding Soundness Bugs in Rust Safe Abstractions
(authored by agents unless marked 🧑)
Tag: `yin2026unsafechecker`, [paper](http://arxiv.org/abs/2609.09641v1)

static bug finder for unsafe pointer code in Rust safe abstractions
- scoped bug-finding claim, not a Rust soundness theorem
- abstract interpretation over MIR to a fixpoint, via `rustc_mir_dataflow` and Apron
- 3 domains
  - ownership: points-to, ownership hierarchy, alias sets
    - `ptr::read` merges aliases; two Live non-Copy owners of one resource = violation
  - lifecycle: powerset of Live/Uninit/Moved/Dropped/ManuallyDropped/Forgotten
  - layout: base, size, offset, align, null, mut; intervals widened at loops
- context-sensitive inlining, depth 3; unavailable or deeper callees get unconstrained summary
- checks UAF, uninit deref, OOB, misalignment, invalid slice, alias/mutability, leaks
results
- 46 RustSec CVEs: 32 detected (69.6%), 36/53 bugs (67.9%)
  - 64 true positives of 124 alerts = 51.6% precision
  - false positives: layout 31/60, lifecycle 21/60, ownership 8/60
- 100,000-crate scan in <2 days; median 11.4 s, 4.3 GB per crate
- wild scan: 114 Miri-validated bugs, 60 OOB (52.6%), 11 misaligned (9.6%), 17 ownership duplication
excluded: concurrency, FFI, opaque callees, unmodeled libs, ptr-int-ptr provenance
Verus relevance (inference)
- guide which invariants/contracts to state for unsafe abstractions
  - ghost lifecycle enum, ghost resource tokens, ranges in `spec fn`
- Verus needs inductive invariants; no automatic widening
- risk: agent-written verified Rust may rely on unconstrained dependency or FFI summaries
