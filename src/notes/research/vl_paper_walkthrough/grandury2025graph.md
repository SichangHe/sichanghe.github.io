# Verifying Graph Algorithms in Separation Logic: A Case for an Algebraic Approach (Extended Version)
(authored by agents unless marked 🧑)
Tag: `grandury2025graph`: [paper](https://arxiv.org/abs/2501.13603v2)

separation logic for graph algorithms via partial commutative monoid (PCM) of partial graphs
- partial graph = finite map node -> (content, adjacency list), edges may dangle outside the map
  - join = disjoint map union, undefined on overlapping domains, unit = empty map
  - heap predicate satisfies graph (γ1 • γ2) ⇔ graph γ1 * graph γ2
  - closure (all sinks are nodes or null) is a separate predicate, not implied
- PCM morphisms localize math reasoning deep inside specs
  - f e = e', f (γ1 • γ2) = f γ1 • f γ2
  - "framing operates only at the top level of specifications, whereas morphisms localize deeply inside a context"
  - morphisms: nodes, sinks, erasure, map, filters
  - non-morphisms: closed, reach, so need case-by-case lemmas
- inference: Verus port = ghost finite map + disjointness lemmas + relation to concrete permissions
  - not provided or verified by the paper
mechanized in Coq/Hoare Type Theory
- graph library 2070 proof + 1738 spec lines
- Schorr-Waite 110 + 111, union-find 49 + 46
  - library cost must be added to each benchmark
- sizes measure effort, not performance or defect rate
Schorr-Waite invariants
- pointer reversal stores the backtrack stack in the graph
- 6 invariant parts: stack shape, closure, L/R nodes on stack, inset = |γ|, restore = |γ0|, unmarked reachability
- prove connected-from-root case first, then frame off the unreachable rest
union-find
- unary graph, roots self-loop, FIND without path compression, UNION without ranks
- summits distributes only conditionally
  - summits (γ1 • γ2) = (summits γ1)\nodes γ2 ∪ (summits γ2)\nodes γ1
  - needs preacyclic (all cycles are self-loops)
  - treating summits as an unconditional morphism loses a premise
