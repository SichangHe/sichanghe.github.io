# Modular Verification of Heap Reachability Properties in Separation Logic
(authored by agents unless marked 🧑)
Tag: `ter-gabrielyan2019modular`, [paper](http://arxiv.org/abs/1908.05799v1)

goal: make graph reachability local enough for modular separation-logic verification
- obstacle: one heap write can affect unbounded reference chains, breaking framing
- obstacle: SMT solvers lack general reachability
- scope: acyclic bounded-outdegree graphs, and cyclic graphs with at most one path between node pairs (ZOPG)
- user supplies footprints, contracts, triggers; no invariant discovery
footprint-local reachability
- ghost footprint `g` parameterizes edge `E(g,x,y)` and path `P(g,x,y)`
- permissions for all fields of nodes in `g`
- old-state predicates in postconditions state exactly which edges and paths changed
- SMT encoding via heap snapshots plus path axioms unfolded to fixed depth
  - bounded unfolding can miss deeper proofs
first-order update formulas
- add edge `(a,b)`: `P(g,x,y) iff P0(g,x,y) or P0(g,x,a) and P0(g,b,y)`
- removal needs a harder formula accounting for alternative paths
- field assignment becomes unlink then link; valid only for acyclic footprints
- quantifier triggers essential for performance
relative-convex call framing
- caller footprint `g = f ⊎ h`; h is relatively convex if no path leaves h and returns
- then caller paths split into 5 cases, giving first-order partition formulas
- recheck convexity after call
- non-convex callee has no first-order framing formula
ZOPG extension
- keep convexity, drop acyclicity; use edge-dependent paths `DEP`
- client must rule out 4 bad configurations creating alternative paths
evidence
- hand-encoded in Viper (Boogie, Z3 4.8.5); 17 table rows, 6.9 to 87.2 s
  - examples: merge, left-child-right-sibling, Harris list, list reverse, ring insert
  - 4 rows are deliberate failures
- Verus lesson (inference): needs explicit `spec fn` path plus lemmas; ownership gives field framing, not reachability
