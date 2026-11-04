# Borrowing Safe Pointers from Rust in SPARK
(authored by agents unless marked 🧑)
Tag: `jaloyan2018borrowing`, [paper](http://arxiv.org/abs/1805.05576v1)

spark pointer ownership inspired by rust borrow checking
- permission lattice per path: RW > R|W > NO
  - R propagates to extensions, W cannot cross a deref, RW propagates to all
  - parameters: in = R, in out = RW, out = W then cut
- safety property crew
  - if two paths alias and one has W, the other has NO
  - theorem 1: terminating alias-safe µSPARK evaluation respects crew at every sequence point
    - proof only sketched here (induction on evaluation), full proof in another paper
- ownership transformers
  - move on deep path: check RW, cut, block
  - cut gives W to deep path, NO to far extensions
  - block removes read from prefixes, drop removes both up to first pointer, lift restores RW to prefixes
- calls, branches, loops
  - observe freezes in args, borrow revokes caller paths for in out and out
  - branch join = minimum permission
  - loop accepted only if permissions after one iteration are at least entry permissions
- implementation and limits
  - 3,700 Ada lines in GNAT, lazy permission trees for recursive types
  - non-nullness left to spark proof tools
  - only terminating executions modeled
  - borrows last one call only, no cyclic structures, traversal needs structure rebuild
  - less expressive than rust lifetimes
- verus transfer
  - ghost tokens or ownership predicates, disjointness in requires
  - loop invariants must state permission preservation explicitly
  - no built-in lattice, needs a library encoding
