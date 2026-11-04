# Precise Reasoning about Container-Internal Pointers with Logical Pinning
(authored by agents unless marked 🧑)
Tag: `guan2025precise`, [paper](https://doi.org/10.1145/3779031.3779096)

problem: hiding internal pointers keeps predicates modular but clients cannot prove cached pointers stay valid
- logger example: cache pointer via `get`, call `set_level_all`, reuse pointer
  - ordinary postcondition allows relocating loggers
- pointer stability: subparts neither deallocated nor relocated
logical pinning: lightweight borrowing model for sequential programs, no change to underlying separation logic
- classify writes
  - in-place write mutates without moving
  - full write may free or relocate, invalidates exposed pointers
- borrowable state per selected subpart, 4 cases
  - Owned v: available, floating
  - Offered v qs: available, pinned
  - Borrowed qs: unavailable, pinned
  - Missing: unavailable, untracked
- pinned value may be mutated, returned only at the same location
- `get` turns Owned into Offered with the pointer added to alias list
  - no ownership detach
- logical borrow and return detach a subpart for local proof, restore at same location
representation lifting
- ♭R: borrowable pair (option value, list of exposed locations)
  - value part holds when available
  - location part: every alias equals canonical location
- lists and trees lifted compositionally
  - borrowable elements, tails, subtrees
- ∗ models pointer indirection, composes with ♭
  - ∗♭R borrows pointee only
  - ♭∗R borrows pointer cell with pointee
  - order matters, ∗♭R differs from ♭∗R
hard operations handled
- element swap via memswap on two offered elements
- append, push_front, push_back keep input head pointers
- tree left rotation keeps original root address tracked
- overlapping subtree compare uses non-separating conjunction
evidence
- mechanized in rocq on core CFML
- examples only: logger, cells, arrays, records, lists, trees
  - no benchmark, no obligation counts, no timings
limits
- sequential only
- open: concurrency, unrestricted graph sharing, fractional permissions, invariant tracking, automatic derivation
- lifting changes datatype shape, existing APIs need new representation predicates
- humans must choose borrowable subparts and in-place operations
verus transfer (inference)
- ghost enum or option plus location, spec fn relating it to node
- proof fn for pin, borrow, return lemmas
- rust ownership handles ordinary aliasing
  - non-separating overlap needs explicit relation, not two `&mut`
- threat to agent-written verified rust
  - agent can prove list contents while leaving relocation and aliasing unspecified
  - incomplete contract can pass the verifier without pointer stability
