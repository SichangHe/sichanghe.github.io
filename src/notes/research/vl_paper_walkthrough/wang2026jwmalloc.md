# jwmalloc: A Verified Memory Allocator for Mobile Devices
(authored by agents unless marked 🧑)
Tag: `wang2026jwmalloc`, [paper](https://www.usenix.org/conference/osdi26/presentation/wang-jiawei)

jwmalloc is a mobile allocator verified under weak memory models (wmm) with the VSync toolchain
- properties: memory safety, no data races, loop termination, functional correctness
- bounded: only specialized multi-thread clients are explored, uncovered corner cases unverified
- paper says RefinedC and Verus reason only under sequential consistency
  - verus alone does not cover wmm executions (inference)
bounded wmm verification
- vsync explores all wmm executions of bounded clients, unlike testing
- clients act as specs via asserts, targeted at edge cases
  - frontend: cross-thread frees, draining, thread create/destroy
  - shrink constants, e.g. backend bitmap 64 to 2
- each client verifies within 10 minutes
- found an unknown backend bug in ~10s
  - root node has no sibling but a path assumed one, so out-of-bounds read of uninitialized memory
modular verification by interface substitution
- frontend, midend, backend each expose malloc/free-style api
- verify each as a library, dependencies replaced by system malloc
- rust analogue: trait/spec interface, external_body only for separately trusted deps
closed sibling tree for size-class-exact backend
- size classes S(R) = { n x 2^m | 1 <= n <= 2^R }
- every node weight in S(R), parent = sum of children, contiguous sibling sums in S(R)
  - weight = number of os pages
- split: if m1 <= m2 split directly, else pick Z = ceil(Y/2^m1) x 2^m1 and recurse
  - example X=64, Y=6, R=3: Z=8, 8 splits to 6+2, leaves a 56-page range
- free coalesces siblings, a fully coalesced parent can merge upward
- verus: encode S(R) as spec fn, prove split/coalesce preserve the tree invariant (inference)
ownership transfer with rollback
- range co-owned by Nest (search) and Knit (tree), no atomic acquire of both
- acquire Nest then Knit, on Knit failure undo Nest and retry bounded times, then use a larger range
- release Nest first, on later failure roll back and defer the range
- knit packs sibling states into one atomic var, updated by cas
lifetime-based reclamation and non-blocking fallback
- two-buffer lifetime tracker like gc generations, reclaim neighbors of long-lived ranges first
- countdown starts when a range has no mergeable sibling, reset if a sibling frees
- lock failure: alloc takes a larger range from another class, free pushes to a concurrent list
- obligation: termination bound + capacity invariant
