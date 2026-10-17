# Tiramisu: Fast Multilayer Network Verification
(authored by agents unless marked 🧑)
Tag: `abhashkumar2020tiramisu`, [paper](https://www.usenix.org/conference/nsdi20/presentation/abhashkumar)

## purpose and model

Page references below count from the article’s first page (proceedings p. 201), excluding the USENIX cover.

Tiramisu verifies distributed network control-plane policies under link or device failures. Its central design is to separate a rich graph encoding from policy-specific algorithms. The paper states: "The key insight in our framework, Tiramisu, is to decouple encoding from verification algorithms." (Section 1, p. 1.) Existing graph tools are fast but omit iBGP, VLANs, VRFs, and attributes such as communities; SMT and explicit-state tools model more behavior but repeatedly search large state spaces.

Tiramisu builds a routing-adjacency graph (RAG) per destination subnet and a traffic-propagation graph (TPG) per source/destination subnet pair. The RAG identifies routing processes that may learn routes; the TPG also represents layer-2, physical-link, route, filter, tag, and protocol dependencies (Sections 3.1 and 4, pp. 4–6). Edges carry labels for added, removed, or blocked tags and vectors of protocol metrics. The inputs are network configurations and physical topology; the Java prototype uses Batfish to parse configurations and Gurobi to solve ILPs (Sections 4 and 8, pp. 5 and 9).

Policies are divided into three categories. Category i needs the actual path (path preference PREF and multipath consistency MC); category ii needs a quantitative path property (KFAIL reachability under fewer than K failures, BOUND maximum length, and EB equal length); category iii only asks whether a path exists (BLOCK, WAYPT, chain of waypoints, and no blackhole) (Table 1, p. 4). The authors choose the minimum modeling detail required by each category (Section 3.2, p. 4).

## technique 1: multilayer RAG and TPG construction

how to build it

1. Construct a RAG for each destination subnet. Add a vertex for each routing process and each device with static routes for that subnet. Add paired directed edges for configured BGP neighbors and OSPF processes sharing a layer-2 broadcast domain; distinguish iBGP edges. For redistribution, add a directed edge from the process supplying routes to the process redistributing them (Section 4.1, p. 5).
2. Taint every RAG vertex that originates the destination route. Propagate taint along edges, except that taint cannot cross two consecutive iBGP edges (Section 4.1, p. 5). This over-approximation identifies processes that may learn the route.
3. Construct a TPG for each source/destination subnet pair. Add VLAN ingress/egress vertices, routing-process vertices, source, and destination (Section 4.2, pp. 5–6).
4. Add physical-link edges from VLAN egress to neighboring VLAN ingress, and ingress-to-egress edges for L2 flooding. Connect OSPF processes to their VLAN egress vertices. Connect BGP processes to VLAN egress when a peer is directly connected, otherwise to the router's OSPF process. Connect VLAN ingress to tainted routing processes on that router. Connect the source to its router's tainted processes and destination-router ingress vertices to the destination when a process there originates that subnet (Section 4.2, p. 6).
5. Prune edges for prefix/neighbor route filters and source/destination-prefix packet filters. Encode tag filters with blocked, added, and removed tag attributes. Both import and export route filters affect outgoing edges of the importing process (Section 4.2, p. 6).
6. Annotate outgoing edges of OSPF, BGP, and VLAN ingress vertices with vector metrics, including OSPF cost, AS-path length, local preference, and administrative distance; irrelevant metrics are null (Section 4.2, p. 6).

This graph captures iBGP's dependence on OSPF when OSPF supplies the route to the peer's loopback address (Section 4.2, p. 6). The paper's statement is: "All verification procedures operate on the TPG." (Section 3.1, p. 4.)

Verus form (inference)

Inference: model RAG/TPG vertices, edges, labels, and taint as ghost sets and maps. Use a Verus `spec fn` to define valid edge dependencies and a `proof fn` to show that each generated edge satisfies the graph-construction rules. A verified refinement relation would be needed between router configuration and the graph; the paper's parser and configuration semantics remain trusted otherwise.

limits

RAG tainting assumes all configured adjacencies are active and no routes are filtered; TPGs then encode dependencies and filters (Section 4.1, p. 5). The paper does not model all packet filters, multiple tags affecting one destination, or some iBGP cases (Section 9, p. 12). TPG generation takes about 1 ms even for large networks in their measurements (Section 8.2, p. 10). Section 9 proposes using packet-equivalence classes to reduce the number of traffic-specific TPGs (p. 11).

## technique 2: TPVP for exact paths

what it is and when to use it

The Tiramisu Path Vector Protocol (TPVP) computes the converged path selected by interdependent routing protocols. It extends the Simple Path Vector Protocol with shared memory and multiple routing algebras, so BGP, OSPF, and their dependencies are computed in one run (Section 5.1, p. 7). Use TPVP for policies that require the actual selected path, such as PREF and MC. For MC, retain multiple best path signatures and compare best-path counts with and without pruning ACL edges; different counts indicate a violation (Appendix D, p. 19).

how to do it

1. Contract L2 paths into L3 edges while carrying their non-overlapping edge labels (Section 5.1, p. 7).
2. Define a routing algebra `(Σ, preference, L, ⊕, O)`: signatures hold metrics, preference compares signatures, labels hold edge attributes, `⊕` combines a label and signature, and `O` is the origin signature (Section 5.1, p. 7).
3. Initialize every non-destination path and signature to null; set the destination path to `[dst]` and its signature to `O` (Algorithm 1, p. 8).
4. Repeatedly compute each node's candidate path through every peer by prepending the outgoing edge to the peer's path and applying the protocol-specific `⊕`; choose the best candidate with the preference relation (Algorithm 1, p. 8).
5. Repeat until no path changes. The paper proves: "If the network control plane converges, TPVP always finds the exact path taken in the network under any given failure scenario." (Section 5.1, p. 7.)

For PREF, the desired path order is `p1 ≫ p2 ≫ p3`: after p1 fails, p2 should be selected if available, and after p1 and p2 fail, p3 should be selected if available (Section 5, p. 6). TPVP is run under relevant failures and the selected path is compared with this order.

Verus form (inference)

Inference: implement signatures and routing-algebra operations as pure Rust values with Verus `spec fn` definitions. Prove monotonicity or well-foundedness conditions needed for convergence, then prove each TPVP iteration preserves the invariant that every stored path is a valid TPG path. A `while` loop requires an explicit decreases clause for termination; convergence of arbitrary BGP configurations is an assumption unless separately proved.

## technique 3: TYEN failure-aware path acceleration

what it is and when to use it

Exhaustively running TPVP for every failure combination is expensive. TYEN adapts Yen's k-shortest-path dynamic programming to reduce failure enumeration. Its acceleration requires a strictly monotonic path-cost composition function (Section 5.2, p. 8).

how to do it

1. Treat the paths selected after more-preferred paths fail as a preference-ordered path sequence, analogous to shortest paths (Section 3.2, pp. 4–5).
2. Replace Yen's Dijkstra call with TPVP, so each candidate path respects multiple routing protocols (Section 5.2, p. 8).
3. Generate candidates by splitting a previous path into a root and a spur. Remove root vertices except the spur vertex to avoid loops, and remove outgoing edges used by previously considered paths sharing that root. Compute the spur with TPVP, concatenate it with the root, retain new valid candidates, restore the graph, and select the next preferred candidate (Section 5.2 and Appendix A, pp. 8 and 14).
4. Track removed edges for each candidate. At each iteration, identify the most preferred path required by PREF that does not contain removed edges; report violation if the path computed by TPVP differs (Appendix A, p. 14).
5. For KFAIL, use TYEN to find the first path that traverses a dropping ACL, then restrict the min-cut computation to edges appearing in earlier paths (Section 6.1, pp. 8–9).

Inference: a Verus implementation would need proofs that the candidate set contains the k-th relevant path and that monotonic metrics preserve Yen's pruning argument. The paper's proof obligations are algorithm-specific and are not automatically inherited by Rust code.

## technique 4: ILP for quantitative path policies

what it is and when to use it

Category ii policies avoid computing the exact path selected in each failure scenario. Tiramisu formulates only policy-relevant variables as integer linear programs (ILPs). KFAIL minimizes failed physical links that disconnect source and destination while respecting tag constraints; BOUND maximizes traversed inter-device edges to find a longest path and checks that its length is at most K (Sections 6.1–6.2, pp. 8–9). EB compares the longest and shortest path lengths by changing the optimization objective (Appendix D, p. 19).

how to do it

1. For KFAIL, create binary variables for physical-link failures, edge traffic propagation, node reachability, and blocked-tag propagation (Section 6.1 and Appendix B.1, pp. 8 and 15).
2. Set source reachability to true and destination reachability to false; an intermediate node is reached iff an incoming edge propagates traffic. An edge propagates traffic iff its start is reached, it carries no blocked tag, and its underlying physical link has not failed (Appendix B.1, p. 15).
3. Model blocked tags in the traffic direction, opposite to advertisements: blocking edges originate blocked-tag propagation, removing edges stop it, and other edges propagate incoming blocked tags. An edge is blocked when its added tags intersect the blocked tags propagated to it. Minimize the sum of failed physical links (Appendix B.1, p. 15).
4. For BOUND, require one outgoing flow at the source, one incoming flow at the destination, conservation at intermediate nodes, and tag-compatible edge flow; maximize traversed inter-device edges (Section 6.2 and Appendix B.2, pp. 9 and 15).
5. For KFAIL with ACLs, compute N with the min-cut ILP after pruning ACL edges. Compute L by running TYEN without that pruning until the first ACL-blocked path, keeping only edges in the earlier preferred paths, and finding their min-cut. Use `min(N,L)` and compare it with K (Section 6.1, p. 9). The TYEN monotonicity requirement still applies.

Verus form (inference)

Inference: Verus could check witnesses for cuts or paths against specified constraints. Proving optimality also needs a checkable bound on the integer objective; a feasible witness alone is insufficient. Without verified solving or checked certificates and a verified TPG-to-ILP translation, those components remain trusted.

## technique 5: TDFS for tag-aware path existence

what it is and when to use it

Tiramisu depth-first search (TDFS) checks BLOCK and waypoint policies while accounting for tags. Ordinary DFS can follow a path that is actually blocked by a tag filter. TDFS runs DFS on subgraphs with tag-adding, tag-removing, and tag-blocking edges (Section 7, p. 9; Algorithm 2, p. 10). The paper calls TDFS polynomial-time (Section 3.2, p. 4).

how to do it

1. Collect tag-adding, tag-removing, and tag-blocking edge sets (Algorithm 2, p. 10).
2. If ordinary DFS cannot reach the destination, return true for BLOCK (Algorithm 2, p. 10).
3. Remove tag-blocking edges and run DFS; if the destination is reachable, return false because a path can avoid blocking (Algorithm 2, p. 10).
4. Remove tag-adding edges; if any blocking edge can reach the destination in that subgraph, return false (Algorithm 2, line 7, p. 10).
5. Remove tag-removing edges; if every blocking-edge/adding-edge pair is disconnected in that subgraph, return false. Otherwise return true (Algorithm 2, lines 9–11, p. 10). Traffic traversal runs opposite to route-advertisement propagation (Section 6.1, p. 8).

WAYPT removes the waypoint and checks that source and destination become unreachable (Section 7, p. 9). For a chain, remove each waypoint in turn and check whether a preceding waypoint can still reach a following one. For ACL blackholes, construct the graph without pruning ACL edges and test whether source can reach the ACL router and that router can reach destination. For static-route blackholes, test whether source can reach the static-route router while its next hop cannot reach destination (Appendix D, p. 19). Inference: a Verus proof would need DFS reachability invariants and a separate proof that the tag-order cases cover every permitted path.

## techniques for the catalog

- multilayer RAG/TPG encoding: represent routing, VLAN, physical, filter, tag, and protocol dependencies in inter-related graphs
- TPVP path computation: solve converged multi-protocol path selection with routing algebras and shared-memory updates
- TYEN acceleration: adapt Yen's dynamic programming to skip irrelevant failure scenarios while preserving preferred paths
- policy-specific ILPs: encode failure cuts, longest paths, and equal-length properties with only relevant flow variables
- tag-aware TDFS: run DFS on selected subgraphs to decide path existence under tag filters
