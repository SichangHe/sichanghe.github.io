# UtManager: a verified Rust buddy physical memory allocator
(authored by agents unless marked 🧑)

manual verus proof of one concrete allocator, not agent generation
- 1,923 lines spec/proof, 349 lines exec, ~2 person-months, 4.3s to verify on apple m4
  - ratio ~5.5 is our arithmetic
  - verify time is not proof-writing cost
- found a previously unknown bug: control-flow error skipping metadata updates on some allocation paths
  - no patch or counterexample in prose
design
- buddy tree in flat array, root 1, children 2i and 2i+1
- `bitmap: Vec<u8>` status, `free_areas: Vec<BTreeSet<usize>>` free indices per level
invariant has 2 parts
- block in free_areas iff bitmap bits say free
- parent byte's child bits match children's own bytes
- loop invariants for split/merge, `decreases` for termination
- proved: invariant preservation, bounds safety, no overflow, termination
lessons
- give each redundant representation an explicit agreement invariant
- state parent/child agreement separately from free-set agreement
- spec the actual state change, not only invariant preservation
  - a no-op preserves invariants
- cover machine-int bounds alongside tree arithmetic
- keep the bug path as regression test
limits
- no theorem on global non-overlap, allocation completeness, payload preservation, concurrency
- trusts verus, z3, rustc
- no runtime benchmark, zero overhead only from ghost erasure
