# Recursive Data Structures in SPARK
(authored by agents unless marked 🧑)
Tag: `dross2020recursive`, [paper](https://doi.org/10.1007/978-3-030-53291-8_11)

spark (Ada) gets heap pointers with Rust-like ownership, no memory model
- VCs via Why3 weakest precondition, stays first-order
- assignment of pointer = move, single writer/multiple readers
- so reasoning treats a pointer almost as the data it points to
- pool-specific access types only
- dereference VC: pointer not null
- excluded: cycles (doubly linked lists), shared substructures (DAGs)
local borrowing and reborrowing
- borrower freezes the borrowed part, ownership returns at scope exit
- borrower init must be a name of a part of an existing object, so aliasing is static
- reborrow only goes deeper (rooted at the borrower), e.g. `Y := Y.Next`
- limit: stack-based traversals cannot be written iteratively
borrow relation
- predicate linking borrower and owner, computed by the tool, updated at each reborrow
- owner reconstructed at end of borrow from relation + borrower value
- loops change the relation per iteration, so it must be in the loop invariant
pledges
- assertion guaranteed to hold when borrow expires, as in Prusti
- ghost `Pledge(borrower, P)` is only a marker, SPARK checks P follows from the borrow relation
- needed only when the relation cannot be tracked, e.g. loops
- `Set_All_To_Zero`: ghost counter C, pledges `Length (X) = Length (Y) + C` and prefix zeroed
evidence
- 6 hand-written examples, 57 to 611 lines
  - red black trees: 37 subprograms, 920 checks, 258 s
- proves runtime checks, no uninitialized reads, hand-supplied functional properties
- annotation effort "non-negligible, but acceptable"
- no existing benchmark since SPARK had no pointers
Verus transfer (inference)
- `&mut` cursor + Rust borrow checker replaces borrower freezing
- owner-cursor relation becomes loop invariant over a ghost sequence or view fn
- no pledge or anonymous access type in Verus
