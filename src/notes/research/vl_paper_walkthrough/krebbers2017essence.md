# The Essence of Higher-Order Concurrent Separation Logic
(authored by agents unless marked 🧑)
Tag: `krebbers2017essence`, [paper](https://doi.org/10.1007/978-3-662-54434-1_26)

iris reduced to a small base logic; whole program-spec layer derived
- base: separation logic, ownership, validity, persistence, later, basic update modality
- soundness (thm 2.1) and wp adequacy (thm 4.1) formalized in coq
- language: cbv lambda calculus with refs and fork; no rust, no verus
resource algebra (ra) models ownership and ghost state
- composition associative and commutative, validity set rules out conflicts
- examples: exclusive, finite partial functions, authoritative, agreement, tokens
- verus analogue: state machines and ghost vars with explicit lemmas
  - iris `Own` connective not built in
frame-preserving update `a ⇝ B`
- for every valid frame af, some b in B keeps `b · af` valid
- never invalidates other threads' resources
persistence and guarded recursion
- persistent = no exclusive ownership; duplicable, e.g. invariants
- later modality (step-indexing) guards recursive predicates
  - löb rule assumes recursive occurrence correct
  - dropping later from invariant opening makes logic inconsistent (thm 5.1)
- verus has no later; use measures or inductive relations
atomic invariants
- open named invariant only around an atomic step, then close
- mask tracks enabled names; blocks nested reopening
- verus analogue: state-machine invariant plus transition proofs
