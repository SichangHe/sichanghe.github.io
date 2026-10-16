# Tiramisu: Fast Multilayer Network Verification
(authored by agents unless marked 🧑)
Tag: `abhashkumar2020tiramisu`, [paper](https://www.usenix.org/conference/nsdi20/presentation/abhashkumar)

## purpose and model

Page references below count from the article’s first page (proceedings p. 201), excluding the USENIX cover.

Tiramisu verifies distributed network control-plane policies under link or device failures. Its central design is to separate a rich graph encoding from policy-specific algorithms. The paper states: "The key insight in our framework, Tiramisu, is to decouple encoding from verification algorithms." (Section 1, p. 1.) Existing graph tools are fast but omit iBGP, VLANs, VRFs, and attributes such as communities; SMT and explicit-state tools model more behavior but repeatedly search large state spaces.

Tiramisu builds two related graphs for each traffic class and destination: a routing-adjacency graph (RAG), which says which routing processes may exchange routes, and a traffic-propagation graph (TPG), which also represents layer-2, physical-link, route, filter, tag, and protocol dependencies (Sections 3.1 and 4, pp. 4–6). Edges carry labels for added, removed, or blocked tags and vectors of protocol metrics. The input is parsed router configuration; the prototype uses Batfish and Gurobi (Section 8, p. 10).

Policies are divided into three categories. Category i needs the actual path (path preference PREF and multipath consistency MC); category ii needs a quantitative path property (KFAIL reachability under fewer than K failures, BOUND maximum length, and EB equal length); category iii only asks whether a path exists (BLOCK, WAYPT, chain of waypoints, and no blackhole) (Table 1, p. 4). The authors choose the minimum modeling detail required by each category (Section 3.2, p. 4).

## technique 1: multilayer RAG and TPG construction

how to build it

1. Construct a RAG for each destination prefix. Add a vertex for each routing process and static route. Add directed edges for configured BGP neighbors and shared layer-2 broadcast domains (Section 4.1, p. 5).
2. Taint every RAG vertex that originates the destination route. Propagate taint along edges, except that taint cannot cross two consecutive iBGP edges (Section 4.1, p. 5). This over-approximation identifies processes that may learn the route.
3. Construct a TPG for each source/destination subnet pair. Add VLAN ingress/egress vertices, routing-process vertices, source, and destination (Section 4.2, pp. 5–6).
4. Add layer-1/2 edges for physical links and L2 flooding, OSPF-to-VLAN edges, BGP-to-VLAN or BGP-to-OSPF edges, and tainted-process-to-ingress edges (Section 4.2, pp. 5–6).
5. Encode filters by pruning edges for prefix or neighbor filters. Encode tag filters with blocked, added, and removed tag attributes on edges (Section 4.2, p. 6).
6. Annotate OSPF, BGP, and VLAN edges with vector metrics, including OSPF cost, AS-path length, local preference, and administrative distance (Section 4.2, p. 6).

This graph captures the dependency that an iBGP process can exchange a route only if OSPF provides reachability to its neighbor. The paper's statement is: "All verification procedures operate on the TPG." (Section 3.1, p. 4.)

Verus form (inference)

Inference: model RAG/TPG vertices, edges, labels, and taint as ghost sets and maps. Use a Verus `spec fn` to define valid edge dependencies and a `proof fn` to show that each generated edge corresponds to a configured adjacency or physical link. A verified refinement relation would be needed between router configuration and the graph; the paper's parser and configuration semantics remain trusted otherwise.

limits

RAG tainting assumes all configured adjacencies are active and no routes are filtered; TPGs then recover relevant dependencies. The paper does not model all packet filters, multiple tags affecting one destination, or some iBGP route-deflection cases (Section 9, p. 12). TPG generation takes about 1 ms even for large networks in their measurements (Section 8.2, p. 10), but one TPG is generated per traffic class unless packet-equivalence classes are used.

## technique 2: TPVP for exact paths

what it is and when to use it

The Tiramisu Path Vector Protocol (TPVP) computes the converged path selected by interdependent routing protocols. It extends the Simple Path Vector Protocol with shared memory and multiple routing algebras, so BGP, OSPF, and their dependencies are computed in one run (Section 5.1, pp. 6–7). Use TPVP for policies that require the actual selected path, such as PREF and MC.

how to do it

1. Contract L2 paths into L3 edges while carrying their non-overlapping edge labels (Section 5.1, p. 7).
2. Define a routing algebra `(Σ, preference, L, ⊕, O)`: signatures hold metrics, preference compares signatures, labels hold edge attributes, `⊕` combines a label and signature, and `O` is the origin signature (Section 5.1, p. 7).
3. Initialize every non-destination path to null; set the destination path to `[dst]` and its signature to `O` (Algorithm 1, p. 7).
4. Repeatedly compute each node's candidate path through every peer by appending the edge and applying the protocol-specific `⊕`; choose the best candidate with the preference relation (Algorithm 1, p. 7).
5. Repeat until no path changes. The paper proves: "If the network control plane converges, TPVP always finds the exact path taken in the network under any given failure scenario." (Section 5.1, p. 7.)

For PREF, the desired path order is `p1 ≫ p2 ≫ p3`: after p1 fails, p2 should be selected, and after p1 and p2 fail, p3 should be selected (Section 5, p. 6). TPVP is run under relevant failures and the selected path is compared with this order.

Verus form (inference)

Inference: implement signatures and routing-algebra operations as pure Rust values with Verus `spec fn` definitions. Prove monotonicity or well-foundedness conditions needed for convergence, then prove each TPVP iteration preserves the invariant that every stored path is a valid TPG path. A `while` loop requires an explicit decreases clause for termination; convergence of arbitrary BGP configurations is an assumption unless separately proved.

## technique 3: TYEN failure-aware path acceleration

what it is and when to use it

Exhaustively running TPVP for every failure combination is expensive. TYEN adapts Yen's k-shortest-path dynamic programming to avoid scenarios that cannot change the next preferred path. It is applicable when path metrics are monotonic (Section 3.2, p. 4).

how to do it

1. Treat the paths selected after successive failures as a preference-ordered path sequence, analogous to shortest paths (Section 3.2, p. 4).
2. Replace Yen's Dijkstra call with TPVP, so each candidate path respects multiple routing protocols (Section 5.2, p. 8).
3. Generate a polynomial candidate set from previously found paths instead of enumerating all paths (Section 3.2, p. 4).
4. Track removed edges for each candidate. At each iteration, identify the most preferred path required by PREF that does not contain removed edges; report violation if the path computed by TPVP differs (Appendix A, p. 14).
5. For KFAIL, use TYEN to find the first path that traverses a dropping ACL, then restrict the min-cut computation to edges appearing in earlier paths (Section 6.1, pp. 8–9).

Inference: a Verus implementation would need proofs that the candidate set contains the k-th relevant path and that monotonic metrics preserve Yen's pruning argument. The paper's proof obligations are algorithm-specific and are not automatically inherited by Rust code.

## technique 4: ILP for quantitative path policies

what it is and when to use it

Category ii policies avoid computing one exact path. Tiramisu formulates only policy-relevant variables as integer linear programs (ILPs). KFAIL minimizes failed physical links that disconnect source and destination while respecting tag constraints; BOUND maximizes traversed inter-device edges to find a longest path; EB compares path lengths (Sections 6.1–6.2, pp. 8–9).

how to do it

1. Create binary variables for physical-link failures and traffic flow on TPG edges (Section 6.1, p. 8).
2. Constrain source to originate traffic, destination to be unreachable for a cut, and every intermediate node's flow to follow incoming edges (Section 6.1, p. 8).
3. Allow an edge only when its start is reached, its blocked-tag condition is false, and its physical link has not failed (Section 6.1, p. 8).
4. Minimize the sum of failure variables for KFAIL. For BOUND, maximize the sum of traversed inter-device edges (Section 6.2, p. 9).
5. For tag-correlated cuts, account for the ordering of tag-blocking and tag-adding edges. For ACL-blocked paths, compute both graph disconnection N and failures L that force a selected path through an ACL, then use `min(N,L)` (Section 6.1, p. 9).

Verus form (inference)

Inference: Verus can prove that a produced flow satisfies conservation and tag constraints, but it is not an ILP optimizer. A practical design would verify an ILP solver's certificate: feasibility witnesses for a cut or path and a dual bound for optimality. Without such a certificate, Gurobi and the translation from TPG to ILP are trusted.

## technique 5: TDFS for tag-aware path existence

what it is and when to use it

Tiramisu depth-first search (TDFS) checks BLOCK and waypoint policies in polynomial time while accounting for tags. Ordinary DFS can follow a path that is actually blocked by a tag filter. TDFS makes a constant number of DFS calls on subgraphs with tag-adding, tag-removing, and tag-blocking edges (Section 7, p. 9).

how to do it

1. Partition edges into tag-adding, tag-removing, and tag-blocking sets (Algorithm 2, p. 10).
2. If ordinary DFS cannot reach the destination, return true for BLOCK (Algorithm 2, p. 10).
3. Remove tag-blocking edges and run DFS; if the destination is reachable, return false because a path can avoid blocking (Algorithm 2, p. 10).
4. Remove tag-adding edges; if any blocking edge can reach the destination in that subgraph, return false (Algorithm 2, line 7, p. 10).
5. Remove tag-removing edges; if every blocking-edge/adding-edge pair is disconnected in that subgraph, return false. Otherwise return true (Algorithm 2, lines 9–11, p. 10). Traffic traversal runs opposite to route-advertisement propagation (Section 6.1, p. 8).

The same procedure verifies WAYPT by removing the waypoint and checking reachability, and supports chains of waypoints and no-blackhole policies (Section 7, p. 10). Inference: a Verus proof can establish DFS reachability invariants over a finite graph and separately prove that the tag-order cases cover every path; the algorithm's polynomial complexity is a mathematical property, not a Verus construct.

## evidence, boundaries, and VL relevance

The evaluation uses four university, 34 datacenter, seven Topology Zoo, and five Rocketfuel networks, with medians over 100 runs for 100 traffic classes in policy experiments (Sections 8.1–8.2, p. 10). On university networks, BLOCK is under 3 ms and KFAIL/BOUND about 80 ms per traffic class (Section 8.2, p. 10). On large networks, every tested policy is under 0.12 s (Section 8.4, p. 11). Compared with Minesweeper under failures, speedups reach 50× for BOUND and 600–800× for TDFS policies; compared with Plankton on iBGP networks, Tiramisu is 100–300× faster on small networks and 2–50× faster on OSPF-only networks after excluding one anomalous case (Section 8.3, p. 11). TYEN contributes up to 3.8× acceleration on networks over 100 devices (Section 8.4, p. 11). The abstract summarizes the tested range as: "Tiramisu can verify if policies hold under failures for various real-world and synthetic configurations in < 0.08s in small networks and < 2.2s in large networks." (Abstract, p. 1.)

The authors give mathematical correctness arguments for TPVP, the ILPs, and TDFS in Appendix C (pp. 16–19); they do not report machine-checked proofs. Their claims depend on convergence and the modeling limitations in Section 9. What is measured is runtime and comparative speed on the stated configurations and 100-run medians. Inference: the trusted base includes Batfish parsing, configuration semantics, Gurobi's ILP solution, the Java implementation, concrete external advertisements, and the assumption that the graph captures every relevant protocol dependency. Tiramisu cannot quantify over arbitrary external advertisements, check control-plane equivalence, or model all filters and route-deflection behaviors (Section 9, pp. 11–12).

Inference: the threat to a product producing Verus-verified Rust is moderate and structural. Tiramisu's separation of a rich model from property-specific algorithms is directly reusable for generated Rust state machines: one abstract graph can support reachability, path preference, and failure properties. However, a Verus proof of the graph algorithm does not prove that production Rust routing behavior refines the graph. VL would need a verified parser/refinement layer and explicit assumptions for failures, concurrency, and external inputs.

Inference: VL should not redo multilayer graph construction, TPVP, TYEN, ILP encodings, or TDFS as generic literature contributions. A new contribution could provide machine-checked certificates for the optimization and path computations, or measure whether refinement proofs survive real network-configuration changes.

## techniques for the catalog

- multilayer RAG/TPG encoding: represent routing, VLAN, physical, filter, tag, and protocol dependencies in inter-related graphs
- TPVP path computation: solve converged multi-protocol path selection with routing algebras and shared-memory updates
- TYEN acceleration: adapt Yen's dynamic programming to skip irrelevant failure scenarios while preserving preferred paths
- policy-specific ILPs: encode failure cuts, longest paths, and equal-length properties with only relevant flow variables
- tag-aware TDFS: combine a constant number of DFS calls to decide path existence under tag filters
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "To verify a property under all failure scenarios, we set the value of K to one less than the number of physical links in the network."): checked the whole paper including Appendices A–E, quotations, metrics, algorithms, references and metadata; corrected TPVP initialization, reversed TDFS final test, page/appendix references, proof characterization and publisher link; did not inspect Java/Batfish/Gurobi code, independently prove algorithms, or reproduce experiments.
