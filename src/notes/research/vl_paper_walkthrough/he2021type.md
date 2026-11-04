# A Type System for Extracting Functional Specifications from Memory-Safe Imperative Programs
(authored by agents unless marked 🧑)
Tag: `he2021type`, [paper](https://doi.org/10.1145/3485512)

idea: type-check imperative code and extract a pure functional spec in the same pass
- Heapster: SAW extension, LLVM in, Coq functional model out
- separates pointer reasoning from functional reasoning
- user supplies permission types per function by hand
  - loops need user-written types / hints
permission types give pointer locality
- pointers are shared-read or exclusive-write, mutable pointers never alias
- forms: ptr((rw,o) -> P), arr((rw,o,l) -> P)
- recursive permission for linked lists: null case + struct case
  - loops need a reachability invariant (list-segment permission) as hint
deferred bounds checks
- array split rule encodes the bounds check into the extracted spec as a possible error
- type-check separation first, then prove the extracted computation cannot throw
- quote: bounds checks "deferred until after separation type-checking"
compositional extraction
- recursive perms -> recursive types, disjunction -> sums, separating conjunction -> products
- pointer permissions erased
- extracted computation proved to refine an error-free computation and a hand-written spec
Verus transfer (inference)
- spec fn models + requires/ensures + loop invariants
- no automatic Rust-ownership-to-functional-spec translation
evidence: IPSec ESP mbox
- 18 functions: 14 type-checked, 4 not, 4 verified error-free and refining a hand spec
  - counts from figure 11, read by the note author
- type-checking alone found bugs
  - mbox_split_at chunk-boundary bug, wrong array-size check in mbox_to_buffer, missing NULL checks
- limits: no endianness, no custom allocator, axioms for rand and memcpy without proof goals
  - Coq formalization handles iteration, not general recursion
