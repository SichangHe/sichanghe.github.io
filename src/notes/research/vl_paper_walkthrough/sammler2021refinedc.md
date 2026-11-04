# RefinedC: Automating the Foundational Verification of C Code with Refined Ownership Types
(authored by agents unless marked 🧑)
Tag: `sammler2021refinedc`, [paper](https://doi.org/10.1145/3453483.3454036)

refinedc verifies low-level c via ownership types refined with logical facts, checked in coq
- automation is lithium, a restricted separation-logic language whose rules are iris lemmas
- targets functional correctness of pointer-heavy code: uninit memory, pointer arithmetic, some concurrency
- partial correctness only, no termination or liveness
specs are refinement-indexed ownership types
- allocator example: `mem_t` refined by available bytes `a`, buffer `&own<uninit<a>>`
  - `rc::args`, `rc::returns`, `rc::ensures` give input ownership, nullable result, updated ownership
  - result `{n≤a} @ optional<&own<uninit<n>>, null>` verified with no manual proof
- weakened spec `n<a` fails at `n=a`, diagnostic names the branch and unsolved condition
  - shows spec is checked against code, not that spec matches intent
recursive structures need existential head/tail plus an explicit loop invariant
- free list: sorted chunks refined by multiset `s = {[n]} ⊎ tail`, `n ≤` all tail
- loop invariant holds the suffix ownership plus a magic wand back to the full list
- `rc::tactics("all: multiset_solver.")` for multiset side conditions
- singly linked list row: overhead ~0.2 (annot + pure over impl), 47/5 auto/manual pure goals
lithium is goal-directed and never backtracks
- judgment: unrestricted Γ, resources Δ, goal G; resource atoms non-duplicable
- ∀ goal introduces a fresh var, ∃ goal an evar; pure goals go to a built-in linear-arith/list solver
- evar heuristics are incomplete; only 1 manual instantiation across all case studies (Spinlock)
- largest case: hafnium mpool allocator, 191 loc c, 55 annotation lines, overhead ~0.3
- solver obligations needing a named solver count as manual
semantic foundation
- c goes through cerberus to caesium, a deep coq semantics with a compcert-like memory model
  - supports pointer arithmetic, poison, goto, function pointers, sc atomics
  - lacks int-pointer casts and relaxed memory, no external calls or i/o
- new idiom = new type + lithium rule, proved sound in iris, added to the open rule set
- concurrency via atomic boolean abstraction tying a resource to an atomic state (spinlock, one-time barrier)
- tcb: ~6000 loc ocaml front end, ~1500 loc caesium, coq; lithium itself untrusted
case studies
- linked lists, queues, binary search, two bsts, allocators, hashmap, hafnium page allocator, spinlock, one-time barrier
verus transfer (inference)
- `requires`/`ensures` + representation predicate replace refinement args/returns
- loop `invariant` splits traversed prefix from suffix; wand becomes a prefix/suffix frame predicate
- ownership types and iris resources do not carry over, state invariants explicitly
