# A verified implementation of the Misra and Gries edge coloring algorithm
(authored by agents unless marked 🧑)
Tag: `bhoja2025misra`, [paper](https://arxiv.org/abs/2512.13999)

lean 4 implementation of misra-gries (vizing's theorem): proper edge coloring with at most Δ+1 colors
- claims polynomial time, but no runtime bound is formalized, no benchmark
- no proof synthesis; author says an interactive prover "was essential"
- trusted: Lean, Mathlib/core, automation (omega, grind), graph model
data representation first, then invariants
- executable lists/arrays, not abstract Mathlib types, for efficiency
  - cost: "significant additional work"; statements and proofs harder
  - author's pick: efficiency, then automation-friendliness, then ease of statements
- structures carry invariants as fields
  - graph: size, symmetry, no self-loops
  - coloring: n×n `Option (Fin c)` matrix; entries are edges, incident colors distinct, symmetric
  - edges are ordered pairs (Sym2 complicates statements), symmetry lemmas patch over it
- verus analog (inference): `type_invariant` + ghost views, `requires`/`ensures` re-establish invariant
mutation contracts
- recolor sets both symmetric cells, proved to
  - preserve size, symmetry, properness, graph membership
  - change only the target edge
  - change color counts at endpoints by known amounts
- proofs "long and technical", casework over indices; omitted from the paper
fans
- fan = nonempty distinct neighbors, adjacent entries satisfy color property, stated with `Chain'`
- `add` grows the fan by searching unused neighbors, terminates on candidate list length
  - `fun_induction` makes fan and maximality proofs simple
- rotate: recolor last edge, rebuild shorter fan, recurse
  - `Fan` type depends on the coloring, so shortened fan must be re-proved a fan
alternating paths
- invert by uncolor-all then recolor-swapped, not in-place flip
  - in-place flip fails since `setEdgeColor` only accepts valid colors
  - eases invariant proofs
- "not already in path" lemma is ~75 lines, never justified in the informal proof
main algorithm
- `extendColoring` recurses on uncolored edge count
  - fan rotation if free colors agree
  - else invert path, find subfan, rotate
- properness holds by construction (coloring type), completeness proved by induction
- subfan existence lemma needs "extensive casework and arithmetic", omitted
takeaway
- even a well-specified graph algorithm needs heavy proof structure; high bar for agent-written verified Rust
