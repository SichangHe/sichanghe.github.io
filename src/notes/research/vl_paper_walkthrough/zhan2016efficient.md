# Efficient verification of imperative programs using auto2
(authored by agents unless marked 🧑)
Tag: `zhan2016efficient`, [paper](http://arxiv.org/abs/1610.06996v3)

two-stage workflow in Isabelle auto2
- prove a functional version, then refine to imperative code with separation logic
- case studies: union-find, red-black and interval trees, priority queue, Dijkstra, rectangle intersection
saturation-based proof search
- keeps facts and terms, scores new items, applies all registered steps until contradiction
  - contrast: backtracking tactics
- small propositions get priority
- case-analysis boxes propagate negations to the parent
- Verus (inference): no saturation API
  - closest: reusable lemma fns, triggers, explicit `assert`
tables reused instead of reproving
- rewrite table: ground equalities, E-matching
- property table: sortedness, tree invariants
- well-formedness table: side conditions like `i < length xs`
arithmetic
- natural subtraction normalized only after side conditions are present
- difference logic: transitive inequalities, negative self-edge is a contradiction
guided induction
- only human hint is the induction scheme (`@prop_induct`)
  - automation closes the routine cases
separation logic refinement
- Hoare triples with frame rule
- forward symbolic matching of each command against spatial precondition, pure side conditions proved
- inductive assertions (lists, trees) expanded on demand
- abstraction layers: concrete triple, then abstract triple over a map
  - concrete proof steps hidden afterward for modularity
- Verus (inference): no built-in separating conjunction; ownership and disjointness must be encoded
evidence
- 49 imperative lines / 26 theorems for union-find, 270/83 red-black tree, 44/62 Dijkstra
- all examples ~14 min on a laptop (2 cores, 16 GB)
limits
- sequential programs, simple allocation
- Dijkstra assumes vertices 0..n-1 and an off-heap unchanged graph matrix
- union-find omits the size-array performance invariant
- trusted: Isabelle kernel, auto2 ML code, registered steps, separation-logic definitions, human induction hints
