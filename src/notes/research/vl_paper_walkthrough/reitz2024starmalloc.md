# StarMalloc: A Formally Verified, Concurrent, Performant, and Security-Oriented Memory Allocator
(authored by agents unless marked 🧑)
Tag: `reitz2024starmalloc`, [paper](https://arxiv.org/abs/2403.09435v1)

verified concurrent allocator in F★/Steel (concurrent separation logic), extracted to C
- designed from hardened_malloc; drop-in replacement
- size: 26,000 lines F★ extract to ~4,300 lines C
  - table 2 total 26,102 lines incl. 303 lines C glue; paper does not reconcile
- two person-years; verification 30-40 min on a laptop
- 27 size classes (16-byte multiples to 4 kB page), 4 arenas in evaluation, per-size-class locks
- steel signature guarantees memory safety, functional correctness, thread safety
layered ownership specs
- malloc contract: non-null result has length >= requested size
- generic combinators reused across layers
  - `starseq`: sequence as indexed separating conjunction
  - `sldep`: ownership of metadata tied to a predicate on its contents
  - `slrefine`: ownership plus pure well-formedness
- layers: arena, size class, slab (page), slot; slot bitmap in separate mapped region
  - slabs partitioned into empty/partial/full lists; avl tree tracks large allocations (> 4 kB)
  - frozen array: concurrent read-only access to initialized size-class descriptors
- verus analog (inference): `spec fn` ownership predicates, ghost maps for large extents, lock api per size class
security mechanisms as local spec extensions
- zeroing: postcondition says every returned byte below size is 0
- quarantine: 4th slab list, fifo reclaim, `madvise(DONT_NEED)`
- guard pages: 5th list, `PROT_NONE`, monotone guard predicate
- changes touch only affected layers
- canaries described informally, no proof
- proof says allocator stays correct with these mechanisms, not that they defeat attacks (needs an attacker model)
trusted base and limits
- axioms for syscalls, e.g. mmap; assumes mmap returns page-aligned memory
- model cannot prove absence of deadlock; scoped `with_lock` combinator mitigates
- F★ normalizer in tcb; specializes generic code from size-class list before KaRaMeL extraction
  - extraction/compilation correctness not established by that reuse
performance
- 4-core xeon e5-1620, linux 6.1, glibc 2.38; 30 benchmarks normalized to hardened_malloc = 1.0
  - most real-world apps 0.84x-1.38x
  - outliers: redis 16.379x, rptestN 19.537x, espresso 2.284x, lua 1.554x
  - redis cause: many allocations slightly above page size (large-allocation path)
- firefox 118.0.2 jetstream2: 5.1% overhead vs hardened_malloc build, 12.1% vs glibc build
- blocks fastbin_reverse_into_cache, fastbin_dup, tcache poisoning; caught use-after-free cases and bzip2 cve-2016-3189
  - no total attempted-exploit count
