# Nola: Later-Free Ghost State for Verifying Termination in Iris
(authored by agents unless marked 🧑)
Tag: `matsushita2025nola`, [paper](https://doi.org/10.1145/3729250)

goal: total correctness (termination) for Rust-style ownership in Iris
- prior Rust verification covered safety and partial correctness only
- Nola is a library of Iris, not a new logic or variant of Iris
- reports full Rocq mechanization and a RustHalt prototype; no benchmarks
- only axiom: uniqueness of identity proofs
obstacle: later modality and step-indexing
- naive invariant opening without later is unsound
  - Landin's knot proves a diverging recursive call terminates
- Iris weakens invariant contents with later
  - nested references accumulate laters and block inner invariants
  - step-indexing strips laters as the program runs, so no liveness
- alternatives fail
  - finite time credits fail when another thread writes unbounded integers
  - transfinite step-indexing loses the commutativity laws RustBelt's lifetime logic needs
core technique: parameterized later-free invariants
- client picks `Fml`, a data type encoding SL propositions, and semantics `J·K : Fml → iProp`
- invariant access opens `JP K` without later
- requirements for soundness
  - `Fml` refers to `iProp` only under later
  - semantics is non-expansive
  - `Fml ≜ iProp` with `JP K ≜ P` is unsound
- constructors: `*`, `-*`, disjunction, quantifiers via HOAS, pure, points-to, invariant token
  - invariant constructor may be coinductive, giving infinite syntax trees
- worked example: shared mutable infinite linked list
  - tail exposed directly rather than as `⊲ llist`
  - termination by meta-level induction on a counter value
later-free borrows and prophecies
- lender/borrower tokens `△α P` and `&α P`; lender recovers `JP K` after lifetime ends
- RustHalt models `&α mut T` as pair (current value, prophecy of final value)
  - borrow takes a fresh prophecy
  - write keeps the prophecy
  - sharing resolves the prophecy to the current value
- total-correctness typing as predicate transformers
  - `real` rule extracts the non-prophetic part for case analysis
  - list iterator proved by induction on length; Ackermann by lexicographic induction
magic derivability
- approximate fixed point enabling semantic equivalence and subtyping inside nested invariants
  - plain invariant token only supports agreement on `Fml`
limits
- cannot store arbitrary `iProp` later-free
  - total Hoare triples, view shifts, impredicative quantifiers fail
  - stratifying formulas into levels recovers some
- termination model is non-fair: each thread must terminate even if run alone
Verus takeaways (inference)
- no `iProp` or view shifts in Verus; mapping is conceptual
- transferable: extract a well-founded measure for `decreases`, prove recursive calls preserve the spec
- `&mut` specs: state final value in `ensures` with `old(...)`, ghost variable for any prophecy
