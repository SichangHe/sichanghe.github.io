# Auto-active Verification of Graph Algorithms, Written in OCaml
(authored by agents unless marked 🧑)
Tag: `castanho2022autoactive`, [paper](https://arxiv.org/abs/2207.09854v1)

Cameleer verifies OCamlgraph structures and algorithms (GOSPEL contracts to Why3), 4 SMT provers
- code is OCaml; every Verus mapping is inference
- verified: persistent labeled graph, imperative digraph, cycle finder, 2 BFS path checkers
- proofs mostly automatic; BFS completeness, `find_all_edges` needed manual lemmas and splits
- not proved: all 19 graph variants, higher-order clients, complexity
- trusted: GOSPEL specs, module axioms, Cameleer, Why3, provers
certificate validation instead of proving producer
- cycle finder returns a vertex list; prove `is_cycle`/path checker equivalent to logical predicate
  - `is_cycle l g = len <> 0 /\ is_path l[len-1] l l[len-1] g`
- producer only needs termination and no exceptions; checker independent of producer
- completeness (cycle exists implies found) stays a separate property
- Verus: `spec fn valid_cycle` + exec `check_cycle` with `ensures` iff
BFS reachability invariants
- queue soundness: every queued vertex reachable from source
- frontier completeness: path to target and empty queue implies unvisited vertex in queue, contradiction
  - needs ghost `intermediate_value`: first edge along a path crossing predicate p (true to false)
  - plus lemma lifting list result to `Seq` path
- closure invariant: children of visited vertices are visited or queued (automatic)
- false-result proof costs much more than true-result proof
- variant: ghost `visited` + executable `marked` table separates queue from visited, simpler completeness proof
representation invariants on data structures
- record invariant: successors in domain, edge (v2,l) in v1 implies (v1,l) in v2
- prove every mutator preserves it; queries assume it
- Verus: `wf` predicate or `#[verifier::type_invariant]`
modular abstract model
- graph module signature with model `dom` and `suc`; algorithms are functors over it
- Verus nearest: traits + generics with `spec fn` model
- comparison ordering assumed as boundary axiom `is_pre_order compare`; trusted, record it
contracts with termination
- `requires`, `ensures`, `variant n` (Verus `decreases`); postcondition conditional on precondition
- when SMT fails: split VC, add small helper lemma (e.g. list-mem to seq-mem)
