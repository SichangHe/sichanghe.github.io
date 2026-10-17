# Verifying maximum link loads in a changing world
(authored by agents unless marked 🧑)
Tag: `schneider2025maximum`, [paper](https://www.usenix.org/conference/nsdi25/presentation/schneider)

## purpose and result

Velo verifies worst-case load on every network link while considering link or node failures and changes in external BGP routes. Existing verifiers either ignore performance requirements or, for the few that check link loads, assume fixed external routes (Section 1, p. 1269). Velo reduces the search space with three techniques: represent a route change by its set of egress routers, prove which egress sets can maximize a link, and approximate a large traffic matrix by clustering destinations with similar ingress distributions (abstract, p. 1269; Sections 3–5, pp. 1272–1275).

The problem is stated precisely as finding “the worst-case load for each link in the network, along with the egress changes and the failure scenario causing such loads.” (Section 2.1, p. 1271). The authors claim: “Velo’s computed maximum loads are also highly accurate, within 1% of the actual ones, and this across a wide range of traffic matrices, from heavy-tailed to almost-uniform.” (Section 1, p. 1270). Inference: for VL this is a model for proving quantitative resource limits over many environment changes, but its conclusions are conditional on routing assumptions and traffic models.

## technique 1: abstract route changes by egress-router sets

What it is. For each destination, Velo models only the subset of border routers that receive a preferred route, rather than enumerating BGP attributes and every concrete route. The paper motivates this scope because “For each destination, external networks may advertise new routes, modify existing ones, or completely withdraw them.” (Section 1, p. 1270). The paper justifies the abstraction thus: “Each set captures the many equivalent routes inducing the same link loads.” (Section 1, p. 1270). Operators bound the number `k` of destinations whose egress set may change, restrict destinations, and restrict possible egress routers (Section 2.1, p. 1271).

How to apply it.
1. Represent the network as graph `G=(N,E)`, with border routers `NB` and destinations `P` (Section 3, p. 1272).
2. For each destination, determine which border routers may receive a route and which subsets can be preferred under route-map and BGP constraints (Section 3, p. 1272).
3. Treat the selected subset as the routing input for that destination and compute forwarding paths from each router to its selected egress (Section 3, p. 1272).
4. Enumerate only route-change states allowed by the operator's `k`, destination, and egress constraints (Section 2.1, p. 1271).

Verus form. Inference: represent an egress set and failure scenario as a ghost/specification state, with a `spec fn` that maps it to forwarding choices. Use `requires` to state BGP visibility and route-policy assumptions and `ensures` to state that the computed forwarding relation matches the selected egress set. A `proof fn` can establish that two concrete advertisements with the same preferred egress set have equal load under the chosen routing model. This is an inference, since the paper uses graph algorithms and Rust implementation rather than Verus.

Evidence and limits. The model assumes iBGP attributes affecting preference are not modified on sessions and that all routers eventually learn preferred routes (Section 3, p. 1272). It accepts current or what-if configurations, one traffic matrix per run, an additional traffic volume, and a user-defined failure space such as up to `l` simultaneous link or node failures (Sections 1 and 2.1, pp. 1270–1271). Section 9 (p. 1280) adds limits: link loads are plain sums with no congestion modeling, destinations must be independent (no route aggregation or conditional advertisements), and sub-prefix announcements of a current destination are not systematically explored. Inference: because the abstraction hides most of the BGP decision process, an assumption or route policy it omits can invalidate a result.

## technique 2: reduce worst-case search with routing theorems

Strictly isotone routing. For shortest-path-like routing, define link weights with an order and combine operation such that adding the same prefix or suffix preserves strict order (Section 3, p. 1273). Theorem 1 states that for every egress set `B` and link `e`, some single egress `b` in `B` causes at least as much load on `e` as `B`. Therefore Velo computes one forwarding DAG per border router, pushes traffic in topological order, and keeps the maximum for each link (Section 4.1.1, pp. 1273–1274). The algorithm's pseudocode initializes loads, constructs each `ForwardingDAG`, traverses it in `TopoSort`, splits traffic equally among next hops for ECMP, and updates `y[u,v]` with the maximum (Algorithm 1, p. 1273).

How to apply it.
1. Verify that the routing algebra is strictly isotone, which the paper states is necessary and sufficient for sub-paths of optimal paths to be optimal (Section 3, p. 1273).
2. For each border router `b`, compute its forwarding DAG with a generalized Dijkstra algorithm (Sections 3 and 4.1.1, pp. 1273–1274).
3. Initialize each ingress load with `M[s,d]` and traverse the DAG in topological order (Algorithm 1, p. 1273).
4. Divide traffic equally across outgoing next hops and update each edge's maximum load (Algorithm 1, p. 1273).
5. Repeat for destinations and failure topologies; retain the maximum and the state that caused it (Sections 2.1, 2.2 and 4, pp. 1271–1273).

Exception paths. Strict isotonicity does not cover manually configured paths such as MPLS tunnels. Let `T` be egress routers terminating exception paths. Theorem 2 says it is sufficient to test every single egress plus combinations `{b} ∪ T'`, where `T'` is the intersection of `T` with the selected set (Section 4.1.2, p. 1274); combinations that cannot receive equally preferred routes under BGP policies are filtered out (Section 4.1.2, p. 1274). This keeps the search smaller than the naive `O(2^|NB|)` states (Section 4.1, p. 1273) while covering the counterexample where two egresses jointly maximize a link (Figure 3 and Section 4.1.2, p. 1274).

Evidence. For strictly isotone routing, complexity is `O(|N|² log|N| + |N||E||P|)` (Section 4.1.1, p. 1274). With exception paths, the paper reports `O(|N|² log|N| + 2^|T| |N||E||P|)` (Section 4.1.2, p. 1274). Inference: a Verus model can encode forwarding as a transition relation and prove monotonicity lemmas, but graph algorithm performance itself needs benchmark evidence. A loop `invariant` can preserve accumulated load bounds; `ensures` can state that the returned load dominates every enumerated state.

## technique 3: bound route changes and account for additional traffic

For a maximum of `k` egress changes, Velo maintains, per link, a heap of the `k` largest differences between worst-case and current-state loads (Section 4.2, p. 1274). Maintaining the heap costs `O(|E| · |P| · log k)`, which the paper calls negligible relative to the whole algorithm (Section 4.2, p. 1274).

For an additional traffic amount `y`, Velo first computes maxima for the input matrix and then increases each maximum by `y`. The paper notes this can overestimate a link's load if no router forwards all its traffic for any single destination over that link in that destination's worst case, and says this occurred in “less than 0.1% in our experiments in §6” (Section 2.2, p. 1272). Inference: this is a conservative bound suitable for a safety check, but the stated error rate is empirical and tied to the experiments' traffic and topologies.

Verus form. Inference: model the heap as a ghost ranking structure and prove that it contains the top `k` deltas; use `requires` for `k` and nonnegative traffic, `ensures` for the resulting bound, and an `invariant` while scanning destinations. Additional traffic can be represented as a monotone additive bound in a postcondition.

## technique 4: cluster destinations with a provable traffic error

What it is. Velo clusters destinations that have similar normalized traffic distributions across ingress routers, but only within an equivalence class where current egress routers and forwarding paths are compatible (Section 5, p. 1275). It uses a weighted k-means variant: the L1 distance between a destination's normalized vector and its centroid is weighted by total destination traffic (Section 5, p. 1275). The approximate matrix contains one centroid column per cluster. The clustering error `ε` bounds the maximum difference `δ` in worst-case link loads (Equation 1 and Section 5, p. 1275).

How to apply it.
1. Partition destinations into equivalence classes with identical current egress sets and equal forwarding paths for every possible preferred egress set (Section 5, p. 1275).
2. Allocate the chosen number of clusters across classes in proportion to traffic (Section 5, p. 1275).
3. Normalize each destination column by its total traffic and run weighted L1 k-means (Section 5, p. 1275).
4. Use each cluster centroid as a column in approximate matrix `A` (Section 5, p. 1275).
5. Compute Velo on `A`; report `ε` as an upper bound on the difference from the original matrix (Equation 1, p. 1275).

Evidence. Velo used the 75 largest TopologyZoo networks with 40–754 nodes and 80–1,790 links, a ≈7,000-line Rust prototype, 96 CPU threads, and 384 GB memory (Section 6, p. 1275). With 300 clusters, the actual approximation error was always below 1% of total traffic, while the error bound stayed below 12% for difficult synthetic matrices; clustering was 5×–50× more efficient than Top-X (Section 6.2, p. 1278). For four real 5-minute Netflow slices from the Swiss research network Switch, Table 1 reports maximum error bounds of 3.46–5.63%, maximum approximation errors of 0.44–0.68%, and efficiency of 3.7×–4.3× relative to Top-X, where efficiency is the ratio of the smallest Top-X destination count reaching the same bound to `|C|` (Section 6.2 and Table 1, pp. 1277–1278). The authors report correct maximum loads on over 99.9% of links for any value of additional traffic (Section 6.2, p. 1278).

Verus form. Inference: encode a traffic matrix as a finite map or sequence, prove cluster-membership and centroid invariants, and state the `ε` bound with `ensures`. The proof must include that destinations in one cluster have equivalent forwarding behavior; otherwise the numerical bound does not apply. A `spec fn` can express L1 distance, while executable clustering remains ordinary Rust checked against its specification.

## appendix proof technique: linearity and superposition

Appendix B proves the clustering bound through two reusable facts. Scaling a traffic matrix by a nonnegative scalar scales maximum link load by the same scalar (Lemma 1, Appendix B, p. 1284). Maximum load for a matrix is the sum of per-destination maxima because route choices are independent by destination (Lemma 2, Appendix B, p. 1284). Theorem 3 then bounds the difference between original and centroid matrices by the L1 clustering error `ε` (Appendix B, pp. 1284–1285). Inference: these lemmas can become Verus `proof fn`s over a finite traffic map, with `ensures` for homogeneity and additive decomposition; they are assumptions about the routing model, not generic facts about arbitrary network programs.

## what is proved, trusted, and relevant to VL

The theorems prove worst-case reductions under routing algebra, exception-path, and clustering assumptions; the paper states correctness “is instead guaranteed by our theorems in §4 and §5” while the evaluation measures running time and accuracy (Section 6, p. 1275). Inference: nothing checks the Rust prototype, topology input, or traffic measurements against the theorems. The case study uses an ISP with 126 routers, 376 links, and a gravity-model traffic matrix of 100,000 prefixes; Velo found two links that would exceed capacity if egresses of only four destinations change, and an alternative configuration with three additional MPLS paths prevented congestion for up to 16 arbitrary egress changes (Section 7, pp. 1278–1279).

Inference: threat to agent-written verified Rust is high for quantitative guarantees whose environment can change outside the verified model, and moderate when the state space, routing algebra, and traffic bounds are explicit. VL should reuse compositional worst-case reasoning, monotonicity lemmas, and clustering with a proved error bound. It should not redo generic shortest-path algorithms; the unresolved part is connecting their assumptions to executable Rust configuration and deployment data. The paper's main failure modes are non-isotone exception paths, an invalid equivalence class, underestimated traffic variability, and route-policy behavior outside the abstraction.

## techniques for the catalog

- egress-set abstraction: represent external route changes by preferred border-router sets
- isotone worst-case theorem: reduce arbitrary egress combinations to one egress per destination under strict isotonicity
- exception-path enumeration: add only combinations containing egresses that terminate configured exception paths
- traffic clustering bound: replace destinations with weighted L1 centroids and carry a proved load-error bound
- bounded-change heap: retain the k largest per-link load increases for at most k egress changes
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We find that the network size and the number of failures have the biggest impact on Velo’s running time."): read all pages including appendices and checked every quotation, number, section and page reference, and technique step; changed the link to the publisher page in the paper text, moved two quotes from the abstract to Section 1 and fixed many off-by-one page numbers, replaced an unsupported validity claim with the paper's own sentence, deleted the unsupported claim that the heap avoids sorting, stated that Table 1 numbers are maxima and added the Top-X ratios, added Section 9 limits, the BGP-policy filter for exception paths and the gravity-model origin of the case-study traffic, and marked the trust statement as inference; did not check the Verus forms or VL relevance beyond marking them inference, nor the box-plot values in Table 1 beyond the printed maxima.
